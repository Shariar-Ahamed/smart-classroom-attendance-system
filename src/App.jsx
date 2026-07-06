import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import RegisterStudent from "./components/RegisterStudent";
import LiveAttendance from "./components/LiveAttendance";
import StudentsList from "./components/StudentsList";
import AttendanceRecords from "./components/AttendanceRecords";
import ManualAttendance from "./components/ManualAttendance";
import StudentDashboard from "./components/StudentDashboard";
import CoursesManager from "./components/CoursesManager";

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
    title: "Courses & Faculty",
    subtitle: "",
  },
};

function Shell() {
  const { user } = useAuth();
  const [view, setView] = useState("dashboard");

  if (!user) return <Login />;

  if (user.role === "STUDENT") {
    return <StudentDashboard />;
  }

  // RBAC view-gating:
  //  - ADMIN cannot access Live or Manual attendance (faculty-only workflows)
  //  - FACULTY cannot access Register Student (admin-only workflow)
  const isAdminOnly = view === "register" || view === "courses";
  const isFacultyOnly = view === "live" || view === "manual";
  const blocked =
    (isAdminOnly && user.role !== "ADMIN") ||
    (isFacultyOnly && user.role !== "FACULTY");
  const safeView = blocked ? "dashboard" : view;
  const meta = VIEW_META[safeView];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar view={safeView} setView={setView} />
      <main className="flex-1 min-w-0">
        <header className="px-8 py-5 border-b border-slate-800 bg-slate-900/40 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">
                {meta.title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {new Date().toLocaleString()}
            </div>
          </div>
        </header>
        <div className="p-6 lg:p-8">
          {safeView === "dashboard" && <Dashboard />}
          {safeView === "live" && user.role === "FACULTY" && <LiveAttendance />}
          {safeView === "manual" && user.role === "FACULTY" && (
            <ManualAttendance />
          )}
          {safeView === "register" && user.role === "ADMIN" && (
            <RegisterStudent onDone={() => setView("students")} />
          )}
          {safeView === "students" && <StudentsList />}
          {safeView === "records" && <AttendanceRecords />}
          {safeView === "courses" && user.role === "ADMIN" && <CoursesManager />}
        </div>
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