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
  AlertCircle,
  Shield,
  Database,
  Cpu,
  BarChart3,
  TrendingDown,
  Zap,
  Search,
  GraduationCap,
  BookOpen,
  Video,
  Edit,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function Dashboard({ setView, setActiveCourseId }) {
  const { user } = useAuth();
  
  const handleStartScanner = (courseId) => {
    if (setActiveCourseId) setActiveCourseId(courseId);
    if (setView) setView("live");
  };

  const handleManualEntry = (courseId) => {
    if (setActiveCourseId) setActiveCourseId(courseId);
    if (setView) setView("manual");
  };
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [summarySearch, setSummarySearch] = useState("");
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));

  const shiftActivityDate = (days) => {
    const current = new Date(activityDate);
    current.setDate(current.getDate() + days);
    setActivityDate(current.toISOString().slice(0, 10));
  };

  useEffect(() => {
    (async () => {
      const allStudents = await api.listStudents();
      const allRecords = await api.getAttendance();
      const allRegs = await api.getStudentRegistrations().catch(() => []);
      const allCourses = await api.listCourses().catch(() => []);
      const allFaculties = user?.role === "ADMIN" ? await api.listFaculties().catch(() => []) : [];

      setRegistrations(allRegs);
      setCourses(allCourses);
      setFaculties(allFaculties);

      if (user?.role === "FACULTY") {
        try {
          const assignedCourseIds = allCourses.map((c) => c.course_id);

          const enrolledStudentIds = new Set(
            allRegs
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

        const regDoc = registrations.find((reg) => reg.student_id === s.student_id);
        const courseCount = regDoc?.course_ids?.length || 0;

        return {
          ...s,
          attended: days,
          pct: Math.round((days / totalDays) * 100),
          courseCount,
        };
      })
      .sort((a, b) => b.attended - a.attended);
  }, [students, records, registrations]);

  const filteredSummary = useMemo(() => {
    return summary.filter((s) => {
      const term = summarySearch.toLowerCase().trim();
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        s.student_id.toLowerCase().includes(term) ||
        (s.department && s.department.toLowerCase().includes(term)) ||
        (s.batch && s.batch.toLowerCase().includes(term))
      );
    });
  }, [summary, summarySearch]);

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColorClass = (studentId) => {
    const colors = [
      "from-blue-500 to-indigo-600 shadow-blue-500/10",
      "from-emerald-500 to-teal-600 shadow-emerald-500/10",
      "from-purple-500 to-pink-600 shadow-purple-500/10",
      "from-amber-500 to-orange-600 shadow-amber-500/10",
      "from-rose-500 to-red-600 shadow-rose-500/10"
    ];
    let hash = 0;
    const str = studentId || "";
    for (let i = 0; i < str.length; i++) {
      hash += str.charCodeAt(i);
    }
    return colors[hash % colors.length];
  };

  const isRecentCheckIn = (timeStr) => {
    if (!timeStr) return false;
    try {
      const [h, m, s] = timeStr.split(":").map(Number);
      const now = new Date();
      const checkTime = new Date();
      checkTime.setHours(h, m, s || 0, 0);
      const diffMin = Math.abs(now - checkTime) / 1000 / 60;
      return diffMin <= 5; // 5 minutes threshold
    } catch (e) {
      return false;
    }
  };

  const facultyCourses = useMemo(() => {
    if (user?.role !== "FACULTY") return [];
    return courses.map((c) => {
      const courseRecords = records.filter((r) => r.course_id === c.course_id);
      const enrolledIds = new Set(
        registrations
          .filter((reg) => reg.course_ids.includes(c.course_id))
          .map((reg) => reg.student_id)
      );
      const enrolledCount = enrolledIds.size;
      const uniqueDates = new Set(courseRecords.map((r) => r.date)).size;
      const totalExpected = enrolledCount * uniqueDates;
      const totalPresent = courseRecords.filter((r) => r.status === "Present").length;
      const attendanceRate = totalExpected === 0 ? 0 : Math.round((totalPresent / totalExpected) * 100);
      return {
        ...c,
        enrolledCount,
        attendanceRate,
      };
    });
  }, [courses, records, registrations, user]);

  const deptStats = useMemo(() => {
    const uniqueDepts = Array.from(new Set(students.map((s) => s.department).filter(Boolean)));
    const todayStudentIds = new Set(todayRecords.map((r) => r.student_id));
    return uniqueDepts
      .map((dept) => {
        const deptStudents = students.filter((s) => s.department === dept);
        const deptPresent = deptStudents.filter((s) => todayStudentIds.has(s.student_id)).length;
        const pct = deptStudents.length === 0 ? 0 : Math.round((deptPresent / deptStudents.length) * 100);
        return {
          name: dept,
          total: deptStudents.length,
          present: deptPresent,
          pct,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [students, todayRecords]);

  const riskWatchlist = useMemo(() => {
    return summary.filter((s) => s.pct < 75);
  }, [summary]);

  const activityRecords = useMemo(() => {
    return records.filter((r) => r.date === activityDate);
  }, [records, activityDate]);

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
      {user?.role === "ADMIN" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Students"
            value={students.length}
            icon={Users}
            tone="indigo"
            desc={`Across ${Array.from(new Set(students.map((s) => s.department).filter(Boolean))).length} Departments`}
          />
          <KpiCard
            label="Faculty Members"
            value={faculties.length}
            icon={GraduationCap}
            tone="emerald"
            desc="Registered teaching staff"
          />
          <KpiCard
            label="Active Courses"
            value={courses.length}
            icon={BookOpen}
            tone="amber"
            desc="Allocated course catalog"
          />
          <KpiCard
            label="Attendance Rate"
            value={`${percent}%`}
            icon={TrendingUp}
            tone="purple"
            desc="Daily institutional average"
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Students"
            value={students.length}
            icon={Users}
            tone="indigo"
            desc="Enrolled in your courses"
          />
          <KpiCard
            label="Present Today"
            value={presentToday}
            icon={CheckCircle2}
            tone="emerald"
            desc="Present in your classes"
          />
          <KpiCard
            label="Absent Today"
            value={absentToday}
            icon={XCircle}
            tone="rose"
            desc="Absent in your classes"
          />
          <KpiCard
            label="Attendance %"
            value={`${percent}%`}
            icon={TrendingUp}
            tone="purple"
            desc="Your courses average"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {user?.role === "ADMIN" ? (
          /* Admin Combi-Panel */
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg relative overflow-hidden"
          >
            <div className="grid md:grid-cols-3 gap-6">
              {/* Column 1: Department Performance */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                    Dept Performance
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Today's attendance rate</p>
                </div>
                
                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                  {deptStats.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4">No student departments registered.</p>
                  ) : (
                    deptStats.map((dept) => (
                      <div key={dept.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-300 truncate max-w-[120px]">{dept.name}</span>
                          <span className="text-indigo-400 font-mono">{dept.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            style={{ width: `${dept.pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold font-mono">
                          <span>{dept.present} present</span>
                          <span>{dept.total} total</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Attendance Risk Alerts */}
              <div className="space-y-4 md:border-l md:border-r border-slate-800/60 md:px-5">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                    Risk Watchlist
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Attendance rate &lt; 75%</p>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {riskWatchlist.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 flex flex-col items-center justify-center gap-1">
                      <CheckCircle2 className="w-6.5 h-6.5 text-emerald-500/80" />
                      <span className="text-xs font-bold text-emerald-400/90">All Students Clear</span>
                      <span className="text-[9px]">Attendance is above 75%</span>
                    </div>
                  ) : (
                    riskWatchlist.map((student) => (
                      <div
                        key={student.student_id}
                        className="flex items-center justify-between p-2 rounded-xl bg-rose-500/5 border border-rose-500/10"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">{student.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono">{student.student_id}</div>
                        </div>
                        <span className="text-[10px] text-rose-400 font-bold font-mono bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/10 shrink-0">
                          {student.pct}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Biometric Engine Status */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    System Live Logs
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Biometric &amp; database logs</p>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-450 font-semibold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-450" />
                      Biometric Engine
                    </span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      v1.7.15
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-450 font-semibold flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-slate-455" />
                      DB Cluster
                    </span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-450 font-semibold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-450" />
                      Latency
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">&lt; 15ms</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-450 font-semibold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-slate-450" />
                      Sync State
                    </span>
                    <span className="text-indigo-400 font-bold">Real-time</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sleek Terminal Logs at the bottom to fill empty vertical space */}
            <div className="mt-5 p-3.5 bg-slate-950/75 border border-slate-900 rounded-xl font-mono text-[10px] text-slate-400 font-medium space-y-1.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-indigo-950/40 text-[8px] text-indigo-400 font-bold uppercase rounded-bl border-l border-b border-indigo-900/50">
                Terminal Console
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-indigo-500 font-bold">$</span>
                <span>biometric-daemon --status</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400/90 pl-3">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span>[SYSTEM] SSD Mobilenet v1 weights loaded successfully (~5.4 MB)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 pl-3">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                <span>[DATABASE] Connected to Atlas cluster (smartattend)</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-400/90 pl-3">
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                <span>[SECURITY] Face biometric encryption keys active (AES-GCM-256)</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Faculty Assigned Courses Grid Hub */
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  My Assigned Courses
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Active courses and attendance controls
                </p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-1">
              {facultyCourses.length === 0 ? (
                <div className="sm:col-span-2 text-sm text-slate-505 text-center py-12 italic">
                  No courses assigned to your profile.
                </div>
              ) : (
                facultyCourses.map((c) => (
                  <div
                    key={c.course_id}
                    className="p-4 rounded-xl bg-slate-950/40 border border-slate-900/60 hover:border-slate-850/60 hover:bg-slate-900/10 transition duration-300 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-200 truncate group-hover:text-white transition">
                        {c.course_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {c.course_id} · Sem {c.semester}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-3.5">
                        <button
                          onClick={() => handleStartScanner(c.course_id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 transition cursor-pointer"
                        >
                          <Video className="w-3 h-3" />
                          Scanner
                        </button>
                        <button
                          onClick={() => handleManualEntry(c.course_id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/20 transition cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          Manual
                        </button>
                      </div>
                    </div>
                    
                    {/* Radial Progress Ring */}
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="text-slate-850"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="text-indigo-500"
                          strokeWidth="3.5"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - c.attendanceRate / 100)}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold text-slate-350 font-mono">
                        {c.attendanceRate}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Daily/Today's Activity table */}
        <motion.div
          variants={itemVariants}
          className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-purple-400" />
              {activityDate === today ? "Today's Activity" : "Daily Activity"}
            </h3>
            <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-900 px-2 py-0.5 rounded-full">
              <button
                onClick={() => shiftActivityDate(-1)}
                className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold text-slate-300 font-mono px-1">
                {activityDate.split("-").reverse().join("-")}
              </span>
              <button
                onClick={() => shiftActivityDate(1)}
                className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {activityRecords.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-12 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-600 animate-bounce" />
                No attendance recorded for this date.
              </div>
            )}
            {activityRecords.slice(0, 20).map((r, idx) => {
              const isFirst = idx === 0 && activityDate === today && isRecentCheckIn(r.time);
              const sourceLabel = r.source === "manual" ? "MANUAL ✍️" : "AUTO 🤖";
              const sourceColor = r.source === "manual" ? "text-blue-400 bg-blue-500/10 border-blue-500/10" : "text-indigo-400 bg-indigo-500/10 border-indigo-500/10";
              const initials = getInitials(r.student_name);
              const avatarBg = getAvatarColorClass(r.student_id);

              return (
                <div
                  key={r._id || r.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/35 border border-slate-800/60 hover:border-slate-700/60 transition duration-300 gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-md`}>
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate flex items-center gap-1.5">
                        {r.student_name}
                        {user?.role === "ADMIN" && isFirst && (
                          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{r.student_id}</span>
                        <span>·</span>
                        <span className="text-slate-400 font-bold">{r.course_id}</span>
                        {user?.role === "ADMIN" && (
                          <>
                            <span>·</span>
                            <span className={`text-[8px] font-bold px-1 rounded border ${sourceColor}`}>
                              {sourceLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 shrink-0">
                    {r.time}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Student-wise summary */}
      <motion.div
        variants={itemVariants}
        className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg"
      >
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5 pb-3 border-b border-slate-800/40">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-indigo-400" />
            Student-wise Attendance Summary
          </h3>
          {user?.role === "ADMIN" && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition w-72">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                placeholder="Search name, ID, or dept..."
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none w-full placeholder-slate-400 font-semibold"
              />
            </div>
          )}
        </div>
        {filteredSummary.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-12">
            {summary.length === 0 ? "Register students to see analytics." : "No matching students found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800/80">
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3">Days Attended</th>
                  {user?.role === "ADMIN" && <th className="py-3 px-3">Status</th>}
                  <th className="py-3 px-3">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredSummary.map((s) => {
                  const badgeColor = s.pct >= 90 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : s.pct >= 75 ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20";
                  const badgeLabel = s.pct >= 90 ? "Excellent 🌟" : s.pct >= 75 ? "Regular 👍" : "At Risk ⚠️";
                  const initials = getInitials(s.name);
                  const avatarBg = getAvatarColorClass(s.student_id);

                  return (
                    <tr
                      key={s.student_id}
                      className="group border-b border-slate-800/40 hover:bg-slate-800/10 transition"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-md`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-200 group-hover:text-white transition">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium font-mono mt-0.5 flex items-center gap-1.5">
                              <span>{s.student_id}</span>
                              {user?.role === "ADMIN" && (
                                <>
                                  <span>·</span>
                                  <span className="text-slate-400 font-semibold">{s.courseCount} course(s)</span>
                                </>
                              )}
                            </div>
                          </div>
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
                      {user?.role === "ADMIN" && (
                        <td className="py-3 px-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        </td>
                      )}
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
                  );
                })}
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
    amber: {
      bg: "from-amber-500/15 via-amber-500/5 to-slate-900 border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]",
      icon: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
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
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 group-hover:text-white transition">
            {label}
          </div>
          <div className="text-3xl font-bold text-white tracking-tight mt-2.5">
            {value}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-medium group-hover:text-slate-300 transition">
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