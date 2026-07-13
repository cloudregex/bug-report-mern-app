import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, ChevronRight } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import { statusBadgeClass } from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';

import { API_BASE_URL } from '../config.js';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      try {
        const res  = await fetch(`${API_BASE_URL}/users/clients`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load clients');
        setClients(data.clients || []);
      } catch (err) { setError(err.message); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  return (
    <PageShell wide>
      <PageHeader
        title="Clients"
        subtitle="Manage your client directory"
        badge={`${clients.length} total`}
        actions={
          <Button variant="primary" size="auto" icon={UserPlus} onClick={() => navigate('/clients/add')}>
            Add Client
          </Button>
        }
      />

      <ErrorBanner>{error}</ErrorBanner>

      {isLoading ? (
        <PageLoader />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to get started"
          actionLabel="+ Add Client"
          onAction={() => navigate('/clients/add')}
        />
      ) : (
        <div className="space-y-3 animate-fade-up delay-100">
          {clients.map((client, i) => (
            <div
              key={client._id}
              className="row-card animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => navigate(`/clients/${client._id}`)}
            >
              <div className="flex items-center gap-4">
                <Avatar name={client.name} />
                <div>
                  <p className="row-card-title">{client.name}</p>
                  <p className="row-card-sub font-mono">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={statusBadgeClass(client.status)}>{client.status}</span>
                <ChevronRight size={16} className="text-primary hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
