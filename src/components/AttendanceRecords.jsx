import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [date, setDate] = useState("");
  const [course, setCourse] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    let recs = await api.getAttendance({
      date: date || undefined,
      course_id: course || undefined,
    });
    if (statusFilter !== "all") {
      recs = recs.filter((r) => r.status === statusFilter);
    }
    setRecords(recs);
  };

  useEffect(() => {
    (async () => setCourses(await api.listCourses()))();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, course, statusFilter]);

  const changeStatus = async (id, status) => {
    await api.updateAttendanceStatus(id, status);
    setEditingId(null);
    load();
  };

  const removeRecord = async (id) => {
    if (!confirm("Delete this attendance record?")) return;
    await api.deleteAttendance(id);
    load();
  };

  const exportCSV = () => {
    const header = "student_id,name,course_id,date,time,status,source\n";
    const body = records
      .map(
        (r) =>
          `${r.student_id},${r.student_name},${r.course_id},${r.date},${r.time},${r.status},${r.source ?? "auto"}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-100">Attendance Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              GET /api/attendance · {records.length} matching record(s) · click
              status to edit
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_id}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
            <button
              onClick={() => {
                setDate("");
                setCourse("");
                setStatusFilter("all");
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
            >
              Reset
            </button>
            <button
              onClick={exportCSV}
              disabled={records.length === 0}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium disabled:opacity-40 transition"
            >
              ⬇ Export CSV
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-2">📋</div>
            No records match the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2 px-3">Student ID</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Course</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Source</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                      {r.student_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-100 font-medium">
                      {r.student_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-xs">
                      {r.course_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-xs">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-xs">
                      {r.time}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold ${
                          r.source === "manual"
                            ? "text-fuchsia-300"
                            : "text-indigo-300"
                        }`}
                      >
                        {r.source ?? "auto"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {editingId === r.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => changeStatus(r.id, "Present")}
                            className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30 transition"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => changeStatus(r.id, "Absent")}
                            className="px-2 py-0.5 text-xs rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 transition"
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-0.5 text-xs rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingId(r.id)}
                          title="Click to change status"
                          className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full transition hover:brightness-125 ${
                            r.status === "Present"
                              ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                              : "text-rose-300 bg-rose-500/15 border-rose-500/30"
                          }`}
                        >
                          ● {r.status}
                          <span className="opacity-60 ml-0.5">✎</span>
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => removeRecord(r.id)}
                        className="text-xs text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/10 px-2 py-1 rounded transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}