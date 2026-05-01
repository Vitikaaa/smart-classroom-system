"""
Database models for Smart Classroom Availability System.
Uses SQLAlchemy ORM with SQLite backend.
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

Base = declarative_base()


class Room(Base):
    """Represents a classroom, lab, or seminar hall."""
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    building = Column(String(100), nullable=False)
    floor = Column(Integer, nullable=False)
    capacity = Column(Integer, nullable=False, default=40)
    room_type = Column(String(50), nullable=False, default="classroom")  # classroom, lab, seminar_hall
    current_status = Column(String(20), nullable=False, default="vacant")  # occupied, vacant, maintenance
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    schedules = relationship("Schedule", back_populates="room", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="room", cascade="all, delete-orphan")
    user_reports = relationship("UserReport", back_populates="room", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "building": self.building,
            "floor": self.floor,
            "capacity": self.capacity,
            "room_type": self.room_type,
            "current_status": self.current_status,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }


class Schedule(Base):
    """Timetable entry linking a room to a class session."""
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    day_of_week = Column(String(10), nullable=False)  # Monday, Tuesday, ...
    start_time = Column(String(5), nullable=False)  # HH:MM (24-hr)
    end_time = Column(String(5), nullable=False)
    subject = Column(String(150), nullable=False)
    faculty = Column(String(100), nullable=True)
    section = Column(String(20), nullable=True)

    room = relationship("Room", back_populates="schedules")

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "room_name": self.room.name if self.room else None,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "subject": self.subject,
            "faculty": self.faculty,
            "section": self.section,
        }


class StatusHistory(Base):
    """Audit log of room status changes."""
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    status = Column(String(20), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    changed_by = Column(String(50), nullable=False, default="system")  # admin, system, user

    room = relationship("Room", back_populates="status_history")

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "room_name": self.room.name if self.room else None,
            "status": self.status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "changed_by": self.changed_by,
        }


class UserReport(Base):
    """Crowdsourced room status report from a user."""
    __tablename__ = "user_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    reported_status = Column(String(20), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    reporter_name = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    room = relationship("Room", back_populates="user_reports")

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "room_name": self.room.name if self.room else None,
            "reported_status": self.reported_status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "reporter_name": self.reporter_name,
            "notes": self.notes,
        }


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

DATABASE_URL = "sqlite:///smart_classroom.db"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    """Create all tables."""
    Base.metadata.create_all(engine)


def get_session():
    """Return a new database session."""
    return SessionLocal()
