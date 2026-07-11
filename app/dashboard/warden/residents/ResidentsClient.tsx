"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeStudentRoom,
  removeStudentFromHostel,
  removeAllResidents,
} from "./residentActions";
import { Trash2, RefreshCw, AlertTriangle, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  roomNumber: string;
  hostelId: number;
  hostel: { id: number; name: string };
}

interface Resident {
  studentUserId: number;
  studentProfileId: number;
  name: string;
  rollNumber: string | null;
  branch: string;
  hostelName: string;
  hostelId: number;
  currentRoom: Room | null;
}

interface Props {
  residents: Resident[];
  availableRooms: Room[];
  wardenUserId: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ResidentsClient({
  residents,
  availableRooms,
  wardenUserId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Which student's row is showing the room-change dropdown
  const [changingRoomFor, setChangingRoomFor] = useState<number | null>(null);
  // Selected room ID in the dropdown
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  // Which student is currently being processed (for per-row loading state)
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  // Confirmation panel for remove-all
  const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false);
  // Notification banner
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // ── Change room ─────────────────────────────────────────────────────────────
  const handleChangeRoom = (studentUserId: number) => {
    if (!selectedRoomId) {
      showMsg("error", "Please select a destination room first.");
      return;
    }
    setProcessingUserId(studentUserId);

    startTransition(async () => {
      const result = await changeStudentRoom(
        studentUserId,
        selectedRoomId,
        wardenUserId
      );
      if (result.success) {
        showMsg("success", "Room changed successfully.");
        setChangingRoomFor(null);
        setSelectedRoomId("");
        router.refresh();
      } else {
        showMsg("error", result.message);
      }
      setProcessingUserId(null);
    });
  };

  // ── Remove single student ───────────────────────────────────────────────────
  const handleRemoveStudent = (studentUserId: number, studentName: string) => {
    if (
      !window.confirm(
        `Remove ${studentName} from the hostel?\n\nTheir room will be freed and they will need to re-book.`
      )
    )
      return;

    setProcessingUserId(studentUserId);
    startTransition(async () => {
      const result = await removeStudentFromHostel(studentUserId, wardenUserId);
      if (result.success) {
        showMsg("success", `${studentName} has been removed from the hostel.`);
        router.refresh();
      } else {
        showMsg("error", result.message);
      }
      setProcessingUserId(null);
    });
  };

  // ── Remove all residents ────────────────────────────────────────────────────
  const handleRemoveAll = () => {
    startTransition(async () => {
      const result = await removeAllResidents(wardenUserId);
      if (result.success) {
        showMsg(
          "success",
          `All ${result.count} residents removed. All rooms are now available.`
        );
        setShowRemoveAllConfirm(false);
        router.refresh();
      } else {
        showMsg("error", result.message);
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Notification banner ──────────────────────────────────────────────── */}
      {notification && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium animate-fadeInUp ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <span>{notification.type === "success" ? "✅" : "⚠️"}</span>
          <span>{notification.text}</span>
        </div>
      )}

      {/* ── Danger zone: Remove All ──────────────────────────────────────────── */}
      {residents.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/20 p-5">
          {showRemoveAllConfirm ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-zinc-950">
                    Remove all {residents.length} residents?
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    All rooms will be freed. Students will need to re-book.
                    This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => setShowRemoveAllConfirm(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveAll}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Removing…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Yes, Remove All
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Danger Zone
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Remove all {residents.length} residents and free every room
                  in your hostel(s) at once.
                </p>
              </div>
              <button
                onClick={() => setShowRemoveAllConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Remove All Residents
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main table ───────────────────────────────────────────────────────── */}
      {residents.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-16 text-center shadow-sm">
          <Users className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">
            No residents currently assigned to your hostel(s).
          </p>
          <p className="text-zinc-400 text-xs mt-1">
            Students will appear here once they book a room.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                {["#", "Name", "Roll No.", "Branch", "Hostel", "Current Room", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {residents.map((resident, i) => {
                const isChangingRoom =
                  changingRoomFor === resident.studentUserId;
                const isProcessing =
                  processingUserId === resident.studentUserId;

                return (
                  <tr
                    key={resident.studentUserId}
                    className="hover:bg-zinc-50/40 transition-colors"
                  >
                    {/* # */}
                    <td className="px-4 py-4 text-zinc-400 text-xs font-medium">
                      {i + 1}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-4 font-semibold text-zinc-950 whitespace-nowrap">
                      {resident.name}
                    </td>

                    {/* Roll No */}
                    <td className="px-4 py-4 text-zinc-500 font-mono text-xs">
                      {resident.rollNumber ?? (
                        <span className="text-zinc-300 italic">—</span>
                      )}
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium">
                        {resident.branch}
                      </span>
                    </td>

                    {/* Hostel */}
                    <td className="px-4 py-4 text-zinc-600 text-xs font-medium whitespace-nowrap">
                      {resident.hostelName}
                    </td>

                    {/* Current Room */}
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${
                          resident.currentRoom
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {resident.currentRoom
                          ? `Room ${resident.currentRoom.roomNumber}`
                          : "No room assigned"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      {isChangingRoom ? (
                        /* Inline room-change controls */
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={selectedRoomId}
                            onChange={(e) => setSelectedRoomId(e.target.value)}
                            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                          >
                            <option value="">— Select room —</option>
                            {availableRooms.length === 0 ? (
                              <option disabled>No available rooms</option>
                            ) : (
                              availableRooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.hostel.name} – Room {r.roomNumber}
                                </option>
                              ))
                            )}
                          </select>
                          <button
                            onClick={() =>
                              handleChangeRoom(resident.studentUserId)
                            }
                            disabled={isProcessing || !selectedRoomId}
                            className="px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {isProcessing ? (
                              <span className="flex items-center gap-1.5">
                                <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                Saving…
                              </span>
                            ) : (
                              "Confirm"
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setChangingRoomFor(null);
                              setSelectedRoomId("");
                            }}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-semibold hover:bg-zinc-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        /* Default action buttons */
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setChangingRoomFor(resident.studentUserId);
                              setSelectedRoomId("");
                            }}
                            disabled={isProcessing || availableRooms.length === 0}
                            title={
                              availableRooms.length === 0
                                ? "No available rooms to move to"
                                : "Change this student's room"
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs font-semibold hover:bg-zinc-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Change Room
                          </button>
                          <button
                            onClick={() =>
                              handleRemoveStudent(
                                resident.studentUserId,
                                resident.name
                              )
                            }
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {isProcessing ? (
                              <span className="h-3 w-3 border-2 border-rose-400/40 border-t-rose-600 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
