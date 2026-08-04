import Button from '../ui/Button';

const formatIpAddress = (ip) => {
  if (!ip) return '—';
  if (ip === '::1') return 'localhost (IPv6)';
  if (ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return 'localhost (IPv4)';
  return ip;
};

export default function SessionsTable({ sessions = [], onRevoke, revokingId, revokedIds = [] }) {
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
          {sessions.map((session) => {
            const isRevoked = revokedIds.includes(session._id);
            return (
              <tr 
                key={session._id} 
                className={isRevoked ? 'opacity-30 line-through transition-all duration-1000 bg-destructive/5' : 'transition-all'}
              >
                <td>
                  <div className="text-sm font-medium">{session.userId?.name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">{session.userId?.email}</div>
                </td>
                <td className="text-sm">{session.device}</td>
                <td className="text-xs text-muted-foreground">{formatIpAddress(session.ipAddress)}</td>
                <td className="text-xs text-muted-foreground whitespace-nowrap">
                  {session.lastSeen ? new Date(session.lastSeen).toLocaleString() : '—'}
                </td>
                <td>
                  {isRevoked ? (
                    <Button
                      variant="success"
                      size="sm"
                      disabled
                      className="!bg-emerald-600 !text-white border-none animate-pulse"
                    >
                      Logged out
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revokingId === session._id}
                      onClick={() => onRevoke(session._id)}
                    >
                      {revokingId === session._id ? 'Revoking…' : 'Force logout'}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

