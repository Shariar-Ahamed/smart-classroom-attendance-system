import { useEffect, useState, useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import { DEPARTMENTS, generateSemesters } from "../constants/departments";
import { BookOpen, UserCheck, GraduationCap, Plus, Trash2, Edit3, Save, CheckSquare, Square, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CoursesManager() {
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" or "assignments"
  const [assignmentSubTab, setAssignmentSubTab] = useState("student"); // "student" or "faculty"

  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  
  // Assignment lists for display/editing
  const [facultyAssignments, setFacultyAssignments] = useState([]);
  const [studentRegistrations, setStudentRegistrations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // --- Form States for Course Catalog ---
  const [selectedCatalogDept, setSelectedCatalogDept] = useState("Computer Science & Engineering");
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [totalClasses, setTotalClasses] = useState(20);
  const [editingCourse, setEditingCourse] = useState(null); // holds course object if editing

  // --- Form States for Assignments ---
  const [assignDept, setAssignDept] = useState("Computer Science & Engineering");
  const [assignSemester, setAssignSemester] = useState(generateSemesters()[0]);
  
  // Student assign form state
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudentCourses, setSelectedStudentCourses] = useState([]); // array of course_ids

  // Faculty assign form state
  const [selectedFacultyUsername, setSelectedFacultyUsername] = useState("");
  const [selectedFacultyCourses, setSelectedFacultyCourses] = useState([]); // array of course_ids

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [cList, sList, fList, fAssigns, sRegs] = await Promise.all([
        api.listCourses(),
        api.listStudents(),
        api.listFaculties(),
        api.getFacultyAssignments(),
        api.getStudentRegistrations(),
      ]);

      setCourses(cList);
      setStudents(sList);
      setFaculties(fList);
      setFacultyAssignments(fAssigns);
      setStudentRegistrations(sRegs);
    } catch (err) {
      setError(err.message || "Failed to load database information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cleanDept = (dept) => {
    if (!dept) return "";
    return dept.replace(/^Department of\s+/i, "").trim().toLowerCase();
  };

  // Filter courses for catalog display based on selected department
  const filteredCatalogCourses = useMemo(() => {
    return courses.filter((c) => cleanDept(c.department) === cleanDept(selectedCatalogDept));
  }, [courses, selectedCatalogDept]);

  // Filter students for dropdown based on department selection
  const filteredStudents = useMemo(() => {
    return students.filter((s) => cleanDept(s.department) === cleanDept(assignDept));
  }, [students, assignDept]);

  // Filter faculties for dropdown based on department selection
  const filteredFaculties = useMemo(() => {
    return faculties.filter((f) => cleanDept(f.department) === cleanDept(assignDept));
  }, [faculties, assignDept]);

  // Available courses in the selected department for assigning
  const availableDeptCourses = useMemo(() => {
    return courses.filter((c) => cleanDept(c.department) === cleanDept(assignDept));
  }, [courses, assignDept]);

  // Handle student dropdown selection -> load their current registrations
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudentCourses([]);
      return;
    }
    const match = studentRegistrations.find(
      (r) => r.student_id === selectedStudentId && r.semester === assignSemester
    );
    setSelectedStudentCourses(match ? match.course_ids : []);
  }, [selectedStudentId, assignSemester, studentRegistrations]);

  // Handle faculty dropdown selection -> load their current assignments
  useEffect(() => {
    if (!selectedFacultyUsername) {
      setSelectedFacultyCourses([]);
      return;
    }
    const match = facultyAssignments.find(
      (a) => a.username === selectedFacultyUsername && a.department === assignDept
    );
    setSelectedFacultyCourses(match ? match.course_ids : []);
  }, [selectedFacultyUsername, assignDept, facultyAssignments]);

  // Handle saving course to catalog
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!courseId.trim() || !courseName.trim()) {
      setError("Course ID and Course Name are required.");
      return;
    }
    try {
      await api.saveCourse({
        course_id: courseId.trim().toUpperCase(),
        name: courseName.trim(),
        department: selectedCatalogDept,
        total_classes: Number(totalClasses),
      });
      setSuccess(`✓ Course ${courseId.toUpperCase()} saved to catalog.`);
      // Reset input fields
      setCourseId("");
      setCourseName("");
      setTotalClasses(20);
      setEditingCourse(null);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to save course.");
    }
  };

  const handleEditClick = (c) => {
    setEditingCourse(c);
    setCourseId(c.course_id);
    setCourseName(c.name);
    setTotalClasses(c.total_classes);
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setCourseId("");
    setCourseName("");
    setTotalClasses(20);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setError("");
    setSuccess("");
    try {
      await api.removeCourse(confirmDelete);
      setSuccess(`✓ Course ${confirmDelete} deleted from catalog.`);
      setConfirmDelete(null);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to delete course.");
    }
  };

  // Toggle student course selections
  const toggleStudentCourse = (cid) => {
    setSelectedStudentCourses((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  // Toggle faculty course selections
  const toggleFacultyCourse = (cid) => {
    setSelectedFacultyCourses((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  // Save student registration to database
  const handleSaveStudentRegistration = async () => {
    setError("");
    setSuccess("");
    if (!selectedStudentId) {
      setError("Please select a student first.");
      return;
    }
    try {
      await api.saveStudentRegistration({
        student_id: selectedStudentId,
        department: assignDept,
        semester: assignSemester,
        course_ids: selectedStudentCourses,
      });
      setSuccess(`✓ Course registration saved for student ${selectedStudentId}.`);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to register courses.");
    }
  };

  // Save faculty assignments to database
  const handleSaveFacultyAssignment = async () => {
    setError("");
    setSuccess("");
    if (!selectedFacultyUsername) {
      setError("Please select a faculty member first.");
      return;
    }
    try {
      await api.saveFacultyAssignment({
        username: selectedFacultyUsername,
        department: assignDept,
        course_ids: selectedFacultyCourses,
      });
      setSuccess(`✓ Course assignments saved for faculty ${selectedFacultyUsername}.`);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to assign courses.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Syncing courses configuration with MongoDB…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner / Tab bar header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Course Settings & Allocations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage course catalog and student/faculty registrations
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/85 shadow-inner">
          <button
            onClick={() => {
              setActiveTab("catalog");
              setError("");
              setSuccess("");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide uppercase transition ${
              activeTab === "catalog"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-indigo-500/10 font-bold"
                : "text-slate-400 hover:text-slate-200 cursor-pointer"
            }`}
          >
            Course Catalog
          </button>
          <button
            onClick={() => {
              setActiveTab("assignments");
              setError("");
              setSuccess("");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide uppercase transition ${
              activeTab === "assignments"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-indigo-500/10 font-bold"
                : "text-slate-400 hover:text-slate-200 cursor-pointer"
            }`}
          >
            Course Assignments
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-4 py-3 rounded-xl flex items-center gap-2 font-semibold"
          >
            ⚠️ {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-4 py-3 rounded-xl flex items-center gap-2 font-semibold animate-pulse"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: COURSE CATALOG */}
      {activeTab === "catalog" && (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Catalog editor form */}
          <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-100 mb-0.5">
                {editingCourse ? "Modify Course Catalog" : "Add New Course"}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Store course in catalog under selected department
              </p>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Department
                </label>
                <CustomSelect
                  value={selectedCatalogDept}
                  onChange={(val) => {
                    setSelectedCatalogDept(val);
                    handleCancelEdit();
                  }}
                  options={DEPARTMENTS}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Course ID (Code)
                </label>
                <input
                  type="text"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  placeholder="e.g. CSE-101"
                  disabled={!!editingCourse}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-slate-600 font-semibold transition disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Course Title (Name)
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Intro to Programming"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm placeholder-slate-600 font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Total Lecture Classes
                </label>
                <input
                  type="number"
                  value={totalClasses}
                  onChange={(e) => setTotalClasses(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm font-semibold transition"
                  min={1}
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                {editingCourse && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingCourse ? "Update Course" : "Save Course"}
                </button>
              </div>
            </form>
          </div>

          {/* Catalog Listing Table */}
          <div className="lg:col-span-2 glass-panel border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-100">
                  {selectedCatalogDept} Catalog
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {filteredCatalogCourses.length} courses listed
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800/80">
                    <th className="py-2.5 px-3">Course Code</th>
                    <th className="py-2.5 px-3">Course Title</th>
                    <th className="py-2.5 px-3">Lectures</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredCatalogCourses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 text-xs italic">
                        No courses added under this department catalog yet.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogCourses.map((c) => (
                      <tr key={c.course_id} className="hover:bg-slate-800/10 transition text-slate-300">
                        <td className="py-3 px-3 font-mono font-bold text-xs text-indigo-400">
                          {c.course_id}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-100">{c.name}</td>
                        <td className="py-3 px-3 font-mono text-xs">{c.total_classes} lectures</td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => handleEditClick(c)}
                            className="p-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                            title="Edit Title/Classes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(c.course_id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSE ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <div className="space-y-6">
          {/* Department Filter for allocation panel */}
          <div className="glass-panel border border-slate-800/80 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4 relative z-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-100">Configure Department Allocations</h3>
                <p className="text-[9px] text-slate-500 font-semibold">Select department to view and allocate courses</p>
              </div>
            </div>

            <div className="w-64">
              <CustomSelect
                value={assignDept}
                onChange={(val) => {
                  setAssignDept(val);
                  setSelectedStudentId("");
                  setSelectedFacultyUsername("");
                }}
                options={DEPARTMENTS}
              />
            </div>
          </div>

          {/* Allocation Sub-Tab selectors */}
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left Sidebar: Select User type and Person */}
            <div className="glass-panel border border-slate-800/80 p-5 rounded-2xl space-y-4">
              {/* Selector Student/Faculty */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setAssignmentSubTab("student")}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition uppercase cursor-pointer ${
                    assignmentSubTab === "student"
                      ? "bg-slate-850 text-white border border-slate-800"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Student Cohorts
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentSubTab("faculty")}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition uppercase cursor-pointer ${
                    assignmentSubTab === "faculty"
                      ? "bg-slate-850 text-white border border-slate-800"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Faculty Members
                </button>
              </div>

              {/* STUDENT ALLOCATION PANEL */}
              {assignmentSubTab === "student" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Select Semester
                    </label>
                    <CustomSelect
                      value={assignSemester}
                      onChange={(val) => setAssignSemester(val)}
                      options={generateSemesters()}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Select Student
                    </label>
                    <CustomSelect
                      value={selectedStudentId}
                      onChange={(val) => setSelectedStudentId(val)}
                      options={filteredStudents.map((s) => ({
                        value: s.student_id,
                        label: `${s.student_id} — ${s.name}`,
                      }))}
                      placeholder={
                        filteredStudents.length === 0
                          ? "No students registered in this dept"
                          : "Select student..."
                      }
                      disabled={filteredStudents.length === 0}
                      searchable={true}
                    />
                  </div>
                </div>
              ) : (
                /* FACULTY ALLOCATION PANEL */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Select Faculty Member
                    </label>
                    <CustomSelect
                      value={selectedFacultyUsername}
                      onChange={(val) => setSelectedFacultyUsername(val)}
                      options={filteredFaculties.map((f) => ({
                        value: f.username,
                        label: `${f.username} (${f.full_name})`,
                      }))}
                      placeholder={
                        filteredFaculties.length === 0
                          ? "No faculty profiles in this dept"
                          : "Select faculty..."
                      }
                      disabled={filteredFaculties.length === 0}
                      searchable={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Checkbox allocation checklist */}
            <div className="lg:col-span-2 glass-panel border border-slate-800/80 p-5 rounded-2xl space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  Select Registered Courses
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  Check the boxes of courses from the {assignDept} catalog to allocate
                </p>
              </div>

              {/* List of Catalog Courses with checkboxes */}
              <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-3 max-h-80 overflow-y-auto divide-y divide-slate-850">
                {availableDeptCourses.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs italic">
                    First add courses under the {assignDept} department catalog tab.
                  </div>
                ) : (
                  availableDeptCourses.map((c) => {
                    const isChecked =
                      assignmentSubTab === "student"
                        ? selectedStudentCourses.includes(c.course_id)
                        : selectedFacultyCourses.includes(c.course_id);
                    
                    const handleToggle = () => {
                      if (assignmentSubTab === "student") {
                        if (!selectedStudentId) return;
                        toggleStudentCourse(c.course_id);
                      } else {
                        if (!selectedFacultyUsername) return;
                        toggleFacultyCourse(c.course_id);
                      }
                    };

                    return (
                      <button
                        key={c.course_id}
                        type="button"
                        onClick={handleToggle}
                        disabled={
                          assignmentSubTab === "student"
                            ? !selectedStudentId
                            : !selectedFacultyUsername
                        }
                        className="w-full flex items-center justify-between py-3 px-2 text-left hover:bg-slate-800/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-slate-400">
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-indigo-400" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{c.name}</div>
                            <div className="text-[9px] font-mono text-slate-500 font-semibold mt-0.5">{c.course_id}</div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {c.total_classes} classes
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-2">
                {assignmentSubTab === "student" ? (
                  <button
                    type="button"
                    onClick={handleSaveStudentRegistration}
                    disabled={!selectedStudentId || availableDeptCourses.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold transition shadow-lg text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    Save Student Registration
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveFacultyAssignment}
                    disabled={!selectedFacultyUsername || availableDeptCourses.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold transition shadow-lg text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    Save Faculty Assignments
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Course Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Course Catalog Entry"
        message={`Are you sure you want to delete course ${confirmDelete} from the catalog? This action will remove the course and cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
