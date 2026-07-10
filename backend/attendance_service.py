"""Attendance business logic — duplicate prevention, queries, manual ops."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from db import attendance_col, students_col, student_registrations_col


def mark_attendance(
    student_id: str, course_id: str, date: Optional[str] = None, time: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Auto-mark a student as Present for the given course today.

    Returns the inserted record dict, or None if a duplicate already exists
    (one-record-per-student-per-course-per-day rule).
    """
    now = datetime.utcnow()
    record = {
        "student_id": student_id,
        "course_id": course_id,
        "date": date or now.strftime("%Y-%m-%d"),
        "time": time or now.strftime("%H:%M:%S"),
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


def auto_fill_past_absents():
    """Find past dates where class was held (attendance exists) and automatically
    add 'Absent' records for registered students who did not attend.
    """
    try:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        # Find all distinct (course_id, date) in attendance_col where date < today_str
        pipeline = [
            {"$match": {"date": {"$lt": today_str}}},
            {"$group": {"_id": {"course_id": "$course_id", "date": "$date"}}}
        ]
        active_slots = list(attendance_col.aggregate(pipeline))

        for slot in active_slots:
            course_id = slot["_id"]["course_id"]
            date = slot["_id"]["date"]

            # Find all students registered in this course
            regs = list(student_registrations_col.find({"course_ids": course_id}))
            registered_student_ids = [r["student_id"] for r in regs]

            # Find existing records for this slot
            existing_recs = list(attendance_col.find(
                {"course_id": course_id, "date": date},
                {"student_id": 1, "_id": 0}
            ))
            existing_student_ids = {r["student_id"] for r in existing_recs}

            # Find missing students
            missing_student_ids = [sid for sid in registered_student_ids if sid not in existing_student_ids]

            if missing_student_ids:
                docs_to_insert = []
                for sid in missing_student_ids:
                    docs_to_insert.append({
                        "student_id": sid,
                        "course_id": course_id,
                        "date": date,
                        "time": "00:00:00",
                        "status": "Absent",
                        "source": "auto-absent"
                    })
                try:
                    attendance_col.insert_many(docs_to_insert, ordered=False)
                except Exception:
                    pass
    except Exception as e:
        print("Error auto-filling past absents:", e)


def query_attendance(
    date: Optional[str] = None,
    course_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    # Auto-fill past absents dynamically
    auto_fill_past_absents()
    
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
