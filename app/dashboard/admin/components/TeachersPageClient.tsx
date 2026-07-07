"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import TeachersTable from "./TeachersTable";

type Teacher = {
  id: number;
  name: string;
  phone?: string | null;
  user: { username: string; email: string | null };
  subjects: { id: number; name: string }[];
};

type Subject = { id: number; name: string };
type SortKey = "name";
type AssignedFilter = "" | "yes" | "no";

const SELECT_CLS =
  "bg-white border border-zinc-200 text-zinc-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all w-full";

export default function TeachersPageClient({
  teachers,
  subjects,
}: {
  teachers: Teacher[];
  subjects: Subject[];
}) {
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterAssigned, setFilterAssigned] = useState<AssignedFilter>("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...teachers];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.user.username.toLowerCase().includes(q) ||
          t.user.email?.toLowerCase().includes(q)
      );
    }

    if (filterAssigned === "yes") list = list.filter((t) => t.subjects.length > 0);
    if (filterAssigned === "no") list = list.filter((t) => t.subjects.length === 0);
    if (filterSubject)
      list = list.filter((t) => t.subjects.some((s) => s.id === parseInt(filterSubject)));

    list.sort((a, b) => {
      const av = a.name.toLowerCase();
      const bv = b.name.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [teachers, search, sortDir, filterSubject, filterAssigned]);

  const activeFilterCount = [filterSubject, filterAssigned].filter(Boolean).length;
  const hasFilters = !!(search || activeFilterCount);

  const clearAll = () => {
    setSearch("");
    setFilterSubject("");
    setFilterAssigned("");
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
            placeholder="Search by name, username or email…"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subject Assigned</label>
              <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value as AssignedFilter)} className={SELECT_CLS}>
                <option value="">Any</option>
                <option value="yes">✅ Has Subject</option>
                <option value="no">❌ Unassigned</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Specific Subject</label>
              <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className={SELECT_CLS}>
                <option value="">All Subjects</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
          {filtered.length === teachers.length
            ? <>{teachers.length} <span className="text-zinc-400">teachers</span></>
            : <><span className="font-bold text-zinc-950">{filtered.length}</span> <span className="text-zinc-400">of {teachers.length} teachers</span></>
          }
        </span>
        {hasFilters && !showFilters && (
          <button onClick={clearAll} className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sort:</span>
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-zinc-900 text-white border-zinc-900"
          >
            Name
            {sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center shadow-sm">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-zinc-500 text-sm font-medium">No teachers match your search or filters.</p>
          <button onClick={clearAll} className="mt-3 text-xs text-zinc-600 underline hover:text-zinc-900">Clear all filters</button>
        </div>
      ) : (
        <TeachersTable teachers={filtered as any} subjects={subjects} />
      )}
    </div>
  );
}
