import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Search, Key, Users, Copy, Check, Info } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function FacultiesManager() {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState([]);
  const [q, setQ] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetFaculty, setResetFaculty] = useState(null); // { username, name }
  const [customPasswordInput, setCustomPasswordInput] = useState("");
  const [busyReset, setBusyReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Result modal state
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { username, password }

  const refresh = async () => {
    try {
      const data = await api.listFaculties();
      setFaculties(data);
    } catch (err) {
      console.error("Failed to load faculties:", err);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const togglePasswordVisibility = (username) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const remove = (username) => {
    setConfirmDelete(username);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.removeFaculty(confirmDelete);
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      alert(err.message || "Failed to remove faculty member.");
    }
  };

  const openResetModal = (username, name) => {
    setResetFaculty({ username, name });
    setCustomPasswordInput("");
    setErrorMsg("");
    setResetModalOpen(true);
  };

  const submitResetPassword = async () => {
    setBusyReset(true);
    setErrorMsg("");
    try {
      const res = await api.resetFacultyPassword(resetFaculty.username, customPasswordInput);
      setResetResult({ username: res.username, password: res.password });
      setResetModalOpen(false);
      setResetFaculty(null);
      setResultModalOpen(true);
      refresh();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save credentials.");
    } finally {
      setBusyReset(false);
    }
  };

  const filtered = faculties.filter(
    (f) =>
      f.username.toLowerCase().includes(q.toLowerCase()) ||
      f.full_name.toLowerCase().includes(q.toLowerCase()) ||
      (f.faculty_id && f.faculty_id.toLowerCase().includes(q.toLowerCase())) ||
      f.department.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Faculty Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {faculties.length} faculty members registered
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 mb-4 max-w-md bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username, name or department..."
          className="bg-transparent border-none text-sm text-slate-200 focus:outline-none w-full placeholder-slate-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-2">🎓</div>
          {faculties.length === 0
            ? "No faculties registered yet."
            : "No matches found."}
        </div>
      ) : (
        /* Faculty List Table */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 px-3">Faculty ID</th>
                <th className="py-2 px-3">Full Name</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Username</th>
                <th className="py-2 px-3">Password</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const isPasswordVisible = visiblePasswords[f.username] || false;
                const displayPassword = f.plain_password || "Encrypted/Hashed";
                return (
                  <tr
                    key={f.username}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30"
                  >
                    <td className="py-3.5 px-3 font-mono text-xs text-slate-300">
                      {f.faculty_id || "N/A"}
                    </td>
                    <td className="py-3.5 px-3 text-slate-100 font-semibold">
                      {f.full_name}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {f.department || "N/A"}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-xs">
                          {f.username}
                        </span>
                        <button
                          onClick={() => handleCopy(f.username, `${f.username}-user`)}
                          className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                          title="Copy Username"
                        >
                          {copiedId === `${f.username}-user` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs tracking-wider bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-200">
                          {isPasswordVisible ? displayPassword : "••••••••"}
                        </span>
                        
                        {f.plain_password ? (
                          <>
                            <button
                              onClick={() => togglePasswordVisibility(f.username)}
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
                              onClick={() => handleCopy(f.plain_password, `${f.username}-pass`)}
                              className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                              title="Copy Password"
                            >
                              {copiedId === `${f.username}-pass` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        ) : null}

                        <button
                          onClick={() => openResetModal(f.username, f.full_name)}
                          className="p-1 text-slate-500 hover:text-indigo-400 transition cursor-pointer ml-1"
                          title="Change / Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => remove(f.username)}
                        className="text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
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
        {resetModalOpen && resetFaculty && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative space-y-4 text-slate-100"
            >
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-base border-b border-slate-800 pb-3">
                <Key className="w-5 h-5" />
                <span>Configure Faculty Credentials</span>
              </div>

              <div className="space-y-1.5 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Faculty Name</div>
                <div className="text-sm font-semibold text-slate-200">{resetFaculty.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Username: {resetFaculty.username}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="text"
                  value={customPasswordInput}
                  onChange={(e) => setCustomPasswordInput(e.target.value)}
                  placeholder="Leave blank to auto-generate a random one"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm placeholder-slate-600 transition font-medium"
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
                    setResetFaculty(null);
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
                  The account has been updated successfully. Share these login details with the faculty:
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
        title="Remove Faculty Member"
        message={`Are you sure you want to remove faculty member "${confirmDelete}" and their associated login account? This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
