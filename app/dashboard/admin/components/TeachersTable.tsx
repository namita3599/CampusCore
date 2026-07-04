type Teacher = {
  id: number;
  name: string;
  user: { username: string };
  subject: { id: number; name: string } | null;
};

export default function TeachersTable({ teachers }: { teachers: Teacher[] }) {
  if (teachers.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-500">No teachers registered yet.</p>
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
              <th>Assigned Subject</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, i) => (
              <tr key={t.id}>
                <td className="text-slate-500 text-xs">{i + 1}</td>
                <td className="font-medium text-white">{t.name}</td>
                <td className="text-slate-400 font-mono text-xs">{t.user.username}</td>
                <td>
                  {t.subject ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                      {t.subject.name}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs italic">Not assigned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
