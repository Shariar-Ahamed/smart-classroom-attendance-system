import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Search, Key, Users, Copy, Check } from "lucide-react";

export default function StudentsList() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState("directory");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null); // tracking copy status animation

  const refresh = async () => setStudents(await api.listStudents());
  
  useEffect(() => {
    refresh();
  }, []);

  const remove = async (id) => {
    if (!confirm(`Remove student ${id} and their login account?`)) return;
    await api.removeStudent(id);
    refresh();
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetPassword = async (studentId, studentName) => {
    const customPass = prompt(
      `Set new password for ${studentName} (${studentId}):\n(Leave blank to auto-generate a random 8-character password)`
    );
    if (customPass === null) return; // clicked Cancel
    
    try {
      const res = await api.resetStudentPassword(studentId, customPass);
      alert(`Account credentials saved!\nUsername: ${res.username}\nPassword: ${res.password}`);
      refresh();
    } catch (err) {
      alert(err.message || "Failed to reset password.");
    }
  };

  const filtered = students.filter(
    (s) =>
      s.student_id.toLowerCase().includes(q.toLowerCase()) ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.department.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header and Tab switcher */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Student Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {students.length} students enrolled
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "directory"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Student Directory
          </button>
          <button
            onClick={() => setActiveTab("credentials")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "credentials"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Login Credentials
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 mb-4 max-w-md bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by Student ID, name or department..."
          className="bg-transparent border-none text-sm text-slate-200 focus:outline-none w-full placeholder-slate-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-2">🗂️</div>
          {students.length === 0
            ? "No students registered yet."
            : "No matches found."}
        </div>
      ) : activeTab === "directory" ? (
        /* Tab 1: Directory List */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 px-3">Student ID</th>
                <th className="py-2 px-3">Username</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Batch</th>
                <th className="py-2 px-3">Face Enrolled</th>
                <th className="py-2 px-3">Registered</th>
                {user?.role === "ADMIN" && <th className="py-2 px-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.student_id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30"
                >
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                    {s.student_id}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-xs text-indigo-400">
                    {s.username || "Pending"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-100 font-medium">
                    {s.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{s.department}</td>
                  <td className="py-2.5 px-3 text-slate-300">{s.batch}</td>
                  <td className="py-2.5 px-3">
                    {s.face_encoding && s.face_encoding.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Yes ✅ <span className="text-[10px] text-emerald-500">({s.face_encoding.length}-d)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        No ❌ <span className="text-[10px] text-amber-500">Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  {user?.role === "ADMIN" && (
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => remove(s.student_id)}
                        className="text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition font-semibold"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tab 2: Login Credentials List */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 px-3">Student ID</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Username</th>
                <th className="py-2 px-3">Password</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isPasswordVisible = visiblePasswords[s.student_id] || false;
                const displayPassword = s.plain_password || "No password stored";
                return (
                  <tr
                    key={s.student_id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td className="py-3 px-3 font-mono text-xs text-slate-300">
                      {s.student_id}
                    </td>
                    <td className="py-3 px-3 text-slate-100 font-semibold">
                      {s.name}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-xs">
                          {s.username || "Pending"}
                        </span>
                        {s.username && (
                          <button
                            onClick={() => handleCopy(s.username, `${s.student_id}-user`)}
                            className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                            title="Copy Username"
                          >
                            {copiedId === `${s.student_id}-user` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs tracking-wider bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-200">
                          {isPasswordVisible ? displayPassword : "••••••••"}
                        </span>
                        
                        {s.plain_password && s.plain_password !== "Encrypted/Hashed" ? (
                          <>
                            <button
                              onClick={() => togglePasswordVisibility(s.student_id)}
                              className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                              title={isPasswordVisible ? "Hide Password" : "Show Password"}
                            >
                              {isPasswordVisible ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCopy(s.plain_password, `${s.student_id}-pass`)}
                              className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                              title="Copy Password"
                            >
                              {copiedId === `${s.student_id}-pass` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleResetPassword(s.student_id, s.name)}
                              className="p-1 text-slate-500 hover:text-indigo-400 transition cursor-pointer ml-1"
                              title="Change / Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleResetPassword(s.student_id, s.name)}
                            className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="Generate Password & Create Account"
                          >
                            Set/Generate Password
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}