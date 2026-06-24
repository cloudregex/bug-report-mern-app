import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config';

export default function Register() {
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/');
  }, [navigate]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim() || !name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      triggerShake();
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('token', data.token);
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
      title="Bug Tracker"
      subtitle="Create your company workspace"
      icon={Building2}
      shake={shake}
    >
      <div className="auth-card">
        <h2 className="auth-card-title">Register your company</h2>
        <p className="auth-card-sub">
          Set up your organisation and become the company admin
        </p>

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            id="register-company"
            label="Company name"
            type="text"
            value={companyName}
            autoComplete="organization"
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp"
            disabled={isLoading}
          />

          <Input
            id="register-name"
            label="Your full name"
            type="text"
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            disabled={isLoading}
          />

          <Input
            id="register-email"
            label="Work email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={isLoading}
          />

          <Input
            id="register-password"
            label="Password"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            disabled={isLoading}
          />

          <Input
            id="register-confirm-password"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            disabled={isLoading}
          />

          <p className="password-hint">
            At least 8 characters with uppercase, lowercase, number, and special character.
          </p>

          <Button type="submit" id="register-submit" loading={isLoading} className="mt-2">
            {isLoading ? 'Creating account...' : 'Create Company & Sign In'}
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-footer-link">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
