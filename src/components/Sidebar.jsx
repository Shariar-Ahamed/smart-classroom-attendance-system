import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Video,
  Edit3,
  UserPlus,
  BookOpen,
  Users,
  FolderOpen,
  LogOut,
  GraduationCap
} from "lucide-react";

const ALL_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "live", label: "Live Attendance", icon: Video, faculty: true },
  { id: "manual", label: "Manual Attendance", icon: Edit3, faculty: true },
  { id: "register", label: "Register Student", icon: UserPlus, admin: true },
  { id: "courses", label: "Courses & Faculty", icon: BookOpen, admin: true },
  { id: "students", label: "Students", icon: Users },
  { id: "records", label: "Records", icon: FolderOpen },
];

export default function Sidebar({ view, setView }) {
  const { user, logout } = useAuth();
  const items = ALL_ITEMS.filter((i) => {
    if (i.admin && user?.role !== "ADMIN") return false;
    if (i.faculty && user?.role !== "FACULTY") return false;
    return true;
  });

  return (
    <aside className="w-64 bg-slate-900/60 backdrop-blur-lg border-r border-slate-800/80 flex flex-col h-screen sticky top-0 z-20">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 leading-tight tracking-wide">
              SmartAttend
            </div>
            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">
              AI Attendance
            </div>
          </div>
        </div>
      </div>

      {/* Navigation list with animated sliding background pill */}
      <nav className="flex-1 px-3 py-6 space-y-1 relative">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition relative select-none font-medium ${
                isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {/* Sliding Active Background Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarTab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 to-fuchsia-500/5 border border-indigo-500/20 rounded-lg -z-10"
                />
              )}
              <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Card Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="px-3 py-2.5 rounded-lg bg-slate-800/30 border border-slate-800/50 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-semibold text-white text-sm shadow-md">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-100 truncate">
                {user?.username}
              </div>
              <div
                className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
                  user?.role === "ADMIN" ? "text-indigo-400" : "text-fuchsia-400"
                }`}
              >
                {user?.role}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-sm text-slate-400 hover:text-red-400 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition flex items-center gap-2 font-medium"
        >
          <LogOut className="w-4 h-4 text-red-500/70" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}