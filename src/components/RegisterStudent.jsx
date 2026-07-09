import { useEffect, useState } from "react";
import CustomSelect from "./CustomSelect";
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
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown
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

// ---- Face Pose Estimator ----
function getPoseFromLandmarks(landmarks) {
  if (!landmarks || landmarks.length !== 68) return "none";

  const noseTip = landmarks[30];
  const leftEyeOuter = landmarks[36];
  const rightEyeOuter = landmarks[45];
  
  // Calculate eye center Y
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const mouthCenterY = landmarks[57].y; // bottom lip center
  
  // Yaw: distance from nose tip to left eye outer vs right eye outer
  const leftDist = noseTip.x - leftEyeOuter.x;
  const rightDist = rightEyeOuter.x - noseTip.x;
  const yawRatioLeft = leftDist / rightDist;
  const yawRatioRight = rightDist / leftDist;
  
  // Pitch: vertical nose bridge height vs nose-to-mouth height
  const upperNoseHeight = noseTip.y - eyeCenterY;
  const lowerNoseToMouth = mouthCenterY - noseTip.y;
  const pitchRatio = upperNoseHeight / lowerNoseToMouth;

  if (yawRatioLeft < 0.7) {
    return "right";
  } else if (yawRatioRight < 0.7) {
    return "left";
  } else if (pitchRatio < 0.8) {
    return "up";
  } else if (pitchRatio > 1.45) {
    return "down";
  }
  
  return "straight";
}

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
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [detectedPose, setDetectedPose] = useState("none");

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

  // Binance-style Auto-detection scan loop
  useEffect(() => {
    let active = true;
    let timer = null;

    const runDetection = async () => {
      if (!active) return;
      if (!videoRef.current || !ready || !modelReady || done || busy) {
        timer = setTimeout(runDetection, 250);
        return;
      }

      try {
        const face = await detectSingleFace(videoRef.current);
        if (!face) {
          setDetectedPose("none");
          setMsg("Position your face inside the scan frame", "info");
        } else {
          const pose = getPoseFromLandmarks(face.landmarks);
          setDetectedPose(pose);

          const requiredPoses = ["straight", "left", "right", "up", "down"];
          const req = requiredPoses[step];

          if (pose === req) {
            // Match found! Auto-capture
            setBusy(true);
            setDescriptors((d) => [...d, face.descriptor]);
            
            const next = step + 1;
            if (next >= POSES.length) {
              setMsg("🎉 All 5 poses auto-captured! Ready to register.", "ok");
            } else {
              setMsg(`✓ Captured! Next step: ${POSES[next].label}.`, "ok");
            }
            
            // 1.2s delay to give the user time to adjust to the next pose
            setTimeout(() => {
              setBusy(false);
            }, 1200);
          } else {
            // Show guidance message
            const reqLabel = POSES[step].label;
            setMsg(`Instruction: Please ${reqLabel} (Detected: ${pose.toUpperCase()})`, "info");
          }
        }
      } catch (err) {
        console.error("Auto scan detection error:", err);
      }

      timer = setTimeout(runDetection, 200);
    };

    if (ready && modelReady && !done) {
      runDetection();
    }

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [ready, modelReady, done, step, busy]);

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
      const res = await api.registerStudent({
        student_id: form.student_id.trim().toUpperCase(),
        name: form.name.trim(),
        department: form.department.trim(),
        batch: form.batch.trim(),
        face_encoding: avg,
      });
      setMsg("🎉 Student successfully registered to MongoDB database!", "ok");
      if (res && res.username && res.password) {
        setCreatedCredentials({ username: res.username, password: res.password });
      } else {
        setTimeout(() => {
          if (onDone) onDone();
        }, 1500);
      }
    } catch (err) {
      setMsg(err.message || "Failed to register student.", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start relative">
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
            className="w-full h-full object-cover -scale-x-100"
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

              {/* Face Guide Oval */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-[180px] h-[240px] rounded-[50%] border-2 border-dashed border-indigo-400/40 shadow-[0_0_0_9999px_rgba(3,7,18,0.7)] flex items-center justify-center">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-slate-950/80 px-2 py-0.5 rounded border border-indigo-500/20">
                    Fit Face Here
                  </div>
                </div>
              </div>

              {/* Dynamic direction arrow guide overlay */}
              <DirectionArrow arrow={currentPose.arrow} />
            </>
          )}

          {/* Live Web Status indicators */}
          {ready && (
            <div className="absolute top-3 left-3 z-15 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider select-none">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                Live
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider select-none">
                Pose: {detectedPose.toUpperCase()}
              </span>
            </div>
          )}

          {/* AI Model Loading State indicator */}
          <div className="absolute top-3 right-3 z-15">
            {modelLoading ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase select-none">
                Initializing AI...
              </span>
            ) : modelReady ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase select-none">
                AI ready
              </span>
            ) : null}
          </div>

          {/* Overlay when complete */}
          {ready && done && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-4 z-10">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce mb-3" />
              <h4 className="font-semibold text-white">Face Capturing Completed</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                All 5 poses have been auto-registered. Fill in details and click submit to save.
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-3 pt-2">
          {webcamError && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Camera Error: {webcamError}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            {!ready ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={start}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Start Camera</span>
              </motion.button>
            ) : (
              <>
                {!done ? (
                  <span className="px-5 py-2.5 bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold animate-pulse flex items-center gap-2 select-none">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                    AI Auto-Scanning...
                  </span>
                ) : (
                  <span className="px-5 py-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 select-none">
                    Scan Completed
                  </span>
                )}

                {descriptors.length > 0 && !done && (
                  <button
                    onClick={undoLast}
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Undo last captured pose"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>Undo</span>
                  </button>
                )}

                <button
                  onClick={reset}
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Reset scanning progress"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>

                <button
                  onClick={stop}
                  className="p-2 bg-slate-800/60 hover:bg-slate-800 hover:text-white border border-slate-800 hover:border-slate-700 text-slate-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Details Panel */}
      <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-5">
        <div>
          <h3 className="font-semibold text-slate-100">Student Details</h3>
          <p className="text-xs text-slate-500 mt-1">
            Associate captured facial prints with official student database records.
          </p>
        </div>

        <div className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                Department
              </label>
              <CustomSelect
                value={form.department}
                onChange={(val) => setForm({ ...form, department: val })}
                options={[
                  "Computer Science",
                  "Electrical Engineering",
                  "Business Administration",
                  "SWE",
                ]}
              />
            </div>

            <Field
              label="Batch"
              value={form.batch}
              onChange={(v) => setForm({ ...form, batch: v })}
              placeholder="2025"
            />
          </div>

          {/* Guided scan poses checklists */}
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
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 shadow-md shadow-indigo-500/20"
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

          {/* Checklist Instructions */}
          <div className="space-y-2.5 bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Capture Checklist
            </h4>
            <div className="space-y-2">
              {POSES.map((p, i) => {
                const completed = i < step;
                const active = i === step && !done;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition duration-300 ${
                      completed
                        ? "bg-emerald-500/5 border-emerald-500/20 text-slate-300"
                        : active
                          ? "bg-indigo-500/10 border-indigo-500/30 text-white font-semibold"
                          : "border-transparent text-slate-500"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${completed ? "bg-emerald-500/10 text-emerald-400" : active ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-600"}`}>
                      {completed ? "✓" : i + 1}
                    </span>
                    <span className="text-xs">{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{p.label}</div>
                      {active && (
                        <div className="text-[10px] text-indigo-400 font-medium mt-0.5">
                          {p.hint}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 font-medium ${
                statusKind === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  : statusKind === "err"
                    ? "bg-red-500/10 border-red-500/25 text-red-300"
                    : "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
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
            className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <UserCheck className="w-5 h-5" />
            <span>{busy ? "Registering…" : "Register Student"}</span>
          </motion.button>
        </div>
      </div>

      {/* Credentials overlay modal */}
      {createdCredentials && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-center p-8 z-30 border border-slate-800/80 shadow-2xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl text-slate-100"
          >
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-bold text-white text-lg tracking-wide">Student Account Created!</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                A student login account was auto-generated. Please share these credentials with the student:
              </p>
            </div>
            
            <div className="space-y-3 bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl text-left font-semibold">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Username</span>
                <span className="text-sm font-mono font-bold text-indigo-300">{createdCredentials.username}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Temporary Password</span>
                <span className="text-sm font-mono font-bold text-purple-300">{createdCredentials.password}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center font-medium italic">
              Students can use these credentials to log in and view their attendance records in read-only mode.
            </p>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCreatedCredentials(null);
                reset();
                if (onDone) onDone();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
            >
              <span>Close & View list</span>
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function DirectionArrow({ arrow }) {
  if (!arrow || arrow === "•") return null;

  const positions = {
    "◀": "left-6 top-1/2 -translate-y-1/2",
    "▶": "right-6 top-1/2 -translate-y-1/2",
    "▲": "top-6 left-1/2 -translate-x-1/2",
    "▼": "bottom-6 left-1/2 -translate-x-1/2",
  };

  const icons = {
    "◀": ChevronLeft,
    "▶": ChevronRight,
    "▲": ChevronUp,
    "▼": ChevronDown,
  };

  const labels = {
    "◀": "Turn Left",
    "▶": "Turn Right",
    "▲": "Look Up",
    "▼": "Look Down",
  };

  const Icon = icons[arrow];
  const label = labels[arrow];

  if (!Icon) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: [1, 1.08, 1], opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className={`absolute ${positions[arrow]} z-20 flex flex-col items-center gap-1.5 pointer-events-none`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/25">
        <Icon className="w-7 h-7" />
      </div>
      <span className="text-[9px] uppercase font-mono font-extrabold tracking-widest text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/20 shadow-md">
        {label}
      </span>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white text-sm placeholder-slate-400 transition"
      />
    </div>
  );
}