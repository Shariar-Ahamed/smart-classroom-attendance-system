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
const MATCH_THRESHOLD = 0.50;

// How often to run a recognition pass (TICK_MS = 500 ms = roughly 2 fps)
const TICK_MS = 500;

export default function LiveAttendance({ initialCourseId }) {
  const { videoRef, ready, error: webcamError, start, stop } = useWebcam();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState("");
  const [records, setRecords] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);
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
  const lastNotifiedRef = useRef({});
  const processedStudentsRef = useRef(new Set());

  const triggerNotification = (type, studentId, studentName, title, message) => {
    const now = Date.now();
    const lastTime = lastNotifiedRef.current[studentId] || 0;
    if (now - lastTime < 8000) return;

    lastNotifiedRef.current[studentId] = now;
    const newNotif = {
      id: Math.random().toString(),
      type,
      student_id: studentId,
      name: studentName,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setNotifications((prev) => [newNotif, ...prev].slice(0, 3));

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
    }, 3500);
  };

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
      processedStudentsRef.current.clear();
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
      processedStudentsRef.current.clear();
    } catch (err) {
      // handled by useWebcam state
    }
  };

  const handleStop = () => {
    stop();
    setRunning(false);
    setOverlay([]);
    processedStudentsRef.current.clear();
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
      if (inFlightRef.current) return;
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

            // Skip if already processed in this scanner session
            if (processedStudentsRef.current.has(student.student_id)) {
              o.newlyMarked = true;
              continue;
            }

            const isEnrolled = students.some((s) => s.student_id === o.student_id);
            const time = new Date().toLocaleTimeString();

            if (!isEnrolled) {
              processedStudentsRef.current.add(student.student_id);
              // State 3: Not Enrolled popup and feed event
              triggerNotification(
                "not_enrolled",
                student.student_id,
                student.name,
                "Not Enrolled",
                `Not registered for ${course}`
              );

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
                processedStudentsRef.current.add(student.student_id);
                setOverlay([...newOverlay]); // trigger re-render of overlay border colors

                // State 1: Newly marked Present popup
                triggerNotification(
                  "success",
                  student.student_id,
                  student.name,
                  "Attendance Confirmed",
                  "Successfully marked Present"
                );

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
                  processedStudentsRef.current.add(student.student_id);
                  triggerNotification(
                    "already",
                    student.student_id,
                    student.name,
                    "Already Checked In",
                    "Has already attended today"
                  );

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
  }, [running, ready, students, course, allStudents, records]);

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

    const left = `${((vw - box.x - box.width) / vw) * 100}%`;
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

          {/* Floating non-blocking Toast Queue overlay inside video feed */}
          <div className="absolute bottom-16 right-3 flex flex-col gap-2 z-30 max-w-[240px] w-full pointer-events-none">
            <AnimatePresence>
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95, transition: { duration: 0.2 } }}
                  className={`pointer-events-auto w-full p-2.5 rounded-xl border backdrop-blur-xl shadow-lg flex items-center gap-2.5 relative overflow-hidden select-none ${
                    n.type === "success"
                      ? "bg-emerald-950/85 border-emerald-500/30 text-emerald-100 shadow-emerald-950/20"
                      : n.type === "already"
                      ? "bg-indigo-950/85 border-indigo-500/30 text-indigo-100 shadow-indigo-950/20"
                      : "bg-amber-950/85 border-amber-500/30 text-amber-100 shadow-amber-950/20"
                  }`}
                >
                  {/* Styled indicator ring */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    n.type === "success"
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                      : n.type === "already"
                      ? "bg-indigo-500/20 border-indigo-400 text-indigo-400"
                      : "bg-amber-500/20 border-amber-400 text-amber-400"
                  }`}>
                    {n.type === "success" ? (
                      <span className="font-bold text-sm">✓</span>
                    ) : n.type === "already" ? (
                      <span className="font-bold text-xs">ℹ</span>
                    ) : (
                      <span className="font-bold text-xs">⚠</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-slate-100 truncate">
                      {n.name}
                    </div>
                    <div className="text-[8px] text-slate-300 font-medium truncate mt-0.5">
                      {n.message}
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== n.id))}
                    className="p-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-md shrink-0 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
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