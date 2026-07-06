import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

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
    department: "Computer Science",
    batch: "2025",
    student_id: "",
    role: "FACULTY", // FACULTY or STUDENT
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
    if (reg.role === "STUDENT") {
      if (!reg.username.trim().startsWith("s-")) {
        setError("Student username must start with 's-' (e.g. s-john).");
        return;
      }
      if (!reg.student_id.trim()) {
        setError("Student ID is required.");
        return;
      }
    }
    setLoading(true);
    try {
      if (reg.role === "STUDENT") {
        await api.registerStudentUser({
          username: reg.username.trim(),
          password: reg.password,
          full_name: reg.full_name.trim(),
          department: reg.department.trim(),
          student_id: reg.student_id.trim(),
          batch: reg.batch.trim(),
        });
      } else {
        await api.registerFaculty({
          username: reg.username.trim(),
          password: reg.password,
          full_name: reg.full_name.trim(),
          department: reg.department.trim(),
        });
      }
      setInfo(
        `✓ Account created for ${reg.username}. You can now sign in below.`,
      );
      setUsername(reg.username);
      setPassword("");
      setReg({
        full_name: "",
        username: "",
        department: reg.department,
        batch: reg.batch,
        student_id: "",
        role: "FACULTY",
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4 text-slate-100">
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30 mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SmartAttend AI</h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-Powered Smart Classroom Attendance
          </p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* ----- SIGN IN ----- */}
          {mode === "signin" && (
            <form onSubmit={submitLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  className="w-full px-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                  required
                />
              </div>

              {info && (
                <div className="text-sm bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg px-3 py-2">
                  {info}
                </div>
              )}
              {error && (
                <div className="text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 rounded-lg font-medium shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg font-medium text-slate-300 transition"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {/* ----- REGISTER ----- */}
          {mode === "register" && (
            <form onSubmit={submitRegister} className="p-6 space-y-3">
              <div className="text-xs text-slate-400 mb-2">
                Create a <span className="text-fuchsia-300 font-semibold">{reg.role === "STUDENT" ? "Student" : "Faculty"}</span>{" "}
                account. Admin accounts cannot be self-registered.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Account Type
                  </label>
                  <select
                    value={reg.role}
                    onChange={(e) => setReg({ ...reg, role: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                  >
                    <option value="FACULTY">Faculty</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
                {reg.role === "STUDENT" ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={reg.student_id}
                      onChange={(e) => setReg({ ...reg, student_id: e.target.value })}
                      placeholder="e.g. STU2025001"
                      className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Registration Type
                    </label>
                    <div className="w-full px-4 py-2 bg-slate-800/20 border border-slate-700/40 rounded-lg text-slate-400 text-sm">
                      Self-Enrollment
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={reg.full_name}
                  onChange={(e) =>
                    setReg({ ...reg, full_name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={reg.username}
                    onChange={(e) =>
                      setReg({ ...reg, username: e.target.value })
                    }
                    autoComplete="username"
                    className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                    required
                  />
                  {reg.role === "STUDENT" && (
                    <span className="text-[10px] text-fuchsia-300 mt-1 block">
                      Must start with 's-' (e.g. s-john)
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={reg.department}
                    onChange={(e) =>
                      setReg({ ...reg, department: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                    required
                  />
                </div>
              </div>

              {reg.role === "STUDENT" && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Batch
                  </label>
                  <input
                    type="text"
                    value={reg.batch}
                    onChange={(e) =>
                      setReg({ ...reg, batch: e.target.value })
                    }
                    placeholder="e.g. 2025"
                    className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={reg.password}
                  onChange={(e) => setReg({ ...reg, password: e.target.value })}
                  autoComplete="new-password"
                  className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={reg.confirm}
                  onChange={(e) => setReg({ ...reg, confirm: e.target.value })}
                  autoComplete="new-password"
                  className="w-full px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-100 text-sm"
                  required
                />
              </div>

              {error && (
                <div className="text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 rounded-lg font-medium shadow-lg shadow-fuchsia-500/30 disabled:opacity-50 transition"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          React · Flask · MongoDB · OpenCV · face_recognition
        </p>
      </div>
    </div>
  );
}