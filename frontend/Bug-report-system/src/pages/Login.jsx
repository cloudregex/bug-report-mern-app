import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { API_BASE_URL } from '../config';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/');
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); triggerShake(); return; }
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  return (
    <AuthLayout title="Bug Tracker" subtitle="Citizens Foundation Portal" shake={shake}>
      <div className="auth-card">
        <h2 className="auth-card-title">Welcome back</h2>
        <p className="auth-card-sub">Sign in to your account to continue</p>

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleLogin} className="space-y-5">
          <Input
            id="login-email"
            label="Email address"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
          />

          <Input
            id="login-password"
            label="Password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
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
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>Demo credentials</p>
          <div className="space-y-2">
            <p className="text-xs font-mono flex items-center gap-2 flex-wrap" style={{ color: 'var(--foreground)' }}>
              <Badge variant="active">ADMIN</Badge>
              admin@example.com / admin123
            </p>
            <p className="text-xs font-mono flex items-center gap-2 flex-wrap" style={{ color: 'var(--foreground)' }}>
              <Badge variant="open">EMP</Badge>
              employee@example.com / employee123
            </p>
            <p className="text-xs font-mono flex items-center gap-2 flex-wrap" style={{ color: 'var(--foreground)' }}>
              <Badge variant="closed">SA</Badge>
              superadmin@example.com / superadmin123
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
