type Student = {
  id: number;
  name: string;
  branch: string;
  courseRegistered: boolean;
  tuitionPaid: boolean;
  hostelPaid: boolean;
  user: { username: string; createdAt: Date };
};

function StatusBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      No
    </span>
  );
}

export default function StudentsTable({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-500">No students registered yet.</p>
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
              <th>Name</th>
              <th>Username</th>
              <th>Branch</th>
              <th>Course Registered</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td className="text-slate-500 text-xs">{i + 1}</td>
                <td className="font-medium text-white">{s.name}</td>
                <td className="text-slate-400 font-mono text-xs">{s.user.username}</td>
                <td>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                    {s.branch}
                  </span>
                </td>
                <td><StatusBadge value={s.courseRegistered} /></td>
                <td className="text-slate-500 text-xs">
                  {new Date(s.user.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
