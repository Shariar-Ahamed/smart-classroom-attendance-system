import { useEffect, useRef, useState } from "react";
import CustomSelect from "./CustomSelect";
import { useWebcam } from "../hooks/useWebcam";
import {
  isFaceModelLoaded,
  loadFaceModel,
  recognizeAllFaces,
} from "../services/faceModel";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  Square,
  ShieldAlert,
  Info,
  ScanLine,
  UserCheck,
  ChevronRight,
  X
} from "lucide-react";

// Distance threshold for FaceNet descriptors (lower = stricter).
const MATCH_THRESHOLD = 0.55;

// How often to run a recognition pass (TICK_MS = 500 ms = roughly 2 fps)
const TICK_MS = 500;

export default function LiveAttendance({ initialCourseId }) {
  const { videoRef, ready, error: webcamError, start, stop } = useWebcam();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState("");
  const [records, setRecords] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [scanNotification, setScanNotification] = useState(null);
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

  // Load courses once
  useEffect(() => {
    (async () => {
      const cList = await api.listCourses();
      setCourses(cList);
      if (initialCourseId && cList.some((c) => c.course_id === initialCourseId)) {
        setCourse(initialCourseId);
      } else if (cList.length > 0) {
        setCourse(cList[0].course_id);
      }
      refreshToday();
      
      const allS = await api.listStudents();
      setAllStudents(allS);
    })();
  }, []);

  // Reload student list for selected course
  useEffect(() => {
    if (!course) {
      setStudents([]);
      return;
    }
    (async () => {
      setStudents(await api.listStudents(course));
      refreshToday();
    })();
  }, [course]);

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
    if (!course) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const courseRecords = await api.getAttendance({ date: today, course_id: course });
      setRecords(courseRecords);
      const uniq = new Set(courseRecords.map((r) => r.student_id)).size;
      setTodayCount(uniq);
    } catch (err) {
      console.error("Failed to refresh today's scan records:", err);
    }
  };

  const handleStart = async () => {
    setModelError(null);
    if (!modelReady) {
      setModelError("Face model not loaded yet.");
      return;
    }
    try {
      // Refresh students lists on scanner activation
      const allS = await api.listStudents();
      setAllStudents(allS);
      if (course) {
        setStudents(await api.listStudents(course));
      }
      
      await start();
      setRunning(true);
      setFramesProcessed(0);
      setOverlay([]);
    } catch (err) {
      // handled by useWebcam state
    }
  };

  const handleStop = () => {
    stop();
    setRunning(false);
    setOverlay([]);
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  };

  // Main recognition loop tick
  useEffect(() => {
    if (!running || !ready || !videoRef.current) {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
      return;
    }

    loopRef.current = setInterval(async () => {
      if (inFlightRef.current || scanNotification) return;
      inFlightRef.current = true;
      try {
        const results = await recognizeAllFaces(
          videoRef.current,
          allStudents,
          MATCH_THRESHOLD,
        );

        setFramesProcessed((f) => f + 1);

        // Map visual bounding boxes for overlay
        const newOverlay = results.map((r) => ({
          box: r.box,
          name: "Unknown",
          distance: r.match.distance,
          student_id: r.match.student_id,
          newlyMarked: false,
        }));

        setOverlay(newOverlay);

        // Mark attendance via backend for each detected student
        for (const o of newOverlay) {
          const student = allStudents.find((s) => s.student_id === o.student_id);
          if (student) {
            o.name = student.name;
            const isEnrolled = students.some((s) => s.student_id === o.student_id);
            const time = new Date().toLocaleTimeString();

            if (!isEnrolled) {
              // State 3: Not Enrolled popup and feed event
              if (!scanNotification || scanNotification.student_id !== student.student_id) {
                setScanNotification({
                  type: "not_enrolled",
                  student_id: student.student_id,
                  name: student.name,
                  title: "Not Enrolled",
                  message: `Not registered for ${course}`,
                });
              }

              setEvents((e) => {
                if (e.some((ev) => ev.student_id === student.student_id && ev.note === "Not Enrolled")) return e;
                return [
                  {
                    id: Math.random().toString(),
                    student_id: student.student_id,
                    name: student.name,
                    time,
                    status: "Absent",
                    distance: o.distance,
                    note: "Not Enrolled",
                  },
                  ...e.slice(0, 49),
                ];
              });
              continue;
            }

            try {
              const res = await api.markAttendance(o.student_id, course);
              if (res) {
                o.newlyMarked = true;
                setOverlay([...newOverlay]); // trigger re-render of overlay border colors

                // State 1: Newly marked Present popup
                if (!scanNotification || scanNotification.student_id !== student.student_id) {
                  setScanNotification({
                    type: "success",
                    student_id: student.student_id,
                    name: student.name,
                    title: "Attendance Confirmed",
                    message: "Successfully marked Present",
                  });
                }

                // Log to event feed
                setEvents((e) => {
                  if (e.some((ev) => ev.student_id === student.student_id && ev.status === "Present" && !ev.note)) return e;
                  return [
                    {
                      id: Math.random().toString(),
                      student_id: student.student_id,
                      name: student.name,
                      time,
                      status: "Present",
                      distance: o.distance,
                    },
                    ...e.slice(0, 49),
                  ];
                });
                refreshToday();
              } else {
                // State 2: Already Marked check
                const existingRecord = records.find((r) => r.student_id === student.student_id);
                if (existingRecord) {
                  if (!scanNotification || scanNotification.student_id !== student.student_id) {
                    setScanNotification({
                      type: "already",
                      student_id: student.student_id,
                      name: student.name,
                      title: "Already Checked In",
                      message: "Has already attended today",
                    });
                  }

                  setEvents((e) => {
                    if (e.some((ev) => ev.student_id === student.student_id && ev.note === "Already Marked")) return e;
                    return [
                      {
                        id: Math.random().toString(),
                        student_id: student.student_id,
                        name: student.name,
                        time,
                        status: existingRecord.status,
                        distance: o.distance,
                        note: "Already Marked",
                      },
                      ...e.slice(0, 49),
                    ];
                  });
                }
              }
            } catch (err) {
              // ignore duplicate marking logs
            }
          }
        }
      } catch (err) {
        // quiet error
      } finally {
        inFlightRef.current = false;
      }
    }, TICK_MS);

    return () => {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
    };
  }, [running, ready, students, course, allStudents, records, scanNotification]);

  // Clean stop on unmount
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distanceToConfidence = (d) => {
    // 0 = 100% confidence, MATCH_THRESHOLD = 0% confidence
    const raw = Math.round((1 - d / MATCH_THRESHOLD) * 100);
    return Math.max(0, Math.min(100, raw));
  };

  const toOverlayStyle = (box) => {
    if (!videoRef.current) return {};
    const vw = videoRef.current.videoWidth || 640;
    const vh = videoRef.current.videoHeight || 480;

    const left = `${(box.x / vw) * 100}%`;
    const top = `${(box.y / vh) * 100}%`;
    const width = `${(box.width / vw) * 100}%`;
    const height = `${(box.height / vh) * 100}%`;

    return { left, top, width, height };
  };

  const matchedCount = overlay.length;
  const newlyMarkedCount = overlay.filter((o) => o.newlyMarked).length;
  const todayDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      {/* Webcam scanner feed */}
      <div className="lg:col-span-2 glass-panel border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-indigo-400" />
              Live AI Scanner Feed
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a course and activate scanner to start automated attendance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Course:</span>
            <CustomSelect
              value={course}
              onChange={setCourse}
              disabled={running}
              className="min-w-[240px]"
              options={courses.map((c) => ({
                value: c.course_id,
                label: `${c.course_id} (${c.name})`,
              }))}
            />
          </div>
        </div>

        {/* Video feed container */}
        <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800/60 shadow-inner group">
          <video
            ref={videoRef}
            className="w-full h-full object-cover -scale-x-100"
            playsInline
            muted
          />

          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-2.5 select-none bg-slate-950/80">
              <VideoOff className="w-10 h-10 text-slate-700 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider">Camera off</p>
            </div>
          )}

          {ready && running && (
            <>
              {/* Scan Overlay animation bar */}
              <div className="animate-scan z-10" />

              {/* Bounding boxes overlays on detected faces */}
              {overlay.map((f, i) => {
                const conf = distanceToConfidence(f.distance);
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={`${f.student_id}-${i}`}
                    className={`absolute border-2 rounded-xl transition-all duration-200 pointer-events-none z-10 ${
                      f.newlyMarked
                        ? "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.7)]"
                        : "border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    }`}
                    style={toOverlayStyle(f.box)}
                  >
                    <div
                      className={`absolute -top-7 left-0 px-2 py-0.5 rounded-lg text-[9px] font-bold whitespace-nowrap shadow-md border ${
                        f.newlyMarked
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "bg-indigo-500 text-white border-indigo-400"
                      }`}
                    >
                      {f.newlyMarked ? "✓ " : ""}
                      {f.name} · {conf}%
                    </div>
                  </motion.div>
                );
              })}

              {/* Scanning indicator */}
              {overlay.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-950/80 border border-slate-800 backdrop-blur flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    Scanning for faces…
                  </div>
                </div>
              )}

              {/* LIVE Recording dot indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-2 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                SCANNING
              </div>

              {/* Stats badges inside web camera screen */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <span className="text-[10px] font-bold text-slate-300 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-800 font-mono">
                  {course}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition duration-300 ${
                    matchedCount > 0
                      ? "text-emerald-300 bg-emerald-500/20 border-emerald-500/30 shadow-md"
                      : "text-slate-400 bg-slate-950/80 border-slate-800"
                  }`}
                >
                  {matchedCount} detected
                </span>
              </div>

              {/* Frame counter stats overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-medium text-slate-300 bg-slate-950/85 px-3 py-2 rounded-xl border border-slate-800/80 backdrop-blur z-10">
                <span className="flex items-center gap-1.5">
                  Multi-face scan · frame #{framesProcessed}
                  {newlyMarkedCount > 0 && (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      +{newlyMarkedCount} marked
                    </span>
                  )}
                </span>
                <span className="font-mono text-slate-400">
                  {students.length} enrolled · {todayCount} present today
                </span>
              </div>
            </>
          )}

          {/* HUD Notification Popup Overlay */}
          <AnimatePresence>
            {scanNotification && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15 }}
                className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm z-30"
              >
                <motion.div
                  initial={{ y: 8 }}
                  animate={{ y: 0 }}
                  className={`max-w-xs sm:max-w-md w-full border rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4 relative ${
                    scanNotification.type === "success"
                      ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100 shadow-emerald-500/5"
                      : scanNotification.type === "already"
                      ? "bg-indigo-950/90 border-indigo-500/30 text-indigo-100 shadow-indigo-500/5"
                      : "bg-amber-950/90 border-amber-500/30 text-amber-100 shadow-amber-500/5"
                  }`}
                >
                  {/* Close button to stop scanner */}
                  <button
                    onClick={() => {
                      handleStop();
                      setScanNotification(null);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer"
                    title="Close and Stop Scanner"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  {/* Animated Icon Container */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                      scanNotification.type === "success"
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                        : scanNotification.type === "already"
                        ? "bg-indigo-500/20 border-indigo-400 text-indigo-400"
                        : "bg-amber-500/20 border-amber-400 text-amber-400"
                    }`}
                  >
                    {scanNotification.type === "success" ? (
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3.5}
                        stroke="currentColor"
                        className="w-7 h-7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.35, ease: "easeOut", delay: 0.2 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </motion.svg>
                    ) : scanNotification.type === "already" ? (
                      <Info className="w-7 h-7" />
                    ) : (
                      <ShieldAlert className="w-7 h-7" />
                    )}
                  </motion.div>

                  <div className="space-y-1.5 w-full">
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest ${
                      scanNotification.type === "success"
                        ? "text-emerald-400"
                        : scanNotification.type === "already"
                        ? "text-indigo-400"
                        : "text-amber-400"
                    }`}>
                      {scanNotification.title}
                    </h3>
                    <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate w-full px-2">
                      {scanNotification.name}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {scanNotification.message}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {modelError && (
          <div className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{modelError}</span>
          </div>
        )}
        {webcamError && (
          <div className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{webcamError}</span>
          </div>
        )}

        {/* Action Controls buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            {!running ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                disabled={!modelReady}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 animate-pulse"
              >
                <Play className="w-4.5 h-4.5" />
                Start Scanner
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleStop}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white rounded-lg font-bold shadow-lg shadow-rose-500/20 transition duration-300 flex items-center gap-1.5"
              >
                <Square className="w-4.5 h-4.5 fill-white" />
                Stop Scanner
              </motion.button>
            )}
          </div>
          <div className="text-[9px] font-semibold text-slate-500 max-w-sm text-right leading-relaxed flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            Runs a local 128-d FaceNet matcher, auto-logging attendance to MongoDB.
          </div>
        </div>
      </div>

      {/* Event feed log */}
      <div className="glass-panel border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col self-stretch">
        <div className="flex items-center justify-between mb-4.5">
          <h2 className="font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
            Live Activity Feed
          </h2>
          {running && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 flex items-center gap-1 select-none">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
              active
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[460px]">
          {events.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-20 flex flex-col items-center gap-2">
              <Clock className="w-8 h-8 text-slate-700" />
              No face detections recorded.
            </div>
          )}
          
          <AnimatePresence>
            {events.map((ev, i) => {
              const conf = distanceToConfidence(ev.distance);
              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  key={ev.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/60 transition duration-300"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-sm font-semibold text-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <UserCheck className={`w-4 h-4 shrink-0 ${
                          ev.note === "Already Marked"
                            ? "text-indigo-400"
                            : ev.note === "Not Enrolled"
                            ? "text-amber-500"
                            : "text-emerald-400"
                        }`} />
                        <span className="truncate">{ev.name}</span>
                      </span>
                      {ev.note && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          ev.note === "Already Marked"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {ev.note}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span>{ev.student_id}</span>
                      <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
                      <span className="truncate max-w-[80px]">{course}</span>
                      <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
                      <span className="text-indigo-400 font-bold shrink-0">{conf}% confidence</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-900/50 border border-slate-800 px-2 py-0.5 rounded-full font-mono shrink-0">
                    {ev.time}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}