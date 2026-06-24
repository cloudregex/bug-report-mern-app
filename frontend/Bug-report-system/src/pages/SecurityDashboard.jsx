import { useCallback, useEffect, useState } from 'react';
import { Monitor, ShieldAlert, UserX, ScrollText } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import { PageLoader } from '../components/ui/Spinner';
import AuditLogTable from '../components/security/AuditLogTable';
import SessionsTable from '../components/security/SessionsTable';
import {
  fetchCompanySecurityDashboard,
  fetchAuditLogs,
  revokeSession,
} from '../utils/securityApi';

const AUDIT_ACTIONS = [
  '', 'PRIORITY_CHANGED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'TICKET_DELETED',
  'PROJECT_DELETED', 'PROJECT_ARCHIVED', 'ROLE_CHANGED', 'USER_DISABLED', 'USER_ENABLED',
  'COMMENT_DELETED', 'ATTACHMENT_DELETED', 'SESSION_REVOKED', 'LOGIN_SUCCESS',
];

export default function SecurityDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadDashboard = useCallback(async () => {
    const data = await fetchCompanySecurityDashboard();
    if (data.success) setDashboard(data.dashboard);
  }, []);

  const loadAuditLogs = useCallback(async (page = 1) => {
    const data = await fetchAuditLogs({ ...filters, page, limit: 25 });
    if (data.success) {
      setAuditLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, pages: 1 });
    }
  }, [filters]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadDashboard(), loadAuditLogs(1)]);
    } finally {
      setIsLoading(false);
    }
  }, [loadDashboard, loadAuditLogs]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRevoke = async (sessionId) => {
    setRevokingId(sessionId);
    try {
      const data = await revokeSession(sessionId);
      if (data.success) await loadDashboard();
    } finally {
      setRevokingId(null);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadAuditLogs(1);
  };

  if (isLoading) return <PageLoader message="Loading security dashboard..." />;

  const d = dashboard || {};

  return (
    <PageShell wide>
      <PageHeader
        title="Security Dashboard"
        subtitle="Company audit trail, active sessions, and login activity"
      />
      <div className="stat-card-grid mb-6">
        <StatCard label="Active Sessions" value={d.activeSessions?.length ?? 0} icon={Monitor} accent="oklch(0.48 0.19 258)" />
        <StatCard label="Failed Logins (24h)" value={d.failedLogins?.length ?? 0} icon={ShieldAlert} accent="oklch(0.55 0.22 25)" />
        <StatCard label="Disabled Users" value={d.disabledUsers?.length ?? 0} icon={UserX} accent="oklch(0.58 0.20 30)" />
        <StatCard label="Recent Audit Events" value={d.recentAuditLogs?.length ?? 0} icon={ScrollText} accent="oklch(0.52 0.18 145)" />
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'audit', label: 'Audit Logs' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'overview' && (
        <div className="space-y-4 mt-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold mb-4">Active Sessions</h3>
            <SessionsTable
              sessions={d.activeSessions}
              onRevoke={handleRevoke}
              revokingId={revokingId}
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4">Failed Logins (last 24 hours)</h3>
              {!d.failedLogins?.length ? (
                <p className="text-xs text-muted-foreground">No failed login attempts.</p>
              ) : (
                <ul className="space-y-2">
                  {d.failedLogins.map((attempt) => (
                    <li key={attempt._id} className="flex justify-between text-sm border-b border-border pb-2">
                      <span className="font-medium">{attempt.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {attempt.ipAddress || '—'} · {new Date(attempt.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4">Disabled Users</h3>
              {!d.disabledUsers?.length ? (
                <p className="text-xs text-muted-foreground">No disabled users.</p>
              ) : (
                <ul className="space-y-2">
                  {d.disabledUsers.map((user) => (
                    <li key={user._id} className="flex justify-between text-sm">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-4">Recent Audit Logs</h3>
            <AuditLogTable logs={d.recentAuditLogs} />
          </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4 mt-4">
          <Card className="p-5">
            <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-3 items-end mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Action</label>
                <select
                  className="filter-select"
                  value={filters.action}
                  onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                >
                  <option value="">All actions</option>
                  {AUDIT_ACTIONS.filter(Boolean).map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">From</label>
                <input
                  type="date"
                  className="filter-select"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">To</label>
                <input
                  type="date"
                  className="filter-select"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">Apply filters</button>
            </form>

            <AuditLogTable logs={auditLogs} />

            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadAuditLogs(pagination.page - 1)}
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground self-center">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => loadAuditLogs(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
