type Student = {
  id: number;
  name: string;
  branch: string;
  courseRegistered: boolean;
  tuitionPaid: boolean;
  hostelPaid: boolean;
  user: { username: string };
};

function Pill({ value, trueLabel = "Paid", falseLabel = "Pending" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
      ✓ {trueLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
      ⏳ {falseLabel}
    </span>
  );
}

export default function FeeStatusTable({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <p className="text-zinc-500">No students to display.</p>
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
              <th>Student Name</th>
              <th>Branch</th>
              <th>Course Registered</th>
              <th>Tuition Fee</th>
              <th>Hostel Fee</th>
              <th>Completion</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const completed = [s.courseRegistered, s.tuitionPaid, s.hostelPaid].filter(Boolean).length;
              const pct = Math.round((completed / 3) * 100);
              return (
                <tr key={s.id}>
                  <td className="text-zinc-500 text-xs">{i + 1}</td>
                  <td className="font-medium text-zinc-950">{s.name}</td>
                  <td className="text-zinc-500 text-xs">{s.branch}</td>
                  <td><Pill value={s.courseRegistered} trueLabel="Done" falseLabel="Pending" /></td>
                  <td><Pill value={s.tuitionPaid} /></td>
                  <td><Pill value={s.hostelPaid} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
