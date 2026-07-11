import { useState } from "react";
import CustomSelect from "./CustomSelect";
import { DEPARTMENTS } from "../constants/departments";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import diuSingleLogo from "../assets/DIU-Single-Logo.png";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  User,
  Lock,
  ArrowLeft,
  Sparkles,
  Building,
  Hash,
  Calendar,
  CheckCircle,
  Database,
  Code
} from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState("signin");

  // Sign-in fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [reg, setReg] = useState({
    full_name: "",
    username: "",
    department: "Computer Science & Engineering",
    faculty_id: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (reg.password !== reg.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!reg.faculty_id.trim()) {
      setError("Faculty ID is required.");
      return;
    }
    setLoading(true);
    try {
      await api.registerFaculty({
        username: reg.username.trim(),
        password: reg.password,
        full_name: reg.full_name.trim(),
        department: reg.department.trim(),
        faculty_id: reg.faculty_id.trim(),
      });
      setInfo(
        `✓ Account created for ${reg.username}. You can now sign in below.`,
      );
      setUsername(reg.username);
      setPassword("");
      setReg({
        full_name: "",
        username: "",
        department: reg.department,
        faculty_id: "",
        password: "",
        confirm: "",
      });
      setMode("signin");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-slate-100 overflow-hidden relative select-none">
      {/* Decorative Interactive Floating Glows - Blue and Purple Theme */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 left-10 w-80 h-80 bg-blue-500/15 rounded-full blur-[80px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"
      />

      <div className="relative w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 shadow-lg shadow-indigo-500/10 mb-4 border border-slate-800/80 p-2.5 overflow-hidden"
          >
            <img 
              src={diuSingleLogo} 
              alt="Daffodil International University Crest" 
              className="w-full h-full object-contain"
            />
          </motion.div>
          <motion.h1
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200"
          >
            Smart Attend AI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm mt-1.5 flex items-center justify-center gap-1.5 font-medium"
          >
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            AI-Powered Classroom Attendance
          </motion.p>
        </div>

        {/* Form Container (Blue and Purple Theme edge) */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 shadow-indigo-500/5 relative"
        >
          {/* Top glowing edge line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

          <AnimatePresence mode="wait">
            {mode === "signin" ? (
              <motion.form
                key="signin"
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 80, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                onSubmit={submitLogin}
                className="p-5 sm:p-7 space-y-5"
              >
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 font-medium transition"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 font-medium transition"
                    required
                  />
                </div>

                {info && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2 font-medium"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{info}</span>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2 font-medium"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 text-red-400 rotate-180" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition duration-300 text-white flex items-center justify-center cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign in"
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => switchMode("register")}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-slate-300 transition duration-300 cursor-pointer"
                  >
                    Create Account
                  </motion.button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -80, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                onSubmit={submitRegister}
                className="p-5 sm:p-7 space-y-4"
              >
                <div className="text-xs text-slate-400 font-medium mb-1">
                  Create a <span className="text-purple-400 font-bold">Faculty</span> account. Student and Admin accounts cannot be self-registered.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                      <Hash className="w-3.5 h-3.5 text-purple-400" />
                      Faculty ID
                    </label>
                    <input
                      type="text"
                      value={reg.faculty_id}
                      onChange={(e) => setReg({ ...reg, faculty_id: e.target.value })}
                      placeholder="FAC2025001"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-slate-500 font-medium transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={reg.full_name}
                      onChange={(e) => setReg({ ...reg, full_name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-slate-500 font-medium transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                      Username
                    </label>
                    <input
                      type="text"
                      value={reg.username}
                      onChange={(e) => setReg({ ...reg, username: e.target.value })}
                      autoComplete="username"
                      placeholder="username"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-slate-500 font-medium transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                      <Building className="w-3.5 h-3.5 text-purple-400" />
                      Department
                    </label>
                    <CustomSelect
                      value={reg.department}
                      onChange={(val) => setReg({ ...reg, department: val })}
                      options={DEPARTMENTS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={reg.password}
                      onChange={(e) => setReg({ ...reg, password: e.target.value })}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-slate-500 font-medium transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={reg.confirm}
                      onChange={(e) => setReg({ ...reg, confirm: e.target.value })}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-slate-500 font-medium transition"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2 font-medium"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 text-red-400 rotate-180" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 transition duration-300 text-white flex items-center justify-center cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      "Create Account"
                    )}
                  </motion.button>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition duration-300 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    Back to sign in
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}