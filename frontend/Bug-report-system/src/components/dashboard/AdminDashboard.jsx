import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, Ticket, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import StatCard from '../ui/StatCard';
import { StatusChart, PriorityChart, CreatedPerDayChart, WorkloadChart, ResolutionKpis } from './DashboardCharts';
import RecentActivity from './RecentActivity';

const ADMIN_STATS = [
  { key: 'projects', label: 'Projects', icon: FolderKanban, accent: 'oklch(0.52 0.18 145)', path: '/projects' },
  { key: 'employees', label: 'Employees', icon: Users, accent: 'oklch(0.48 0.19 258)', path: '/employees' },
  { key: 'openTickets', label: 'Open Tickets', icon: Ticket, accent: 'oklch(0.58 0.20 30)', path: '/tickets' },
  { key: 'criticalTickets', label: 'Critical', icon: AlertTriangle, accent: 'oklch(0.55 0.22 25)', path: '/tickets' },
  { key: 'overdueTickets', label: 'Overdue', icon: Clock, accent: 'oklch(0.55 0.18 45)' },
  { key: 'closedToday', label: 'Closed Today', icon: CheckCircle, accent: 'oklch(0.52 0.18 145)' },
];

export default function AdminDashboard({ data, isLoading }) {
  const navigate = useNavigate();
  const d = data || {};

  return (
    <div className="space-y-6">
      <div className="stat-card-grid">
        {ADMIN_STATS.map((stat, i) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={d[stat.key] ?? 0}
            isLoading={isLoading}
            icon={stat.icon}
            accent={stat.accent}
            delay={i * 60}
            onClick={stat.path ? () => navigate(stat.path) : undefined}
          />
        ))}
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
