import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Activity,
  Calendar,
  AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    (async () => {
      const allStudents = await api.listStudents();
      const allRecords = await api.getAttendance();

      if (user?.role === "FACULTY") {
        try {
          const assignedCourses = await api.listCourses();
          const assignedCourseIds = assignedCourses.map((c) => c.course_id);

          const registrations = await api.getStudentRegistrations();
          const enrolledStudentIds = new Set(
            registrations
              .filter((reg) =>
                reg.course_ids.some((cid) => assignedCourseIds.includes(cid))
              )
              .map((reg) => reg.student_id)
          );

          const facultyStudents = allStudents.filter((s) =>
            enrolledStudentIds.has(s.student_id)
          );
          const facultyRecords = allRecords.filter((r) =>
            assignedCourseIds.includes(r.course_id)
          );

          setStudents(facultyStudents);
          setRecords(facultyRecords);
        } catch (e) {
          console.error("Error filtering faculty dashboard data:", e);
          setStudents([]);
          setRecords([]);
        }
      } else {
        setStudents(allStudents);
        setRecords(allRecords);
      }
    })();
  }, [user]);

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Students"
          value={students.length}
          icon={Users}
          tone="indigo"
          desc={user?.role === "FACULTY" ? "Enrolled in your courses" : "Enrolled in system"}
        />
        <KpiCard
          label="Present Today"
          value={presentToday}
          icon={CheckCircle2}
          tone="emerald"
          desc={user?.role === "FACULTY" ? "Present in your classes" : "Marked present"}
        />
        <KpiCard
          label="Absent Today"
          value={absentToday}
          icon={XCircle}
          tone="rose"
          desc={user?.role === "FACULTY" ? "Absent in your classes" : "Pending attendance"}
        />
        <KpiCard
          label="Attendance %"
          value={`${percent}%`}
          icon={TrendingUp}
          tone="purple"
          desc={user?.role === "FACULTY" ? "Your courses average" : "Daily average rate"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Daily Attendance — Last 7 Days
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Unique students marked Present per day
              </p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 h-48 pt-4">
            {last7.map((d) => (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center justify-end gap-2 group"
              >
                <div className="text-xs font-semibold text-indigo-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {d.count}
                </div>
                <div className="w-full bg-slate-800/50 rounded-t-lg h-full flex items-end overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.count / maxBar) * 100}%` }}
                    transition={{ type: "spring", stiffness: 80, delay: 0.1 }}
                    className="w-full bg-gradient-to-t from-blue-500/80 via-indigo-500 to-purple-600 rounded-t-lg shadow-lg shadow-indigo-500/25 min-h-[4px]"
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold font-mono mt-1">
                  {d.date.slice(5)}
                </div>
                <div className="text-[9px] text-slate-500 font-mono">{d.pct}%</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Today's table */}
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-purple-400" />
              Today's Activity
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-full border border-slate-800">
              {today}
            </span>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {todayRecords.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-12 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-600 animate-bounce" />
                No attendance recorded today.
              </div>
            )}
            {todayRecords.slice(0, 20).map((r) => (
              <div
                key={r._id || r.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/35 border border-slate-800/60 hover:border-slate-700/60 transition duration-300"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {r.student_name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {r.student_id} · {r.course_id}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 shrink-0">
                  {r.time}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Student-wise summary */}
      <motion.div
        variants={itemVariants}
        className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg"
      >
        <h3 className="font-semibold text-slate-100 mb-5 flex items-center gap-2">
          <Calendar className="w-4.5 h-4.5 text-indigo-400" />
          Student-wise Attendance Summary
        </h3>
        {summary.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-12">
            Register students to see analytics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80">
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3">Days Attended</th>
                  <th className="py-3 px-3">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {summary.map((s) => (
                  <tr
                    key={s.student_id}
                    className="group border-b border-slate-800/40 hover:bg-slate-800/10 transition"
                  >
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200 group-hover:text-white transition">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {s.student_id}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-medium">
                      {s.department}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-semibold">
                      {s.batch} (Sec {s.section || "A"})
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono font-semibold">
                      {s.attended}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden max-w-[160px] border border-slate-800/40">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.pct}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-slate-300 font-bold font-mono w-10">
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
      </motion.div>
    </motion.div>
  );
}

function KpiCard({ label, value, icon: Icon, tone, desc }) {
  const tones = {
    indigo: {
      bg: "from-indigo-500/15 via-indigo-500/5 to-slate-900 border-indigo-500/30 hover:border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.35)]",
      icon: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
    },
    emerald: {
      bg: "from-emerald-500/15 via-emerald-500/5 to-slate-900 border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]",
      icon: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    },
    rose: {
      bg: "from-rose-500/15 via-rose-500/5 to-slate-900 border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:shadow-[0_0_30px_rgba(244,63,94,0.35)]",
      icon: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    },
    purple: {
      bg: "from-purple-500/15 via-purple-500/5 to-slate-900 border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)]",
      icon: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    },
  };

  const cardVariants = {
    hidden: { y: 10, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, scale: 1.01 }}
      className={`relative overflow-hidden bg-gradient-to-br ${tones[tone].bg} border rounded-2xl p-5 transition-all duration-300 group cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition">
            {label}
          </div>
          <div className="text-3xl font-bold text-slate-100 tracking-tight mt-2.5">
            {value}
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-medium">
            {desc}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${tones[tone].icon} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}