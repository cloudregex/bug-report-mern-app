import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';
import { API_BASE_URL } from '../config';
import {
  validateFullName,
  normalizeFullName,
  validateCompanyName,
  normalizeCompanyName,
  validateEmail,
  normalizeEmail,
  validatePasswordStrength,
  validateConfirmPassword
} from '../utils/validation';

export default function Register() {
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    const newErrors = {};

    // Validate Company Name
    const companyCheck = validateCompanyName(companyName, { fieldName: 'company name', required: true });
    if (!companyCheck.valid) {
      newErrors.companyName = companyCheck.message;
    }

    // Validate Full Name (permissive to international names, strict on unsafe chars)
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

    // Validate Confirm Password
    const confirmCheck = validateConfirmPassword(password, confirmPassword);
    if (!confirmCheck.valid) {
      newErrors.confirmPassword = confirmCheck.message;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please fix the errors in the form.');
      triggerShake();
      return;
    }

    setErrors({});
    setIsLoading(true);

    const normalizedCompany = normalizeCompanyName(companyName);
    const normalizedName = normalizeFullName(name);
    const normalizedMail = normalizeEmail(email);

    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: normalizedCompany,
          name: normalizedName,
          email: normalizedMail,
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

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <Input
            id="register-company"
            name="companyName"
            label="Company name"
            type="text"
            required
            maxLength={100}
            value={companyName}
            autoComplete="organization"
            error={errors.companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: undefined }));
            }}
            placeholder="e.g. Acme Corp"
            disabled={isLoading}
          />

          <Input
            id="register-name"
            name="fullName"
            label="Full name"
            type="text"
            required
            maxLength={100}
            value={name}
            autoComplete="name"
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="e.g. Rahul Sharma"
            disabled={isLoading}
          />

          <Input
            id="register-email"
            name="email"
            label="Work email"
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
            placeholder="e.g. rahul@acme.com"
            disabled={isLoading}
          />

          <Input
            id="register-password"
            name="password"
            label="Password"
            type="password"
            required
            maxLength={128}
            value={password}
            autoComplete="new-password"
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Create a strong password"
            disabled={isLoading}
          />

          <Input
            id="register-confirm-password"
            name="confirmPassword"
            label="Confirm password"
            type="password"
            required
            maxLength={128}
            value={confirmPassword}
            autoComplete="new-password"
            error={errors.confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
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
