import Badge from '../ui/Badge';

const formatChange = (before, after) => {
  if (!before && !after) return '—';
  if (before && after) {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    return [...keys].map((key) => `${key}: ${before?.[key] ?? '—'} → ${after?.[key] ?? '—'}`).join(' · ');
  }
  return JSON.stringify(after || before);
};

export default function AuditLogTable({ logs = [], showCompany = false }) {
  if (!logs.length) {
    return <p className="text-xs text-muted-foreground py-4">No audit logs found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            {showCompany && <th>Company</th>}
            <th>Action</th>
            <th>Entity</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id}>
              <td className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td>
                <div className="text-sm font-medium">{log.actorId?.name || 'System'}</div>
                <div className="text-xs text-muted-foreground">{log.actorId?.email}</div>
              </td>
              {showCompany && (
                <td className="text-sm">{log.companyId?.name || '—'}</td>
              )}
              <td><Badge variant="closed">{log.action}</Badge></td>
              <td className="text-xs">{log.entityType}</td>
              <td className="text-xs text-muted-foreground max-w-xs truncate" title={formatChange(log.before, log.after)}>
                {formatChange(log.before, log.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
