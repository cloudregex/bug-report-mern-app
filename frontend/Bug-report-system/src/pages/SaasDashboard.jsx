import { useState, useEffect } from 'react';
import { Building2, DollarSign, CheckCircle, XCircle, HardDrive, ShieldAlert, Lock } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import { PageLoader } from '../components/ui/Spinner';
import AuditLogTable from '../components/security/AuditLogTable';
import FailedLoginTrendChart from '../components/security/FailedLoginTrendChart';
import { API_BASE_URL } from '../config';
import { fetchPlatformSecurityDashboard } from '../utils/securityApi';

export default function SaasDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [security, setSecurity] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const load = async () => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [dR, sR, secR] = await Promise.all([
        fetch(`${API_BASE_URL}/saas/dashboard`, { headers: h }),
        fetch(`${API_BASE_URL}/subscriptions`, { headers: h }),
        fetchPlatformSecurityDashboard(),
      ]);
      const [dD, sD] = await Promise.all([dR.json(), sR.json()]);
      if (dR.ok && dD.success) setDashboard(dD.dashboard);
      if (sR.ok && sD.success) setSubscriptions(sD.subscriptions || []);
      if (secR.success) setSecurity(secR.dashboard);
    } catch (err) {
      console.error('SaaS dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`Change subscription status to ${status}?`)) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, confirm: true }),
    });
    if (res.ok) load();
  };

  if (isLoading) return <PageLoader />;

  const d = dashboard || {};
  const sec = security || {};

  return (
    <PageShell wide>
      <PageHeader title="Platform Dashboard" subtitle="Billing, subscriptions, and platform security" />

      <Tabs
        tabs={[
          { id: 'overview', label: 'Billing Overview' },
          { id: 'security', label: 'Platform Security', icon: ShieldAlert },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {activeTab === 'overview' && (
        <>
          <div className="stat-card-grid mb-6">
            <StatCard label="Total Companies" value={d.totalCompanies ?? 0} icon={Building2} accent="oklch(0.48 0.19 258)" />
            <StatCard label="MRR" value={`$${d.mrr ?? 0}`} icon={DollarSign} accent="oklch(0.52 0.18 145)" />
            <StatCard label="Active Subscriptions" value={d.activeSubscriptions ?? 0} icon={CheckCircle} accent="oklch(0.52 0.18 145)" />
            <StatCard label="Expired" value={d.expiredSubscriptions ?? 0} icon={XCircle} accent="oklch(0.55 0.22 25)" />
            <StatCard label="Storage Used" value={`${d.storageUsageGB ?? 0} GB`} icon={HardDrive} accent="oklch(0.58 0.20 30)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4">Top Companies</h3>
              {!d.topCompanies?.length ? (
                <p className="text-xs text-muted-foreground">No companies yet</p>
              ) : (
                <ul className="space-y-3">
                  {d.topCompanies.map((c) => (
                    <li key={c.companyId} className="flex justify-between items-center text-sm">
                      <span className="font-semibold">{c.companyName}</span>
                      <span className="text-muted-foreground">
                        {c.plan} · {c.projectsCount} projects · {c.employeesCount} employees
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4">Available Plans</h3>
              <ul className="space-y-2">
                {(d.plans || []).map((p) => (
                  <li key={p._id} className="flex justify-between text-sm">
                    <span className="font-bold">{p.name}</span>
                    <span className="text-muted-foreground">${p.price}/mo</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-5 overflow-x-auto">
            <h3 className="text-sm font-bold mb-4">All Subscriptions</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Renewal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s._id}>
                    <td className="font-medium">{s.companyId?.name || '—'}</td>
                    <td>{s.planId?.name || '—'}</td>
                    <td><Badge variant={s.status === 'ACTIVE' || s.status === 'TRIAL' ? 'active' : 'critical'}>{s.status}</Badge></td>
                    <td className="text-muted-foreground text-xs">
                      {s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s._id, e.target.value)}
                        className="filter-select"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRIAL">TRIAL</option>
                        <option value="EXPIRED">EXPIRED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="stat-card-grid mb-2">
            <StatCard
              label="Locked Accounts"
              value={sec.lockedAccounts?.length ?? 0}
              icon={Lock}
              accent="oklch(0.55 0.22 25)"
            />
            <StatCard
              label="Subscription Changes (7d)"
              value={sec.subscriptionChanges?.length ?? 0}
              icon={DollarSign}
              accent="oklch(0.52 0.18 145)"
            />
            <StatCard
              label="Accounts Locked (24h)"
              value={sec.accountLockedEvents?.length ?? 0}
              icon={ShieldAlert}
              accent="oklch(0.58 0.20 30)"
            />
          </div>

          <FailedLoginTrendChart data={sec.failedLoginTrends} />

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-4">Locked Accounts</h3>
            {!sec.lockedAccounts?.length ? (
              <p className="text-xs text-muted-foreground">No locked accounts right now.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Failed Attempts</th>
                    <th>Locked Until</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.lockedAccounts.map((user) => (
                    <tr key={user._id}>
                      <td className="font-medium">{user.name}</td>
                      <td className="text-sm text-muted-foreground">{user.email}</td>
                      <td>{user.failedLoginAttempts ?? 0}</td>
                      <td className="text-xs text-muted-foreground">
                        {user.lockedUntil ? new Date(user.lockedUntil).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-1">Subscription Change Audit</h3>
            <p className="text-xs text-muted-foreground mb-4">Billing-related changes only — no company operational logs.</p>
            <AuditLogTable logs={sec.subscriptionChanges} showCompany />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-4">Recent Account Lock Events</h3>
            <AuditLogTable logs={sec.accountLockedEvents} />
          </Card>
        </div>
      )}
    </PageShell>
  );
}
