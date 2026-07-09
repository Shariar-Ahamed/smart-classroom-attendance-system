import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Search, Key, Users, Copy, Check } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function StudentsList() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState("directory");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null); // tracking copy status animation
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStudent, setResetStudent] = useState(null); // { id, name }
  const [customPasswordInput, setCustomPasswordInput] = useState("");
  const [busyReset, setBusyReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Result modal state
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { username, password }

  const refresh = async () => setStudents(await api.listStudents());
  
  useEffect(() => {
    refresh();
  }, []);

  const remove = (id) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.removeStudent(confirmDelete);
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      alert(err.message || "Failed to remove student.");
    }
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

  const openResetModal = (studentId, studentName) => {
    setResetStudent({ id: studentId, name: studentName });
    setCustomPasswordInput("");
    setErrorMsg("");
    setResetModalOpen(true);
  };

  const submitResetPassword = async () => {
    setBusyReset(true);
    setErrorMsg("");
    try {
      const res = await api.resetStudentPassword(resetStudent.id, customPasswordInput);
      setResetResult({ username: res.username, password: res.password });
      setResetModalOpen(false);
      setResetStudent(null);
      setResultModalOpen(true);
      refresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save credentials.");
    } finally {
      setBusyReset(false);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.student_id.toLowerCase().includes(q.toLowerCase()) ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.department.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
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
                              onClick={() => openResetModal(s.student_id, s.name)}
                              className="p-1 text-slate-500 hover:text-indigo-400 transition cursor-pointer ml-1"
                              title="Change / Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openResetModal(s.student_id, s.name)}
                            className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer"
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

      {/* Custom Reset Password Modal */}
      <AnimatePresence>
        {resetModalOpen && resetStudent && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative space-y-4 text-slate-100"
            >
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-base border-b border-slate-800 pb-3">
                <Key className="w-5 h-5" />
                <span>Configure Account Credentials</span>
              </div>

              <div className="space-y-1.5 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Student Name</div>
                <div className="text-sm font-semibold text-slate-200">{resetStudent.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {resetStudent.id}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Custom Password (Optional)
                </label>
                <input
                  type="text"
                  value={customPasswordInput}
                  onChange={(e) => setCustomPasswordInput(e.target.value)}
                  placeholder="Leave blank to auto-generate a random one"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-805/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm placeholder-slate-600 transition font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  If left blank, the system will generate a secure random 8-character password.
                </p>
              </div>

              {errorMsg && (
                <div className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-3 py-2">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(false);
                    setResetStudent(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitResetPassword}
                  disabled={busyReset}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-500/10 disabled:opacity-40 cursor-pointer"
                >
                  {busyReset ? "Saving..." : "Save Credentials"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Result Credentials Modal */}
      <AnimatePresence>
        {resultModalOpen && resetResult && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl text-center space-y-4 text-slate-100"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <Check className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Credentials Configured!</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  The account has been created/updated successfully. Please share these login details:
                </p>
              </div>

              <div className="space-y-3 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl text-left font-semibold">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Username</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-indigo-300">{resetResult.username}</span>
                    <button
                      onClick={() => handleCopy(resetResult.username, "result-user")}
                      className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                    >
                      {copiedId === "result-user" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Password</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-purple-300">{resetResult.password}</span>
                    <button
                      onClick={() => handleCopy(resetResult.password, "result-pass")}
                      className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                    >
                      {copiedId === "result-pass" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setResultModalOpen(false);
                  setResetResult(null);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold transition shadow-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Remove Student"
        message={`Are you sure you want to remove student "${confirmDelete}" and their associated login account? This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}