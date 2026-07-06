"""Attendance business logic — duplicate prevention, queries, manual ops."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from db import attendance_col, students_col


def mark_attendance(student_id: str, course_id: str) -> Optional[Dict[str, Any]]:
    """Auto-mark a student as Present for the given course today.

    Returns the inserted record dict, or None if a duplicate already exists
    (one-record-per-student-per-course-per-day rule).
    """
    now = datetime.utcnow()
    record = {
        "student_id": student_id,
        "course_id": course_id,
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "status": "Present",
        "source": "auto",
    }
    try:
        result = attendance_col.insert_one(record)
        record["_id"] = str(result.inserted_id)
        return record
    except DuplicateKeyError:
        return None


def manual_mark(
    student_id: str, course_id: str, date: str, status: str
) -> Dict[str, Any]:
    """Manually mark/override attendance (Present or Absent).

    Upserts on (student_id, course_id, date) so manual entries override
    any prior auto entries for the same slot.
    """
    if status not in ("Present", "Absent"):
        raise ValueError("status must be 'Present' or 'Absent'")
    now = datetime.utcnow()
    filter_q = {
        "student_id": student_id,
        "course_id": course_id,
        "date": date,
    }
    update_doc = {
        "$set": {
            **filter_q,
            "time": now.strftime("%H:%M:%S"),
            "status": status,
            "source": "manual",
        }
    }
    attendance_col.update_one(filter_q, update_doc, upsert=True)
    rec = attendance_col.find_one(filter_q)
    if rec:
        rec["_id"] = str(rec["_id"])
    return rec or {}


def update_status(record_id: str, status: str) -> bool:
    if status not in ("Present", "Absent"):
        raise ValueError("status must be 'Present' or 'Absent'")
    res = attendance_col.update_one(
        {"_id": ObjectId(record_id)},
        {"$set": {"status": status, "source": "manual"}},
    )
    return res.modified_count > 0


def delete_record(record_id: str) -> bool:
    res = attendance_col.delete_one({"_id": ObjectId(record_id)})
    return res.deleted_count > 0


def query_attendance(
    date: Optional[str] = None,
    course_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if date:
        q["date"] = date
    if course_id:
        q["course_id"] = course_id
    if student_id:
        q["student_id"] = student_id

    records = list(attendance_col.find(q).sort([("date", -1), ("time", -1)]))

    # enrich with student names
    sid_to_name = {
        s["student_id"]: s["name"]
        for s in students_col.find({}, {"student_id": 1, "name": 1})
    }
    for r in records:
        r["_id"] = str(r["_id"])
        r["student_name"] = sid_to_name.get(r["student_id"], "Unknown")
    return records
