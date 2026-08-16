import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  FolderKanban,
  Ticket,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Crown,
  ArrowUpRight,
} from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ErrorBanner from '../components/ui/ErrorBanner';
import { PageLoader } from '../components/ui/Spinner';
import UsageBar from '../components/billing/UsageBar';
import { useBilling } from '../hooks/useBilling';
import { API_BASE_URL } from '../config';

// ── plan metadata ─────────────────────────────────────────────────────────────
const PLAN_ICONS = {
  FREE: '🆓',
  STARTER: '🚀',
  PRO: '⚡',
  ENTERPRISE: '🏢',
};

const PLAN_HIGHLIGHTS = {
  FREE: 'Great for individuals and small experiments.',
  STARTER: 'Perfect for small teams getting started.',
  PRO: 'Designed for growing teams that need more power.',
  ENTERPRISE: 'Unlimited scale for large organizations.',
};

// ── reusable alert banner ─────────────────────────────────────────────────────
function StatusAlert({ type, title, message }) {
  const styles = {
    error: {
      wrapper: 'border-destructive/20 bg-destructive/5',
      icon: <AlertTriangle size={20} className="text-destructive shrink-0" />,
      titleColor: 'text-destructive',
    },
    success: {
      wrapper: 'border-emerald-500/20 bg-emerald-500/5',
      icon: <CheckCircle size={20} className="text-emerald-500 shrink-0" />,
      titleColor: 'text-emerald-500',
    },
    warning: {
      wrapper: 'border-amber-500/20 bg-amber-500/5',
      icon: <XCircle size={20} className="text-amber-500 shrink-0" />,
      titleColor: 'text-amber-500',
    },
  };

  const s = styles[type];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 mb-6 text-sm animate-fade-in ${s.wrapper}`}>
      {s.icon}
      <div>
        <p className={`font-extrabold ${s.titleColor}`}>{title}</p>
        <p className="mt-0.5 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ── compact icon + stat tile ──────────────────────────────────────────────────
function UsageStat({ icon: Icon, label, used, max, suffix }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const atLimit = used >= max;
  const isWarn = !atLimit && pct >= 80;
  const color = atLimit ? 'text-destructive' : isWarn ? 'text-amber-500' : 'text-primary';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
      <div className={`p-2 rounded-md bg-muted ${color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-bold ${color}`}>
          {used}{suffix ? ` ${suffix}` : ''}
          <span className="text-muted-foreground font-normal">
            {' '}/ {max}{suffix ? ` ${suffix}` : ''}
          </span>
        </p>
      </div>
      <span className="text-xs tabular-nums text-muted-foreground/70">{pct}%</span>
    </div>
  );
}

// ── plan card feature row ─────────────────────────────────────────────────────
function PlanFeatureItem({ label, icon: Icon }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-foreground/80">
      {Icon
        ? <Icon size={13} className="text-primary/60 shrink-0" />
        : <span className="text-primary font-bold text-sm shrink-0">✓</span>
      }
      {label}
    </li>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function Billing() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const upgradeReason  = searchParams.get('reason');
  const paymentStatus  = searchParams.get('payment_status');

  const { plan, usage, subscription, canUpgrade, isLoading, error, refetch } = useBilling();

  const [plans, setPlans]               = useState([]);
  const [isPlansLoading, setPlansLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [showAllFeatures, setShowAllFeatures] = useState({});

  const isAdmin = user?.role === 'ADMIN';

  // fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const token = localStorage.getItem('token');
        const res  = await fetch(`${API_BASE_URL}/plans`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setPlans(data.plans || []);
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    if (paymentStatus === 'success') refetch();
  }, [paymentStatus, refetch]);

  const handleUpgrade = async (targetPlanId) => {
    if (!isAdmin) return;
    setUpgradingPlanId(targetPlanId);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: targetPlanId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to start upgrade session');
      window.location.href = data.url;
    } catch (err) {
      alert(err.message || 'Something went wrong initiating the upgrade.');
      setUpgradingPlanId(null);
    }
  };

  const toggleFeatures = (planId) =>
    setShowAllFeatures((prev) => ({ ...prev, [planId]: !prev[planId] }));

  if (isLoading || isPlansLoading) {
    return <PageLoader message="Loading subscription data..." />;
  }

  const currentPlanIndex = plans.findIndex((p) => p.name === plan?.name);
  const renewalLabel = subscription?.renewalDate
    ? new Date(subscription.renewalDate).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <PageShell
      title="Billing & Subscription"
      subtitle={isAdmin
        ? 'Manage plans, payments, and workspace capacity'
        : 'View your workspace tier limits'}
    >
      {/* ── Status Banners ───────────────────────────────────────────────── */}
      {upgradeReason && (
        <StatusAlert
          type="error"
          title="Limit Reached"
          message={upgradeReason + (!canUpgrade ? ' Please contact your workspace admin to upgrade the plan.' : '')}
        />
      )}
      {paymentStatus === 'success' && (
        <StatusAlert
          type="success"
          title="Upgrade Successful!"
          message="Your subscription has been updated. New limits are now active in your workspace."
        />
      )}
      {paymentStatus === 'cancelled' && (
        <StatusAlert
          type="warning"
          title="Checkout Cancelled"
          message="The payment checkout was cancelled. No changes were made to your plan."
        />
      )}

      <ErrorBanner>{error}</ErrorBanner>

      {/* ── Section 1: Plan Overview + Usage ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">

        {/* Current Plan Card */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/8 transition-all duration-500" />

          <div>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <CreditCard size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Current Plan
                  </p>
                  <h3 className="font-extrabold text-md leading-tight">Workspace Subscription</h3>
                </div>
              </div>
              <Badge variant={
                subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL'
                  ? 'active' : 'critical'
              }>
                {subscription?.status || 'ACTIVE'}
              </Badge>
            </div>

            {plan ? (
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{PLAN_ICONS[plan.name?.toUpperCase()] || '📦'}</span>
                  <h1 className="text-4xl font-black tracking-tight">{plan.name}</h1>
                </div>
                <p className="text-2xl font-bold text-primary">
                  ${plan.price}
                  <span className="text-xs text-muted-foreground font-normal ml-1">/month</span>
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  {PLAN_HIGHLIGHTS[plan.name?.toUpperCase()] || ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">No active plan assigned</p>
            )}

            {renewalLabel && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                Next billing: <span className="font-semibold text-foreground ml-1">{renewalLabel}</span>
              </div>
            )}
          </div>

          <div className="pt-5 mt-5 border-t border-border text-xs text-muted-foreground">
            {isAdmin
              ? 'You have admin access to upgrade or change this subscription.'
              : 'Only workspace admins can change the subscription plan.'}
          </div>
        </Card>

        {/* Usage Card */}
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-extrabold text-md">Workspace Usage</h3>
            {plan && (
              <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
                Resets monthly
              </span>
            )}
          </div>

          {plan ? (
            <div className="space-y-5">
              {/* Compact stat tiles */}
              <div className="grid grid-cols-2 gap-3">
                <UsageStat icon={FolderKanban} label="Projects"       used={usage?.projectsCount ?? 0}            max={plan.maxProjects} />
                <UsageStat icon={Users}        label="Team Members"   used={usage?.employeesCount ?? 0}           max={plan.maxEmployees} />
                <UsageStat icon={Ticket}       label="Tickets (month)" used={usage?.ticketsCreatedThisMonth ?? 0} max={plan.maxTicketsPerMonth} />
                <UsageStat icon={HardDrive}    label="Storage"        used={usage?.storageUsed ?? 0}              max={plan.maxStorageGB} suffix="GB" />
              </div>

              {/* Progress bars */}
              <div className="space-y-4 pt-2 border-t border-border">
                <UsageBar label="Active Projects"             used={usage?.projectsCount ?? 0}            max={plan.maxProjects} />
                <UsageBar label="Team Members"                used={usage?.employeesCount ?? 0}           max={plan.maxEmployees} />
                <UsageBar label="Tickets Created This Month"  used={usage?.ticketsCreatedThisMonth ?? 0} max={plan.maxTicketsPerMonth} />
                <UsageBar label="Storage"                     used={usage?.storageUsed ?? 0}              max={plan.maxStorageGB} suffix="GB" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Usage metrics unavailable</p>
          )}
        </Card>
      </div>

      {/* ── Section 2: Plan Grid ──────────────────────────────────────────── */}
      <div className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-black tracking-tight">Available Plans</h2>
          <p className="text-sm text-muted-foreground">
            Scale your workspace as your team grows. Upgrade or switch plans at any time.
          </p>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              ⚠ Only workspace admins can manage subscriptions.
            </p>
          )}
        </div>

        <div className={`grid gap-6 max-w-5xl mx-auto ${
          plans.length <= 2
            ? 'grid-cols-1 md:grid-cols-2'
            : plans.length === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        }`}>
          {plans.map((p, idx) => {
            const isCurrent    = plan?.name === p.name;
            const isPro        = p.name?.toUpperCase() === 'PRO';
            const isEnterprise = p.name?.toUpperCase() === 'ENTERPRISE';
            const isUpgrading  = upgradingPlanId === p.id;
            const isHigher     = idx > currentPlanIndex && currentPlanIndex !== -1;
            const isLower      = idx < currentPlanIndex && currentPlanIndex !== -1;
            const showFeatures = showAllFeatures[p.id];
            const extraFeatures   = p.features || [];
            const visibleFeatures = showFeatures ? extraFeatures : extraFeatures.slice(0, 3);

            return (
              <Card
                key={p.id}
                className={`p-6 border-2 flex flex-col justify-between transition-all duration-300 relative ${
                  isCurrent
                    ? 'border-primary shadow-lg'
                    : isPro
                    ? 'border-border hover:border-ring/60 hover:shadow-xl'
                    : 'border-border hover:border-ring/40'
                }`}
              >
                {/* Top badge */}
                {isPro && !isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-black text-xs tracking-wider uppercase shadow-md whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white font-black text-xs tracking-wider uppercase shadow-md whitespace-nowrap flex items-center gap-1.5">
                    <Crown size={11} /> Active
                  </div>
                )}

                <div>
                  {/* Plan name */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{PLAN_ICONS[p.name?.toUpperCase()] || '📦'}</span>
                    <span className="font-black text-lg tracking-wide">{p.name}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    {p.price === 0
                      ? <span className="text-3xl font-extrabold tracking-tight">Free</span>
                      : <>
                          <span className="text-3xl font-extrabold tracking-tight">${p.price}</span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </>
                    }
                  </div>

                  <p className="text-xs text-muted-foreground mb-5">
                    {PLAN_HIGHLIGHTS[p.name?.toUpperCase()] || ''}
                  </p>

                  {/* Core limits */}
                  <ul className="space-y-2.5 mb-4">
                    <PlanFeatureItem label={`${p.maxProjects} Projects`}                           icon={FolderKanban} />
                    <PlanFeatureItem label={`${p.maxEmployees} Team Members`}                      icon={Users} />
                    <PlanFeatureItem label={`${p.maxTicketsPerMonth.toLocaleString()} Monthly Tickets`} icon={Ticket} />
                    <PlanFeatureItem label={`${p.maxStorageGB} GB Storage`}                        icon={HardDrive} />
                  </ul>

                  {/* Extra features */}
                  {extraFeatures.length > 0 && (
                    <div className="border-t border-border pt-3 mt-3">
                      <ul className="space-y-2 mb-2">
                        {visibleFeatures.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="text-primary/70 font-bold text-sm">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      {extraFeatures.length > 3 && (
                        <button
                          onClick={() => toggleFeatures(p.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showFeatures
                            ? <><ChevronUp size={12} /> Show less</>
                            : <><ChevronDown size={12} /> +{extraFeatures.length - 3} more features</>
                          }
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-auto pt-5 border-t border-border">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full justify-center opacity-60" disabled>
                      Current Plan
                    </Button>
                  ) : isLower ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      disabled={!isAdmin || isUpgrading}
                      loading={isUpgrading}
                      onClick={() => handleUpgrade(p.id)}
                    >
                      Downgrade
                    </Button>
                  ) : (
                    <Button
                      variant={isPro || isEnterprise ? 'primary' : 'outline'}
                      className="w-full justify-center"
                      icon={isPro ? Zap : isHigher ? ArrowUpRight : null}
                      loading={isUpgrading}
                      disabled={!canUpgrade || !isAdmin || isUpgrading}
                      onClick={() => handleUpgrade(p.id)}
                      title={!isAdmin ? 'Only admins can change the plan' : undefined}
                    >
                      {isPro ? 'Upgrade to Pro' : isEnterprise ? 'Go Enterprise' : 'Select Plan'}
                    </Button>
                  )}
                  {!isAdmin && !isCurrent && (
                    <p className="text-center text-xs text-muted-foreground/60 mt-2">
                      Admin access required
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground/50 pb-4">
          All plans are billed monthly. Upgrades take effect immediately. Downgrades apply at the next billing cycle.
        </p>
      </div>
    </PageShell>
  );
}
