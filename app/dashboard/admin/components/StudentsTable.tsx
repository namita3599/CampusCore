"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { updateStudent, deleteStudent } from "../actions";
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
  user: { username: string; email: string | null; createdAt: Date };
  studentHostels: { hostel: { id: number; name: string } }[];
};

type Hostel = {
  id: number;
  name: string;
};

type EditFormInput = {
  name: string;
  guardianName: string;
  phone: string;
  email: string;
  hostelId: string;
};

function StatusBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
      No
    </span>
  );
}

export default function StudentsTable({
  students,
  hostels,
}: {
  students: Student[];
  hostels: Hostel[];
}) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
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

  const openView = (student: Student) => {
    setSelectedStudent(student);
    setIsViewOpen(true);
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setErrorMsg(null);
    reset({
      name: student.name,
      guardianName: student.guardianName || "",
      phone: student.phone || "",
      email: student.user.email || "",
      hostelId: student.studentHostels?.[0]?.hostel?.id?.toString() || "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const onEditSubmit = (data: EditFormInput) => {
    if (!selectedStudent) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateStudent(selectedStudent.id, {
          name: data.name,
          guardianName: data.guardianName || null,
          phone: data.phone || null,
          email: data.email,
          hostelId: data.hostelId ? parseInt(data.hostelId) : null,
        });
        setIsEditOpen(false);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update student.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedStudent) return;
    startTransition(async () => {
      try {
        await deleteStudent(selectedStudent.id);
        setIsDeleteOpen(false);
      } catch (err: any) {
        alert(err.message || "Failed to delete student.");
      }
    });
  };

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <p className="text-zinc-500">No students registered yet.</p>
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
              <th>Branch</th>
              <th>Roll No.</th>
              <th>Phone</th>
              <th>Guardian</th>
              <th>Hostel</th>
              <th>Course Reg</th>
              <th>Dues Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const currentHostel = s.studentHostels?.[0]?.hostel?.name ?? "N/A";
              return (
                <tr key={s.id}>
                  <td className="text-zinc-500 text-xs">{i + 1}</td>
                  <td className="font-medium text-zinc-950">{s.name}</td>
                  <td className="text-zinc-500 font-mono text-xs">{s.user.username}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {s.branch}
                    </span>
                  </td>
                  <td className="text-zinc-600 text-xs">{s.rollNumber ?? "N/A"}</td>
                  <td className="text-zinc-600 text-xs">{s.phone ?? "N/A"}</td>
                  <td className="text-zinc-600 text-xs">{s.guardianName ?? "N/A"}</td>
                  <td className="text-zinc-600 text-xs font-medium">{currentHostel}</td>
                  <td>
                    <StatusBadge value={s.courseRegistered} />
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500">
                        Tuition: <StatusBadge value={s.tuitionPaid} />
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Hostel: <StatusBadge value={s.hostelPaid} />
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openView(s)}
                        title="View Student"
                        className="text-zinc-600 hover:text-zinc-900"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(s)}
                        title="Edit Student"
                        className="text-zinc-600 hover:text-zinc-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDelete(s)}
                        title="Delete Student"
                        className="text-red-600 hover:text-red-950 hover:bg-red-50/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── View Dialog ── */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 text-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-950">Student Details</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Complete details and profile information of the student.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 my-2 text-zinc-950">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</span>
                  <span className="text-sm font-medium">{selectedStudent.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Roll Number</span>
                  <span className="text-sm font-mono">{selectedStudent.rollNumber ?? "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Username</span>
                  <span className="text-sm font-mono text-zinc-600">{selectedStudent.user.username}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</span>
                  <span className="text-sm">{selectedStudent.user.email ?? "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Phone</span>
                  <span className="text-sm">{selectedStudent.phone ?? "N/A"}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Guardian Name</span>
                  <span className="text-sm">{selectedStudent.guardianName ?? "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Branch</span>
                  <span className="text-sm font-medium">{selectedStudent.branch}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Hostel</span>
                  <span className="text-sm font-semibold text-zinc-800">
                    {selectedStudent.studentHostels?.[0]?.hostel?.name ?? "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-zinc-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Admission Year</span>
                  <span className="text-sm">{selectedStudent.yearOfAdmission ?? "N/A"}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Blood Group</span>
                  <span className="text-sm">{selectedStudent.bloodGroup ?? "N/A"}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Joined On</span>
                  <span className="text-xs">
                    {new Date(selectedStudent.user.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Course Reg</span>
                  <StatusBadge value={selectedStudent.courseRegistered} />
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Tuition Paid</span>
                  <StatusBadge value={selectedStudent.tuitionPaid} />
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Hostel Paid</span>
                  <StatusBadge value={selectedStudent.hostelPaid} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewOpen(false)} />}>
              Close Details
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 text-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-950">Edit Student Info</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Modify the student profile information. Click save when done.
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
                placeholder="Rahul Gupta"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Guardian Name
              </label>
              <input
                {...register("guardianName")}
                placeholder="Rajesh Kumar"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
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
                placeholder="rahul@example.com"
                className="w-full bg-white border border-zinc-200 text-zinc-950 placeholder-zinc-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Assigned Hostel
              </label>
              <select
                {...register("hostelId")}
                className="w-full bg-white border border-zinc-200 text-zinc-950 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">— Unassign —</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
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
              This will permanently delete the student account for{" "}
              <span className="font-semibold text-zinc-950">
                {selectedStudent?.name} ({selectedStudent?.user?.username})
              </span>{" "}
              and all their profile data. Any room hold or booking will be canceled immediately. This action cannot be undone.
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
              {isPending ? "Deleting..." : "Delete Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
