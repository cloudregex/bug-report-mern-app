import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from '../ui/Card';

export default function FailedLoginTrendChart({ data = [] }) {
  const chartData = data.map((d) => ({ date: d._id, count: d.count }));

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold mb-4">Failed Login Trends (7 days)</h3>
      {!chartData.length ? (
        <p className="text-xs text-muted-foreground">No failed login data.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.018 250)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="oklch(0.55 0.22 25)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
