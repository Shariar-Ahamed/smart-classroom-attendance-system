import { useEffect, useState } from "react";
import { useWebcam } from "../hooks/useWebcam";
import { api } from "../services/api";
import {
  averageDescriptors,
  detectSingleFace,
  isFaceModelLoaded,
  loadFaceModel,
} from "../services/faceModel";

// ---- Guided pose sequence ----
// Each capture asks the student to face the camera from a slightly
// different angle. Averaging descriptors from multiple poses produces a
// much more robust enrollment than 5 frontal shots.
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
  const { videoRef, ready, error, start, stop } = useWebcam();
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
    } finally {
      setBusy(false);
    }
  };

  const undoLast = () => {
    setDescriptors((d) => d.slice(0, -1));
    setMsg("Removed last sample.", "info");
  };

  const reset = () => {
    setDescriptors([]);
    setMsg("", "info");
  };

  const submit = async () => {
    if (!form.student_id.trim() || !form.name.trim()) {
      setMsg("Student ID and Name are required.", "err");
      return;
    }
    if (!done) {
      setMsg(`Capture ${POSES.length - step} more pose(s).`, "err");
      return;
    }
    setBusy(true);
    try {
      const encoding = averageDescriptors(descriptors);
      await api.registerStudent({
        student_id: form.student_id.trim(),
        name: form.name.trim(),
        department: form.department.trim(),
        batch: form.batch.trim(),
        face_encoding: encoding,
      });
      setMsg(`✅ ${form.name} registered successfully.`, "ok");
      setForm({
        student_id: "",
        name: "",
        department: form.department,
        batch: form.batch,
      });
      setDescriptors([]);
      stop();
      onDone?.();
    } catch (e) {
      setMsg(`❌ ${e.message}`, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Camera panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">Face Capture</h2>
          <span className="text-xs text-slate-500">
            Sample {Math.min(step, POSES.length)}/{POSES.length}
          </span>
        </div>

        {/* Pose instruction banner */}
        {ready && !done && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 border border-indigo-500/40">
            <div className="flex items-center gap-3">
              <div className="text-4xl shrink-0">{currentPose.emoji}</div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold">
                  Pose {step + 1} of {POSES.length}
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {currentPose.label}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {currentPose.hint}
                </div>
              </div>
            </div>
          </div>
        )}
        {ready && done && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-3">
            <div className="text-3xl">✅</div>
            <div>
              <div className="text-sm font-semibold text-emerald-100">
                All poses captured
              </div>
              <div className="text-xs text-emerald-200/80">
                Fill in the details and click <b>Register Student</b>.
              </div>
            </div>
          </div>
        )}

        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
              <div className="text-5xl">📷</div>
              <p className="text-sm">Camera off</p>
            </div>
          )}

          {ready && !done && (
            <>
              {/* face oval guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-60 border-2 border-indigo-400/70 rounded-[50%] shadow-[0_0_30px_rgba(99,102,241,0.5)]" />
              </div>

              {/* Direction arrow overlay */}
              <DirectionArrow arrow={currentPose.arrow} />

              <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
              {modelReady ? (
                <div className="absolute top-3 right-3 text-[10px] text-indigo-200 bg-indigo-500/20 px-2 py-1 rounded-full border border-indigo-500/40">
                  AI ready
                </div>
              ) : (
                <div className="absolute top-3 right-3 text-[10px] text-amber-200 bg-amber-500/20 px-2 py-1 rounded-full border border-amber-500/40 animate-pulse">
                  loading AI…
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!ready ? (
            <button
              onClick={start}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium transition"
            >
              Start Camera
            </button>
          ) : (
            <>
              <button
                onClick={captureSample}
                disabled={busy || done || !modelReady}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-medium text-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "Capturing…" : `📸 Capture Pose ${Math.min(step + 1, POSES.length)}`}
              </button>
              {step > 0 && !done && (
                <button
                  onClick={undoLast}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
                >
                  ↶ Undo
                </button>
              )}
              <button
                onClick={reset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
              >
                Reset
              </button>
              <button
                onClick={stop}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
              >
                Stop
              </button>
            </>
          )}
        </div>

        {/* Progress dots */}
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {POSES.map((p, i) => (
            <div key={i} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition ${
                  i < step
                    ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                    : i === step
                      ? "bg-indigo-500/40"
                      : "bg-slate-800"
                }`}
              />
              <div
                className={`text-center text-[10px] leading-tight ${
                  i < step
                    ? "text-emerald-300"
                    : i === step
                      ? "text-indigo-300 font-semibold"
                      : "text-slate-600"
                }`}
              >
                {p.arrow}
              </div>
            </div>
          ))}
        </div>

        {modelLoading && !modelReady && (
          <div className="mt-3 text-xs text-amber-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Loading face recognition model (one-time, ~6 MB)…
          </div>
        )}
      </div>

      {/* Form panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-100 mb-4">Student Details</h2>
        <div className="space-y-3">
          <Field
            label="Student ID"
            value={form.student_id}
            onChange={(v) => setForm({ ...form, student_id: v })}
          />
          <Field
            label="Full Name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
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

        {/* Pose checklist */}
        <div className="mt-5">
          <div className="text-xs font-medium text-slate-400 mb-2">
            Capture Checklist
          </div>
          <div className="space-y-1.5">
            {POSES.map((p, i) => {
              const completed = i < step;
              const active = i === step && !done;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${
                    completed
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                      : active
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-100"
                        : "bg-slate-800/50 border-slate-800 text-slate-500"
                  }`}
                >
                  <span className="w-5 text-center">
                    {completed ? "✓" : active ? "▶" : "○"}
                  </span>
                  <span className="text-base">{p.emoji}</span>
                  <span className="flex-1">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>




        {status && (
          <div
            className={`mt-4 text-sm border rounded-lg px-3 py-2 ${
              statusKind === "ok"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : statusKind === "err"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                  : "bg-slate-800/70 border-slate-700 text-slate-200"
            }`}
          >
            {status}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy || !done}
          className="mt-5 w-full py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 rounded-lg font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? "Registering…" : "Register Student"}
        </button>
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
    "▼": "bottom-16 left-1/2 -translate-x-1/2",
  };
  return (
    <div
      className={`absolute ${positions[arrow]} text-5xl text-indigo-300/80 animate-pulse drop-shadow-[0_0_8px_rgba(99,102,241,0.8)] pointer-events-none`}
    >
      {arrow}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 text-sm"
      />
    </div>
  );
}