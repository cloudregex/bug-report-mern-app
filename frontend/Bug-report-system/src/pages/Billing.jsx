import { useSearchParams } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { CreditCard, Zap, AlertTriangle } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ErrorBanner from '../components/ui/ErrorBanner';
import { PageLoader } from '../components/ui/Spinner';
import UsageBar from '../components/billing/UsageBar';
import { useBilling } from '../hooks/useBilling';

export default function Billing() {
  const { user } = useOutletContext();
  const [searchParams] = useSearchParams();
  const upgradeReason = searchParams.get('reason');
  const { plan, usage, subscription, canUpgrade, isLoading, error } = useBilling();
  const isAdmin = user?.role === 'ADMIN';

  if (isLoading) return <PageLoader />;

  return (
    <PageShell
      title="Billing & Plan"
      subtitle={isAdmin ? 'Manage your subscription and usage' : 'View your company plan and usage limits'}
    >
      {upgradeReason && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6 text-sm animate-fade-in">
          <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-destructive">Plan limit reached</p>
            <p className="mt-1">{upgradeReason}</p>
            {!canUpgrade && (
              <p className="mt-1 text-muted-foreground">Contact your company admin to upgrade the plan.</p>
            )}
          </div>
        </div>
      )}

      <ErrorBanner>{error}</ErrorBanner>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="stat-card-icon"><CreditCard size={18} /></div>
            <div>
              <h3 className="font-extrabold text-lg">Current Plan</h3>
              <p className="text-xs text-muted-foreground">Your active subscription</p>
            </div>
          </div>

          {plan ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black">{plan.name}</span>
                <Badge variant={subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL' ? 'active' : 'critical'}>
                  {subscription?.status || 'ACTIVE'}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-primary">
                ${plan.price}
                <span className="text-sm text-muted-foreground font-normal">/month</span>
              </p>
              <ul className="space-y-1">
                {(plan.features || []).map((f) => (
                  <li key={f} className="text-sm text-muted-foreground">✓ {f}</li>
                ))}
              </ul>
              {subscription?.renewalDate && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(subscription.renewalDate).toLocaleDateString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No plan assigned</p>
          )}

          {canUpgrade ? (
            <Button
              variant="primary"
              size="auto"
              icon={Zap}
              onClick={() => alert('Payment integration (Stripe/Razorpay) coming soon. Contact support to upgrade.')}
            >
              Upgrade Plan
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only company admins can upgrade the plan. Reach out to your admin if you need more capacity.
            </p>
          )}
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-extrabold text-lg">Usage</h3>
          {plan ? (
            <>
              <UsageBar label="Projects" used={usage?.projectsCount ?? 0} max={plan.maxProjects} />
              <UsageBar label="Employees" used={usage?.employeesCount ?? 0} max={plan.maxEmployees} />
              <UsageBar label="Tickets This Month" used={usage?.ticketsCreatedThisMonth ?? 0} max={plan.maxTicketsPerMonth} />
              <UsageBar label="Storage (GB)" used={usage?.storageUsed ?? 0} max={plan.maxStorageGB} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Usage data unavailable</p>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
