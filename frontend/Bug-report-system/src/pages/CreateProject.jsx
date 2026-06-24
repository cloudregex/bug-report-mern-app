import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input, Textarea } from '../components/ui/Input';
import { API_BASE_URL } from '../config';
import { useBilling } from '../hooks/useBilling';
import { handleUpgradeResponse, isAtLimit, redirectToBilling } from '../utils/billing';

export default function CreateProject() {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [shake, setShake]             = useState(false);
  const navigate = useNavigate();
  const { plan, usage } = useBilling();

  const atProjectLimit = isAtLimit(usage, plan, 'projects');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Project name is required.'); triggerShake(); return; }
    if (atProjectLimit) {
      redirectToBilling(navigate, 'Project limit reached');
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      const result = handleUpgradeResponse(res, data, navigate);
      if (result.upgrade) return;
      if (!result.ok) throw new Error(result.error);
      navigate('/projects');
    } catch (err) { setError(err.message); triggerShake(); }
    finally { setIsLoading(false); }
  };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  return (
    <PageShell backLabel="Projects" onBack={() => navigate('/projects')}>
      <Card className={`px-8 py-9 animate-scale-in ${shake ? 'animate-shake' : ''}`}>
        <div className="mb-7">
          <h1 className="section-title">Create Project</h1>
          <p className="section-sub">Set up a new workspace for tracking issues</p>
        </div>

        {atProjectLimit && plan && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-5 text-sm">
            <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Project limit reached ({usage.projectsCount}/{plan.maxProjects})</p>
              <button
                type="button"
                className="text-primary font-semibold mt-1 underline"
                onClick={() => redirectToBilling(navigate, 'Project limit reached')}
              >
                View billing to upgrade
              </button>
            </div>
          </div>
        )}

        <ErrorBanner>{error}</ErrorBanner>

        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Project Name"
            type="text"
            value={name}
            placeholder="e.g. Mobile App v2"
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading || atProjectLimit}
          />

          <Textarea
            label="Description"
            optional
            value={description}
            placeholder="Brief description of what this project tracks..."
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading || atProjectLimit}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/projects')} disabled={isLoading} className="!flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || atProjectLimit} loading={isLoading} className="!flex-1">
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
