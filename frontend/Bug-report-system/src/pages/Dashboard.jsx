import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FolderKanban, ArrowRight } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { API_BASE_URL } from '../config';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const isAdmin = user?.role === 'ADMIN';

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem('token');
    const endpoint = isAdmin ? '/dashboard/company' : '/dashboard/me';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setDashboard(data.dashboard);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    setIsLoading(true);
    fetchDashboard();
  }, [fetchDashboard]);

  useDashboardRefresh(user?.companyId, fetchDashboard);

  return (
    <PageShell>
      <div className="animate-fade-up mb-8">
        <h1 className="section-title">
          {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
        </h1>
        <p className="section-sub">
          Good to see you, <strong>{user?.name?.split(' ')[0]}</strong> — live workspace analytics.
        </p>
      </div>

      {isAdmin ? (
        <AdminDashboard data={dashboard} isLoading={isLoading} />
      ) : (
        <EmployeeDashboard data={dashboard} isLoading={isLoading} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 animate-fade-up">
        <Card hover className="!p-5" onClick={() => navigate('/projects')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="stat-card-icon"><FolderKanban size={18} /></div>
              <div>
                <p className="font-bold text-sm">Manage Projects</p>
                <p className="text-xs text-muted-foreground mt-0.5">View project workspaces</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-primary" />
          </div>
        </Card>
      </div>

      <div className="text-center mt-8 animate-fade-up">
        <Badge variant={isAdmin ? 'active' : 'open'}>{user?.role} account</Badge>
      </div>
    </PageShell>
  );
}
