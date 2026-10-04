import { useState, useEffect, useCallback } from 'react';
import {
  Building2, DollarSign, CheckCircle, XCircle, HardDrive,
  ShieldAlert, Lock, Users, FolderKanban, Ticket, TrendingUp,
  RefreshCw, Calendar, ArrowUpRight, Ban, Activity
} from 'lucide-react';
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

const STATUS_VARIANT = {
  ACTIVE: 'active',
  TRIAL: 'open',
  EXPIRED: 'critical',
  CANCELLED: 'closed',
};

function UsageBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 90 ? 'var(--destructive)' : pct >= 70 ? 'oklch(0.58 0.20 30)' : 'var(--primary)';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold">{value}/{max} <span className="text-muted-foreground">({pct}%)</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function CompanyCard({ company, onStatusChange }) {
  const sub = company.subscription || {};
  const usage = company.usage || {};
  const plan = company.plan || {};

  return (
    <Card className="p-5 space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-bold text-sm">{company.companyName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">/{company.companySlug}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANT[sub.status] || 'open'}>{sub.status}</Badge>
          {plan.name && <Badge variant="invited">{plan.name}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Employees', value: usage.employeesCount ?? 0, icon: Users },
          { label: 'Projects', value: usage.projectsCount ?? 0, icon: FolderKanban },
          { label: 'Tickets/mo', value: usage.ticketsCreatedThisMonth ?? 0, icon: Ticket },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg p-2" style={{ background: 'var(--muted)' }}>
            <Icon size={14} className="mx-auto mb-1 text-primary" />
            <p className="font-extrabold text-sm">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {plan.maxEmployees != null && (
        <div className="space-y-2">
          <UsageBar value={usage.employeesCount ?? 0} max={plan.maxEmployees} label="Employees" />
          <UsageBar value={usage.projectsCount ?? 0} max={plan.maxProjects} label="Projects" />
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        {sub.startDate && <p>Started: {new Date(sub.startDate).toLocaleDateString()}</p>}
        {sub.renewalDate && <p>Renewal: {new Date(sub.renewalDate).toLocaleDateString()}</p>}
        {plan.price != null && <p className="font-semibold text-foreground">${plan.price}/mo</p>}
      </div>

      {onStatusChange && (
        <select
          value={sub.status}
          onChange={(e) => onStatusChange(sub.id, e.target.value)}
          className="filter-select w-full text-xs mt-1"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="TRIAL">TRIAL</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      )}
    </Card>
  );
}

export default function SaasDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [security, setSecurity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [companySearch, setCompanySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [dR, sR, cR, secR] = await Promise.all([
        fetch(`${API_BASE_URL}/saas/dashboard`, { headers: h }),
        fetch(`${API_BASE_URL}/subscriptions`, { headers: h }),
        fetch(`${API_BASE_URL}/saas/companies`, { headers: h }),
        fetchPlatformSecurityDashboard(),
      ]);
      const [dD, sD, cD] = await Promise.all([dR.json(), sR.json(), cR.json()]);
      if (dR.ok && dD.success) setDashboard(dD.dashboard);
      if (sR.ok && sD.success) setSubscriptions(sD.subscriptions || []);
      if (cR.ok && cD.success) setCompanies(cD.companies || []);
      if (secR.success) setSecurity(secR.dashboard);
    } catch (err) {
      console.error('SaaS dashboard load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`Change subscription status to ${status}?`)) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, confirm: true }),
    });
    if (res.ok) load(true);
  };

  if (isLoading) return <PageLoader />;

  const d = dashboard || {};
  const sec = security || {};

  const filteredCompanies = companies.filter((c) => {
    const matchSearch = !companySearch || c.companyName.toLowerCase().includes(companySearch.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.subscription?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'companies', label: `Companies (${companies.length})`, icon: Building2 },
    { id: 'subscriptions', label: 'Subscriptions', icon: DollarSign },
    { id: 'security', label: 'Security', icon: ShieldAlert },
  ];

  return (
    <PageShell wide>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <PageHeader
          title="Super Admin — Platform Dashboard"
          subtitle="Live metrics, all companies, subscriptions & platform security"
        />
        <button
          onClick={() => load(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>
          {/* Primary stats */}
          <div className="stat-card-grid mb-6">
            <StatCard label="Total Companies" value={d.totalCompanies ?? 0} icon={Building2} accent="oklch(0.48 0.19 258)" />
            <StatCard label="Total Employees" value={d.totalEmployees ?? 0} icon={Users} accent="oklch(0.52 0.18 145)" />
            <StatCard label="Total Projects" value={d.totalProjects ?? 0} icon={FolderKanban} accent="oklch(0.58 0.20 30)" />
            <StatCard label="Tickets This Month" value={d.totalTickets ?? 0} icon={Ticket} accent="oklch(0.55 0.18 45)" />
            <StatCard label="Monthly Revenue" value={`$${d.mrr ?? 0}`} icon={DollarSign} accent="oklch(0.52 0.18 145)" />
            <StatCard label="Storage Used" value={`${d.storageUsageGB ?? 0} GB`} icon={HardDrive} accent="oklch(0.58 0.20 30)" />
          </div>

          {/* Subscription health */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Active / Trial" value={d.activeSubscriptions ?? 0} icon={CheckCircle} accent="oklch(0.52 0.18 145)" />
            <StatCard label="Expired" value={d.expiredSubscriptions ?? 0} icon={XCircle} accent="oklch(0.55 0.22 25)" />
            <StatCard label="Cancelled" value={d.cancelledSubscriptions ?? 0} icon={Ban} accent="oklch(0.45 0.15 10)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Top companies */}
            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <ArrowUpRight size={15} className="text-primary" /> Top Companies by Activity
              </h3>
              {!d.topCompanies?.length ? (
                <p className="text-xs text-muted-foreground">No companies yet</p>
              ) : (
                <div className="space-y-3">
                  {d.topCompanies.map((c) => (
                    <div key={c.companyId} className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm">{c.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.employeesCount} employees · {c.projectsCount} projects · {c.ticketsThisMonth ?? 0} tickets/mo
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[c.status] || 'open'}>{c.status}</Badge>
                        {c.plan && <Badge variant="invited">{c.plan}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Plans */}
            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Activity size={15} className="text-primary" /> Available Plans
              </h3>
              <div className="space-y-3">
                {(d.plans || []).map((p) => (
                  <div key={p._id} className="flex justify-between items-center rounded-lg p-3"
                    style={{ background: 'var(--muted)' }}>
                    <div>
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.maxProjects} projects · {p.maxEmployees} employees
                      </p>
                    </div>
                    <span className="font-bold text-primary">${p.price}/mo</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── COMPANIES TAB ── */}
      {activeTab === 'companies' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <input
              type="text"
              placeholder="Search company..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="filter-select flex-1 min-w-[200px]"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="text-xs text-muted-foreground font-medium">
              {filteredCompanies.length} of {companies.length} companies
            </span>
          </div>

          {filteredCompanies.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No companies match your filters.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCompanies.map((company) => (
                <CompanyCard key={company.companyId} company={company} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUBSCRIPTIONS TAB ── */}
      {activeTab === 'subscriptions' && (
        <Card className="p-5 overflow-x-auto">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <DollarSign size={15} className="text-primary" /> All Subscriptions
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Start</th>
                <th>Renewal</th>
                <th>Employees</th>
                <th>Projects</th>
                <th>Change Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => {
                const matchedCompany = companies.find((c) => c.subscription?.id === s._id);
                return (
                  <tr key={s._id}>
                    <td className="font-medium">{s.companyId?.name || '—'}</td>
                    <td>{s.planId?.name || '—'}</td>
                    <td>
                      <Badge variant={STATUS_VARIANT[s.status] || 'open'}>{s.status}</Badge>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-center">{matchedCompany?.usage?.employeesCount ?? '—'}</td>
                    <td className="text-center">{matchedCompany?.usage?.projectsCount ?? '—'}</td>
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
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="stat-card-grid mb-2">
            <StatCard label="Locked Accounts" value={sec.lockedAccounts?.length ?? 0} icon={Lock} accent="oklch(0.55 0.22 25)" />
            <StatCard label="Subscription Changes (7d)" value={sec.subscriptionChanges?.length ?? 0} icon={DollarSign} accent="oklch(0.52 0.18 145)" />
            <StatCard label="Accounts Locked (24h)" value={sec.accountLockedEvents?.length ?? 0} icon={ShieldAlert} accent="oklch(0.58 0.20 30)" />
          </div>

          <FailedLoginTrendChart data={sec.failedLoginTrends} />

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Lock size={14} className="text-destructive" /> Locked Accounts
            </h3>
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
                  {sec.lockedAccounts.map((u) => (
                    <tr key={u._id}>
                      <td className="font-medium">{u.name}</td>
                      <td className="text-sm text-muted-foreground">{u.email}</td>
                      <td>{u.failedLoginAttempts ?? 0}</td>
                      <td className="text-xs text-muted-foreground">
                        {u.lockedUntil ? new Date(u.lockedUntil).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
              <Calendar size={14} className="text-primary" /> Subscription Change Audit
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Billing-related changes only.</p>
            <AuditLogTable logs={sec.subscriptionChanges} showCompany />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <ShieldAlert size={14} className="text-destructive" /> Recent Account Lock Events
            </h3>
            <AuditLogTable logs={sec.accountLockedEvents} />
          </Card>
        </div>
      )}
    </PageShell>
  );
}
