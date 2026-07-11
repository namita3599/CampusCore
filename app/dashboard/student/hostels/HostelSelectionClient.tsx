"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAvailableRooms, bookRoom } from "../hostelActions";

interface Hostel {
  id: number;
  name: string;
}

interface Room {
  id: string;
  roomNumber: string;
  status: string;
  bookedByUserId?: number | null;
  hostelId: number;
  hostel: {
    id: number;
    name: string;
  };
}

interface Props {
  userId: number;
  initialBookedRoom: Room | null;
  hostelFeePaid: boolean;
  hostels: Hostel[];
}

export default function HostelSelectionClient({
  userId,
  initialBookedRoom,
  hostelFeePaid,
  hostels,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookedRoom, setBookedRoom] = useState<Room | null>(initialBookedRoom);
  const [feeBlocked, setFeeBlocked] = useState(!hostelFeePaid);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch live rooms layout map
  const fetchRooms = async () => {
    try {
      const data = await getAvailableRooms();
      setRooms(data as Room[]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load rooms layout.");
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Direct booking — no hold phase
  const handleSelectRoom = (roomId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await bookRoom(roomId, userId);
        if (result.success) {
          setBookedRoom(result.room as Room);
          setSuccessMessage(`Room ${result.room.roomNumber} has been booked successfully!`);
          fetchRooms();
        } else if (result.message === "HOSTEL_FEE_UNPAID") {
          // Server confirmed the fee is unpaid — show the fee gate
          setFeeBlocked(true);
        } else {
          setErrorMessage(result.message || "Failed to book room.");
          fetchRooms();
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Unable to book room.");
        fetchRooms();
      }
    });
  };

  // Group rooms by hostel
  const roomsByHostel = hostels.reduce((acc, h) => {
    acc[h.name] = rooms.filter((r) => r.hostelId === h.id);
    return acc;
  }, {} as Record<string, Room[]>);

  return (
    <div className="space-y-6">
      {/* Status Notifications */}
      {errorMessage && (
        <div className="px-4 py-3 rounded-xl border bg-rose-50 text-rose-700 border-rose-200 text-sm font-medium animate-fadeInUp">
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="px-4 py-3 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-200 text-sm font-medium animate-fadeInUp">
          ✅ {successMessage}
        </div>
      )}

      {bookedRoom ? (
        /* Booked State */
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/10 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h3 className="font-bold text-zinc-950">Room Allocation Confirmed</h3>
              <p className="text-sm text-zinc-500">Your room assignment is fully secured in the campus records.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-sm">
            <div className="bg-white border border-zinc-150 rounded-xl p-3 shadow-sm">
              <span className="text-zinc-500 block text-xs">Hostel</span>
              <span className="font-bold text-zinc-900">{bookedRoom.hostel?.name || "—"}</span>
            </div>
            <div className="bg-white border border-zinc-150 rounded-xl p-3 shadow-sm">
              <span className="text-zinc-500 block text-xs">Room Number</span>
              <span className="font-bold text-zinc-900">{bookedRoom.roomNumber}</span>
            </div>
            <div className="bg-white border border-zinc-150 rounded-xl p-3 shadow-sm">
              <span className="text-zinc-500 block text-xs">Utilities</span>
              <span className="font-bold text-emerald-700">Included</span>
            </div>
            <div className="bg-white border border-zinc-150 rounded-xl p-3 shadow-sm">
              <span className="text-zinc-500 block text-xs">Mess Account</span>
              <span className="font-bold text-emerald-700">Activated</span>
            </div>
          </div>
        </div>
      ) : feeBlocked ? (
        /* Fee Gate — Hostel fee unpaid */
        <div className="rounded-2xl border border-amber-200 bg-amber-50/20 p-8 shadow-sm space-y-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl mt-0.5">🔒</span>
            <div className="space-y-1">
              <h3 className="font-bold text-zinc-950 text-lg">Hostel Fee Payment Required</h3>
              <p className="text-sm text-zinc-600">
                You must pay the hostel fee before you can select a room. Please complete the payment to unlock room allocation.
              </p>
            </div>
          </div>
          <div className="bg-white border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Hostel Fee</p>
              <p className="text-2xl font-extrabold text-zinc-950">₹25,000</p>
              <p className="text-xs text-zinc-400 mt-0.5">Includes mess &amp; utilities for the academic year</p>
            </div>
            <Link
              href="/dashboard/student/fees"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
            >
              💳 Pay Now
            </Link>
          </div>
          <p className="text-xs text-zinc-400">
            After payment, return here to complete your room selection.
          </p>
        </div>
      ) : (
        /* Room Selection Grid */
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-150 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Select Room</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Click "Select" on an available room to book it instantly.</p>
            </div>
            <Button
              onClick={fetchRooms}
              variant="outline"
              size="sm"
              className="rounded-lg text-zinc-700 border-zinc-200 hover:bg-zinc-50 font-medium"
              suppressHydrationWarning
            >
              🔄 Refresh Rooms Map
            </Button>
          </div>

          {/* Color Key */}
          <div className="flex gap-4 text-xs font-semibold text-zinc-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-white border border-zinc-200 inline-block" />
              Available
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-rose-50 border border-rose-200 inline-block" />
              Occupied
            </div>
          </div>

          {/* Hostel Grids */}
          <div className="space-y-8">
            {hostels.map((hostel) => {
              const hostelRooms = roomsByHostel[hostel.name] || [];
              return (
                <div key={hostel.id} className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-1.5 capitalize">
                    🏛️ {hostel.name}
                  </h3>
                  {hostelRooms.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No rooms loaded or set up in this hostel.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                      {hostelRooms.map((room) => {
                        const isAvailable = room.status === "AVAILABLE";

                        return (
                          <div
                            key={room.id}
                            className={`rounded-xl border p-4 flex flex-col justify-between items-center text-center gap-3 transition-all ${
                              isAvailable
                                ? "bg-white border-zinc-200 hover:border-zinc-300"
                                : "bg-rose-50/20 border-rose-150"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{room.roomNumber}</p>
                              <span className="text-[10px] mt-1 inline-block uppercase font-bold tracking-wider">
                                {isAvailable ? (
                                  <span className="text-emerald-700">Available</span>
                                ) : (
                                  <span className="text-rose-700">Occupied</span>
                                )}
                              </span>
                            </div>

                            {isAvailable ? (
                              <Button
                                onClick={() => handleSelectRoom(room.id)}
                                size="sm"
                                disabled={isPending}
                                className="w-full text-xs font-semibold py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg h-7"
                                suppressHydrationWarning
                              >
                                {isPending ? "Booking…" : "Select"}
                              </Button>
                            ) : (
                              <Button
                                disabled
                                size="sm"
                                className="w-full text-xs font-semibold py-1 bg-zinc-100 text-zinc-400 border border-zinc-200 rounded-lg h-7"
                                suppressHydrationWarning
                              >
                                Blocked
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
