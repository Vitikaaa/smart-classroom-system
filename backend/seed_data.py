"""
Seed the database with sample rooms and timetable data.
Run once:  python seed_data.py
"""

from models import init_db, get_session, Room, Schedule

ROOMS = [
    # Building A — Main Academic Block
    {"name": "Room 101", "building": "Block A", "floor": 1, "capacity": 60, "room_type": "classroom"},
    {"name": "Room 102", "building": "Block A", "floor": 1, "capacity": 60, "room_type": "classroom"},
    {"name": "Room 103", "building": "Block A", "floor": 1, "capacity": 40, "room_type": "classroom"},
    {"name": "Room 201", "building": "Block A", "floor": 2, "capacity": 60, "room_type": "classroom"},
    {"name": "Room 202", "building": "Block A", "floor": 2, "capacity": 60, "room_type": "classroom"},
    {"name": "Room 203", "building": "Block A", "floor": 2, "capacity": 40, "room_type": "classroom"},
    {"name": "Room 301", "building": "Block A", "floor": 3, "capacity": 60, "room_type": "classroom"},
    {"name": "Room 302", "building": "Block A", "floor": 3, "capacity": 40, "room_type": "classroom"},
    {"name": "Seminar Hall A", "building": "Block A", "floor": 3, "capacity": 150, "room_type": "seminar_hall"},

    # Building B — Labs & Additional Block
    {"name": "CS Lab 1", "building": "Block B", "floor": 1, "capacity": 40, "room_type": "lab"},
    {"name": "CS Lab 2", "building": "Block B", "floor": 1, "capacity": 40, "room_type": "lab"},
    {"name": "CS Lab 3", "building": "Block B", "floor": 2, "capacity": 35, "room_type": "lab"},
    {"name": "Room B201", "building": "Block B", "floor": 2, "capacity": 50, "room_type": "classroom"},
    {"name": "Room B202", "building": "Block B", "floor": 2, "capacity": 50, "room_type": "classroom"},
    {"name": "Seminar Hall B", "building": "Block B", "floor": 3, "capacity": 200, "room_type": "seminar_hall"},
    {"name": "Conference Room", "building": "Block B", "floor": 3, "capacity": 30, "room_type": "seminar_hall"},
]

