"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import HostelsTable from "./HostelsTable";

type Props = {
  hostels: any[];
  wardens: any[];
};

export default function HostelsSearchWrapper({ hostels, wardens }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return hostels;
    const q = search.toLowerCase();
    return hostels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.warden?.name?.toLowerCase().includes(q)
    );
  }, [hostels, search]);

  return (
    <div>
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-zinc-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hostel name or warden…"
            className="w-full pl-9 pr-9 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-zinc-400 mt-2">
            {filtered.length === hostels.length
              ? `${hostels.length} hostels`
              : `${filtered.length} of ${hostels.length} hostels`}
          </p>
        )}
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <p className="text-zinc-500 text-sm">No hostels match &ldquo;{search}&rdquo;</p>
          <button
            onClick={() => setSearch("")}
            className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-900"
          >
            Clear search
          </button>
        </div>
      ) : (
        <HostelsTable hostels={filtered} wardens={wardens} />
      )}
    </div>
  );
}
