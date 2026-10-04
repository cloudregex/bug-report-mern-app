import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config';
import {
  validateFullName,
  normalizeFullName,
  validateEmail,
  normalizeEmail,
  validatePasswordStrength
} from '../utils/validation';
import { useBilling } from '../hooks/useBilling';
import { handleUpgradeResponse, isAtLimit, redirectToBilling } from '../utils/billing';

export default function AddEmployee() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const { plan, usage } = useBilling();

  const atEmployeeLimit = isAtLimit(usage, plan, 'employees');

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const newErrors = {};

    // Validate Full Name
    const nameCheck = validateFullName(name, { fieldName: 'full name', required: true, maxLength: 100 });
    if (!nameCheck.valid) {
      newErrors.name = nameCheck.message;
    }

    // Validate Email
    const emailCheck = validateEmail(email, { required: true });
    if (!emailCheck.valid) {
      newErrors.email = emailCheck.message;
    }

    // Validate Password
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      newErrors.password = passwordCheck.message;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please resolve all validation errors.');
      triggerShake();
      return;
    }

    if (atEmployeeLimit) {
      redirectToBilling(navigate, 'Employee limit reached');
      return;
    }

    setErrors({});
    setIsLoading(true);

    const normalizedName = normalizeFullName(name);
    const normalizedMail = normalizeEmail(email);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: normalizedName, email: normalizedMail, password }),
      });
      const data = await res.json();
      const result = handleUpgradeResponse(res, data, navigate);
      if (result.upgrade) return;
      if (!result.ok) throw new Error(result.error);
      navigate('/employees');
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell backLabel="Employees" onBack={() => navigate('/employees')}>
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

        <form onSubmit={handleCreate} className="space-y-5" noValidate>
          <Input
            id="emp-name"
            name="fullName"
            label="Full Name"
            type="text"
            required
            maxLength={100}
            value={name}
            autoComplete="name"
            error={errors.name}
            placeholder="e.g. Rahul Sharma"
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            disabled={isLoading || atEmployeeLimit}
          />

          <Input
            id="emp-email"
            name="email"
            label="Email Address"
            type="email"
            required
            maxLength={254}
            value={email}
            autoComplete="email"
            error={errors.email}
            placeholder="e.g. rahul@company.com"
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={isLoading || atEmployeeLimit}
          />

          <Input
            id="emp-password"
            name="password"
            label="Password"
            type="password"
            required
            maxLength={128}
            value={password}
            autoComplete="new-password"
            error={errors.password}
            helperText="At least 8 characters with uppercase, lowercase, number, and special character."
            placeholder="Create a strong password"
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            disabled={isLoading || atEmployeeLimit}
          />

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
