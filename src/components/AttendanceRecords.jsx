import { useEffect, useState, useMemo } from "react";
import CustomSelect from "./CustomSelect";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import { useAuth } from "../context/AuthContext";
import CustomDatePicker from "./CustomDatePicker";

export const formatRecordDateTime = (dateStr, timeStr) => {
  if (!dateStr) return { date: "", time: "" };
  const parts = dateStr.split("-");
  const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
  const formattedTime = !timeStr || timeStr === "00:00:00" ? "--" : timeStr;
  return {
    date: formattedDate,
    time: formattedTime
  };
};

export default function AttendanceRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState("");
  const [course, setCourse] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canManage = user?.role === "ADMIN" || user?.role === "FACULTY";

  const load = async () => {
    let recs = await api.getAttendance({
      date: date || undefined,
      course_id: course || undefined,
    });
    if (statusFilter !== "all") {
      recs = recs.filter((r) => r.status === statusFilter);
    }
    setRecords(recs);
  };

  useEffect(() => {
    (async () => {
      setCourses(await api.listCourses());
      setStudents(await api.listStudents());
    })();
  }, []);

  const studentDeptMap = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      map.set(s.student_id, s.department);
    }
    return map;
  }, [students]);

  const cleanDept = (dept) => (dept || "").replace(/^Department of\s+/i, "").trim().toLowerCase();

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (user?.role === "FACULTY" && user?.department) {
        const studentDept = studentDeptMap.get(r.student_id);
        return cleanDept(studentDept) === cleanDept(user.department);
      }
      return true;
    });
  }, [records, studentDeptMap, user]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, course, statusFilter]);

  const changeStatus = async (id, status) => {
    await api.updateAttendanceStatus(id, status);
    setEditingId(null);
    load();
  };

  const removeRecord = (id) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteAttendance(confirmDelete);
      setConfirmDelete(null);
      load();
    } catch (err) {
      alert(err.message || "Failed to delete attendance record.");
    }
  };

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download PDF reports.");
      return;
    }
    
    const formattedDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const coursePart = course ? course.replace(/[^a-zA-Z0-9]/g, "_") : "All_Courses";
    const datePart = date ? date.replace(/[^a-zA-Z0-9]/g, "_") : "All_Dates";
    const title = `DIU_Attendance_${coursePart}_${datePart}`;

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #0f172a;
              padding: 30px;
              margin: 0;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .logo-area {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-img {
              height: 48px;
              width: auto;
            }
            .brand-title {
              margin: 0;
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
            }
            .brand-subtitle {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-area {
              text-align: right;
            }
            .title-area h1 {
              font-size: 18px;
              margin: 0;
              color: #0f766e;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .title-area p {
              font-size: 10px;
              margin: 3px 0 0 0;
              color: #64748b;
              font-weight: 500;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px;
              margin-bottom: 24px;
              font-size: 11px;
            }
            .meta-item span {
              display: block;
              color: #64748b;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .meta-item strong {
              color: #0f172a;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
              font-size: 11px;
            }
            th {
              background: #f1f5f9;
              color: #475569;
              font-weight: 600;
              text-align: left;
              padding: 8px 10px;
              border-bottom: 2px solid #cbd5e1;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.5px;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #e2e8f0;
              color: #334155;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            .badge {
              display: inline-flex;
              align-items: center;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 9px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .badge-present {
              background: #dcfce7;
              color: #15803d;
            }
            .badge-absent {
              background: #fee2e2;
              color: #b91c1c;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              font-size: 9px;
              color: #64748b;
              text-align: center;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-area">
              <img src="${window.location.origin}/src/assets/DIU-Single-Logo.png" class="logo-img" alt="DIU Logo" />
              <div>
                <h2 class="brand-title">Daffodil International University</h2>
                <span class="brand-subtitle">Smart Attend AI System</span>
              </div>
            </div>
            <div class="title-area">
              <h1>ATTENDANCE REPORT</h1>
              <p>Generated on ${formattedDate}</p>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span>Course Code</span>
              <strong>${course || "All Courses"}</strong>
            </div>
            <div class="meta-item">
              <span>Date Filter</span>
              <strong>${date || "All Dates"}</strong>
            </div>
            <div class="meta-item">
              <span>Attendance Status</span>
              <strong>${statusFilter === "all" ? "All Statuses" : statusFilter}</strong>
            </div>
            <div class="meta-item">
              <span>Records Count</span>
              <strong>${filteredRecords.length} student(s)</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Course ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(r => {
                const formatted = formatRecordDateTime(r.date, r.time);
                const statusBadgeClass = r.status === 'Present' ? 'badge-present' : 'badge-absent';
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 500;">${r.student_id}</td>
                    <td><strong>${r.student_name}</strong></td>
                    <td style="font-family: monospace;">${r.course_id}</td>
                    <td>${formatted.date}</td>
                    <td>${formatted.time}</td>
                    <td><span class="badge ${statusBadgeClass}">${r.status}</span></td>
                    <td style="text-transform: uppercase; font-size: 9px; color: #64748b;">${r.source || 'auto'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Smart Attend System © ${new Date().getFullYear()} Daffodil International University. All rights reserved.</p>
            <p style="font-size: 8px; margin-top: 3px; color: #94a3b8;">This report compiles automated biometric scans and manual supervisor check-ins.</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.document.title = title;

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const exportExcel = () => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Attendance Report</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #0f766e; color: white; font-weight: bold; font-family: Calibri, sans-serif; font-size: 11pt; text-align: left; }
            td, th { border: 1px solid #cbd5e1; padding: 6px 12px; font-family: Calibri, sans-serif; font-size: 10pt; }
            .title { font-family: Calibri, sans-serif; font-size: 16pt; font-weight: bold; color: #0f766e; }
            .subtitle { font-family: Calibri, sans-serif; font-size: 10pt; color: #64748b; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="title">Daffodil International University</div>
          <div class="subtitle">Smart Attend AI System - Attendance Report (Generated on ${formattedDate})</div>
          
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Course ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(r => {
                const formatted = formatRecordDateTime(r.date, r.time);
                return `
                  <tr>
                    <td style="mso-number-format:'\\@';">${r.student_id}</td>
                    <td><b>${r.student_name}</b></td>
                    <td>${r.course_id}</td>
                    <td>${formatted.date}</td>
                    <td>${formatted.time}</td>
                    <td style="color: ${r.status === 'Present' ? '#15803d' : '#b91c1c'}; font-weight: bold;">${r.status}</td>
                    <td style="text-transform: uppercase;">${r.source || 'auto'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const coursePart = course ? course.replace(/[^a-zA-Z0-9]/g, "_") : "All_Courses";
    const datePart = date ? date.replace(/[^a-zA-Z0-9]/g, "_") : "All_Dates";
    a.download = `DIU_Attendance_${coursePart}_${datePart}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-100">Attendance Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              GET /api/attendance · {filteredRecords.length} matching record(s) · click
              status to edit
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomDatePicker
              value={date}
              onChange={setDate}
              placeholder="Select date"
            />
            <CustomSelect
              value={course}
              onChange={setCourse}
              placeholder="All courses"
              className="min-w-[150px]"
              options={[
                { value: "", label: "All courses" },
                ...courses.map((c) => ({ value: c.course_id, label: c.course_id })),
              ]}
            />
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All status"
              className="min-w-[130px]"
              options={[
                { value: "all", label: "All status" },
                { value: "Present", label: "Present" },
                { value: "Absent", label: "Absent" },
              ]}
            />
            <button
              onClick={() => {
                setDate("");
                setCourse("");
                setStatusFilter("all");
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
            >
              Reset
            </button>
            <button
              onClick={exportPDF}
              disabled={filteredRecords.length === 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium disabled:opacity-40 transition flex items-center gap-1.5 text-white"
            >
              📄 Export PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={filteredRecords.length === 0}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-40 transition flex items-center gap-1.5 text-white"
            >
              📊 Export Excel
            </button>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-2">📋</div>
            No records match the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2 px-3">Student ID</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Course</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Source</th>
                  <th className="py-2 px-3">Status</th>
                  {canManage && <th className="py-2 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => {
                  const formatted = formatRecordDateTime(r.date, r.time);
                  return (
                    <tr
                      key={r._id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30"
                    >
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                        {r.student_id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-100 font-medium">
                        {r.student_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-xs">
                        {r.course_id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-xs">
                        {formatted.date}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-xs">
                        {formatted.time}
                      </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold ${
                          r.source === "manual"
                            ? "text-purple-300"
                            : "text-indigo-300"
                        }`}
                      >
                        {r.source ?? "auto"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {canManage ? (
                        editingId === r._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => changeStatus(r._id, "Present")}
                              className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30 transition"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => changeStatus(r._id, "Absent")}
                              className="px-2 py-0.5 text-xs rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 transition"
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-0.5 text-xs rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingId(r._id)}
                            title="Click to change status"
                            className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full transition hover:brightness-125 ${
                              r.status === "Present"
                                ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                                : "text-rose-300 bg-rose-500/15 border-rose-500/30"
                            }`}
                          >
                            ● {r.status}
                            <span className="opacity-60 ml-0.5">✎</span>
                          </button>
                        )
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full ${
                            r.status === "Present"
                              ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                              : "text-rose-300 bg-rose-500/15 border-rose-500/30"
                          }`}
                        >
                          ● {r.status}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => removeRecord(r._id)}
                          className="text-xs text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/10 px-2 py-1 rounded transition"
                        >
                          Reset
                        </button>
                      </td>
                    )}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Confirm Reset Modal */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Reset Attendance Record"
        message="Are you sure you want to reset this attendance record? This will delete the record, allowing the student to be scanned again or manually re-marked."
        confirmText="Reset"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}