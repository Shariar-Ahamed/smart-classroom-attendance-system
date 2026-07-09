import { useEffect, useState, useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { api } from "../services/api";
import { BookOpen, Users, Search, GraduationCap, Calendar, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FacultyCourses() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [students, setStudents] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  // Load faculty courses on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const cList = await api.listCourses();
        setCourses(cList);
        if (cList.length > 0) {
          setSelectedCourseId(cList[0].course_id);
        }
      } catch (err) {
        setError(err.message || "Failed to load assigned courses.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reload student list when active course selection changes
  useEffect(() => {
    if (!selectedCourseId) {
      setStudents([]);
      return;
    }
    (async () => {
      try {
        setLoadingStudents(true);
        const sList = await api.listStudents(selectedCourseId);
        setStudents(sList);
      } catch (err) {
        console.error("Failed to load course student directory:", err);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [selectedCourseId]);

  // Find details of the active selected course
  const activeCourse = useMemo(() => {
    return courses.find((c) => c.course_id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Client-side search filter for students inside active directory
  const filteredStudents = useMemo(() => {
    if (!q.trim()) return students;
    return students.filter(
      (s) =>
        s.student_id.toLowerCase().includes(q.toLowerCase()) ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        (s.batch && s.batch.toLowerCase().includes(q.toLowerCase()))
    );
  }, [students, q]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Loading assigned classroom courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector and course details banner */}
      <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl relative z-20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-5 relative min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 shrink-0">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-slate-100 truncate">
              {activeCourse ? activeCourse.name : "Assigned Courses"}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider truncate">
              {selectedCourseId ? `${selectedCourseId} · ${students.length} Enrolled Students` : "Select a course to view details"}
            </p>
          </div>
        </div>

        {/* Dropdown to select course */}
        <div className="w-60 shrink-0 relative">
          <CustomSelect
            value={selectedCourseId}
            onChange={(val) => {
              setSelectedCourseId(val);
              setQ("");
            }}
            options={courses.map((c) => ({
              value: c.course_id,
              label: `${c.course_id} — ${c.name}`,
            }))}
            placeholder="Select course..."
            searchable={true}
          />
        </div>
      </div>

      {error && (
        <div className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-4 py-3 rounded-xl flex items-center gap-2 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Main Student list card */}
      <div className="glass-panel border border-slate-800/80 p-6 rounded-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-indigo-400" />
              Class Enrollment Directory
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              List of all students registered to attend {selectedCourseId || "this course"}
            </p>
          </div>

          {/* Search box to filter students */}
          {students.length > 0 && (
            <div className="flex items-center gap-2 max-w-xs w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition">
              <Search className="w-4 h-4 text-slate-600 shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by ID or name..."
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none w-full placeholder-slate-600 font-semibold"
              />
            </div>
          )}
        </div>

        {loadingStudents ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold">Fetching cohort registration details...</p>
          </div>
        ) : !selectedCourseId ? (
          <div className="text-center py-16 text-slate-500 text-xs italic">
            Please assign courses to this faculty account first under Admin Course Allocations.
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center gap-2">
            <GraduationCap className="w-9 h-9 text-slate-700" />
            <p className="font-medium text-slate-400">No students enrolled in this course yet.</p>
            <p className="text-[10px] text-slate-500">Admin can register students to this course from Course settings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800/80">
                  <th className="py-2.5 px-3">Student ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Semester</th>
                  <th className="py-2.5 px-3 text-right">Face Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs italic">
                      No matching students found in this course cohort.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.student_id} className="hover:bg-slate-800/10 transition text-slate-300">
                      <td className="py-3 px-3 font-mono font-bold text-xs text-indigo-400">
                        {s.student_id}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-100">{s.name}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs">{s.department}</td>
                      <td className="py-3 px-3 font-mono text-xs">{s.batch}</td>
                      <td className="py-3 px-3 font-bold text-slate-200 text-xs">Sec {s.section || "A"}</td>
                      <td className="py-3 px-3 font-semibold text-xs">{s.semester || "N/A"}</td>
                      <td className="py-3 px-3 text-right">
                        {s.face_encoding && s.face_encoding.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Face Active ✅
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Pending Scan ❌
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
