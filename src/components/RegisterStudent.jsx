import { useEffect, useState } from "react";
import { useWebcam } from "../hooks/useWebcam";
import { api } from "../services/api";
import {
  averageDescriptors,
  detectSingleFace,
  isFaceModelLoaded,
  loadFaceModel,
} from "../services/faceModel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  UserCheck,
  RotateCcw,
  Undo2,
  AlertCircle,
  CheckCircle2,
  Smile,
  ShieldAlert,
  ArrowRight,
  Info
} from "lucide-react";

// ---- Guided pose sequence ----
const POSES = [
  {
    label: "Look straight at the camera",
    emoji: "👀",
    hint: "Keep your face centered in the frame",
    arrow: "•",
  },
  {
    label: "Turn your head slightly LEFT",
    emoji: "👈",
    hint: "About 15° to your left — keep eyes on the lens",
    arrow: "◀",
  },
  {
    label: "Turn your head slightly RIGHT",
    emoji: "👉",
    hint: "About 15° to your right — keep eyes on the lens",
    arrow: "▶",
  },
  {
    label: "Tilt your head UP",
    emoji: "👆",
    hint: "Lift your chin slightly, eyes still on the lens",
    arrow: "▲",
  },
  {
    label: "Tilt your head DOWN",
    emoji: "👇",
    hint: "Lower your chin slightly, eyes still on the lens",
    arrow: "▼",
  },
];

