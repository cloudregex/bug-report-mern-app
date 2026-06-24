import { Users, Bug, Ticket, AlertTriangle } from 'lucide-react';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import { StatusChart, PriorityChart, CreatedPerDayChart, WorkloadChart, ResolutionKpis } from './DashboardCharts';
import RecentActivity from './RecentActivity';

export default function ProjectDashboardPanel({ data, isLoading, projectName }) {
  const d = data || {};
  const health = d.projectHealth ?? 0;
  const healthVariant = health >= 80 ? 'active' : health >= 50 ? 'open' : 'critical';

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-extrabold text-lg">Project Analytics</h3>
        {projectName && <span className="text-sm text-muted-foreground">— {projectName}</span>}
        {!isLoading && (
          <Badge variant={healthVariant}>Health: {health}%</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active Members" value={d.activeMembers ?? 0} isLoading={isLoading} icon={Users} accent="oklch(0.48 0.19 258)" />
        <StatCard label="Open Bugs" value={d.openBugs ?? 0} isLoading={isLoading} icon={Bug} accent="oklch(0.55 0.22 25)" />
        <StatCard label="Open Tickets" value={d.openTickets ?? 0} isLoading={isLoading} icon={Ticket} accent="oklch(0.58 0.20 30)" />
        <StatCard label="Critical" value={d.criticalTickets ?? 0} isLoading={isLoading} icon={AlertTriangle} accent="oklch(0.55 0.22 25)" />
      </div>

      {!isLoading && <ResolutionKpis resolution={d.resolution} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusChart data={d.ticketsByStatus} />
        <PriorityChart data={d.ticketsByPriority} />
        <CreatedPerDayChart data={d.ticketsCreatedPerDay} />
        <WorkloadChart data={d.workload} />
      </div>

      <RecentActivity activities={d.recentActivity} />
    </div>
  );
}
