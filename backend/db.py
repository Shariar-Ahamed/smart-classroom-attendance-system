"""MongoDB connection helpers."""
import os
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "smartattend")

_client = MongoClient(MONGO_URI)
db = _client[DB_NAME]

students_col = db["students"]
attendance_col = db["attendance"]
users_col = db["users"]
courses_col = db["courses"]
faculty_assignments_col = db["faculty_assignments"]
student_registrations_col = db["student_registrations"]

# Ensure useful indexes exist
students_col.create_index([("student_id", ASCENDING)], unique=True)
attendance_col.create_index(
    [("student_id", ASCENDING), ("course_id", ASCENDING), ("date", ASCENDING)],
    unique=True,
)
users_col.create_index([("username", ASCENDING)], unique=True)
courses_col.create_index([("course_id", ASCENDING)], unique=True)
faculty_assignments_col.create_index([("username", ASCENDING), ("department", ASCENDING)], unique=True)
student_registrations_col.create_index([("student_id", ASCENDING), ("semester", ASCENDING)], unique=True)
