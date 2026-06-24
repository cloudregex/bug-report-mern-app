import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FolderKanban, Plus, ChevronRight, AlertTriangle } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import { API_BASE_URL } from '../config';
import { useBilling } from '../hooks/useBilling';
import { isAtLimit, redirectToBilling } from '../utils/billing';

const accentColors = [
  'oklch(0.48 0.19 258)',
  'oklch(0.52 0.18 145)',
  'oklch(0.58 0.22 30)',
  'oklch(0.55 0.20 300)',
  'oklch(0.55 0.22 15)',
  'oklch(0.58 0.18 200)',
];

export default function Projects() {
  const { user } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { plan, usage } = useBilling();
  const isAdmin = user.role === 'ADMIN';
  const atProjectLimit = isAdmin && isAtLimit(usage, plan, 'projects');

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      try {
        const res  = await fetch(`${API_BASE_URL}/projects/my`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load projects');
        setProjects(data.projects || []);
      } catch (err) { setError(err.message); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const projectInitial = (name) => name?.charAt(0).toUpperCase() || 'P';

  const handleCreateClick = () => {
    if (atProjectLimit) {
      redirectToBilling(navigate, 'Project limit reached');
      return;
    }
    navigate('/projects/create');
  };

  const usageBadge = plan
    ? `${usage?.projectsCount ?? projects.length} / ${plan.maxProjects} projects`
    : `${projects.length} total`;

  return (
    <PageShell wide>
      <PageHeader
        title="Projects"
        subtitle="All workspaces you have access to"
        badge={usageBadge}
        actions={isAdmin && (
          <Button variant="primary" size="auto" icon={Plus} onClick={handleCreateClick}>
            Create Project
          </Button>
        )}
      />

      {atProjectLimit && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4 text-sm">
          <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Project limit reached on your {plan.name} plan</p>
            <button
              type="button"
              className="text-primary font-semibold mt-1 underline"
              onClick={() => redirectToBilling(navigate, 'Project limit reached')}
            >
              Go to billing to upgrade
            </button>
          </div>
        </div>
      )}

      <ErrorBanner>{error}</ErrorBanner>

      {isLoading ? (
        <PageLoader />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to start tracking issues"
          actionLabel={isAdmin ? '+ Create Project' : undefined}
          onAction={isAdmin ? handleCreateClick : undefined}
        />
      ) : (
        <div className="space-y-3 animate-fade-up delay-100">
          {projects.map((proj, i) => (
            <div key={proj._id} className="row-card" onClick={() => navigate(`/projects/${proj._id}`)}>
              <div className="flex items-center gap-4">
                <div className="project-icon" style={{ background: accentColors[i % accentColors.length] }}>
                  {projectInitial(proj.name)}
                </div>
                <div>
                  <p className="row-card-title">{proj.name}</p>
                  <p className="row-card-sub max-w-xs truncate">{proj.description || 'No description provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant={proj.status === 'ACTIVE' ? 'active' : 'invited'}>{proj.status}</Badge>
                <ChevronRight size={16} className="text-primary hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
