"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { updateSubject, deleteSubject } from "../actions";
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

type Subject = {
  id: number;
  name: string;
  teacherId?: number | null;
  teacher: { id: number; name: string; phone?: string | null } | null;
  studentSubjects: { student: { id: number; name: string; rollNumber?: string | null } }[];
};

type TeacherProfile = {
  id: number;
  name: string;
};

type EditFormInput = {
  name: string;
  teacherId: string;
};

export default function SubjectsTable({
  subjects,
  teachers,
}: {
  subjects: Subject[];
  teachers: TeacherProfile[];
}) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
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

  const openView = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsViewOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setErrorMsg(null);
    reset({
      name: subject.name,
      teacherId: subject.teacherId?.toString() || "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsDeleteOpen(true);
  };

  const onEditSubmit = (data: EditFormInput) => {
    if (!selectedSubject) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateSubject(selectedSubject.id, {
          name: data.name,
          teacherId: data.teacherId ? parseInt(data.teacherId) : null,
        });
        setIsEditOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update subject.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedSubject) return;
    startTransition(async () => {
      try {
        await deleteSubject(selectedSubject.id);
        setIsDeleteOpen(false);
      } catch (err: any) {
        alert(err.message || "Failed to delete subject.");
      }
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-150">
            <th className="px-6 py-3.5">Subject</th>
            <th className="px-6 py-3.5">Assigned Teacher</th>
            <th className="px-6 py-3.5">Students Enrolled</th>
            <th className="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {subjects.map((sub) => (
            <tr key={sub.id} className="hover:bg-zinc-50/50 transition-colors">
              <td className="px-6 py-4 font-semibold text-zinc-950">{sub.name}</td>
              <td className="px-6 py-4">
                {sub.teacher ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    👨‍🏫 {sub.teacher.name}
                  </span>
                ) : (
                  <span className="text-zinc-400 text-xs italic">Unassigned</span>
                )}
              </td>
              <td className="px-6 py-4 text-zinc-600 text-xs">
                {sub.studentSubjects?.length ?? 0} students
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openView(sub)}
                    title="View Details"
                    className="text-zinc-600 hover:text-zinc-900"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(sub)}
                    title="Edit Subject"
                    className="text-zinc-600 hover:text-zinc-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openDelete(sub)}
                    title="Delete Subject"
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
            <DialogTitle className="text-lg font-bold text-zinc-950">Subject Details</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Details and registration status of the subject.
            </DialogDescription>
          </DialogHeader>

          {selectedSubject && (
            <div className="space-y-4 my-2 text-zinc-950">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Subject Name</span>
                  <span className="text-sm font-medium">{selectedSubject.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Subject ID</span>
                  <span className="text-sm font-mono">{selectedSubject.id}</span>
                </div>
              </div>

              <div className="border-b border-zinc-100 pb-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Assigned Teacher</span>
                {selectedSubject.teacher ? (
                  <div className="text-sm font-medium mt-1">
                    👨‍🏫 {selectedSubject.teacher.name}{" "}
                    {selectedSubject.teacher.phone && (
                      <span className="text-xs text-zinc-500 font-normal">({selectedSubject.teacher.phone})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">No teacher assigned to this subject.</span>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Enrolled Students ({selectedSubject.studentSubjects?.length ?? 0})
                </span>
                {selectedSubject.studentSubjects && selectedSubject.studentSubjects.length > 0 ? (
                  <div className="max-h-[160px] overflow-y-auto border border-zinc-100 rounded-xl p-2 space-y-1 bg-zinc-50/50">
                    {selectedSubject.studentSubjects.map(({ student }) => (
                      <div key={student.id} className="text-xs flex items-center justify-between px-2 py-1 hover:bg-white rounded-lg transition-colors">
                        <span className="font-medium text-zinc-900">{student.name}</span>
                        {student.rollNumber && <span className="text-zinc-500 font-mono text-[10px]">{student.rollNumber}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">No students are currently enrolled in this subject.</span>
                )}
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
            <DialogTitle className="text-lg font-bold text-zinc-950">Edit Subject Info</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Modify the subject name or teacher assignment. Click save when done.
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
                Subject Name
              </label>
              <input
                {...register("name", { required: "Subject name is required" })}
                placeholder="Artificial Intelligence"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Assigned Teacher
              </label>
              <select
                {...register("teacherId")}
                className="w-full bg-white border border-zinc-200 text-zinc-950 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">— Unassign —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
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
              This will permanently delete the subject{" "}
              <span className="font-semibold text-zinc-950">{selectedSubject?.name}</span>. All
              student enrollment records for this subject will be removed automatically. This action cannot be undone.
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
              {isPending ? "Deleting..." : "Delete Subject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
