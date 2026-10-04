import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config.js';
import { validateCompanyName, normalizeCompanyName } from '../utils/validation';

export default function CreateCompany() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setFieldError('');

    const check = validateCompanyName(name, {
      fieldName: 'company name',
      required: true,
      minLength: 2,
      maxLength: 100
    });

    if (!check.valid) {
      setFieldError(check.message);
      setError(check.message);
      triggerShake();
      return;
    }

    setIsLoading(true);
    const normalized = normalizeCompanyName(name);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create company');
      navigate('/');
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set Up Your Company"
      subtitle="One-time setup before you get started"
      icon={Building2}
      shake={shake}
    >
      <div className="auth-card">
        <h2 className="auth-card-title">Company Details</h2>
        <p className="auth-card-sub">This will be your organisation&apos;s workspace</p>

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleCreate} className="space-y-5" noValidate>
          <Input
            id="company-name"
            name="companyName"
            label="Company Name"
            type="text"
            required
            maxLength={100}
            value={name}
            autoComplete="organization"
            error={fieldError}
            placeholder="e.g. Citizens Foundation"
            onChange={(e) => {
              setName(e.target.value);
              if (fieldError) setFieldError('');
            }}
            disabled={isLoading}
          />

          <Button type="submit" loading={isLoading} className="mt-2">
            {isLoading ? 'Creating...' : 'Create Company'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
