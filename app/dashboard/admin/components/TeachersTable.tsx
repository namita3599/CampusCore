type Teacher = {
  id: number;
  name: string;
  user: { username: string };
  subject: { id: number; name: string } | null;
};

export default function TeachersTable({ teachers }: { teachers: Teacher[] }) {
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
              <th>Assigned Subject</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, i) => (
              <tr key={t.id}>
                <td className="text-zinc-500 text-xs">{i + 1}</td>
                <td className="font-medium text-zinc-950">{t.name}</td>
                <td className="text-zinc-500 font-mono text-xs">{t.user.username}</td>
                <td>
                  {t.subject ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {t.subject.name}
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-xs italic">Not assigned</span>
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
