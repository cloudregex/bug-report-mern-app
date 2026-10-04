import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config.js';
import {
  validateFullName,
  normalizeFullName,
  validateEmail,
  normalizeEmail,
  validatePasswordStrength
} from '../utils/validation';

export default function AddClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const newErrors = {};

    const nameCheck = validateFullName(name, {
      fieldName: 'client name',
      required: true,
      maxLength: 100,
      allowCompanyParentheses: true,
    });
    if (!nameCheck.valid) {
      newErrors.name = nameCheck.message;
    }

    const emailCheck = validateEmail(email, { required: true });
    if (!emailCheck.valid) {
      newErrors.email = emailCheck.message;
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      newErrors.password = passwordCheck.message;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please fix all errors to proceed.');
      triggerShake();
      return;
    }

    setErrors({});
    setIsLoading(true);

    const normalizedName = normalizeFullName(name);
    const normalizedMail = normalizeEmail(email);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: normalizedName, email: normalizedMail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create client');
      navigate('/clients');
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell backLabel="Clients" onBack={() => navigate('/clients')}>
      <Card className={`px-8 py-9 animate-scale-in ${shake ? 'animate-shake' : ''}`}>
        <div className="mb-7">
          <h1 className="section-title">Add Client</h1>
          <p className="section-sub">Create a new client account for reporting issues</p>
        </div>

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleCreate} className="space-y-5" noValidate>
          <Input
            id="client-name"
            name="clientName"
            label="Client Name"
            type="text"
            required
            maxLength={100}
            value={name}
            autoComplete="name"
            error={errors.name}
            placeholder="e.g. Acme Corp (John Doe)"
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            disabled={isLoading}
          />

          <Input
            id="client-email"
            name="email"
            label="Email Address"
            type="email"
            required
            maxLength={254}
            value={email}
            autoComplete="email"
            error={errors.email}
            placeholder="e.g. john@acme.com"
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={isLoading}
          />

          <Input
            id="client-password"
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
            disabled={isLoading}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/clients')} disabled={isLoading} className="!flex-1">
              Cancel
            </Button>
            <Button type="submit" id="client-submit" disabled={isLoading} loading={isLoading} className="!flex-1">
              {isLoading ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
