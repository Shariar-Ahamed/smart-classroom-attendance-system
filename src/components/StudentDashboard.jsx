import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { formatRecordDateTime } from "./AttendanceRecords";
import diuSingleLogo from "../assets/DIU-Single-Logo.png";
import Footer from "./Footer";

export default function StudentDashboard() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const prof = await api.getStudentProfile();
        const att = await api.getAttendance();
        const cList = await api.listCourses();
        setProfile(prof);
        setRecords(att);
        setCourses(cList);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading student dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="text-4xl">⚠</div>
          <h2 className="text-xl font-bold text-red-400">Error Loading Dashboard</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={logout}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm transition"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // Attendance metrics calculation
  const courseSummary = {};
  let totalClassesSum = 0;
  let totalPresentsSum = 0;

  courses.forEach((c) => {
    const courseRecords = records.filter((r) => r.course_id === c.course_id);
    const presents = courseRecords.filter((r) => r.status === "Present").length;

    courseSummary[c.course_id] = {
      name: c.name,
      present: presents,
      total: c.total_classes,
      instructor: c.faculty_name || "Unassigned",
    };

    totalClassesSum += c.total_classes;
    totalPresentsSum += presents;
  });

  const presentCount = totalPresentsSum;
  const absentCount = totalClassesSum - totalPresentsSum;
  const attendanceRate = totalClassesSum > 0 ? Math.round((totalPresentsSum / totalClassesSum) * 100) : 0;

  // Color coding for attendance rate
  const getRateColorClass = (rate) => {
    if (rate >= 75) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (rate >= 60) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
    return "text-rose-400 border-rose-500/20 bg-rose-500/5";
  };

  const getRateProgressColor = (rate) => {
    if (rate >= 75) return "bg-emerald-500";
    if (rate >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header bar */}
      <header className="px-6 lg:px-8 py-5 border-b border-slate-900 bg-slate-900/30 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-lg shadow-indigo-500/10">
              <img 
                src={diuSingleLogo} 
                alt="DIU Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Smart Attend AI</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Student Portal</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition"
          >
            <span>🚪</span> Log Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        
        {/* Welcome Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Profile Details Box */}
          <div className="md:col-span-2 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
                👤
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Registered Student</span>
                  {profile?.face_registered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                      Face Active ✅
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold animate-pulse">
                      Face Pending ❌
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{profile?.name}</h2>
                <p className="text-sm text-slate-400">Linked Student ID: <span className="font-mono text-slate-300 font-semibold">{profile?.student_id}</span></p>
              </div>
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/60 text-sm">
              <div>
                <span className="block text-xs text-slate-400 font-medium">Department</span>
                <span className="font-medium text-slate-200 mt-0.5 block">{profile?.department}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Batch & Section</span>
                <span className="font-medium text-slate-200 mt-0.5 block">{profile?.batch} (Sec {profile?.section || "A"})</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Semester</span>
                <span className="font-medium text-slate-200 mt-0.5 block">{profile?.semester || "N/A"}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-medium">Enrolled Since</span>
                <span className="font-medium text-slate-200 mt-0.5 block">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Performance Gauge */}
          <div className={`border rounded-2xl p-6 flex flex-col items-center justify-center text-center ${getRateColorClass(attendanceRate)}`}>
            <div className="text-xs uppercase tracking-widest font-bold opacity-80 mb-2">Overall Attendance</div>
            <div className="relative flex items-center justify-center w-28 h-28 my-2">
              {/* Circular Gauge SVG */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-10" />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={2 * Math.PI * 48 * (1 - attendanceRate / 100)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute text-3xl font-extrabold tracking-tight font-mono text-white">{attendanceRate}%</div>
            </div>
            <div className="text-xs mt-2 text-slate-400">
              <span className="font-semibold text-white">{presentCount}</span> Present · <span className="font-semibold text-white">{absentCount}</span> Absent · <span className="font-semibold text-white">{totalClassesSum}</span> Total Classes Held
            </div>
          </div>
        </div>

        {/* Breakdown & History Grid */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left/Middle: Attendance History Log */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <span>📅</span> Attendance Log
            </h3>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 font-bold uppercase">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Course ID</th>
                    <th className="pb-3 font-semibold">Time</th>
                    <th className="pb-3 font-semibold">Source</th>
                    <th className="pb-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No attendance records logged yet.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => {
                      const formatted = formatRecordDateTime(r.date, r.time);
                      return (
                        <tr key={r._id || idx} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 text-slate-300 font-mono text-xs">{formatted.date}</td>
                          <td className="py-3 text-slate-200 font-semibold">{r.course_id}</td>
                          <td className="py-3 text-slate-300 font-mono text-xs">{formatted.time}</td>
                          <td className="py-3 text-slate-400">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 border border-slate-700/50 rounded-md">
                              {r.source || "auto"}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                r.status === "Present"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${r.status === "Present" ? "bg-emerald-400" : "bg-rose-400"}`} />
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Course Breakdown & Performance Charts */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-5">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <span>📊</span> Performance by Course
            </h3>
            
            {Object.keys(courseSummary).length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-12">
                No active classroom courses mapped.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(courseSummary).map(([courseId, data]) => {
                  const rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
                  return (
                    <div key={courseId} className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-300 font-mono">{courseId}</span>
                          <span className="text-slate-400 text-[10px] ml-2 block sm:inline">({data.name})</span>
                        </div>
                        <span className="text-slate-400">
                          <span className="text-white font-semibold">{data.present}</span>/{data.total} presents · <span className="font-bold text-white font-mono">{rate}%</span>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Instructor: <span className="text-indigo-400 font-semibold">{data.instructor}</span>
                      </div>
                      
                      {/* styled horizontal progress bar */}
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getRateProgressColor(rate)}`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Attendance Guideline Alert */}
            <div className="pt-4 border-t border-slate-800/50 text-[11px] text-slate-400 font-medium space-y-1.5">
              <div className="font-bold text-slate-300 text-xs">Academic Guidelines</div>
              <p>📌 High performance (<span className="text-emerald-400 font-bold">&gt;=75%</span>) is required for course exam registration eligibility.</p>
              <p>⚠️ Attendance rates falling below <span className="text-rose-400 font-bold">60%</span> will trigger warning notices.</p>
            </div>
          </div>

        </div>

      </main>
      <Footer />
    </div>
  );
}
