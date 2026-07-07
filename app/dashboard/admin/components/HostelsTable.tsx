"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { updateHostel, deleteHostel } from "../actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Hostel = {
  id: number;
  name: string;
  wardenId?: number | null;
  warden: { id: number; name: string; phone?: string | null } | null;
  studentHostels: { student: { id: number; name: string; rollNumber?: string | null } }[];
  rooms: { id: string; roomNumber: string; status: string }[];
};

type WardenProfile = {
  id: number;
  name: string;
};

type EditFormInput = {
  name: string;
  wardenId: string;
};

export default function HostelsTable({
  hostels,
  wardens,
}: {
  hostels: Hostel[];
  wardens: WardenProfile[];
}) {
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormInput>();

  const openView = (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setIsViewOpen(true);
  };

  const openEdit = (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setErrorMsg(null);
    reset({
      name: hostel.name,
      wardenId: hostel.wardenId?.toString() || "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setIsDeleteOpen(true);
  };

  const onEditSubmit = (data: EditFormInput) => {
    if (!selectedHostel) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateHostel(selectedHostel.id, {
          name: data.name,
          wardenId: data.wardenId ? parseInt(data.wardenId) : null,
        });
        setIsEditOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update hostel.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedHostel) return;
    startTransition(async () => {
      try {
        await deleteHostel(selectedHostel.id);
        setIsDeleteOpen(false);
      } catch (err: any) {
        alert(err.message || "Failed to delete hostel.");
      }
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-150">
            <th className="px-6 py-3.5">Hostel</th>
            <th className="px-6 py-3.5">Assigned Warden</th>
            <th className="px-6 py-3.5">Rooms Count</th>
            <th className="px-6 py-3.5">Residents Count</th>
            <th className="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {hostels.map((h) => (
            <tr key={h.id} className="hover:bg-zinc-50/50 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-950">{h.name}</td>
              <td className="px-6 py-4">
                {h.warden ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                    🏠 {h.warden.name}
                  </span>
                ) : (
                  <span className="text-zinc-400 text-xs italic">Unassigned</span>
                )}
              </td>
              <td className="px-6 py-4 text-zinc-600 text-xs">
                {h.rooms?.length ?? 0} rooms
              </td>
              <td className="px-6 py-4 text-zinc-600 text-xs">
                {h.studentHostels?.length ?? 0} students
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openView(h)}
                    title="View Details"
                    className="text-zinc-600 hover:text-zinc-900"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(h)}
                    title="Edit Hostel"
                    className="text-zinc-600 hover:text-zinc-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openDelete(h)}
                    title="Delete Hostel"
                    className="text-red-600 hover:text-red-950 hover:bg-red-50/50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── View Dialog ── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 text-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-950">Hostel Details</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Details and rooms overview of the hostel.
            </DialogDescription>
          </DialogHeader>

          {selectedHostel && (
            <div className="space-y-4 my-2 text-zinc-950">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Hostel Name</span>
                  <span className="text-sm font-medium">{selectedHostel.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Hostel ID</span>
                  <span className="text-sm font-mono">{selectedHostel.id}</span>
                </div>
              </div>

              <div className="border-b border-zinc-100 pb-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Assigned Warden</span>
                {selectedHostel.warden ? (
                  <div className="text-sm font-medium mt-1">
                    🏠 {selectedHostel.warden.name}{" "}
                    {selectedHostel.warden.phone && (
                      <span className="text-xs text-zinc-500 font-normal">({selectedHostel.warden.phone})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">No warden assigned to this hostel.</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Rooms List ({selectedHostel.rooms?.length ?? 0})</span>
                  {selectedHostel.rooms && selectedHostel.rooms.length > 0 ? (
                    <div className="max-h-[110px] overflow-y-auto border border-zinc-100 rounded-xl p-2 space-y-1 bg-zinc-50/50 mt-1">
                      {selectedHostel.rooms.map((room) => (
                        <div key={room.id} className="text-xs flex items-center justify-between px-2 py-0.5 hover:bg-white rounded-lg transition-colors">
                          <span className="font-mono font-medium">Room {room.roomNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${room.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {room.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400 italic mt-1 block">No rooms added yet.</span>
                  )}
                </div>

                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Residents ({selectedHostel.studentHostels?.length ?? 0})</span>
                  {selectedHostel.studentHostels && selectedHostel.studentHostels.length > 0 ? (
                    <div className="max-h-[110px] overflow-y-auto border border-zinc-100 rounded-xl p-2 space-y-1 bg-zinc-50/50 mt-1">
                      {selectedHostel.studentHostels.map(({ student }) => (
                        <div key={student.id} className="text-xs flex items-center justify-between px-2 py-0.5 hover:bg-white rounded-lg transition-colors">
                          <span className="font-medium">{student.name}</span>
                          {student.rollNumber && <span className="text-[10px] text-zinc-400 font-mono">{student.rollNumber}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400 italic mt-1 block">No residents registered yet.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewOpen(false)} />}>
              Close
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 text-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-950">Edit Hostel Info</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Modify the hostel name or warden assignment. Click save when done.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Hostel Name
              </label>
              <input
                {...register("name", { required: "Hostel name is required" })}
                placeholder="Hostel Block A"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Assigned Warden
              </label>
              <select
                {...register("wardenId")}
                className="w-full bg-white border border-zinc-200 text-zinc-950 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">— Unassign —</option>
                {wardens.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-zinc-900 text-white hover:bg-zinc-800">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 text-zinc-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-zinc-950">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This will permanently delete the hostel{" "}
              <span className="font-semibold text-zinc-950">{selectedHostel?.name}</span> and all
              associated rooms. All resident links will be disconnected automatically. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isPending ? "Deleting..." : "Delete Hostel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
