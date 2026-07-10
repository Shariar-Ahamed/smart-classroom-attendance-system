import { useEffect, useState } from "react";
import CustomSelect from "./CustomSelect";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import { useAuth } from "../context/AuthContext";

export const formatRecordDateTime = (dateStr, timeStr) => {
  if (!dateStr) return { date: "", time: "" };
  const parts = dateStr.split("-");
  const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
  const formattedTime = !timeStr || timeStr === "00:00:00" ? "--" : timeStr;
  return {
    date: formattedDate,
    time: formattedTime
  };
};

export default function AttendanceRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [date, setDate] = useState("");
  const [course, setCourse] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canManage = user?.role === "ADMIN" || user?.role === "FACULTY";

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

  const removeRecord = (id) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteAttendance(confirmDelete);
      setConfirmDelete(null);
      load();
    } catch (err) {
      alert(err.message || "Failed to delete attendance record.");
    }
  };

  const exportCSV = () => {
    const header = "student_id,name,course_id,date,time,status,source\n";
    const body = records
      .map((r) => {
        const formatted = formatRecordDateTime(r.date, r.time);
        return `${r.student_id},${r.student_name},${r.course_id},${formatted.date},${formatted.time},${r.status},${r.source ?? "auto"}`;
      })
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
            <CustomSelect
              value={course}
              onChange={setCourse}
              placeholder="All courses"
              className="min-w-[150px]"
              options={[
                { value: "", label: "All courses" },
                ...courses.map((c) => ({ value: c.course_id, label: c.course_id })),
              ]}
            />
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All status"
              className="min-w-[130px]"
              options={[
                { value: "all", label: "All status" },
                { value: "Present", label: "Present" },
                { value: "Absent", label: "Absent" },
              ]}
            />
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
                  {canManage && <th className="py-2 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const formatted = formatRecordDateTime(r.date, r.time);
                  return (
                    <tr
                      key={r._id}
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
                        {formatted.date}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-xs">
                        {formatted.time}
                      </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold ${
                          r.source === "manual"
                            ? "text-purple-300"
                            : "text-indigo-300"
                        }`}
                      >
                        {r.source ?? "auto"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {canManage ? (
                        editingId === r._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => changeStatus(r._id, "Present")}
                              className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30 transition"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => changeStatus(r._id, "Absent")}
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
                            onClick={() => setEditingId(r._id)}
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
                        )
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full ${
                            r.status === "Present"
                              ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                              : "text-rose-300 bg-rose-500/15 border-rose-500/30"
                          }`}
                        >
                          ● {r.status}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => removeRecord(r._id)}
                          className="text-xs text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/10 px-2 py-1 rounded transition"
                        >
                          Reset
                        </button>
                      </td>
                    )}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Confirm Reset Modal */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Reset Attendance Record"
        message="Are you sure you want to reset this attendance record? This will delete the record, allowing the student to be scanned again or manually re-marked."
        confirmText="Reset"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}