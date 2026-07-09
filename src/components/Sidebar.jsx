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
  GraduationCap,
  ChevronRight
} from "lucide-react";

const ALL_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "live", label: "Live Attendance", icon: Video, faculty: true },
  { id: "manual", label: "Manual Attendance", icon: Edit3, faculty: true },
  { id: "register", label: "Register Student", icon: UserPlus, admin: true },
  { id: "courses", label: "Courses", icon: BookOpen, admin: true },
  { id: "faculties", label: "Faculties", icon: GraduationCap, admin: true },
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
    <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col h-screen sticky top-0 z-20">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/20"
          >
            <GraduationCap className="w-5.5 h-5.5 text-white" />
          </motion.div>
          <div>
            <div className="font-bold text-slate-100 text-base tracking-wide">
              SmartAttend
            </div>
            <div className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest mt-0.5 animate-pulse">
              AI Attendance
            </div>
          </div>
        </div>
      </div>

      {/* Navigation list with animated sliding background pill and vertical glowing indicators */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 relative overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition relative select-none font-semibold ${
                isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {/* Sliding Active Background Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarTab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-slate-900 border border-slate-800/80 rounded-xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] shadow-lg"
                />
              )}

              {/* Sliding Vertical Neon Glow Indicator (left edge) */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute left-0 w-1 h-5.5 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                />
              )}

              {/* Icon with scaling & color transition */}
              <motion.div
                animate={{ scale: isActive ? 1.08 : 1 }}
                className="shrink-0"
              >
                <Icon className={`w-4.5 h-4.5 transition-colors duration-300 ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
              </motion.div>

              <span className="flex-1 text-left">{item.label}</span>

              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Card Profile & Logout */}
      <div className="p-4 border-t border-slate-900">
        <motion.div
          whileHover={{ y: -2 }}
          className="px-3.5 py-3 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-indigo-500/10 border border-white/10 shrink-0">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-100 truncate">
                {user?.username}
              </div>
              <div
                className={`text-[8px] uppercase tracking-widest font-extrabold mt-0.5 ${
                  user?.role === "ADMIN" ? "text-indigo-400" : "text-purple-400"
                }`}
              >
                {user?.role}
              </div>
            </div>
          </div>
        </motion.div>
        
        <button
          onClick={logout}
          className="w-full text-sm text-slate-400 hover:text-red-400 px-4 py-2.5 rounded-xl hover:bg-red-500/10 transition duration-300 flex items-center gap-2 font-semibold"
        >
          <LogOut className="w-4 h-4 text-red-500/70" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}