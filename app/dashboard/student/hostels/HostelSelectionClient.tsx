"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getAvailableRooms, reserveRoom, confirmBooking, releaseHold } from "../hostelActions";

interface Hostel {
  id: number;
  name: string;
}

interface Room {
  id: string;
  roomNumber: string;
  status: string;
  heldByUserId?: number | null;
  holdExpiresAt?: Date | null;
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
  initialHeldRoom: Room | null;
  hostels: Hostel[];
}

export default function HostelSelectionClient({
  userId,
  initialBookedRoom,
  initialHeldRoom,
  hostels,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookedRoom, setBookedRoom] = useState<Room | null>(initialBookedRoom);
  const [heldRoom, setHeldRoom] = useState<Room | null>(initialHeldRoom);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch live rooms layout map
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

  // 2. Countdown timer for HELD lock status
  useEffect(() => {
    if (!heldRoom || !heldRoom.holdExpiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const expiresAt = new Date(heldRoom.holdExpiresAt!).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      return diff;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setHeldRoom(null);
        setErrorMessage("Your 10-minute hold has expired. The room has been released.");
        fetchRooms();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [heldRoom]);

  // Formatting countdown helper MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 3. Stage 1: Lock room for 10 minutes
  const handleSelectRoom = (roomId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await reserveRoom(roomId, userId);
        if (result.success) {
          const selected = rooms.find((r) => r.id === roomId);
          if (selected) {
            setHeldRoom({
              ...selected,
              status: "HELD",
              heldByUserId: userId,
              holdExpiresAt: result.holdExpiresAt,
            });
            setSuccessMessage(`Room ${selected.roomNumber} is now held for you. Complete your booking within 10 minutes!`);
            fetchRooms();
          }
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Unable to hold room.");
        fetchRooms();
      }
    });
  };

  // 4. Stage 2: Finalize booking
  const handleConfirmBooking = () => {
    if (!heldRoom) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await confirmBooking(heldRoom.id, userId);
        if (result.success) {
          setBookedRoom(result.room as Room);
          setHeldRoom(null);
          setSuccessMessage(`Success! Room ${heldRoom.roomNumber} has been booked.`);
          fetchRooms();
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to confirm booking.");
        fetchRooms();
      }
    });
  };

  // 5. Stage 3: Release lock hold
  const handleCancelHold = () => {
    if (!heldRoom) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await releaseHold(heldRoom.id, userId);
        setHeldRoom(null);
        setSuccessMessage("Hold cancelled successfully. You can select another room.");
        fetchRooms();
      } catch (err: any) {
        setErrorMessage("Failed to cancel hold.");
      }
    });
  };

  // Group rooms by Hostel
  const roomsByHostel = hostels.reduce((acc, h) => {
    acc[h.name] = rooms.filter((r) => r.hostelId === h.id);
    return acc;
  }, {} as Record<string, Room[]>);

  return (
    <div className="space-y-6">
      {/* Dynamic Status Notifications */}
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

      {/* Booking State Display */}
      {bookedRoom ? (
        /* State A: Room Booked Successfully */
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
              <span className="font-bold text-zinc-900">{bookedRoom.hostel?.name || "Hostel A"}</span>
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
      ) : heldRoom ? (
        /* State B: Lock-Hold Stage */
        <div className="rounded-2xl border border-amber-250 bg-amber-50/15 p-6 shadow-sm space-y-4 animate-fadeInUp">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-amber-200/40">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">⏰</span>
              <div>
                <h3 className="font-bold text-zinc-950">Room Lock Active</h3>
                <p className="text-sm text-zinc-600">
                  Room <span className="font-bold text-zinc-950">{heldRoom.roomNumber}</span> ({heldRoom.hostel?.name}) is temporarily reserved for you.
                </p>
              </div>
            </div>
            <div className="bg-zinc-950 text-white font-mono text-xl font-bold px-4 py-2 rounded-xl tracking-wider">
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleConfirmBooking}
              disabled={isPending || timeLeft <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              suppressHydrationWarning
            >
              Confirm Room Booking
            </Button>
            <Button
              onClick={handleCancelHold}
              disabled={isPending}
              variant="outline"
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl"
              suppressHydrationWarning
            >
              Cancel Hold &amp; Release
            </Button>
          </div>
        </div>
      ) : (
        /* State C: Normal selection map */
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-150 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Select Room</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Click "Select" on an available room to place a temporary 10-minute hold.</p>
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

          {/* Color Key Guide */}
          <div className="flex gap-4 text-xs font-semibold text-zinc-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-white border border-zinc-200 inline-block" />
              Available
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-50 border border-amber-250 inline-block" />
              Held (Reserved)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-rose-50 border border-rose-250 inline-block" />
              Occupied (Booked)
            </div>
          </div>

          {/* Hostel grids */}
          <div className="space-y-8">
            {hostels.map((hostel) => {
              const hostelRooms = roomsByHostel[hostel.name] || [];
              return (
                <div key={hostel.id} className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-1.5 capitalize">
                    🏛️ {hostel.name}
                  </h3>
                  {hostelRooms.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No rooms loaded or setup in this hostel.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                      {hostelRooms.map((room) => {
                        const isAvailable = room.status === "AVAILABLE";
                        const isHeld = room.status === "HELD";
                        const isBooked = room.status === "BOOKED";

                        return (
                          <div
                            key={room.id}
                            className={`rounded-xl border p-4 flex flex-col justify-between items-center text-center gap-3 transition-all ${isAvailable
                                ? "bg-white border-zinc-200 hover:border-zinc-300"
                                : isHeld
                                  ? "bg-amber-50/30 border-amber-200"
                                  : "bg-rose-50/20 border-rose-150"
                              }`}
                          >
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{room.roomNumber}</p>
                              <span className="text-[10px] mt-1 inline-block uppercase font-bold tracking-wider">
                                {isAvailable && (
                                  <span className="text-emerald-700">Available</span>
                                )}
                                {isHeld && (
                                  <span className="text-amber-700">Held</span>
                                )}
                                {isBooked && (
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
                                Select
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
