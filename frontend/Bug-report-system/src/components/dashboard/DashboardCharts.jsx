import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import Card from '../ui/Card';

const STATUS_COLORS = {
  BACKLOG: '#94a3b8',
  TODO: '#60a5fa',
  IN_PROGRESS: '#f59e0b',
  IN_REVIEW: '#a78bfa',
  TESTING: '#22d3ee',
  DONE: '#22c55e',
  CLOSED: '#64748b',
  REOPENED: '#ef4444',
};

const PRIORITY_COLORS = {
  LOW: '#94a3b8',
  MEDIUM: '#60a5fa',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444',
  BLOCKER: '#7f1d1d',
};

function ChartCard({ title, children, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <h3 className="text-sm font-bold mb-4">{title}</h3>
      {children}
    </Card>
  );
}

export function StatusChart({ data = [] }) {
  const chartData = data.map((d) => ({
    name: d.status?.replace(/_/g, ' ') || 'Unknown',
    value: d.count,
    fill: STATUS_COLORS[d.status] || '#94a3b8',
  }));

  if (!chartData.length) {
    return <ChartCard title="Tickets by Status"><p className="text-xs text-muted-foreground">No data</p></ChartCard>;
  }

  return (
    <ChartCard title="Tickets by Status">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PriorityChart({ data = [] }) {
  const chartData = data.map((d) => ({
    name: d.priority,
    value: d.count,
    fill: PRIORITY_COLORS[d.priority] || '#94a3b8',
  }));

  if (!chartData.length) {
    return <ChartCard title="Tickets by Priority"><p className="text-xs text-muted-foreground">No data</p></ChartCard>;
  }

  return (
    <ChartCard title="Tickets by Priority">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CreatedPerDayChart({ data = [] }) {
  const chartData = data.map((d) => ({ date: d.date.slice(5), count: d.count }));

  return (
    <ChartCard title="Tickets Created Per Day">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="oklch(0.48 0.19 258)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function WorkloadChart({ data = [] }) {
  const chartData = data.map((d) => ({ name: d.name?.split(' ')[0] || 'User', count: d.count }));

  if (!chartData.length) {
    return <ChartCard title="Employee Workload"><p className="text-xs text-muted-foreground">No assigned tickets</p></ChartCard>;
  }

  return (
    <ChartCard title="Employee Workload">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="oklch(0.52 0.18 145)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ResolutionKpis({ resolution }) {
  if (!resolution) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Avg Resolution', value: `${resolution.avgResolutionHours}h` },
        { label: 'Avg Ticket Age', value: `${resolution.avgTicketAgeDays}d` },
        { label: 'Reopen Rate', value: `${resolution.reopenRate}%` },
        { label: 'Open / Closed', value: `${resolution.openTickets} / ${resolution.closedTickets}` },
      ].map((kpi) => (
        <Card key={kpi.label} className="p-4 text-center">
          <p className="text-xs text-muted-foreground font-semibold">{kpi.label}</p>
          <p className="text-lg font-extrabold mt-1">{kpi.value}</p>
        </Card>
      ))}
    </div>
  );
}
