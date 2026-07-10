"""Flask REST API for the SmartAttend AI system.

Run:
    pip install -r requirements.txt
    python app.py

Endpoints:
    POST /api/login                  -> { username, password } -> { token, user }
    POST /api/register-student       -> ADMIN: register student & face encoding
    GET  /api/students               -> list registered students (no encodings)
    POST /api/start-attendance       -> start camera & background recognition loop
    POST /api/stop-attendance        -> stop recognition loop
    GET  /api/attendance             -> ?date=YYYY-MM-DD&course_id=CS101
    GET  /api/analytics              -> dashboard KPIs
"""
import base64
import threading
import time
from datetime import datetime
from typing import List

from flask import Flask, jsonify, request
from flask_cors import CORS

from db import students_col, courses_col, users_col, faculty_assignments_col, student_registrations_col
from auth import (
    authenticate,
    make_token,
    register_faculty,
    register_student_user,
    require_auth,
    seed_default_users,
    hash_password,
)
from face_service import (
    average_encodings,
    encode_from_image_bytes,
    encode_from_frame,
    find_best_match,
)
from attendance_service import (
    mark_attendance,
    manual_mark,
    update_status,
    delete_record,
    query_attendance,
)
from camera import CameraStream

app = Flask(__name__)
CORS(app)

seed_default_users()


# ------------------------- Background recognition --------------------------

_recog_thread = None
_recog_stop = threading.Event()
_recog_course = "CS101"


def _recognition_loop():
    """Continuously read frames, detect ALL faces, and mark each one.

    Each frame can contain multiple students standing in front of the
    camera. We:
      1. Detect every face in the frame.
      2. Match each detected face against every enrolled encoding.
      3. Keep only the BEST match per student in this frame
         (so two adjacent boxes can't both claim the same person).
      4. Mark attendance once per unique student per frame; the
         compound unique index (student_id, course_id, date) on the
         `attendance` collection guarantees one record per day.
    """
    cam = CameraStream.instance()
    cam.start()
    while not _recog_stop.is_set():
        frame = cam.read()
        if frame is None:
            time.sleep(0.1)
            continue

        enrolled = [
            (s["student_id"], s["face_encoding"])
            for s in students_col.find({}, {"student_id": 1, "face_encoding": 1})
        ]
        if not enrolled:
            time.sleep(1)
            continue

        # Best match per student in this frame
        best_per_student: dict[str, float] = {}
        for _box, probe in encode_from_frame(frame):
            match = find_best_match(probe, enrolled)
            if match:
                sid, dist = match
                if sid not in best_per_student or dist < best_per_student[sid]:
                    best_per_student[sid] = dist

        for sid in best_per_student:
            mark_attendance(sid, _recog_course)

        time.sleep(0.5)
    cam.stop()


# ------------------------------ Routes -------------------------------------

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    user = authenticate(data.get("username", ""), data.get("password", ""))
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"token": make_token(user["username"], user["role"], user.get("student_id")), "user": user})


@app.route("/api/register-user", methods=["POST"])
def register_user():
    """Public endpoint — lets a new FACULTY or STUDENT member create their account.

    Admin accounts cannot be self-registered (the single fixed admin is
    seeded by `seed_default_users` from auth.py).
    """
    data = request.get_json(force=True) or {}
    role = data.get("role", "FACULTY")
    if role == "STUDENT":
        err = register_student_user(
            username=data.get("username", ""),
            password=data.get("password", ""),
            full_name=data.get("full_name", ""),
            department=data.get("department", ""),
            student_id=data.get("student_id", ""),
            batch=data.get("batch", "2025"),
        )
    else:
        err = register_faculty(
            username=data.get("username", ""),
            password=data.get("password", ""),
            full_name=data.get("full_name", ""),
            department=data.get("department", ""),
            faculty_id=data.get("faculty_id", ""),
        )
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"ok": True}), 201


