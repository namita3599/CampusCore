"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 text-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-zinc-800 cursor-pointer"
    >
      <Printer className="h-4 w-4" /> Print Receipt
    </button>
  );
}
