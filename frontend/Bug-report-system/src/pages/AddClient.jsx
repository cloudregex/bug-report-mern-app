import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input } from '../components/ui/Input';

const API_BASE_URL = 'http://localhost:5000/api/users';

export default function AddClient() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim())            { setError('Name is required.');                   triggerShake(); return; }
    if (!email.trim())           { setError('Email is required.');                  triggerShake(); return; }
    if (password.length < 6)    { setError('Password must be at least 6 chars.');   triggerShake(); return; }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create client');
      navigate('/clients');
    } catch (err) { setError(err.message); triggerShake(); }
    finally { setIsLoading(false); }
  };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  return (
    <PageShell
      backLabel="Clients"
      onBack={() => navigate('/clients')}
    >
      <Card className={`px-8 py-9 animate-scale-in ${shake ? 'animate-shake' : ''}`}>
        <div className="mb-7">
          <h1 className="section-title">Add Client</h1>
          <p className="section-sub">Create a new client account for reporting issues</p>
        </div>

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            id="client-name"
            label="Client Name"
            type="text"
            value={name}
            placeholder="e.g. Acme Corp (John Doe)"
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />

          <Input
            id="client-email"
            label="Email Address"
            type="email"
            value={email}
            placeholder="john@acme.com"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <div>
            <Input
              id="client-password"
              label="Password"
              type="password"
              value={password}
              placeholder="Min. 6 characters"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs mt-1.5 pl-1 text-muted-foreground">
              Client will use this password to log in.
            </p>
          </div>

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
