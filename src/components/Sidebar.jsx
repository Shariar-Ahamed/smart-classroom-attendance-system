import { useAuth } from "../context/AuthContext";

// `admin`   = visible only to ADMIN
// `faculty` = visible only to FACULTY
// (neither flag) = visible to both
const ALL_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "live", label: "Live Attendance", icon: "🎥", faculty: true },
  { id: "manual", label: "Manual Attendance", icon: "📝", faculty: true },
  { id: "register", label: "Register Student", icon: "🧑‍🎓", admin: true },
  { id: "courses", label: "Courses & Faculty", icon: "📚", admin: true },
  { id: "students", label: "Students", icon: "👥" },
  { id: "records", label: "Records", icon: "🗂️" },
];

export default function Sidebar({ view, setView }) {
  const { user, logout } = useAuth();
  const items = ALL_ITEMS.filter((i) => {
    if (i.admin && user?.role !== "ADMIN") return false;
    if (i.faculty && user?.role !== "FACULTY") return false;
    return true;
  });

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <div className="font-semibold text-slate-100 leading-tight">
              SmartAttend
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              AI Attendance
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              view === item.id
                ? "bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/10 text-white border border-indigo-500/30"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="px-3 py-2.5 rounded-lg bg-slate-800/50 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-semibold text-white">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-100 truncate">
                {user?.username}
              </div>
              <div
                className={`text-[10px] uppercase tracking-wider font-semibold ${
                  user?.role === "ADMIN"
                    ? "text-indigo-300"
                    : "text-fuchsia-300"
                }`}
              >
                {user?.role}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-sm text-slate-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/10 transition flex items-center gap-2"
        >
          <span>⎋</span> Sign out
        </button>
      </div>
    </aside>
  );
}