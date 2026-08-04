import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, Ticket, AlertTriangle, Clock, CheckCircle, ArrowRight, UserPlus } from 'lucide-react';
import StatCard from '../ui/StatCard';
import Card from '../ui/Card';
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-scale-in">
        <Card hover className="!p-5" onClick={() => navigate('/employees/add')}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="stat-card-icon" style={{ color: 'oklch(0.48 0.19 258)', backgroundColor: 'oklch(0.48 0.19 258 / 0.1)' }}>
                <UserPlus size={18} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Add Employee</p>
                <p className="text-xs text-muted-foreground mt-0.5">Invite a team member to the workspace</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-primary shrink-0" />
          </div>
        </Card>

        <Card hover className="!p-5" onClick={() => navigate('/clients/add')}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="stat-card-icon" style={{ color: 'oklch(0.52 0.18 145)', backgroundColor: 'oklch(0.52 0.18 145 / 0.1)' }}>
                <UserPlus size={18} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Add Client</p>
                <p className="text-xs text-muted-foreground mt-0.5">Register a new client company account</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-primary shrink-0" />
          </div>
        </Card>
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
