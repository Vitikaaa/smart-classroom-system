"""
Smart Classroom Availability System — Flask API Server
"""

import threading
import time
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from models import init_db, get_session, Room, Schedule, StatusHistory, UserReport

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

# ---------------------------------------------------------------------------
# Background scheduler: auto-update room status based on timetable
# ---------------------------------------------------------------------------

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def auto_update_status():
    """Background thread: every 60 s, check the timetable and flip statuses."""
    while True:
        try:
            session = get_session()
            now = datetime.now()
            today = DAY_NAMES[now.weekday()]
            current_time = now.strftime("%H:%M")

            rooms = session.query(Room).all()
            for room in rooms:
                if room.current_status == "maintenance":
                    continue  # don't override maintenance

                # Check if any schedule is active right now
                active = (
                    session.query(Schedule)
                    .filter(
                        Schedule.room_id == room.id,
                        Schedule.day_of_week == today,
                        Schedule.start_time <= current_time,
                        Schedule.end_time > current_time,
                    )
                    .first()
                )

                new_status = "occupied" if active else "vacant"
                if room.current_status != new_status:
                    room.current_status = new_status
                    room.last_updated = datetime.utcnow()
                    session.add(
                        StatusHistory(
                            room_id=room.id,
                            status=new_status,
                            changed_by="system",
                        )
                    )

            session.commit()
            session.close()
        except Exception as e:
            print(f"[scheduler] error: {e}")

        time.sleep(60)


# ---------------------------------------------------------------------------
# Serve frontend
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ---------------------------------------------------------------------------
# REST API — Rooms
# ---------------------------------------------------------------------------

@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    session = get_session()
    rooms = session.query(Room).all()
    data = [r.to_dict() for r in rooms]
    session.close()
    return jsonify(data)


@app.route("/api/rooms/<int:room_id>", methods=["GET"])
def get_room(room_id):
    session = get_session()
    room = session.query(Room).get(room_id)
    if not room:
        session.close()
        return jsonify({"error": "Room not found"}), 404
    data = room.to_dict()
    # Include today's schedule
    today = DAY_NAMES[datetime.now().weekday()]
    schedules = (
        session.query(Schedule)
        .filter(Schedule.room_id == room_id, Schedule.day_of_week == today)
        .order_by(Schedule.start_time)
        .all()
    )
    data["today_schedule"] = [s.to_dict() for s in schedules]
    # Include recent history
    history = (
        session.query(StatusHistory)
        .filter(StatusHistory.room_id == room_id)
        .order_by(StatusHistory.timestamp.desc())
        .limit(20)
        .all()
    )
    data["history"] = [h.to_dict() for h in history]
    session.close()
    return jsonify(data)


@app.route("/api/rooms/<int:room_id>/status", methods=["PUT"])
def update_room_status(room_id):
    session = get_session()
    room = session.query(Room).get(room_id)
    if not room:
        session.close()
        return jsonify({"error": "Room not found"}), 404

    body = request.get_json(force=True)
    new_status = body.get("status")
    if new_status not in ("occupied", "vacant", "maintenance"):
        session.close()
        return jsonify({"error": "Invalid status"}), 400

    room.current_status = new_status
    room.last_updated = datetime.utcnow()
    session.add(
        StatusHistory(
            room_id=room.id,
            status=new_status,
            changed_by=body.get("changed_by", "admin"),
        )
    )
    session.commit()
    data = room.to_dict()
    session.close()
    return jsonify(data)


# ---------------------------------------------------------------------------
# REST API — Schedule
# ---------------------------------------------------------------------------

@app.route("/api/schedule", methods=["GET"])
def get_schedule():
    session = get_session()
    day = request.args.get("day")
    room_id = request.args.get("room_id", type=int)

    query = session.query(Schedule)
    if day:
        query = query.filter(Schedule.day_of_week == day)
    if room_id:
        query = query.filter(Schedule.room_id == room_id)

    schedules = query.order_by(Schedule.start_time).all()
    data = [s.to_dict() for s in schedules]
    session.close()
    return jsonify(data)


