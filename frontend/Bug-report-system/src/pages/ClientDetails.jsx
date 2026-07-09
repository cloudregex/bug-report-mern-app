import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import { PageLoader } from '../components/ui/Spinner';

const API_BASE_URL = 'http://localhost:5000/api/users';

export default function ClientDetails() {
  const { id } = useParams();
  const [client, setClient]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError]         = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      try {
        const res  = await fetch(`${API_BASE_URL}/clients/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load client');
        setClient(data.client);
      } catch (err) { setError(err.message); }
      finally { setIsLoading(false); }
    };
    load();
  }, [id]);

  const toggleStatus = async () => {
    if (!client) return;
    setError('');
    setIsUpdating(true);
    const next = client.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/clients/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: next, confirm: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setClient(data.client);
    } catch (err) { setError(err.message); }
    finally { setIsUpdating(false); }
  };

  return (
    <PageShell
      backLabel="Clients"
      onBack={() => navigate('/clients')}
    >
      <ErrorBanner>{error}</ErrorBanner>

      {isLoading ? (
        <PageLoader />
      ) : !client ? (
        <EmptyState
          icon={Search}
          title="Client not found"
          actionLabel="Back to list"
          onAction={() => navigate('/clients')}
        />
      ) : (
        <div className="animate-scale-in max-w-lg mx-auto">
          <Card className="px-8 py-8 mb-4 text-center">
            <Avatar name={client.name} size="lg" className="mx-auto mb-4" />
            <h2 className="text-xl font-black tracking-tight">{client.name}</h2>
            <p className="text-sm font-mono mt-1 text-muted-foreground">{client.email}</p>
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant="closed">{client.role}</Badge>
              <Badge variant={client.status === 'ACTIVE' ? 'active' : client.status === 'DISABLED' ? 'disabled' : 'invited'}>
                {client.status}
              </Badge>
            </div>
          </Card>

          <Card className="px-6 py-5 mb-4">
            <div className="space-y-4">
              {[
                { label: 'Client Name',  value: client.name },
                { label: 'Email',        value: client.email, mono: true },
                { label: 'Username',     value: client.username, mono: true },
                { label: 'Role',         value: client.role },
                { label: 'Created At',   value: client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
                  <span className={`text-sm font-medium text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            {client.status === 'ACTIVE'
              ? <Button onClick={toggleStatus} disabled={isUpdating} variant="danger" loading={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Disable Account'}
                </Button>
              : <Button onClick={toggleStatus} disabled={isUpdating} variant="success" loading={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Enable Account'}
                </Button>
            }
            <Button onClick={() => navigate('/clients')} disabled={isUpdating} variant="ghost">
              Back to Clients
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