@app.route("/api/register-student", methods=["POST"])
@require_auth("ADMIN")
def register_student():
    """Accept JSON: { student_id, name, department, batch, face_encoding: [...] }
    OR JSON: { student_id, name, department, batch, images: [base64...] }.
    """
    data = request.get_json(force=True) or {}
    required = ["student_id", "name", "department", "batch"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    face_encoding = data.get("face_encoding")
    if face_encoding:
        if not isinstance(face_encoding, list) or len(face_encoding) != 128:
            return jsonify({"error": "Invalid face_encoding format. Must be a list of 128 floats"}), 400
        avg = face_encoding
    else:
        images = data.get("images")
        if not images:
            return jsonify({"error": "Either face_encoding or images is required"}), 400
        encodings: List[List[float]] = []
        for b64 in images:
            # strip "data:image/...;base64," prefix if present
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            try:
                raw = base64.b64decode(b64)
            except Exception:
                continue
            enc = encode_from_image_bytes(raw)
            if enc:
                encodings.append(enc)
        if len(encodings) < 1:
            return jsonify({"error": "No faces detected in provided images"}), 422
        avg = average_encodings(encodings)

    student_id = data["student_id"].strip().upper()
    name = data["name"].strip()
    department = data["department"].strip()
    batch = data["batch"].strip()
    section = data.get("section", "A").strip().upper()
    semester = data.get("semester", "").strip()

    doc = {
        "student_id": student_id,
        "name": name,
        "department": department,
        "batch": batch,
        "section": section,
        "semester": semester,
        "face_encoding": avg,
        "created_at": datetime.utcnow(),
    }
    
    # 1. Insert into students_col
    try:
        students_col.insert_one(doc)
    except Exception as e:
        return jsonify({"error": str(e)}), 409

    # 2. Automatically generate username and password for the student
    import re
    import random
    import string

    # Base username: s- + first word of name lowercased, alphanumeric. Fallback to student_id.
    first_word = name.split(" ")[0].lower()
    first_word_clean = re.sub(r"[^a-z0-9]", "", first_word)
    
    if not first_word_clean:
        student_id_clean = re.sub(r"[^a-z0-9]", "", student_id.lower())
        base_username = f"s-{student_id_clean}"
    else:
        base_username = f"s-{first_word_clean}"

    candidate_username = base_username
    counter = 1
    while users_col.find_one({"username": candidate_username}):
        candidate_username = f"{base_username}{counter}"
        counter += 1
    username = candidate_username

    # Generate a random 8-character password
    chars = string.ascii_letters + string.digits
    generated_password = "".join(random.choice(chars) for _ in range(8))

    # Insert student user into users_col
    try:
        users_col.insert_one({
            "username": username,
            "password": hash_password(generated_password),
            "plain_password": generated_password,
            "role": "STUDENT",
            "full_name": name,
            "department": department,
            "student_id": student_id,
            "section": section,
            "semester": semester,
            "created_at": datetime.utcnow()
        })
    except Exception as e:
        # If user creation fails, delete student profile to allow re-trying
        students_col.delete_one({"student_id": student_id})
        return jsonify({"error": f"Failed to create user account: {str(e)}"}), 500

    return jsonify({
        "ok": True, 
        "student_id": student_id,
        "username": username,
        "password": generated_password
    }), 201


@app.route("/api/students", methods=["GET"])
@require_auth("ADMIN", "FACULTY")
def list_students():
    include_enc = request.args.get("include_encodings", "false").lower() == "true"
    course_id = request.args.get("course_id", "").strip()
    
    projection = {"_id": 0}
    if not include_enc:
        projection["face_encoding"] = 0

    query = {}
    if course_id:
        regs = list(student_registrations_col.find({"course_ids": course_id}))
        registered_student_ids = [r["student_id"] for r in regs]
        query["student_id"] = {"$in": registered_student_ids}

    is_admin = (request.user.get("role") == "ADMIN")
    students = list(students_col.find(query, projection))
    for s in students:
        if isinstance(s.get("created_at"), datetime):
            s["created_at"] = s["created_at"].isoformat()
        
        # Look up username from users_col using student_id (ADMIN only)
        if is_admin:
            user_doc = users_col.find_one({"student_id": s["student_id"]})
            if user_doc:
                s["username"] = user_doc["username"]
                s["plain_password"] = user_doc.get("plain_password", "Encrypted/Hashed")
            else:
                s["username"] = None
                s["plain_password"] = None
        else:
            s["username"] = None
            s["plain_password"] = None
    return jsonify(students)


@app.route("/api/students/<student_id>", methods=["DELETE"])
@require_auth("ADMIN")
def delete_student(student_id):
    """Delete a student and their face encoding from MongoDB."""
    res = students_col.delete_one({"student_id": student_id})
    if res.deleted_count == 0:
        return jsonify({"error": "Student not found"}), 404
    # Also delete associated user account
    users_col.delete_one({"student_id": student_id})
    return jsonify({"ok": True})


@app.route("/api/students/<student_id>/reset-password", methods=["POST"])
@require_auth("ADMIN")
def reset_student_password(student_id):
    student_id = student_id.strip().upper()
    student = students_col.find_one({"student_id": student_id})
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    data = request.get_json(force=True) or {}
    custom_password = data.get("password", "").strip()

    import random
    import string
    import re

    # 1. Generate or retrieve username
    user_doc = users_col.find_one({"student_id": student_id})
    if user_doc:
        username = user_doc["username"]
    else:
        # Generate new unique username starting with "s-"
        name = student["name"].strip()
        first_word = name.split(" ")[0].lower()
        first_word_clean = re.sub(r"[^a-z0-9]", "", first_word)
        if not first_word_clean:
            student_id_clean = re.sub(r"[^a-z0-9]", "", student_id.lower())
            base_username = f"s-{student_id_clean}"
        else:
            base_username = f"s-{first_word_clean}"

        candidate_username = base_username
        counter = 1
        while users_col.find_one({"username": candidate_username}):
            candidate_username = f"{base_username}{counter}"
            counter += 1
        username = candidate_username

    # 2. Determine password
    if custom_password:
        password_to_save = custom_password
    else:
        # Generate random 8-character password
        chars = string.ascii_letters + string.digits
        password_to_save = "".join(random.choice(chars) for _ in range(8))

    # 3. Create or Update user account
    hashed = hash_password(password_to_save)
    if user_doc:
        users_col.update_one(
            {"student_id": student_id},
            {"$set": {
                "password": hashed,
                "plain_password": password_to_save,
                "username": username
            }}
        )
    else:
        users_col.insert_one({
            "username": username,
            "password": hashed,
            "plain_password": password_to_save,
            "role": "STUDENT",
            "full_name": student["name"],
            "department": student["department"],
            "student_id": student_id,
            "created_at": datetime.utcnow()
        })

    return jsonify({
        "ok": True,
        "username": username,
        "password": password_to_save
    })


@app.route("/api/faculties/<username>/reset-password", methods=["POST"])
@require_auth("ADMIN")
def reset_faculty_password(username):
    username = username.strip()
    user_doc = users_col.find_one({"username": username, "role": "FACULTY"})
    if not user_doc:
        return jsonify({"error": "Faculty member not found"}), 404

    data = request.get_json(force=True) or {}
    custom_password = data.get("password", "").strip()

    import random
    import string

    if custom_password:
        password_to_save = custom_password
    else:
        # Generate random 8-character password
        chars = string.ascii_letters + string.digits
        password_to_save = "".join(random.choice(chars) for _ in range(8))

    hashed = hash_password(password_to_save)
    users_col.update_one(
        {"username": username, "role": "FACULTY"},
        {"$set": {
            "password": hashed,
            "plain_password": password_to_save
        }}
    )

    return jsonify({
        "ok": True,
        "username": username,
        "password": password_to_save
    })


@app.route("/api/faculties/<username>", methods=["DELETE"])
@require_auth("ADMIN")
def delete_faculty(username):
    """Delete a faculty user account from MongoDB."""
    username = username.strip()
    res = users_col.delete_one({"username": username, "role": "FACULTY"})
    if res.deleted_count == 0:
        return jsonify({"error": "Faculty member not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/students/profile", methods=["GET"])
@require_auth("ADMIN", "FACULTY", "STUDENT")
def get_student_profile():
    payload = request.user  # type: ignore
    role = payload.get("role")
    
    if role == "STUDENT":
        student_id = payload.get("student_id")
    else:
        student_id = request.args.get("student_id")
        
    if not student_id:
        return jsonify({"error": "student_id is required"}), 400
        
    student = students_col.find_one({"student_id": student_id}, {"_id": 0})
    if not student:
        return jsonify({"error": "Student profile not found"}), 404
        
    face_enc = student.pop("face_encoding", None)
    student["face_registered"] = bool(face_enc and len(face_enc) > 0)
    
    if isinstance(student.get("created_at"), datetime):
        student["created_at"] = student["created_at"].isoformat()
    return jsonify(student)


@app.route("/api/mark-attendance", methods=["POST"])
@require_auth("ADMIN", "FACULTY")
def mark_attendance_api():
    data = request.get_json(force=True) or {}
    student_id = data.get("student_id")
    course_id = data.get("course_id")
    date = data.get("date")
    time = data.get("time")
    if not student_id or not course_id:
        return jsonify({"error": "Missing student_id or course_id"}), 400
    rec = mark_attendance(student_id, course_id, date, time)
    if rec is None:
        return jsonify({"error": "Attendance already marked for today"}), 409
    return jsonify(rec), 200


@app.route("/api/start-attendance", methods=["POST"])
@require_auth("FACULTY")
def start_attendance():
    global _recog_thread, _recog_course
    data = request.get_json(silent=True) or {}
    _recog_course = data.get("course_id", "CS101")

    if _recog_thread and _recog_thread.is_alive():
        return jsonify({"ok": True, "status": "already_running", "course_id": _recog_course})

    _recog_stop.clear()
    _recog_thread = threading.Thread(target=_recognition_loop, daemon=True)
    _recog_thread.start()
    return jsonify({"ok": True, "status": "started", "course_id": _recog_course})


@app.route("/api/stop-attendance", methods=["POST"])
@require_auth("FACULTY")
def stop_attendance():
    _recog_stop.set()
    return jsonify({"ok": True, "status": "stopping"})


@app.route("/api/attendance", methods=["GET"])
@require_auth("ADMIN", "FACULTY", "STUDENT")
def get_attendance():
    payload = request.user  # type: ignore
    role = payload.get("role")
    student_id = request.args.get("student_id")
    
    # If the user is a STUDENT, they can ONLY query their own student_id
    if role == "STUDENT":
        student_id = payload.get("student_id")
        if not student_id:
            return jsonify({"error": "Student account not linked to a student profile"}), 400

    date = request.args.get("date")
    course_id = request.args.get("course_id")
    return jsonify(query_attendance(date, course_id, student_id))


@app.route("/api/manual-attendance", methods=["POST"])
@require_auth("FACULTY")
def manual_attendance():
    """Manually mark a student Present/Absent for a (course, date)."""
    data = request.get_json(force=True) or {}
    required = ["student_id", "course_id", "date", "status"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400
    try:
        rec = manual_mark(
            data["student_id"], data["course_id"], data["date"], data["status"]
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(rec), 200


@app.route("/api/attendance/<record_id>", methods=["PATCH"])
@require_auth("ADMIN", "FACULTY")
def patch_attendance(record_id):
    """Update an existing attendance record's status."""
    data = request.get_json(force=True) or {}
    status = data.get("status")
    if not status:
        return jsonify({"error": "status is required"}), 400
    try:
        ok = update_status(record_id, status)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    if not ok:
        return jsonify({"error": "Record not found or unchanged"}), 404
    return jsonify({"ok": True})


@app.route("/api/attendance/<record_id>", methods=["DELETE"])
@require_auth("ADMIN", "FACULTY")
def delete_attendance(record_id):
    ok = delete_record(record_id)
    if not ok:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/analytics", methods=["GET"])
@require_auth("ADMIN", "FACULTY")
def analytics():
    today = datetime.utcnow().strftime("%Y-%m-%d")
    total_students = students_col.count_documents({})
    todays = query_attendance(date=today)
    present_today = len({r["student_id"] for r in todays})
    absent_today = max(0, total_students - present_today)
    pct = round((present_today / total_students) * 100) if total_students else 0
    return jsonify(
        {
            "total_students": total_students,
            "present_today": present_today,
            "absent_today": absent_today,
            "attendance_percent": pct,
        }
    )


@app.route("/api/faculties", methods=["GET"])
@require_auth("ADMIN")
def get_faculties():
    facs = list(users_col.find({"role": "FACULTY"}, {"_id": 0, "password": 0}))
    return jsonify(facs)


DEFAULT_COURSES = [
    { "course_id": "CS101", "name": "Intro to Computer Science", "total_classes": 20, "department": "Computer Science & Engineering" },
    { "course_id": "CS210", "name": "Data Structures", "total_classes": 20, "department": "Computer Science & Engineering" },
    { "course_id": "CS305", "name": "Operating Systems", "total_classes": 20, "department": "Computer Science & Engineering" },
    { "course_id": "AI401", "name": "Artificial Intelligence", "total_classes": 20, "department": "Computer Science & Engineering" },
]

@app.route("/api/courses", methods=["GET"])
@require_auth("ADMIN", "FACULTY", "STUDENT")
def get_courses():
    user = request.user
    role = user.get("role")
    username = user.get("sub")
    dept_filter = request.args.get("department", "").strip()

    if role == "ADMIN":
        courses_col.update_many({"department": {"$exists": False}}, {"$set": {"department": "Computer Science & Engineering"}})
        query = {}
        if dept_filter:
            query["department"] = dept_filter
        courses = list(courses_col.find(query, {"_id": 0}))
        if not courses and not dept_filter:
            courses_col.insert_many(DEFAULT_COURSES)
            courses = list(courses_col.find({}, {"_id": 0}))
        return jsonify(courses)

    elif role == "FACULTY":
        assignments = list(faculty_assignments_col.find({"username": username}, {"_id": 0}))
        assigned_course_ids = []
        for ass in assignments:
            assigned_course_ids.extend(ass.get("course_ids", []))
        assigned_course_ids = list(set(assigned_course_ids))
        courses = list(courses_col.find({"course_id": {"$in": assigned_course_ids}}, {"_id": 0}))
        return jsonify(courses)

    elif role == "STUDENT":
        student_id = user.get("student_id")
        if not student_id:
            u_doc = users_col.find_one({"username": username})
            if u_doc:
                student_id = u_doc.get("student_id")
        
        if not student_id:
            return jsonify([]), 200

        registrations = list(student_registrations_col.find({"student_id": student_id}, {"_id": 0}))
        registered_course_ids = []
        for reg in registrations:
            registered_course_ids.extend(reg.get("course_ids", []))
        registered_course_ids = list(set(registered_course_ids))
        courses = list(courses_col.find({"course_id": {"$in": registered_course_ids}}, {"_id": 0}))
        
        # Populate faculty_name for the student's courses
        for c in courses:
            c_id = c["course_id"]
            fac_assign = faculty_assignments_col.find_one({"course_ids": c_id})
            if fac_assign:
                fac_user = users_col.find_one({"username": fac_assign["username"], "role": "FACULTY"})
                if fac_user:
                    c["faculty_name"] = fac_user.get("full_name", "")
                else:
                    c["faculty_name"] = fac_assign["username"]
            else:
                c["faculty_name"] = "Unassigned"
        return jsonify(courses)

    return jsonify([]), 200


@app.route("/api/courses", methods=["POST"])
@require_auth("ADMIN")
def save_course():
    data = request.get_json(force=True) or {}
    course_id = data.get("course_id", "").strip()
    name = data.get("name", "").strip()
    department = data.get("department", "").strip()
    try:
        total_classes = int(data.get("total_classes", 20))
    except ValueError:
        total_classes = 20

    if not course_id or not name or not department:
        return jsonify({"error": "Course ID, Name, and Department are required."}), 400

    courses_col.update_one(
        {"course_id": course_id},
        {
            "$set": {
                "course_id": course_id,
                "name": name,
                "department": department,
                "total_classes": total_classes,
            }
        },
        upsert=True
    )
    return jsonify({"ok": True}), 200


@app.route("/api/courses/<course_id>", methods=["DELETE"])
@require_auth("ADMIN")
def delete_course(course_id):
    res = courses_col.delete_one({"course_id": course_id})
    if res.deleted_count == 0:
        return jsonify({"error": "Course not found"}), 404
    return jsonify({"ok": True})


@app.route("/api/assignments/faculty", methods=["GET"])
@require_auth("ADMIN")
def get_faculty_assignments():
    assignments = list(faculty_assignments_col.find({}, {"_id": 0}))
    return jsonify(assignments)


@app.route("/api/assignments/faculty", methods=["POST"])
@require_auth("ADMIN")
def save_faculty_assignment():
    data = request.get_json(force=True) or {}
    username = data.get("username", "").strip()
    department = data.get("department", "").strip()
    course_ids = data.get("course_ids", [])

    if not username or not department:
        return jsonify({"error": "Faculty username and Department are required."}), 400

    faculty_assignments_col.update_one(
        {"username": username, "department": department},
        {
            "$set": {
                "username": username,
                "department": department,
                "course_ids": course_ids
            }
        },
        upsert=True
    )
    return jsonify({"ok": True}), 200


@app.route("/api/assignments/student", methods=["GET"])
@require_auth("ADMIN")
def get_student_registrations():
    student_id = request.args.get("student_id", "").strip().upper()
    semester = request.args.get("semester", "").strip()
    
    query = {}
    if student_id:
        query["student_id"] = student_id
    if semester:
        query["semester"] = semester
        
    regs = list(student_registrations_col.find(query, {"_id": 0}))
    return jsonify(regs)


@app.route("/api/assignments/student", methods=["POST"])
@require_auth("ADMIN")
def save_student_registration():
    data = request.get_json(force=True) or {}
    student_id = data.get("student_id", "").strip().upper()
    department = data.get("department", "").strip()
    semester = data.get("semester", "").strip()
    course_ids = data.get("course_ids", [])

    if not student_id or not department or not semester:
        return jsonify({"error": "Student ID, Department, and Semester are required."}), 400

    student_registrations_col.update_one(
        {"student_id": student_id, "semester": semester},
        {
            "$set": {
                "student_id": student_id,
                "department": department,
                "semester": semester,
                "course_ids": course_ids
            }
        },
        upsert=True
    )
    return jsonify({"ok": True}), 200


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "time": datetime.utcnow().isoformat()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
