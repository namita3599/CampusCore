type Warden = {
  id: number;
  name: string;
  user: { username: string };
  hostel: { id: number; name: string } | null;
};

export default function WardensTable({ wardens }: { wardens: Warden[] }) {
  if (wardens.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-500">No wardens registered yet.</p>
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
              <th>Assigned Hostel</th>
            </tr>
          </thead>
          <tbody>
            {wardens.map((w, i) => (
              <tr key={w.id}>
                <td className="text-slate-500 text-xs">{i + 1}</td>
                <td className="font-medium text-white">{w.name}</td>
                <td className="text-slate-400 font-mono text-xs">{w.user.username}</td>
                <td>
                  {w.hostel ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/10 text-violet-400 border border-violet-500/15">
                      {w.hostel.name}
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
