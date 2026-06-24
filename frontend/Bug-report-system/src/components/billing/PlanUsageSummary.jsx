import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowRight, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { PageLoader } from '../ui/Spinner';
import UsageBar from './UsageBar';
import { useBilling } from '../../hooks/useBilling';
import { isAtLimit } from '../../utils/billing';

export default function PlanUsageSummary({ compact = false, showUpgradeCta = true }) {
  const navigate = useNavigate();
  const { plan, usage, subscription, canUpgrade, isLoading, error } = useBilling();

  if (isLoading) {
    return compact ? null : <PageLoader />;
  }

  if (error || !plan) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          {error || 'Plan usage unavailable'}
        </p>
      </Card>
    );
  }

  const projectLimitHit = isAtLimit(usage, plan, 'projects');
  const ticketLimitHit = isAtLimit(usage, plan, 'tickets');
  const anyLimitHit = projectLimitHit || ticketLimitHit;

  if (compact) {
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="stat-card-icon"><CreditCard size={18} /></div>
            <div>
              <p className="font-bold text-sm">Plan & Usage</p>
              <p className="text-xs text-muted-foreground">
                {plan.name} plan · {subscription?.status || 'ACTIVE'}
              </p>
            </div>
          </div>
          <Badge variant={anyLimitHit ? 'critical' : 'active'}>
            {anyLimitHit ? 'Limit reached' : 'Within limits'}
          </Badge>
        </div>

        <div className="space-y-3">
          <UsageBar label="Projects" used={usage.projectsCount ?? 0} max={plan.maxProjects} />
          <UsageBar label="Tickets This Month" used={usage.ticketsCreatedThisMonth ?? 0} max={plan.maxTicketsPerMonth} />
        </div>

        <Button
          variant="ghost"
          size="auto"
          icon={ArrowRight}
          onClick={() => navigate('/billing')}
          className="w-full"
        >
          View full billing details
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="stat-card-icon"><CreditCard size={18} /></div>
          <div>
            <h3 className="font-extrabold text-lg">Plan & Usage</h3>
            <p className="text-xs text-muted-foreground">Your company subscription limits</p>
          </div>
        </div>
        <Badge variant={subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL' ? 'active' : 'critical'}>
          {plan.name}
        </Badge>
      </div>

      {anyLimitHit && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
          <span>
            {projectLimitHit && 'Project limit reached. '}
            {ticketLimitHit && 'Monthly ticket limit reached. '}
            {canUpgrade ? 'Upgrade your plan to continue.' : 'Ask your admin to upgrade the plan.'}
          </span>
        </div>
      )}

      <UsageBar label="Projects" used={usage.projectsCount ?? 0} max={plan.maxProjects} />
      <UsageBar label="Employees" used={usage.employeesCount ?? 0} max={plan.maxEmployees} />
      <UsageBar label="Tickets This Month" used={usage.ticketsCreatedThisMonth ?? 0} max={plan.maxTicketsPerMonth} />

      {showUpgradeCta && (
        <Button variant="primary" size="auto" onClick={() => navigate('/billing')}>
          {canUpgrade ? 'Manage billing' : 'View billing details'}
        </Button>
      )}
    </Card>
  );
}
