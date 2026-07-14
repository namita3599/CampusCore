"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import StudentsTable from "./StudentsTable";

type Student = {
  id: number;
  name: string;
  branch: string;
  rollNumber?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  yearOfAdmission?: number | null;
  bloodGroup?: string | null;
  courseRegistered: boolean;
  tuitionPaid: boolean;
  hostelPaid: boolean;
  profilePictureUrl?: string | null;
  user: { username: string; email: string | null; createdAt: Date };
  studentHostels: { hostel: { id: number; name: string } }[];
};

type Hostel = { id: number; name: string };
type SortKey = "name" | "rollNumber" | "yearOfAdmission" | "branch";
type FeeFilter = "" | "yes" | "no";

const SELECT_CLS =
  "bg-white border border-zinc-200 text-zinc-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all w-full";

export default function StudentsPageClient({
  students,
  hostels,
}: {
  students: Student[];
  hostels: Hostel[];
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterHostel, setFilterHostel] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterCourse, setFilterCourse] = useState<FeeFilter>("");
  const [filterTuition, setFilterTuition] = useState<FeeFilter>("");
  const [filterHostelFee, setFilterHostelFee] = useState<FeeFilter>("");
  const [showFilters, setShowFilters] = useState(false);

  const branches = useMemo(
    () => Array.from(new Set(students.map((s) => s.branch).filter(Boolean))).sort(),
    [students]
  );

  const years = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.yearOfAdmission).filter((y): y is number => y != null))
      ).sort((a, b) => b - a),
    [students]
  );

  const filtered = useMemo(() => {
    let list = [...students];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.user.username.toLowerCase().includes(q) ||
          s.user.email?.toLowerCase().includes(q) ||
          s.rollNumber?.toLowerCase().includes(q) ||
          s.branch.toLowerCase().includes(q)
      );
    }

    if (filterBranch) list = list.filter((s) => s.branch === filterBranch);
    if (filterYear) list = list.filter((s) => s.yearOfAdmission === parseInt(filterYear));
    if (filterHostel)
      list = list.filter((s) =>
        s.studentHostels?.some((sh) => sh.hostel.id === parseInt(filterHostel))
      );
    if (filterCourse === "yes") list = list.filter((s) => s.courseRegistered);
    if (filterCourse === "no") list = list.filter((s) => !s.courseRegistered);
    if (filterTuition === "yes") list = list.filter((s) => s.tuitionPaid);
    if (filterTuition === "no") list = list.filter((s) => !s.tuitionPaid);
    if (filterHostelFee === "yes") list = list.filter((s) => s.hostelPaid);
    if (filterHostelFee === "no") list = list.filter((s) => !s.hostelPaid);

    list.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") { av = a.name; bv = b.name; }
      else if (sortKey === "rollNumber") { av = a.rollNumber ?? ""; bv = b.rollNumber ?? ""; }
      else if (sortKey === "yearOfAdmission") { av = a.yearOfAdmission ?? 0; bv = b.yearOfAdmission ?? 0; }
      else if (sortKey === "branch") { av = a.branch; bv = b.branch; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [students, search, sortKey, sortDir, filterBranch, filterHostel, filterYear, filterCourse, filterTuition, filterHostelFee]);

  const activeFilterCount = [filterBranch, filterHostel, filterYear, filterCourse, filterTuition, filterHostelFee].filter(Boolean).length;
  const hasFilters = !!(search || activeFilterCount);

  const clearAll = () => {
    setSearch("");
    setFilterBranch("");
    setFilterHostel("");
    setFilterYear("");
    setFilterCourse("");
    setFilterTuition("");
    setFilterHostelFee("");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-30" />
    );

  const SORT_LABELS: Record<SortKey, string> = {
    name: "Name",
    rollNumber: "Roll No.",
    yearOfAdmission: "Year",
    branch: "Branch",
  };

  return (
    <div className="space-y-5">
      {/* Search + Filter toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, email or roll number…"
            className="w-full pl-9 pr-10 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm ${
            activeFilterCount > 0
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-zinc-900 leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-zinc-50/80 border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Branch</label>
              <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className={SELECT_CLS}>
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Hostel</label>
              <select value={filterHostel} onChange={(e) => setFilterHostel(e.target.value)} className={SELECT_CLS}>
                <option value="">All Hostels</option>
                {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Year</label>
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={SELECT_CLS}>
                <option value="">All Years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Course Reg.</label>
              <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value as FeeFilter)} className={SELECT_CLS}>
                <option value="">Any</option>
                <option value="yes">✅ Yes</option>
                <option value="no">❌ No</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tuition Paid</label>
              <select value={filterTuition} onChange={(e) => setFilterTuition(e.target.value as FeeFilter)} className={SELECT_CLS}>
                <option value="">Any</option>
                <option value="yes">✅ Yes</option>
                <option value="no">❌ No</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Hostel Fee</label>
              <select value={filterHostelFee} onChange={(e) => setFilterHostelFee(e.target.value as FeeFilter)} className={SELECT_CLS}>
                <option value="">Any</option>
                <option value="yes">✅ Yes</option>
                <option value="no">❌ No</option>
              </select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="mt-3 text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Sort bar + result count */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600">
          {filtered.length === students.length
            ? <>{students.length} <span className="text-zinc-400">students</span></>
            : <><span className="font-bold text-zinc-950">{filtered.length}</span> <span className="text-zinc-400">of {students.length} students</span></>
          }
        </span>
        {hasFilters && !showFilters && (
          <button onClick={clearAll} className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1">Sort by:</span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                sortKey === k ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {SORT_LABELS[k]}
              <SortIcon k={k} />
            </button>
          ))}
        </div>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center shadow-sm">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-zinc-500 text-sm font-medium">No students match your search or filters.</p>
          <button onClick={clearAll} className="mt-3 text-xs text-zinc-600 underline hover:text-zinc-900">
            Clear all filters
          </button>
        </div>
      ) : (
        <StudentsTable students={filtered as any} hostels={hostels} />
      )}
    </div>
  );
}
