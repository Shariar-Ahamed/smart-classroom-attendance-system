"""Authentication & RBAC helpers."""
import os
from datetime import datetime, timedelta
from functools import wraps
from typing import Optional

import bcrypt
import jwt
from flask import request, jsonify

from db import users_col, students_col

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-prod")
JWT_ALGO = "HS256"
JWT_TTL_HOURS = 12


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def make_token(username: str, role: str, student_id: Optional[str] = None) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_TTL_HOURS),
    }
    if student_id:
        payload["student_id"] = student_id
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        return None


def authenticate(username: str, password: str) -> Optional[dict]:
    user = users_col.find_one({"username": username})
    if not user or not verify_password(password, user["password"]):
        return None
    res = {"username": user["username"], "role": user["role"]}
    if "student_id" in user:
        res["student_id"] = user["student_id"]
    return res


def require_auth(*allowed_roles: str):
    """Decorator: require a valid Bearer JWT and (optionally) a role."""

    def wrapper(fn):
        @wraps(fn)
        def inner(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid token"}), 401
            payload = decode_token(auth.split(" ", 1)[1])
            if not payload:
                return jsonify({"error": "Invalid or expired token"}), 401
            if allowed_roles and payload.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403
            request.user = payload  # type: ignore[attr-defined]
            return fn(*args, **kwargs)

        return inner

    return wrapper


ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin@123"  # See README.md — fixed, single admin account


def seed_default_users():
    """Seed the single fixed ADMIN account if it does not yet exist.

    Faculty members register themselves via POST /api/register-user.
    """
    if not users_col.find_one({"username": ADMIN_USERNAME}):
        users_col.insert_one(
            {
                "username": ADMIN_USERNAME,
                "password": hash_password(ADMIN_PASSWORD),
                "role": "ADMIN",
            }
        )


def register_faculty(
    username: str,
    password: str,
    full_name: str,
    department: str,
) -> Optional[str]:
    """Self-registration for FACULTY accounts.

    Returns an error string on validation failure, or None on success.
    """
    import re

    username = (username or "").strip()
    full_name = (full_name or "").strip()
    department = (department or "").strip()

    if not username or not password or not full_name:
        return "Username, full name and password are required."
    if len(username) < 3:
        return "Username must be at least 3 characters."
    if not re.fullmatch(r"[a-zA-Z0-9._-]+", username):
        return (
            "Username can only contain letters, numbers, dots, "
            "dashes and underscores."
        )
    if len(password) < 6:
        return "Password must be at least 6 characters."
    if username.lower() == ADMIN_USERNAME.lower():
        return "This username is reserved."
    if users_col.find_one({"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}):
        return "This username is already taken."

    users_col.insert_one(
        {
            "username": username,
            "password": hash_password(password),
            "role": "FACULTY",
            "full_name": full_name,
            "department": department,
            "created_at": datetime.utcnow(),
        }
    )
    return None


def register_student_user(
    username: str,
    password: str,
    full_name: str,
    department: str,
    student_id: str,
    batch: str = "2025",
) -> Optional[str]:
    """Self-registration for STUDENT accounts.

    Validates that the username starts with 's-', creates/links with a
    student profile in students collection, and ensures no duplicate registration.
    """
    import re

    username = (username or "").strip()
    full_name = (full_name or "").strip()
    department = (department or "").strip()
    student_id = (student_id or "").strip()
    batch = (batch or "2025").strip()

    if not username or not password or not full_name or not student_id:
        return "Username, full name, student ID and password are required."
    if not username.startswith("s-"):
        return "Student username must start with 's-'."
    if len(username) < 5:
        return "Username must be at least 5 characters (including 's-')."
    if not re.fullmatch(r"s-[a-zA-Z0-9._-]+", username):
        return (
            "Username can only contain letters, numbers, dots, "
            "dashes and underscores."
        )
    if len(password) < 6:
        return "Password must be at least 6 characters."

    if username.lower() == ADMIN_USERNAME.lower():
        return "This username is reserved."
    if users_col.find_one({"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}):
        return "This username is already taken."
    if users_col.find_one({"student_id": student_id}):
        return "An account has already been registered for this Student ID."

    # Validate student profile exists
    student = students_col.find_one({"student_id": student_id})
    if not student:
        return f"Student ID '{student_id}' is not enrolled in the system. Please ask an Admin to register your face/profile first."

    users_col.insert_one(
        {
            "username": username,
            "password": hash_password(password),
            "role": "STUDENT",
            "full_name": full_name,
            "department": department,
            "student_id": student_id,
            "created_at": datetime.utcnow(),
        }
    )
    return None
