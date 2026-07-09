// Frontend API service talking to Flask backend.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function makeRequest(path, options = {}) {
  const token = localStorage.getItem("smartattend.token");
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // POST /api/login
  async login(username, password) {
    const data = await makeRequest("/api/login", {
      method: "POST",
      body: { username, password },
    });
    localStorage.setItem("smartattend.token", data.token);
    localStorage.setItem("smartattend.session", JSON.stringify(data.user));
    return data.user;
  },

  // POST /api/register-user — faculty self-registration
  async registerFaculty(input) {
    await makeRequest("/api/register-user", {
      method: "POST",
      body: input,
    });
  },

  async logout() {
    localStorage.removeItem("smartattend.token");
    localStorage.removeItem("smartattend.session");
  },

  session() {
    try {
      const raw = localStorage.getItem("smartattend.session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // POST /api/register-student  (ADMIN only)
  async registerStudent(s) {
    return await makeRequest("/api/register-student", {
      method: "POST",
      body: s,
    });
  },

  async listStudents() {
    return await makeRequest("/api/students?include_encodings=true");
  },

  async removeStudent(student_id) {
    return await makeRequest(`/api/students/${student_id}`, {
      method: "DELETE",
    });
  },

  async resetStudentPassword(student_id, newPassword = "") {
    return await makeRequest(`/api/students/${student_id}/reset-password`, {
      method: "POST",
      body: { password: newPassword },
    });
  },

  // POST /api/mark-attendance (called by the live capture loop)
  async markAttendance(student_id, course_id) {
    try {
      return await makeRequest("/api/mark-attendance", {
        method: "POST",
        body: { student_id, course_id },
      });
    } catch (e) {
      // Return null on duplicate or error (following the original frontend contract)
      return null;
    }
  },

  // POST /api/manual-attendance — admin/faculty marks Present/Absent by hand
  async manualMark(student_id, course_id, date, status) {
    return await makeRequest("/api/manual-attendance", {
      method: "POST",
      body: { student_id, course_id, date, status },
    });
  },

  // PATCH /api/attendance/:id — change status (Present <-> Absent)
  async updateAttendanceStatus(id, status) {
    return await makeRequest(`/api/attendance/${id}`, {
      method: "PATCH",
      body: { status },
    });
  },

  // DELETE /api/attendance/:id
  async deleteAttendance(id) {
    return await makeRequest(`/api/attendance/${id}`, {
      method: "DELETE",
    });
  },

  // GET /api/attendance?date=&course_id=
  async getAttendance(filters) {
    const params = new URLSearchParams();
    if (filters?.date) params.append("date", filters.date);
    if (filters?.course_id) params.append("course_id", filters.course_id);
    if (filters?.student_id) params.append("student_id", filters.student_id);

    const query = params.toString() ? `?${params.toString()}` : "";
    return await makeRequest(`/api/attendance${query}`);
  },

  async registerStudentUser(input) {
    return await makeRequest("/api/register-user", {
      method: "POST",
      body: { ...input, role: "STUDENT" },
    });
  },

  async getStudentProfile(student_id) {
    const query = student_id ? `?student_id=${student_id}` : "";
    return await makeRequest(`/api/students/profile${query}`);
  },

  async listCourses() {
    return await makeRequest("/api/courses");
  },

  async listFaculties() {
    return await makeRequest("/api/faculties");
  },

  async resetFacultyPassword(username, newPassword = "") {
    return await makeRequest(`/api/faculties/${username}/reset-password`, {
      method: "POST",
      body: { password: newPassword },
    });
  },

  async removeFaculty(username) {
    return await makeRequest(`/api/faculties/${username}`, {
      method: "DELETE",
    });
  },

  async saveCourse(data) {
    return await makeRequest("/api/courses", {
      method: "POST",
      body: data,
    });
  },

  async removeCourse(course_id) {
    return await makeRequest(`/api/courses/${course_id}`, {
      method: "DELETE",
    });
  },
};