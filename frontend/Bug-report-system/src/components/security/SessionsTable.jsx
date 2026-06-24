import Button from '../ui/Button';

export default function SessionsTable({ sessions = [], onRevoke, revokingId }) {
  if (!sessions.length) {
    return <p className="text-xs text-muted-foreground py-4">No active sessions.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Device</th>
            <th>IP</th>
            <th>Last seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session._id}>
              <td>
                <div className="text-sm font-medium">{session.userId?.name || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">{session.userId?.email}</div>
              </td>
              <td className="text-sm">{session.device}</td>
              <td className="text-xs text-muted-foreground">{session.ipAddress || '—'}</td>
              <td className="text-xs text-muted-foreground whitespace-nowrap">
                {session.lastSeen ? new Date(session.lastSeen).toLocaleString() : '—'}
              </td>
              <td>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revokingId === session._id}
                  onClick={() => onRevoke(session._id)}
                >
                  {revokingId === session._id ? 'Revoking…' : 'Force logout'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
