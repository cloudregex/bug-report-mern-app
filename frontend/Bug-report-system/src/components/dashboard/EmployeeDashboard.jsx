import { useNavigate } from 'react-router-dom';
import { Ticket, AtSign, Calendar, CheckCircle } from 'lucide-react';
import StatCard from '../ui/StatCard';
import { StatusChart, PriorityChart } from './DashboardCharts';
import RecentActivity from './RecentActivity';
import PlanUsageSummary from '../billing/PlanUsageSummary';

export default function EmployeeDashboard({ data, isLoading }) {
  const navigate = useNavigate();
  const d = data || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Assigned To Me" value={d.assignedTickets ?? 0} isLoading={isLoading} icon={Ticket} accent="oklch(0.58 0.20 30)" onClick={() => navigate('/tickets')} />
        <StatCard label="Mentions" value={d.mentions ?? 0} isLoading={isLoading} icon={AtSign} accent="oklch(0.48 0.19 258)" />
        <StatCard label="Due Today" value={d.dueToday ?? 0} isLoading={isLoading} icon={Calendar} accent="oklch(0.55 0.18 45)" />
        <StatCard label="Done This Week" value={d.completedThisWeek ?? 0} isLoading={isLoading} icon={CheckCircle} accent="oklch(0.52 0.18 145)" />
      </div>

      <PlanUsageSummary compact />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusChart data={d.ticketsByStatus} />
        <PriorityChart data={d.ticketsByPriority} />
      </div>

      <RecentActivity activities={d.recentActivity} />
    </div>
  );
}
