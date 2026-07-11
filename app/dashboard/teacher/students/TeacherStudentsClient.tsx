"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen, Users, Percent, Calendar } from "lucide-react";

interface AttendanceSummary {
  totalClasses: number;
  attended: number;
  percentage: number;
}

interface Student {
  id: number;
  name: string;
  rollNumber: string | null;
  branch: string;
  tuitionPaid: boolean;
  username: string;
  email: string | null;
  attendance: AttendanceSummary;
}

interface SubjectGroup {
  id: number;
  name: string;
  students: Student[];
}

interface Props {
  subjects: SubjectGroup[];
}

export default function TeacherStudentsClient({ subjects }: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(
    subjects[0]?.id || 0
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Get active subject
  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!activeSubject) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return activeSubject.students;

    return activeSubject.students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(query)) ||
        s.username.toLowerCase().includes(query) ||
        s.branch.toLowerCase().includes(query)
    );
  }, [activeSubject, searchQuery]);

  // Compute statistics for the active subject
  const stats = useMemo(() => {
    if (!activeSubject || activeSubject.students.length === 0) {
      return { total: 0, avgAttendance: 0, tuitionPaidCount: 0 };
    }
    const students = activeSubject.students;
    const total = students.length;
    const totalPercentage = students.reduce((acc, s) => acc + s.attendance.percentage, 0);
    const avgAttendance = Math.round(totalPercentage / total);
    const tuitionPaidCount = students.filter((s) => s.tuitionPaid).length;

    return { total, avgAttendance, tuitionPaidCount };
  }, [activeSubject]);

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <BookOpen className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm font-medium">No subjects assigned to your profile.</p>
        <p className="text-zinc-400 text-xs mt-1">Please contact the administrator to assign subjects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subject Filter Tabs */}
      <div className="flex bg-zinc-100 p-1.5 rounded-xl border border-zinc-200 text-xs font-semibold self-start max-w-max flex-wrap gap-1">
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => {
              setSelectedSubjectId(sub.id);
              setSearchQuery("");
            }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              selectedSubjectId === sub.id
                ? "bg-white text-zinc-950 shadow-sm border border-zinc-200/50"
                : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {sub.name}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {activeSubject && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-zinc-600 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Enrolled Students</p>
              <p className="text-2xl font-bold text-zinc-950 mt-0.5">{stats.total}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-zinc-650 shrink-0">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Average Attendance</p>
              <p className="text-2xl font-bold text-zinc-950 mt-0.5">{stats.avgAttendance}%</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-zinc-650 shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Tuition Status</p>
              <p className="text-2xl font-bold text-zinc-950 mt-0.5">
                {stats.tuitionPaidCount} / {stats.total} Paid
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
        {/* Search Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search students by name, roll number, or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 text-zinc-950 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Students Table */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-zinc-450 text-sm border-2 border-dashed border-zinc-100 rounded-xl">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto border border-zinc-100 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Roll Number</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Branch</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Tuition Fees</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredStudents.map((student, i) => {
                  const att = student.attendance;
                  const isLowAttendance = att.percentage < 75;

                  return (
                    <tr key={student.id} className="hover:bg-zinc-50/40 transition-colors">
                      <td className="px-4 py-4 text-zinc-400 text-xs font-medium">{i + 1}</td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-zinc-950">{student.name}</p>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">{student.username}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-zinc-550 font-mono text-xs">
                        {student.rollNumber || <span className="text-zinc-300 italic">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200/50 font-medium">
                          {student.branch}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {student.tuitionPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-250 font-medium">
                            ✓ Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-250 font-medium">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1.5 max-w-[180px]">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className={isLowAttendance ? "text-rose-600 font-bold" : "text-zinc-700"}>
                              {att.percentage}%
                            </span>
                            <span className="text-zinc-400 font-normal">
                              ({att.attended}/{att.totalClasses} classes)
                            </span>
                          </div>
                          <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                isLowAttendance ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(att.percentage, 100)}%` }}
                            />
                          </div>
                          {isLowAttendance && att.totalClasses > 0 && (
                            <p className="text-[10px] text-rose-500 font-medium">
                              ⚠️ Attendance is below 75%
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