export default function RegisterStudent({ onDone }) {
  const { videoRef, ready, error: webcamError, start, stop } = useWebcam();
  const [form, setForm] = useState({
    student_id: "",
    name: "",
    department: "Computer Science",
    batch: "2025",
  });
  const [descriptors, setDescriptors] = useState([]);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState("info");
  const [busy, setBusy] = useState(false);
  const [modelReady, setModelReady] = useState(isFaceModelLoaded());
  const [modelLoading, setModelLoading] = useState(false);

  const step = descriptors.length; // 0..POSES.length
  const currentPose = POSES[Math.min(step, POSES.length - 1)];
  const done = step >= POSES.length;

  useEffect(() => {
    if (modelReady) return;
    setModelLoading(true);
    loadFaceModel()
      .then(() => setModelReady(true))
      .catch(() => setMsg("Failed to load face model. Check your connection.", "err"))
      .finally(() => setModelLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMsg = (m, k = "info") => {
    setStatus(m);
    setStatusKind(k);
  };

  const captureSample = async () => {
    if (!videoRef.current || !ready) {
      setMsg("Start the camera first.", "err");
      return;
    }
    if (!modelReady) {
      setMsg("Face model is still loading…", "info");
      return;
    }
    setBusy(true);
    try {
      const face = await detectSingleFace(videoRef.current);
      if (!face) {
        setMsg(
          "No face detected — re-center yourself and try again.",
          "err",
        );
        return;
      }
      setDescriptors((d) => [...d, face.descriptor]);
      const next = step + 1;
      if (next >= POSES.length) {
        setMsg("All 5 poses captured! Ready to register.", "ok");
      } else {
        setMsg(
          `✓ Captured pose ${next}/${POSES.length}. Now: ${POSES[next].label}.`,
          "ok",
        );
      }
    } catch (err) {
      setMsg("Error running face detection.", "err");
    } finally {
      setBusy(false);
    }
  };

  const undoLast = () => {
    if (descriptors.length === 0) return;
    setDescriptors((d) => d.slice(0, -1));
    setMsg(`Undone. Now capture: ${POSES[descriptors.length - 1].label}.`, "info");
  };

  const reset = () => {
    setDescriptors([]);
    setMsg("Scan reset. Position your face in the oval to start.", "info");
  };

  const submit = async () => {
    if (!form.student_id.trim() || !form.name.trim()) {
      setMsg("Fill in Student ID and Full Name first.", "err");
      return;
    }
    if (descriptors.length < POSES.length) {
      setMsg("Capture all 5 face angles first.", "err");
      return;
    }
    setBusy(true);
    try {
      const avg = averageDescriptors(descriptors);
      await api.registerStudentFace({
        student_id: form.student_id.trim().toUpperCase(),
        name: form.name.trim(),
        department: form.department.trim(),
        batch: form.batch.trim(),
        face_encoding: avg,
      });
      setMsg("🎉 Student successfully registered to MongoDB database!", "ok");
      setTimeout(() => {
        if (onDone) onDone();
      }, 1500);
    } catch (err) {
      setMsg(err.message || "Failed to register student.", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      {/* Camera Panel */}
      <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <h2 className="font-semibold text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            Face Scan Capture
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Capture 5 diverse facial angles to register a robust face print.
          </p>
        </div>

        {/* Video feed with Oval Guide and Scanning animation */}
        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800/60 shadow-inner group">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Camera Off Placeholder */}
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-2.5 select-none bg-slate-950/80">
              <CameraOff className="w-10 h-10 text-slate-700 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider">Camera off</p>
            </div>
          )}

          {ready && !done && (
            <>
              {/* Futuristic scanning green/blue laser line */}
              <div className="animate-scan z-10" />

              {/* Face oval guide with glowing animations */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-44 h-56 border-2 border-dashed border-indigo-400/50 rounded-[50%] shadow-[0_0_40px_rgba(99,102,241,0.25)] animate-pulse" />
              </div>

              {/* Direction arrow overlay */}
              <DirectionArrow arrow={currentPose.arrow} />

              <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </div>

              {modelReady ? (
                <div className="absolute top-3 right-3 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/20 z-10">
                  AI ready
                </div>
              ) : (
                <div className="absolute top-3 right-3 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/20 animate-pulse z-10">
                  loading AI…
                </div>
              )}
            </>
          )}

          {/* Overlay when complete */}
          {ready && done && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-4 z-10">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce mb-3" />
              <h4 className="font-semibold text-white">Face Capturing Completed</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                All 5 poses have been registered. Fill in details and click submit to save.
              </p>
            </div>
          )}
        </div>

        {webcamError && (
          <div className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{webcamError}</span>
          </div>
        )}

        {/* Buttons Controls */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!ready ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={start}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-500/10 transition duration-300 flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              Start Camera
            </motion.button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={captureSample}
                disabled={busy || done || !modelReady}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-bold text-slate-950 transition duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {busy ? "Capturing…" : `📸 Capture Pose ${Math.min(step + 1, POSES.length)}`}
              </motion.button>
              {step > 0 && !done && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={undoLast}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 text-slate-300"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={reset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={stop}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 text-slate-300"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Stop
              </motion.button>
            </>
          )}
        </div>

        {/* Progress bar and indicators */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>Scan Progress</span>
            <span className="font-bold text-indigo-400">{step}/{POSES.length} Captured</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {POSES.map((p, i) => {
              const completed = i < step;
              const active = i === step && !done;
              return (
                <div key={i} className="space-y-1">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      completed
                        ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-md shadow-indigo-500/20"
                        : active
                          ? "bg-indigo-500/40 animate-pulse"
                          : "bg-slate-800"
                    }`}
                  />
                  <div
                    className={`text-center text-[10px] font-bold ${
                      completed
                        ? "text-emerald-400"
                        : active
                          ? "text-indigo-400 animate-bounce"
                          : "text-slate-600"
                    }`}
                  >
                    {p.arrow}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {modelLoading && !modelReady && (
          <div className="text-xs text-amber-300 flex items-center gap-2 bg-amber-500/10 border border-amber-500/10 p-2 rounded-lg">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            Loading local AI models (one-time, ~6 MB)…
          </div>
        )}
      </div>

      {/* Form panel */}
      <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between self-stretch">
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-slate-100">Student Details</h2>
            <p className="text-xs text-slate-500 mt-1">
              Associate captured facial prints with official student database records.
            </p>
          </div>
          
          <div className="space-y-3">
            <Field
              label="Student ID"
              value={form.student_id}
              onChange={(v) => setForm({ ...form, student_id: v })}
              placeholder="e.g. STU-2025-001"
            />
            <Field
              label="Full Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. John Doe"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Department"
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
              />
              <Field
                label="Batch"
                value={form.batch}
                onChange={(v) => setForm({ ...form, batch: v })}
              />
            </div>
          </div>

          {/* Pose Checklist instructions */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
              Capture checklist
            </div>
            <div className="space-y-1.5">
              {POSES.map((p, i) => {
                const completed = i < step;
                const active = i === step && !done;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 text-xs px-3 py-2 rounded-xl border transition-all duration-300 ${
                      completed
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                        : active
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-200"
                          : "bg-slate-900/30 border-slate-800/60 text-slate-600"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-950/50 shrink-0 font-bold">
                      {completed ? "✓" : active ? "▶" : "○"}
                    </span>
                    <span className="text-sm shrink-0 select-none">{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium ${active ? "text-indigo-300" : ""}`}>{p.label}</div>
                      {active && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.hint}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-5 mt-auto">
          {status && (
            <div
              className={`mb-4 text-xs font-medium border rounded-xl px-3 py-2.5 flex items-center gap-2 ${
                statusKind === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : statusKind === "err"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-300"
              }`}
            >
              <Info className={`w-4 h-4 shrink-0 ${statusKind === "ok" ? "text-emerald-400" : statusKind === "err" ? "text-rose-400" : "text-indigo-400"}`} />
              <span>{status}</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={submit}
            disabled={busy || !done}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 flex items-center justify-center gap-2"
          >
            <UserCheck className="w-5 h-5" />
            <span>{busy ? "Registering…" : "Register Student"}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function DirectionArrow({ arrow }) {
  if (arrow === "•") return null;
  const positions = {
    "◀": "left-4 top-1/2 -translate-y-1/2",
    "▶": "right-4 top-1/2 -translate-y-1/2",
    "▲": "top-4 left-1/2 -translate-x-1/2",
    "▼": "bottom-4 left-1/2 -translate-x-1/2",
  };
  return (
    <div
      className={`absolute ${positions[arrow]} text-5xl text-indigo-300/80 animate-pulse drop-shadow-[0_0_12px_rgba(99,102,241,0.9)] pointer-events-none z-10`}
    >
      {arrow}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2 bg-slate-950/50 border border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 text-sm placeholder-slate-700 transition"
      />
    </div>
  );
}