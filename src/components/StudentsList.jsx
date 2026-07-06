import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function StudentsList() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState("");

  const refresh = async () => setStudents(await api.listStudents());
  useEffect(() => {
    refresh();
  }, []);

  const remove = async (id) => {
    if (!confirm(`Remove student ${id}?`)) return;
    await api.removeStudent(id);
    refresh();
  };

  const filtered = students.filter(
    (s) =>
      s.student_id.toLowerCase().includes(q.toLowerCase()) ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.department.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-slate-100">Registered Students</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {students.length} total
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by Student ID"
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-2">🗂️</div>
          {students.length === 0
            ? "No students registered yet."
            : "No matches found."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 px-3">Student ID</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Batch</th>
                <th className="py-2 px-3">Face Enrolled</th>
                <th className="py-2 px-3">Registered</th>
                {user?.role === "ADMIN" && <th className="py-2 px-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.student_id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30"
                >
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-300">
                    {s.student_id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-100 font-medium">
                    {s.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{s.department}</td>
                  <td className="py-2.5 px-3 text-slate-300">{s.batch}</td>
                  <td className="py-2.5 px-3">
                    {s.face_encoding && s.face_encoding.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Yes ✅ <span className="text-[10px] text-emerald-500">({s.face_encoding.length}-d)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        No ❌ <span className="text-[10px] text-amber-500">Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  {user?.role === "ADMIN" && (
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => remove(s.student_id)}
                        className="text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 px-2 py-1 rounded transition"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}