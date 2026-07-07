"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { updateTeacher, deleteTeacher } from "../actions";
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

type Teacher = {
  id: number;
  name: string;
  phone?: string | null;
  user: { username: string; email: string | null };
  subjects: { id: number; name: string }[];
};

type Subject = {
  id: number;
  name: string;
};

type EditFormInput = {
  name: string;
  username: string;
  email: string;
  phone: string;
  subjectIds: string[];
};

export default function TeachersTable({
  teachers,
  subjects,
}: {
  teachers: Teacher[];
  subjects: Subject[];
}) {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
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

  const openView = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsViewOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setErrorMsg(null);
    reset({
      name: teacher.name,
      username: teacher.user.username,
      email: teacher.user.email || "",
      phone: teacher.phone || "",
      subjectIds: teacher.subjects?.map((s) => s.id.toString()) || [],
    });
    setIsEditOpen(true);
  };

  const openDelete = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteOpen(true);
  };

  const onEditSubmit = (data: EditFormInput) => {
    if (!selectedTeacher) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateTeacher(selectedTeacher.id, {
          name: data.name,
          username: data.username,
          email: data.email,
          phone: data.phone || null,
          subjectIds: data.subjectIds.map((id) => parseInt(id)),
        });
        setIsEditOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update teacher.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedTeacher) return;
    startTransition(async () => {
      try {
        await deleteTeacher(selectedTeacher.id);
        setIsDeleteOpen(false);
      } catch (err: any) {
        alert(err.message || "Failed to delete teacher.");
      }
    });
  };

  if (teachers.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <p className="text-zinc-500">No teachers registered yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="erp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Assigned Subject</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, i) => (
              <tr key={t.id}>
                <td className="text-zinc-500 text-xs">{i + 1}</td>
                <td className="font-medium text-zinc-950">{t.name}</td>
                <td className="text-zinc-500 font-mono text-xs">{t.user.username}</td>
                <td className="text-zinc-650 text-xs">{t.user.email ?? "N/A"}</td>
                <td className="text-zinc-600 text-xs">{t.phone ?? "N/A"}</td>
                <td>
                  {t.subjects && t.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.map((sub) => (
                        <span key={sub.id} className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium">
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-xs italic">Unassigned</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openView(t)}
                      title="View Teacher"
                      className="text-zinc-600 hover:text-zinc-900"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(t)}
                      title="Edit Teacher"
                      className="text-zinc-600 hover:text-zinc-900"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDelete(t)}
                      title="Delete Teacher"
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
      </div>

      {/* ── View Dialog ── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 text-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-950">Teacher Details</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Details and profile information of the teacher.
            </DialogDescription>
          </DialogHeader>

          {selectedTeacher && (
            <div className="space-y-4 my-2 text-zinc-950">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</span>
                  <span className="text-sm font-medium">{selectedTeacher.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Phone</span>
                  <span className="text-sm">{selectedTeacher.phone ?? "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Username</span>
                  <span className="text-sm font-mono text-zinc-600">{selectedTeacher.user.username}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</span>
                  <span className="text-sm">{selectedTeacher.user.email ?? "N/A"}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Assigned Subject(s)</span>
                <span className="text-sm font-semibold text-zinc-800">
                  {selectedTeacher.subjects && selectedTeacher.subjects.length > 0
                    ? selectedTeacher.subjects.map((s) => s.name).join(", ")
                    : "Unassigned"}
                </span>
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
            <DialogTitle className="text-lg font-bold text-zinc-950">Edit Teacher Info</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Modify the teacher profile information. Click save when done.
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
                Full Name
              </label>
              <input
                {...register("name", { required: "Name is required" })}
                placeholder="Dr. Sharma"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Username
              </label>
              <input
                {...register("username", { required: "Username is required" })}
                placeholder="teacher_sharma"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.username && <span className="text-xs text-red-500 mt-1">{errors.username.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Email Address
              </label>
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                type="email"
                placeholder="sharma@example.com"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Phone Number
              </label>
              <input
                {...register("phone")}
                placeholder="9876543210"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Assigned Subject(s)
              </label>
              <div className="max-h-[140px] overflow-y-auto border border-zinc-200 rounded-xl p-3 space-y-2 bg-zinc-50/50">
                {subjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2.5 text-sm font-medium text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      value={s.id}
                      {...register("subjectIds")}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4"
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
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
              This will permanently delete the teacher account for{" "}
              <span className="font-semibold text-zinc-950">
                {selectedTeacher?.name} ({selectedTeacher?.user?.username})
              </span>{" "}
              and all their profile data. The subject they teach will be unassigned automatically. This action cannot be undone.
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
              {isPending ? "Deleting..." : "Delete Teacher"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
