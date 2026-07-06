import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    (async () => {
      setStudents(await api.listStudents());
      setRecords(await api.getAttendance());
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.date === today);
  const presentToday = new Set(todayRecords.map((r) => r.student_id)).size;
  const absentToday = Math.max(0, students.length - presentToday);
  const percent =
    students.length === 0
      ? 0
      : Math.round((presentToday / students.length) * 100);

  // Last 7 days
  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const recs = records.filter((r) => r.date === key);
      const uniq = new Set(recs.map((r) => r.student_id)).size;
      days.push({
        date: key,
        count: uniq,
        pct: students.length ? Math.round((uniq / students.length) * 100) : 0,
      });
    }
    return days;
  }, [records, students]);

  // Per-student summary
  const summary = useMemo(() => {
    return students
      .map((s) => {
        const days = new Set(
          records.filter((r) => r.student_id === s.student_id).map((r) => r.date),
        ).size;
        const totalDays = new Set(records.map((r) => r.date)).size || 1;
        return {
          ...s,
          attended: days,
          pct: Math.round((days / totalDays) * 100),
        };
      })
      .sort((a, b) => b.attended - a.attended);
  }, [students, records]);

  const maxBar = Math.max(...last7.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Students"
          value={students.length}
          icon="👥"
          tone="indigo"
        />
        <KpiCard
          label="Present Today"
          value={presentToday}
          icon="✅"
          tone="emerald"
        />
        <KpiCard
          label="Absent Today"
          value={absentToday}
          icon="⛔"
          tone="rose"
        />
        <KpiCard
          label="Attendance %"
          value={`${percent}%`}
          icon="📈"
          tone="fuchsia"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-100">
                Daily Attendance — Last 7 Days
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unique students marked Present per day
              </p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {last7.map((d) => (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center justify-end gap-2"
              >
                <div className="text-xs text-slate-400 font-mono">
                  {d.count}
                </div>
                <div
                  className="w-full bg-gradient-to-t from-indigo-500 to-fuchsia-500 rounded-t-md shadow-lg shadow-indigo-500/20 transition-all"
                  style={{ height: `${(d.count / maxBar) * 100}%`, minHeight: 4 }}
                />
                <div className="text-[10px] text-slate-500 font-mono">
                  {d.date.slice(5)}
                </div>
                <div className="text-[10px] text-slate-600">{d.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-100 mb-1">Today's Activity</h3>
          <p className="text-xs text-slate-500 mb-4">{today}</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 -mr-1">
            {todayRecords.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-8">
                No attendance recorded today.
              </div>
            )}
            {todayRecords.slice(0, 20).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-800"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {r.student_name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {r.student_id} · {r.course_id}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-300 font-mono shrink-0">
                  {r.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student-wise summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-100 mb-4">
          Student-wise Attendance Summary
        </h3>
        {summary.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-10">
            Register students to see analytics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2 px-3">Student</th>
                  <th className="py-2 px-3">Dept</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Days Attended</th>
                  <th className="py-2 px-3">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr
                    key={s.student_id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-100">{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {s.student_id}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{s.department}</td>
                    <td className="py-2.5 px-3 text-slate-300">{s.batch}</td>
                    <td className="py-2.5 px-3 text-slate-300">{s.attended}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[160px]">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 font-mono w-10">
                          {s.pct}%
                        </span>
                      </div>
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

function KpiCard({ label, value, icon, tone }) {
  const tones = {
    indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/30",
  };
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${tones[tone]} border rounded-2xl p-5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            {label}
          </div>
          <div className="text-3xl font-bold text-slate-100 mt-2">{value}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}