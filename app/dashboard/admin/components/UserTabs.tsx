"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentsTable from "./StudentsTable";
import TeachersTable from "./TeachersTable";
import WardensTable from "./WardensTable";
import { ArrowRight } from "lucide-react";

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

type Teacher = {
  id: number;
  name: string;
  phone?: string | null;
  user: { username: string; email: string | null };
  subjects: { id: number; name: string }[];
};

type Warden = {
  id: number;
  name: string;
  phone?: string | null;
  user: { username: string; email: string | null };
  hostels: { id: number; name: string }[];
};

type Hostel = {
  id: number;
  name: string;
};

type Subject = {
  id: number;
  name: string;
};

export default function UserTabs({
  students,
  teachers,
  wardens,
  hostels,
  subjects,
}: {
  students: Student[];
  teachers: Teacher[];
  wardens: Warden[];
  hostels: Hostel[];
  subjects: Subject[];
}) {
  const [activeTab, setActiveTab] = useState("students");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Existing Users</p>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-3 mb-6 bg-zinc-150 p-1 rounded-xl">
          <TabsTrigger value="students" className="rounded-lg py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-900">
            Students
          </TabsTrigger>
          <TabsTrigger value="teachers" className="rounded-lg py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-900">
            Teachers
          </TabsTrigger>
          <TabsTrigger value="wardens" className="rounded-lg py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-900">
            Wardens
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-0 space-y-4">
          <StudentsTable students={students} hostels={hostels} />
          <div className="flex justify-end pt-1">
            <Link
              href="/dashboard/admin/users/students"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all {students.length} students
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </TabsContent>
        <TabsContent value="teachers" className="mt-0 space-y-4">
          <TeachersTable teachers={teachers} subjects={subjects} />
          <div className="flex justify-end pt-1">
            <Link
              href="/dashboard/admin/users/teachers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View all {teachers.length} teachers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </TabsContent>
        <TabsContent value="wardens" className="mt-0 space-y-4">
          <WardensTable wardens={wardens} hostels={hostels} />
          <div className="flex justify-end pt-1">
            <Link
              href="/dashboard/admin/users/wardens"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              View all {wardens.length} wardens
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
