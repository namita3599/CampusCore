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
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
      ✓ {trueLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
      ⏳ {falseLabel}
    </span>
  );
}

export default function FeeStatusTable({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-500">No students to display.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
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
                  <td className="text-slate-500 text-xs">{i + 1}</td>
                  <td className="font-medium text-white">{s.name}</td>
                  <td className="text-slate-400 text-xs">{s.branch}</td>
                  <td><Pill value={s.courseRegistered} trueLabel="Done" falseLabel="Pending" /></td>
                  <td><Pill value={s.tuitionPaid} /></td>
                  <td><Pill value={s.hostelPaid} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{pct}%</span>
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
