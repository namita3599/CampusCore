"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadProfilePicture } from "@/app/actions/profile";
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
  profilePictureUrl?: string | null;
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
  const router = useRouter();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPhotoPending, startPhotoTransition] = useTransition();

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setPhotoError(`File is too large (${fileSizeMB} MB). Must be under ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    setPhotoError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentId", selectedStudent.id.toString());

    startPhotoTransition(async () => {
      try {
        const res = await uploadProfilePicture(formData);
        if (res.success && res.url) {
          setPreviewUrl(res.url);
          setSelectedStudent(prev => prev ? { ...prev, profilePictureUrl: res.url } : null);
          router.refresh();
        } else {
          setPreviewUrl(selectedStudent.profilePictureUrl || null);
          setPhotoError(res.error || "Failed to upload profile picture.");
        }
      } catch (err: any) {
        setPreviewUrl(selectedStudent.profilePictureUrl || null);
        setPhotoError(err.message || "An unexpected error occurred.");
      }
    });
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setPreviewUrl(student.profilePictureUrl || null);
    setPhotoError(null);
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
                  <td className="font-medium text-zinc-950">
                    <div className="flex items-center gap-2.5">
                      {s.profilePictureUrl ? (
                        <img
                          src={s.profilePictureUrl}
                          alt={s.name}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500 uppercase shadow-sm">
                          {s.name.substring(0, 2)}
                        </div>
                      )}
                      <span>{s.name}</span>
                    </div>
                  </td>
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
              <div className="flex flex-col items-center justify-center pb-4 border-b border-zinc-100">
                {selectedStudent.profilePictureUrl ? (
                  <img
                    src={selectedStudent.profilePictureUrl}
                    alt={selectedStudent.name}
                    className="w-20 h-20 rounded-full object-cover border border-zinc-200 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-2xl font-bold text-zinc-500 uppercase shadow-md">
                    {selectedStudent.name.substring(0, 2)}
                  </div>
                )}
                <h3 className="text-sm font-bold text-zinc-900 mt-2">{selectedStudent.name}</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{selectedStudent.rollNumber ?? "No Roll Number"}</p>
              </div>

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
            {/* Profile Picture Upload Section */}
            <div className="flex flex-col items-center justify-center pb-4 border-b border-zinc-100">
              <div className="relative group w-24 h-24 rounded-full overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={selectedStudent?.name || "Student"}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                ) : (
                  <span className="text-3xl text-zinc-400 font-bold uppercase">
                    {selectedStudent?.name?.substring(0, 2) || "ST"}
                  </span>
                )}

                {isPhotoPending && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}

                {/* Edit overlay */}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200">
                  <span className="text-white text-xs font-medium">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isPhotoPending}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">Click photo to update. Max 5MB.</p>
              {photoError && (
                <span className="text-xs text-red-500 mt-1">{photoError}</span>
              )}
            </div>

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