# Sample timetable — Monday to Friday
SCHEDULES = [
    # Room 101
    {"room": "Room 101", "day": "Monday",    "start": "09:00", "end": "10:00", "subject": "Data Structures",        "faculty": "Dr. Sharma",   "section": "CSE-A"},
    {"room": "Room 101", "day": "Monday",    "start": "10:00", "end": "11:00", "subject": "Operating Systems",      "faculty": "Dr. Reddy",    "section": "CSE-A"},
    {"room": "Room 101", "day": "Monday",    "start": "14:00", "end": "15:00", "subject": "Computer Networks",      "faculty": "Prof. Kumar",  "section": "CSE-B"},
    {"room": "Room 101", "day": "Tuesday",   "start": "09:00", "end": "10:00", "subject": "DBMS",                   "faculty": "Dr. Patel",    "section": "CSE-A"},
    {"room": "Room 101", "day": "Tuesday",   "start": "11:00", "end": "12:00", "subject": "Software Engineering",   "faculty": "Prof. Singh",  "section": "CSE-A"},
    {"room": "Room 101", "day": "Wednesday", "start": "09:00", "end": "10:00", "subject": "Data Structures",        "faculty": "Dr. Sharma",   "section": "CSE-A"},
    {"room": "Room 101", "day": "Wednesday", "start": "14:00", "end": "16:00", "subject": "Mini Project",           "faculty": "Dr. Reddy",    "section": "CSE-A"},
    {"room": "Room 101", "day": "Thursday",  "start": "10:00", "end": "11:00", "subject": "Operating Systems",      "faculty": "Dr. Reddy",    "section": "CSE-A"},
    {"room": "Room 101", "day": "Friday",    "start": "09:00", "end": "10:00", "subject": "Computer Networks",      "faculty": "Prof. Kumar",  "section": "CSE-B"},
    {"room": "Room 101", "day": "Friday",    "start": "11:00", "end": "12:00", "subject": "DBMS",                   "faculty": "Dr. Patel",    "section": "CSE-A"},

    # Room 102
    {"room": "Room 102", "day": "Monday",    "start": "09:00", "end": "10:00", "subject": "Machine Learning",       "faculty": "Dr. Gupta",    "section": "CSE-B"},
    {"room": "Room 102", "day": "Monday",    "start": "11:00", "end": "12:00", "subject": "Cloud Computing",        "faculty": "Prof. Jain",   "section": "CSE-B"},
    {"room": "Room 102", "day": "Tuesday",   "start": "14:00", "end": "15:00", "subject": "Machine Learning",       "faculty": "Dr. Gupta",    "section": "CSE-B"},
    {"room": "Room 102", "day": "Wednesday", "start": "10:00", "end": "11:00", "subject": "Cloud Computing",        "faculty": "Prof. Jain",   "section": "CSE-B"},
    {"room": "Room 102", "day": "Thursday",  "start": "09:00", "end": "11:00", "subject": "Seminar",                "faculty": "Dr. Gupta",    "section": "CSE-B"},
    {"room": "Room 102", "day": "Friday",    "start": "10:00", "end": "12:00", "subject": "Project Work",           "faculty": "Prof. Jain",   "section": "CSE-B"},

    # Room 201
    {"room": "Room 201", "day": "Monday",    "start": "10:00", "end": "11:00", "subject": "Discrete Mathematics",   "faculty": "Dr. Rao",      "section": "CSE-C"},
    {"room": "Room 201", "day": "Monday",    "start": "14:00", "end": "16:00", "subject": "Workshop",               "faculty": "Prof. Das",    "section": "CSE-C"},
    {"room": "Room 201", "day": "Tuesday",   "start": "09:00", "end": "10:00", "subject": "Algorithms",             "faculty": "Dr. Rao",      "section": "CSE-C"},
    {"room": "Room 201", "day": "Wednesday", "start": "11:00", "end": "12:00", "subject": "Discrete Mathematics",   "faculty": "Dr. Rao",      "section": "CSE-C"},
    {"room": "Room 201", "day": "Thursday",  "start": "14:00", "end": "15:00", "subject": "Algorithms",             "faculty": "Dr. Rao",      "section": "CSE-C"},
    {"room": "Room 201", "day": "Friday",    "start": "09:00", "end": "11:00", "subject": "Lab Practice",           "faculty": "Prof. Das",    "section": "CSE-C"},

    # CS Lab 1
    {"room": "CS Lab 1", "day": "Monday",    "start": "14:00", "end": "16:00", "subject": "DS Lab",                 "faculty": "Dr. Sharma",   "section": "CSE-A"},
    {"room": "CS Lab 1", "day": "Tuesday",   "start": "09:00", "end": "11:00", "subject": "OS Lab",                 "faculty": "Dr. Reddy",    "section": "CSE-A"},
    {"room": "CS Lab 1", "day": "Wednesday", "start": "14:00", "end": "16:00", "subject": "CN Lab",                 "faculty": "Prof. Kumar",  "section": "CSE-B"},
    {"room": "CS Lab 1", "day": "Thursday",  "start": "09:00", "end": "11:00", "subject": "DBMS Lab",               "faculty": "Dr. Patel",    "section": "CSE-A"},
    {"room": "CS Lab 1", "day": "Friday",    "start": "14:00", "end": "16:00", "subject": "ML Lab",                 "faculty": "Dr. Gupta",    "section": "CSE-B"},

    # CS Lab 2
    {"room": "CS Lab 2", "day": "Monday",    "start": "09:00", "end": "11:00", "subject": "Web Tech Lab",           "faculty": "Prof. Jain",   "section": "CSE-B"},
    {"room": "CS Lab 2", "day": "Tuesday",   "start": "14:00", "end": "16:00", "subject": "Cloud Lab",              "faculty": "Prof. Jain",   "section": "CSE-B"},
    {"room": "CS Lab 2", "day": "Wednesday", "start": "09:00", "end": "11:00", "subject": "SE Lab",                 "faculty": "Prof. Singh",  "section": "CSE-A"},
    {"room": "CS Lab 2", "day": "Thursday",  "start": "14:00", "end": "16:00", "subject": "Project Lab",            "faculty": "Dr. Gupta",    "section": "CSE-B"},

    # Seminar Hall A
    {"room": "Seminar Hall A", "day": "Wednesday", "start": "10:00", "end": "12:00", "subject": "Guest Lecture",     "faculty": "Dean",         "section": "All"},
    {"room": "Seminar Hall A", "day": "Friday",    "start": "14:00", "end": "16:00", "subject": "Department Seminar","faculty": "HOD",          "section": "All"},
]


def seed():
    """Drop existing data and re-seed."""
    init_db()
    session = get_session()

    # Clear existing data
    session.query(Schedule).delete()
    session.query(Room).delete()
    session.commit()

    # Insert rooms
    room_map = {}
    for r in ROOMS:
        room = Room(**r)
        session.add(room)
        session.flush()
        room_map[r["name"]] = room.id

    # Insert schedules
    for s in SCHEDULES:
        room_id = room_map.get(s["room"])
        if room_id is None:
            continue
        schedule = Schedule(
            room_id=room_id,
            day_of_week=s["day"],
            start_time=s["start"],
            end_time=s["end"],
            subject=s["subject"],
            faculty=s["faculty"],
            section=s["section"],
        )
        session.add(schedule)

    session.commit()
    session.close()
    print(f"[OK] Seeded {len(ROOMS)} rooms and {len(SCHEDULES)} schedule entries.")


if __name__ == "__main__":
    seed()
