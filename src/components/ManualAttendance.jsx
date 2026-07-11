import { useEffect, useMemo, useState } from "react";
import CustomSelect from "./CustomSelect";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";

/**
 * Manual attendance page.
 *
 * Faculty/Admin can mark each student Present or Absent for a chosen
 * course + date. Mirrors the POST /api/manual-attendance endpoint.
 *
 * The row state is upserted, so manually marking overrides any prior
 * auto-recognition record for the same (student, course, date).
 */
export default function ManualAttendance({ initialCourseId }) {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(initialCourseId || "all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState([]);
  const [q, setQ] = useState("");
  const [savedTick, setSavedTick] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [confirmMarkAllStatus, setConfirmMarkAllStatus] = useState(null);

  const load = async () => {
    if (course === "all") {
      try {
        if (courses.length === 0) return;
        const promises = courses.map((c) => api.listStudents(c.course_id));
        const results = await Promise.all(promises);
        const uniqueStudentsMap = {};
        results.flat().forEach((s) => {
          uniqueStudentsMap[s.student_id] = s;
        });
        setStudents(Object.values(uniqueStudentsMap));
        setRecords(await api.getAttendance({ date }));
      } catch (err) {
        console.error("Failed to load all student records:", err);
      }
    } else {
      if (!course) {
        setStudents([]);
        setRecords([]);
        return;
      }
      setStudents(await api.listStudents(course));
      setRecords(await api.getAttendance({ date, course_id: course }));
    }
  };

  useEffect(() => {
    (async () => {
      const cList = await api.listCourses();
      setCourses(cList);
      if (initialCourseId && cList.some((c) => c.course_id === initialCourseId)) {
        setCourse(initialCourseId);
      }
    })();
  }, [initialCourseId]);

  useEffect(() => {
    if (courses.length > 0 || course !== "all") {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, course, courses]);

  const statusFor = (sid) => {
    if (course === "all") {
      const studentRecs = records.filter((r) => r.student_id === sid);
      if (studentRecs.length === 0) return null;
      const hasPresent = studentRecs.some((r) => r.status === "Present");
      return hasPresent ? "Present" : "Absent";
    } else {
      const r = records.find((r) => r.student_id === sid && r.course_id === course);
      return r ? r.status : null;
    }
  };

  const getCourseAttendanceDetail = (sid) => {
    const studentRecs = records.filter((r) => r.student_id === sid);
    if (studentRecs.length === 0) return "No records today";
    return studentRecs.map((r) => `${r.course_id}: ${r.status}`).join(", ");
  };

  const setStatus = async (s, status) => {
    setBusyId(s.student_id);
    try {
      await api.manualMark(s.student_id, course, date, status);
      await load();
      setSavedTick((t) => t + 1);
    } finally {
      setBusyId(null);
    }
  };

  const markAll = (status) => {
    setConfirmMarkAllStatus(status);
  };

  const handleConfirmMarkAll = async () => {
    if (!confirmMarkAllStatus) return;
    const status = confirmMarkAllStatus;
    setConfirmMarkAllStatus(null);
    for (const s of students) {
      await api.manualMark(s.student_id, course, date, status);
    }
    await load();
    setSavedTick((t) => t + 1);
  };

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.student_id.toLowerCase().includes(q.toLowerCase()) ||
          s.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [students, q],
  );

  const presentCount = students.filter((s) => statusFor(s.student_id) === "Present").length;
  const absentCount = students.filter((s) => statusFor(s.student_id) === "Absent").length;
  const unmarked = students.length - presentCount - absentCount;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-slate-100">Manual Attendance</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Override or fill gaps when face recognition isn't used
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              value={course}
              onChange={setCourse}
              className="min-w-[240px]"
              options={[
                { value: "all", label: "All Courses" },
                ...courses.map((c) => ({
                  value: c.course_id,
                  label: `${c.course_id} — ${c.name}`,
                })),
              ]}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Present" value={presentCount} tone="emerald" />
          <Stat label="Absent" value={absentCount} tone="rose" />
          <Stat label="Unmarked" value={unmarked} tone="slate" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student by ID or name…"
            className="flex-1 min-w-[200px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {course !== "all" && (
            <div className="flex gap-2">
              <button
                onClick={() => markAll("Present")}
                disabled={students.length === 0}
                className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 rounded-lg text-xs font-medium transition disabled:opacity-40"
              >
                ✓ All Present
              </button>
              <button
                onClick={() => markAll("Absent")}
                disabled={students.length === 0}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-medium transition disabled:opacity-40"
              >
                ✗ All Absent
              </button>
            </div>
          )}
        </div>

        {savedTick > 0 && (
          <div className="mt-3 text-xs text-emerald-300">
            ✓ Saved · changes are persisted to attendance records.
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-2">📝</div>
            {students.length === 0
              ? "No students registered yet."
              : "No students match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2 px-3">Student</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Current</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const st = statusFor(s.student_id);
                  const busy = busyId === s.student_id;
                  return (
                    <tr
                      key={s.student_id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-100">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {s.student_id}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {s.department}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{s.batch} (Sec {s.section || "A"})</td>
                      <td className="py-2.5 px-3">
                        {st ? (
                          <StatusPill status={st} />
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {course === "all" ? (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-semibold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80">
                              {getCourseAttendanceDetail(s.student_id)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              disabled={busy}
                              onClick={() => setStatus(s, "Present")}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition disabled:opacity-50 ${
                                st === "Present"
                                  ? "bg-emerald-500/30 border-emerald-500/60 text-emerald-100"
                                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                              }`}
                            >
                               Present
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => setStatus(s, "Absent")}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition disabled:opacity-50 ${
                                st === "Absent"
                                  ? "bg-rose-500/30 border-rose-500/60 text-rose-100"
                                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30"
                              }`}
                            >
                               Absent
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Confirm Mark All Modal */}
      <ConfirmModal
        isOpen={!!confirmMarkAllStatus}
        title="Bulk Attendance Action"
        message={`Are you sure you want to mark ALL ${students.length} students as "${confirmMarkAllStatus}" for course ${course} on ${date}?`}
        confirmText="Confirm"
        onConfirm={handleConfirmMarkAll}
        onCancel={() => setConfirmMarkAllStatus(null)}
      />
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-200",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-200",
    slate: "from-slate-700/40 to-slate-700/10 border-slate-700 text-slate-300",
  };
  return (
    <div
      className={`bg-gradient-to-br ${tones[tone]} border rounded-lg px-4 py-2.5`}
    >
      <div className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

function StatusPill({ status }) {
  if (status === "Present") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
        ● Present
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
      ● Absent
    </span>
  );
}