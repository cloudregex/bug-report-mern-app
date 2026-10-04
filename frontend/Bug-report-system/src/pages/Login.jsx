import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { API_BASE_URL } from '../config';
import { validateEmail, normalizeEmail, validateLoginPassword } from '../utils/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/');
  }, [navigate]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const newErrors = {};

    const emailCheck = validateEmail(email, { required: true });
    if (!emailCheck.valid) {
      newErrors.email = emailCheck.message;
    }

    const passwordCheck = validateLoginPassword(password);
    if (!passwordCheck.valid) {
      newErrors.password = passwordCheck.message;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please provide valid login credentials.');
      triggerShake();
      return;
    }

    setErrors({});
    setIsLoading(true);

    const normalizedMail = normalizeEmail(email);

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedMail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid credentials');
      localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (e, demoEmail, demoPassword) => {
    e.preventDefault();
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
    setError('');
  };

  const demoAccounts = [
    { label: 'ADMIN', variant: 'active', email: 'admin@example.com', password: 'Admin@123' },
    { label: 'EMPLOYEE', variant: 'open', email: 'employee@example.com', password: 'Employee@123' },
    { label: 'CLIENT', variant: 'invited', email: 'client@example.com', password: 'Client@123' },
    { label: 'SUPER ADMIN', variant: 'closed', email: 'superadmin@example.com', password: 'SuperAdmin@123' },
  ];

  return (
    <AuthLayout title="Bug Tracker" subtitle="Citizens Foundation Portal" shake={shake}>
      <div className="auth-card">
        <h2 className="auth-card-title">Welcome back</h2>
        <p className="auth-card-sub">Sign in to your account to continue</p>

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          <Input
            id="login-email"
            name="email"
            label="Email address"
            type="email"
            required
            maxLength={254}
            value={email}
            autoComplete="email"
            error={errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="you@example.com"
            disabled={isLoading}
          />

          <Input
            id="login-password"
            name="password"
            label="Password"
            type="password"
            required
            maxLength={128}
            value={password}
            autoComplete="current-password"
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Enter your password"
            disabled={isLoading}
          />

          <Button type="submit" id="login-submit" loading={isLoading} className="mt-2">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-footer-link">
            Register your company
          </Link>
        </p>

        <div className="cred-hint">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
            Demo credentials — click to fill
          </p>
          <div className="space-y-2">
            {demoAccounts.map(({ label, variant, email: demoEmail, password: demoPassword }) => (
              <button
                key={demoEmail}
                type="button"
                onClick={(e) => fillCredentials(e, demoEmail, demoPassword)}
                className="text-xs font-mono flex items-center gap-2 flex-wrap w-full text-left hover:opacity-70 transition-opacity cursor-pointer"
                style={{ color: 'var(--foreground)', background: 'none', border: 'none', padding: 0 }}
              >
                <Badge variant={variant}>{label}</Badge>
                {demoEmail} / {demoPassword}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
