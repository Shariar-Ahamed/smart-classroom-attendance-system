import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Menu } from "lucide-react";
import Login from "./components/Login";
import { formatOrdinalDate } from "./components/CustomDatePicker";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import RegisterStudent from "./components/RegisterStudent";
import LiveAttendance from "./components/LiveAttendance";
import StudentsList from "./components/StudentsList";
import AttendanceRecords from "./components/AttendanceRecords";
import ManualAttendance from "./components/ManualAttendance";
import StudentDashboard from "./components/StudentDashboard";
import CoursesManager from "./components/CoursesManager";
import FacultiesManager from "./components/FacultiesManager";
import FacultyCourses from "./components/FacultyCourses";
import Footer from "./components/Footer";

const VIEW_META = {
  dashboard: {
    title: "Dashboard",
    subtitle: "",
  },
  live: {
    title: "Live Attendance",
    subtitle: "Auto-mark via webcam or IP / CCTV camera",
  },
  manual: {
    title: "Manual Attendance",
    subtitle: "Mark Present / Absent without face recognition",
  },
  "my-courses": {
    title: "My Courses",
    subtitle: "View students enrolled in your assigned courses",
  },
  register: {
    title: "Register Student",
    subtitle: "Enroll a new student with face scan",
  },
  students: {
    title: "Students",
    subtitle: "Manage enrolled students",
  },
  records: {
    title: "Attendance Records",
    subtitle: "",
  },
  courses: {
    title: "Courses",
    subtitle: "",
  },
  faculties: {
    title: "Faculties",
    subtitle: "Manage faculty login accounts",
  },
};

function Shell() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const localDate = formatOrdinalDate(dateStr);
      const localTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTimeStr(`${localDate}, ${localTime}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return <Login />;

  if (user.role === "STUDENT") {
    return <StudentDashboard />;
  }

  // RBAC view-gating:
  //  - ADMIN cannot access Live or Manual attendance (faculty-only workflows)
  //  - FACULTY cannot access Register Student (admin-only workflow)
  const isAdminOnly = view === "register" || view === "courses" || view === "faculties";
  const isFacultyOnly = view === "live" || view === "manual";
  const blocked =
    (isAdminOnly && user.role !== "ADMIN") ||
    (isFacultyOnly && user.role !== "FACULTY");
  const safeView = blocked ? "dashboard" : view;
  const meta = VIEW_META[safeView];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar
        view={safeView}
        setView={setView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="px-6 py-4 lg:px-8 lg:py-5 border-b border-slate-800 bg-slate-900/40 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger menu on mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
              >
                <Menu className="w-5.5 h-5.5" />
              </button>
              <div>
                <h1 className="text-base lg:text-xl font-semibold text-slate-100 leading-tight">
                  {meta.title}
                </h1>
                {meta.subtitle && (
                  <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5 max-sm:hidden">
                    {meta.subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="text-[10px] lg:text-xs text-slate-500 font-mono max-sm:hidden">
              {timeStr}
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8 flex-1">
          {safeView === "dashboard" && <Dashboard />}
          {safeView === "live" && user.role === "FACULTY" && <LiveAttendance />}
          {safeView === "manual" && user.role === "FACULTY" && (
            <ManualAttendance />
          )}
          {safeView === "my-courses" && user.role === "FACULTY" && (
            <FacultyCourses />
          )}
          {safeView === "register" && user.role === "ADMIN" && (
            <RegisterStudent onDone={() => setView("students")} />
          )}
          {safeView === "students" && <StudentsList />}
          {safeView === "records" && <AttendanceRecords />}
          {safeView === "courses" && user.role === "ADMIN" && <CoursesManager />}
          {safeView === "faculties" && user.role === "ADMIN" && <FacultiesManager />}
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}