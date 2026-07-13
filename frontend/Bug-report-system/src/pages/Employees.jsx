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

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      try {
        const res  = await fetch(`${API_BASE_URL}/users/employees`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load employees');
        setEmployees(data.employees || []);
      } catch (err) { setError(err.message); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  return (
    <PageShell wide>
      <PageHeader
        title="Employees"
        subtitle="Manage your team directory"
        badge={`${employees.length} total`}
        actions={
          <Button variant="primary" size="auto" icon={UserPlus} onClick={() => navigate('/employees/add')}>
            Add Employee
          </Button>
        }
      />

      <ErrorBanner>{error}</ErrorBanner>

      {isLoading ? (
        <PageLoader />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Invite your first team member to get started"
          actionLabel="+ Add Employee"
          onAction={() => navigate('/employees/add')}
        />
      ) : (
        <div className="space-y-3 animate-fade-up delay-100">
          {employees.map((emp, i) => (
            <div
              key={emp._id}
              className="row-card animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => navigate(`/employees/${emp._id}`)}
            >
              <div className="flex items-center gap-4">
                <Avatar name={emp.name} />
                <div>
                  <p className="row-card-title">{emp.name}</p>
                  <p className="row-card-sub font-mono">{emp.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={statusBadgeClass(emp.status)}>{emp.status}</span>
                <ChevronRight size={16} className="text-primary hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