@app.route("/api/schedule", methods=["POST"])
def add_schedule():
    session = get_session()
    body = request.get_json(force=True)

    required = ["room_id", "day_of_week", "start_time", "end_time", "subject"]
    for field in required:
        if field not in body:
            session.close()
            return jsonify({"error": f"Missing field: {field}"}), 400

    schedule = Schedule(
        room_id=body["room_id"],
        day_of_week=body["day_of_week"],
        start_time=body["start_time"],
        end_time=body["end_time"],
        subject=body["subject"],
        faculty=body.get("faculty", ""),
        section=body.get("section", ""),
    )
    session.add(schedule)
    session.commit()
    data = schedule.to_dict()
    session.close()
    return jsonify(data), 201


@app.route("/api/schedule/<int:schedule_id>", methods=["DELETE"])
def delete_schedule(schedule_id):
    session = get_session()
    schedule = session.query(Schedule).get(schedule_id)
    if not schedule:
        session.close()
        return jsonify({"error": "Schedule not found"}), 404
    session.delete(schedule)
    session.commit()
    session.close()
    return jsonify({"message": "Deleted"}), 200


# ---------------------------------------------------------------------------
# REST API — User Reports (crowdsource)
# ---------------------------------------------------------------------------

@app.route("/api/report", methods=["POST"])
def submit_report():
    session = get_session()
    body = request.get_json(force=True)

    room_id = body.get("room_id")
    reported_status = body.get("reported_status")

    if not room_id or reported_status not in ("occupied", "vacant"):
        session.close()
        return jsonify({"error": "Invalid report"}), 400

    room = session.query(Room).get(room_id)
    if not room:
        session.close()
        return jsonify({"error": "Room not found"}), 404

    report = UserReport(
        room_id=room_id,
        reported_status=reported_status,
        reporter_name=body.get("reporter_name", "Anonymous"),
        notes=body.get("notes", ""),
    )
    session.add(report)

    # Auto-update room status based on user report
    room.current_status = reported_status
    room.last_updated = datetime.utcnow()
    session.add(
        StatusHistory(
            room_id=room.id,
            status=reported_status,
            changed_by="user",
        )
    )

    session.commit()
    data = report.to_dict()
    session.close()
    return jsonify(data), 201


@app.route("/api/reports", methods=["GET"])
def get_reports():
    session = get_session()
    reports = (
        session.query(UserReport)
        .order_by(UserReport.timestamp.desc())
        .limit(50)
        .all()
    )
    data = [r.to_dict() for r in reports]
    session.close()
    return jsonify(data)


# ---------------------------------------------------------------------------
# REST API — Statistics
# ---------------------------------------------------------------------------

@app.route("/api/stats", methods=["GET"])
def get_stats():
    session = get_session()
    rooms = session.query(Room).all()
    total = len(rooms)
    vacant = sum(1 for r in rooms if r.current_status == "vacant")
    occupied = sum(1 for r in rooms if r.current_status == "occupied")
    maintenance = sum(1 for r in rooms if r.current_status == "maintenance")

    # By building
    buildings = {}
    for r in rooms:
        if r.building not in buildings:
            buildings[r.building] = {"total": 0, "vacant": 0, "occupied": 0, "maintenance": 0}
        buildings[r.building]["total"] += 1
        buildings[r.building][r.current_status] += 1

    # By room type
    room_types = {}
    for r in rooms:
        if r.room_type not in room_types:
            room_types[r.room_type] = {"total": 0, "vacant": 0, "occupied": 0, "maintenance": 0}
        room_types[r.room_type]["total"] += 1
        room_types[r.room_type][r.current_status] += 1

    # By floor
    floors = {}
    for r in rooms:
        key = f"{r.building} - Floor {r.floor}"
        if key not in floors:
            floors[key] = {"total": 0, "vacant": 0, "occupied": 0, "maintenance": 0}
        floors[key]["total"] += 1
        floors[key][r.current_status] += 1

    session.close()
    return jsonify({
        "total": total,
        "vacant": vacant,
        "occupied": occupied,
        "maintenance": maintenance,
        "utilization_rate": round(occupied / total * 100, 1) if total else 0,
        "by_building": buildings,
        "by_room_type": room_types,
        "by_floor": floors,
    })


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()

    # Start background scheduler
    scheduler_thread = threading.Thread(target=auto_update_status, daemon=True)
    scheduler_thread.start()
    print("[OK] Background scheduler started")

    print("[OK] Server running at http://localhost:5000")
    app.run(debug=False, port=5000)
