const variants = {
  active: 'badge-active',
  disabled: 'badge-disabled',
  invited: 'badge-invited',
  open: 'badge-open',
  inprog: 'badge-inprog',
  done: 'badge-done',
  closed: 'badge-closed',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  critical: 'badge-critical',
};

export function statusBadgeClass(status) {
  const map = { ACTIVE: 'active', DISABLED: 'disabled', INVITED: 'invited' };
  return `badge ${variants[map[status] || 'invited']}`;
}

export function ticketStatusBadgeClass(status) {
  const map = {
    BACKLOG: 'closed', TODO: 'open', IN_PROGRESS: 'inprog', IN_REVIEW: 'inprog',
    TESTING: 'inprog', DONE: 'done', CLOSED: 'closed', REOPENED: 'open',
  };
  return `badge ${variants[map[status] || 'open']}`;
}

export function priorityBadgeClass(priority) {
  const map = {
    CRITICAL: 'critical', BLOCKER: 'critical', HIGH: 'high',
    MEDIUM: 'medium', LOW: 'low',
  };
  return `badge ${variants[map[priority] || 'medium']}`;
}

export default function Badge({ children, variant = 'open', className = '' }) {
  return <span className={`badge ${variants[variant] || variants.open} ${className}`}>{children}</span>;
}
