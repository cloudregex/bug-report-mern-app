import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config';
import { useBilling } from '../hooks/useBilling';
import { handleUpgradeResponse, isAtLimit, redirectToBilling } from '../utils/billing';

export default function AddEmployee() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const navigate = useNavigate();
  const { plan, usage } = useBilling();

  const atEmployeeLimit = isAtLimit(usage, plan, 'employees');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim())            { setError('Name is required.');                   triggerShake(); return; }
    if (!email.trim())           { setError('Email is required.');                  triggerShake(); return; }
    if (password.length < 6)    { setError('Password must be at least 6 chars.');   triggerShake(); return; }
    if (atEmployeeLimit) {
      redirectToBilling(navigate, 'Employee limit reached');
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/users/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      const result = handleUpgradeResponse(res, data, navigate);
      if (result.upgrade) return;
      if (!result.ok) throw new Error(result.error);
      navigate('/employees');
    } catch (err) { setError(err.message); triggerShake(); }
    finally { setIsLoading(false); }
  };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  return (
    <PageShell
      backLabel="Employees"
      onBack={() => navigate('/employees')}
    >
      <Card className={`px-8 py-9 animate-scale-in ${shake ? 'animate-shake' : ''}`}>
        <div className="mb-7">
          <h1 className="section-title">Add Employee</h1>
          <p className="section-sub">Create a new account for your team member</p>
        </div>

        {atEmployeeLimit && plan && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-5 text-sm">
            <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Employee limit reached ({usage.employeesCount}/{plan.maxEmployees})</p>
              <button
                type="button"
                className="text-primary font-semibold mt-1 underline"
                onClick={() => redirectToBilling(navigate, 'Employee limit reached')}
              >
                View billing to upgrade
              </button>
            </div>
          </div>
        )}

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            id="emp-name"
            label="Full Name"
            type="text"
            value={name}
            placeholder="e.g. Rahul Sharma"
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading || atEmployeeLimit}
          />

          <Input
            id="emp-email"
            label="Email Address"
            type="email"
            value={email}
            placeholder="rahul@company.com"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || atEmployeeLimit}
          />

          <div>
            <Input
              id="emp-password"
              label="Password"
              type="password"
              value={password}
              placeholder="Min. 6 characters"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || atEmployeeLimit}
            />
            <p className="text-xs mt-1.5 pl-1 text-muted-foreground">
              Employee will use this password to log in.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/employees')} disabled={isLoading} className="!flex-1">
              Cancel
            </Button>
            <Button type="submit" id="emp-submit" disabled={isLoading || atEmployeeLimit} loading={isLoading} className="!flex-1">
              {isLoading ? 'Creating...' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
