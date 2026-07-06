import { useEffect, useRef, useState } from "react";
import { useWebcam } from "../hooks/useWebcam";
import {
  isFaceModelLoaded,
  loadFaceModel,
  recognizeAllFaces,
} from "../services/faceModel";
import { api } from "../services/api";

// Distance threshold for FaceNet descriptors (lower = stricter).
// 0.5 is a common, balanced value.
const MATCH_THRESHOLD = 0.55;

// How often to run a recognition pass. The model takes ~70-150 ms on a
// laptop, so 500 ms = roughly 2 fps which is plenty for attendance and
// keeps CPU usage low.
const TICK_MS = 500;

export default function LiveAttendance() {
  const { videoRef, ready, error, start, stop } = useWebcam();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState("CS101");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [overlay, setOverlay] = useState([]);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [modelReady, setModelReady] = useState(isFaceModelLoaded());
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState(null);
  const loopRef = useRef(null);
  const inFlightRef = useRef(false);

  // Load enrolled + courses once
  useEffect(() => {
    (async () => {
      setStudents(await api.listStudents());
      setCourses(await api.listCourses());
      refreshToday();
    })();
  }, []);

  // Eagerly load the face model so it's ready when Start is clicked
  useEffect(() => {
    if (modelReady) return;
    setModelLoading(true);
    loadFaceModel()
      .then(() => setModelReady(true))
      .catch(() =>
        setModelError(
          "Failed to load face recognition model. Check your internet connection.",
        ),
      )
      .finally(() => setModelLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshToday = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const list = await api.getAttendance({ date: today });
    setTodayCount(list.length);
  };

  // ---- Recognition loop ----
  useEffect(() => {
    if (!running || !ready || !modelReady) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || inFlightRef.current) return;
      if (!videoRef.current) return;
      inFlightRef.current = true;
      try {
        const enrolled = students.map((s) => ({
          student_id: s.student_id,
          face_encoding: s.face_encoding,
        }));

        const matches = await recognizeAllFaces(
          videoRef.current,
          enrolled,
          MATCH_THRESHOLD,
        );
        if (cancelled) return;
        setFramesProcessed((f) => f + 1);

        const overlayFaces = [];
        const newEvents = [];

        for (const { box, match } of matches) {
          const student = students.find(
            (s) => s.student_id === match.student_id,
          );
          if (!student) continue;
          const rec = await api.markAttendance(
            student.student_id,
            course,
          );
          const newly = !!rec;
          overlayFaces.push({
            box,
            name: student.name,
            distance: match.distance,
            newlyMarked: newly,
          });
          newEvents.push({
            student_id: student.student_id,
            name: student.name,
            distance: match.distance,
            time: new Date().toTimeString().slice(0, 8),
            newlyMarked: newly,
          });
        }
        setOverlay(overlayFaces);

        if (newEvents.length > 0) {
          setEvents((prev) => {
            const top = prev[0];
            const fresh = newEvents.filter((e) => {
              if (e.newlyMarked) return true;
              if (
                top &&
                top.student_id === e.student_id &&
                !top.newlyMarked
              ) {
                return false;
              }
              return true;
            });
            return [...fresh, ...prev].slice(0, 40);
          });
          if (newEvents.some((e) => e.newlyMarked)) refreshToday();
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    loopRef.current = window.setInterval(tick, TICK_MS);
    return () => {
      cancelled = true;
      if (loopRef.current) window.clearInterval(loopRef.current);
    };
  }, [running, ready, modelReady, students, course, videoRef]);

  const handleStart = async () => {
    if (students.length === 0) {
      alert(
        "No students registered yet. Please register at least one student first.",
      );
      return;
    }
    if (!modelReady) {
      alert("Face model is still loading. Please wait a moment.");
      return;
    }
    await start();
    setRunning(true);
  };

  const handleStop = () => {
    setRunning(false);
    stop();
    setOverlay([]);
  };

  const toOverlayStyle = (box) => {
    const v = videoRef.current;
    const vw = v?.videoWidth || 640;
    const vh = v?.videoHeight || 480;
    return {
      left: `${(box.x / vw) * 100}%`,
      top: `${(box.y / vh) * 100}%`,
      width: `${(box.width / vw) * 100}%`,
      height: `${(box.height / vh) * 100}%`,
    };
  };

  // Convert raw FaceNet distance into a "confidence %" for display.
  const distanceToConfidence = (d) =>
    Math.max(0, Math.min(100, Math.round((1 - d / MATCH_THRESHOLD) * 100)));

  const matchedCount = overlay.length;
  const newlyMarkedCount = overlay.filter((o) => o.newlyMarked).length;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Camera */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-100">Live Camera Feed</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              📷 Webcam ·{" "}
              <span className="text-indigo-300">
                TinyFaceDetector + FaceNet 128-d (real-time multi-face)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              disabled={running}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_id} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Model status banner */}
        {!modelReady && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm border ${
              modelError
                ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                : "bg-amber-500/10 border-amber-500/30 text-amber-200"
            }`}
          >
            {modelError ? (
              <>⚠ {modelError}</>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-2" />
                {modelLoading
                  ? "Loading face recognition model (one-time, ~6 MB)…"
                  : "Initializing model…"}
              </>
            )}
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
              <div className="text-5xl">🎥</div>
              <p className="text-sm">Camera offline</p>
              <p className="text-xs text-slate-600">
                Click "Start Attendance" to begin
              </p>
            </div>
          )}

          {ready && running && (
            <>
              {overlay.map((f, i) => {
                const conf = distanceToConfidence(f.distance);
                return (
                  <div
                    key={`${f.name}-${i}`}
                    className={`absolute border-2 rounded-lg transition-all duration-200 pointer-events-none ${
                      f.newlyMarked
                        ? "border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.6)]"
                        : "border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                    }`}
                    style={toOverlayStyle(f.box)}
                  >
                    <div
                      className={`absolute -top-6 left-0 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${
                        f.newlyMarked
                          ? "bg-emerald-500 text-slate-900"
                          : "bg-indigo-500 text-white"
                      }`}
                    >
                      {f.newlyMarked ? "✓ " : ""}
                      {f.name} · {conf}%
                    </div>
                  </div>
                );
              })}

              {overlay.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-4 py-2 rounded-lg text-xs text-slate-400 bg-slate-900/60 border border-slate-700 backdrop-blur">
                    Scanning for faces…
                  </div>
                </div>
              )}

              <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-red-300 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                REC
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="text-xs text-slate-300 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700 font-mono">
                  {course}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-semibold ${
                    matchedCount > 0
                      ? "text-emerald-200 bg-emerald-500/20 border-emerald-500/40"
                      : "text-slate-400 bg-slate-900/80 border-slate-700"
                  }`}
                >
                  👥 {matchedCount} matched
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 backdrop-blur">
                <span>
                  Multi-face scan · frame #{framesProcessed}
                  {newlyMarkedCount > 0 && (
                    <span className="ml-2 text-emerald-300 font-semibold">
                      +{newlyMarkedCount} marked
                    </span>
                  )}
                </span>
                <span className="font-mono">
                  {students.length} enrolled · {todayCount} present today
                </span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2">
            {!running ? (
              <button
                onClick={handleStart}
                disabled={!modelReady}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 rounded-lg font-medium shadow-lg shadow-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ▶ Start Attendance
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-400 rounded-lg font-medium shadow-lg shadow-red-500/20 transition"
              >
                ■ Stop
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-500 max-w-sm text-right">
            Every visible face is detected, encoded to 128-d FaceNet, matched
            against enrolled students, and marked Present in one pass.
          </div>
        </div>
      </div>

      {/* Event feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">Recognition Feed</h2>
          {running && (
            <span className="text-xs text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1 max-h-[560px]">
          {events.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-12">
              No detections yet
            </div>
          )}
          {events.map((ev, i) => {
            const conf = distanceToConfidence(ev.distance);
            return (
              <div
                key={`${ev.student_id}-${i}`}
                className={`p-3 rounded-lg border ${
                  ev.newlyMarked
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-100 text-sm">
                      {ev.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {ev.student_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-semibold ${
                        ev.newlyMarked ? "text-emerald-300" : "text-slate-400"
                      }`}
                    >
                      {ev.newlyMarked ? "✓ MARKED" : "already today"}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {ev.time}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                      style={{ width: `${conf}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono w-10 text-right">
                    {conf}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}