// Lightweight localStorage-backed persistence layer.
// This acts as a stand-in for the Flask + MongoDB backend so that the
// front-end demo is fully functional in the browser.
//
// In production, swap these calls with `fetch("/api/...")` requests to the
// Flask backend (see backend/app.py).

const KEYS = {
  students: "smartattend.students",
  attendance: "smartattend.attendance",
  users: "smartattend.users",
  courses: "smartattend.courses",
  session: "smartattend.session",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ------------------------- Students ------------------------- */

export const studentsStore = {
  list() {
    return read(KEYS.students, []);
  },
  add(student) {
    const all = studentsStore.list();
    if (all.some((s) => s.student_id === student.student_id)) {
      throw new Error(`Student ID ${student.student_id} already exists.`);
    }
    all.push(student);
    write(KEYS.students, all);
  },
  remove(student_id) {
    write(
      KEYS.students,
      studentsStore.list().filter((s) => s.student_id !== student_id),
    );
  },
};

/* ------------------------- Attendance ----------------------- */

export const attendanceStore = {
  list() {
    return read(KEYS.attendance, []);
  },
  add(record) {
    const all = attendanceStore.list();
    // Enforce uniqueness: one record per student per course per day.
    const dup = all.find(
      (r) =>
        r.student_id === record.student_id &&
        r.course_id === record.course_id &&
        r.date === record.date,
    );
    if (dup) return false;
    all.push(record);
    write(KEYS.attendance, all);
    return true;
  },
  /** Upsert: replace the matching (student, course, date) record or insert new. */
  upsert(record) {
    const all = attendanceStore.list();
    const idx = all.findIndex(
      (r) =>
        r.student_id === record.student_id &&
        r.course_id === record.course_id &&
        r.date === record.date,
    );
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...record, id: all[idx].id };
      write(KEYS.attendance, all);
      return all[idx];
    }
    all.push(record);
    write(KEYS.attendance, all);
    return record;
  },
  update(id, patch) {
    const all = attendanceStore.list();
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], ...patch };
    write(KEYS.attendance, all);
  },
  remove(id) {
    write(
      KEYS.attendance,
      attendanceStore.list().filter((r) => r.id !== id),
    );
  },
  clear() {
    write(KEYS.attendance, []);
  },
};

/* ------------------------- Courses -------------------------- */

const DEFAULT_COURSES = [
  { course_id: "CS101", name: "Intro to Computer Science" },
  { course_id: "CS210", name: "Data Structures" },
  { course_id: "CS305", name: "Operating Systems" },
  { course_id: "AI401", name: "Artificial Intelligence" },
];

export const coursesStore = {
  list() {
    const c = read(KEYS.courses, []);
    if (c.length === 0) {
      write(KEYS.courses, DEFAULT_COURSES);
      return DEFAULT_COURSES;
    }
    return c;
  },
};

/* ------------------------- Auth ----------------------------- */

// The single fixed ADMIN account. Documented in README.md — this is the
// ONLY admin and cannot be changed at runtime, cannot be re-registered,
// and cannot be deleted. Faculty members self-register their own
// accounts via the Register page.
//
// In the real backend, this would be seeded once into the `users`
// collection on first start (see backend/auth.py::seed_default_users)
// and faculty self-registration would POST to /api/register-user.
export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "admin@123";

const facultyList = () => read(KEYS.users, []);
const writeFaculty = (list) => write(KEYS.users, list);

export const authStore = {
  /** Login as either the fixed admin OR a registered faculty member. */
  login(username, password) {
    const uname = username.trim();
    // 1) Fixed admin
    if (uname === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const session = { username: ADMIN_USERNAME, role: "ADMIN" };
      write(KEYS.session, session);
      return session;
    }
    // 2) Registered faculty
    const f = facultyList().find(
      (x) => x.username === uname && x.password === password,
    );
    if (!f) return null;
    const session = { username: f.username, role: "FACULTY" };
    write(KEYS.session, session);
    return session;
  },

  /** Faculty self-registration. Throws on validation errors. */
  registerFaculty(input) {
    const username = input.username.trim();
    const full_name = input.full_name.trim();
    const department = input.department.trim();

    if (!username || !input.password || !full_name) {
      throw new Error("Username, full name and password are required.");
    }
    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters.");
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      throw new Error(
        "Username can only contain letters, numbers, dots, dashes and underscores.",
      );
    }
    if (input.password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
      throw new Error(
        "This username is reserved. Please choose a different one.",
      );
    }
    const list = facultyList();
    if (list.some((x) => x.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("This username is already taken.");
    }
    list.push({
      username,
      password: input.password,
      full_name,
      department,
      created_at: new Date().toISOString(),
    });
    writeFaculty(list);
  },

  logout() {
    localStorage.removeItem(KEYS.session);
  },
  session() {
    return read(KEYS.session, null);
  },
};