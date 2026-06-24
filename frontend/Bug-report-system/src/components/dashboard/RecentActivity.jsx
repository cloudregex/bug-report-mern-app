import Card from '../ui/Card';

const ACTION_LABELS = {
  TICKET_CREATED: 'created a ticket',
  STATUS_CHANGED: 'changed status',
  PRIORITY_CHANGED: 'changed priority',
  ASSIGNEE_CHANGED: 'reassigned ticket',
  COMMENT_ADDED: 'added a comment',
  ATTACHMENT_UPLOADED: 'uploaded a file',
};

export default function RecentActivity({ activities = [] }) {
  if (!activities.length) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-bold mb-3">Recent Activity</h3>
        <p className="text-xs text-muted-foreground">No recent activity</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold mb-4">Recent Activity</h3>
      <ul className="space-y-3">
        {activities.map((a) => (
          <li key={a._id} className="flex gap-3 text-sm">
            <span className="text-muted-foreground shrink-0 text-xs mt-0.5">
              {new Date(a.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>
              <strong>{a.actorId?.name || 'Someone'}</strong>
              {' '}{ACTION_LABELS[a.action] || a.action}
              {a.ticketId?.ticketNumber && (
                <span className="text-primary font-mono font-bold ml-1">{a.ticketId.ticketNumber}</span>
              )}
              {a.metadata?.newStatus && (
                <span className="text-muted-foreground"> → {a.metadata.newStatus}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
