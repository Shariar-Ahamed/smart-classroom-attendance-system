import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function CoursesManager() {
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [totalClasses, setTotalClasses] = useState(20);
  const [facultyUsername, setFacultyUsername] = useState("");

  const loadData = async () => {
    try {
      setError("");
      const cList = await api.listCourses();
      const fList = await api.listFaculties();
      setCourses(cList);
      setFaculties(fList);
    } catch (err) {
      setError(err.message || "Failed to load courses or faculties list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!courseId.trim() || !name.trim()) {
      setError("Course ID and Name are required.");
      return;
    }
    try {
      await api.saveCourse({
        course_id: courseId.trim(),
        name: name.trim(),
        total_classes: Number(totalClasses),
        faculty_username: facultyUsername,
      });
      setSuccess(`✓ Course ${courseId} saved successfully.`);
      // Reset form
      setCourseId("");
      setName("");
      setTotalClasses(20);
      setFacultyUsername("");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete course ${id}? This cannot be undone.`)) return;
    setError("");
    setSuccess("");
    try {
      await api.removeCourse(id);
      setSuccess(`✓ Course ${id} deleted.`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (c) => {
    setCourseId(c.course_id);
    setName(c.name);
    setTotalClasses(c.total_classes);
    setFacultyUsername(c.faculty_username || "");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading courses settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg px-4 py-2">
          {success}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Form: Add/Edit Course */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <span>➕</span> Add / Update Course
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Course ID</label>
              <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="e.g. CS101"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Course Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Intro to Computer Science"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Total Classes</label>
              <input
                type="number"
                value={totalClasses}
                onChange={(e) => setTotalClasses(e.target.value)}
                min={1}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Assigned Faculty (Instructor)</label>
              <select
                value={facultyUsername}
                onChange={(e) => setFacultyUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Not Assigned --</option>
                {faculties.map((f) => (
                  <option key={f.username} value={f.username}>
                    {f.full_name} ({f.username})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 rounded-lg font-medium text-sm text-white shadow-lg transition"
            >
              Save Course
            </button>
          </form>
        </div>

        {/* Right 2 columns: Courses and Faculties list */}
        <div className="md:col-span-2 space-y-6">
          {/* Courses List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <span>📚</span> Classroom Courses
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase font-medium">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Course Name</th>
                    <th className="pb-2 text-center">Total Classes</th>
                    <th className="pb-2">Instructor</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                        No courses created yet. Use the form to add one.
                      </td>
                    </tr>
                  ) : (
                    courses.map((c) => (
                      <tr key={c.course_id} className="hover:bg-slate-800/10">
                        <td className="py-3 font-bold font-mono text-slate-300 text-xs">{c.course_id}</td>
                        <td className="py-3 text-slate-100 font-medium">{c.name}</td>
                        <td className="py-3 text-center text-slate-200">{c.total_classes}</td>
                        <td className="py-3">
                          {c.faculty_name ? (
                            <span className="text-indigo-300 font-medium">
                              👤 {c.faculty_name}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(c)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2.5 py-1 rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.course_id)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Registered Faculty List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <span>🏫</span> Registered Faculties List
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase font-medium">
                    <th className="pb-2">Full Name</th>
                    <th className="pb-2">Username</th>
                    <th className="pb-2">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {faculties.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500 text-xs">
                        No faculty members registered yet.
                      </td>
                    </tr>
                  ) : (
                    faculties.map((f) => (
                      <tr key={f.username} className="hover:bg-slate-800/10 text-slate-300">
                        <td className="py-3 font-semibold text-slate-100">{f.full_name}</td>
                        <td className="py-3 font-mono text-xs text-slate-400">{f.username}</td>
                        <td className="py-3">{f.department}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
