import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { LayoutDashboard, Ticket, Users, Settings, Plus, X, Trash2, BarChart3 } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import ErrorBanner from '../components/ui/ErrorBanner';
import { Input, Textarea, Select } from '../components/ui/Input';
import TicketList from '../components/tickets/TicketList';
import ProjectDashboardPanel from '../components/dashboard/ProjectDashboardPanel';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { PageLoader } from '../components/ui/Spinner';
import { handleUpgradeResponse } from '../utils/billing';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [myRole, setMyRole] = useState('VIEWER');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('overview');

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [members, setMembers] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('DEVELOPER');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [ticketListKey, setTicketListKey] = useState(0);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketType, setTicketType] = useState('BUG');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketAssignee, setTicketAssignee] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreateError, setTicketCreateError] = useState('');
  const [projectDashboard, setProjectDashboard] = useState(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  const fetchProjectDetails = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load project');
      setProject(data.project);
      setMyRole(data.myRole || 'VIEWER');
      setEditName(data.project.name);
      setEditDescription(data.project.description || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to load project members:', err);
    }
  };

  const fetchCompanyEmployees = async () => {
    if (user.role !== 'ADMIN' && myRole !== 'PROJECT_ADMIN') return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/users/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) setCompanyUsers(data.employees || []);
    } catch (err) {
      console.error('Failed to load company employees:', err);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchMembers();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'members') fetchCompanyEmployees();
  }, [activeTab, myRole]);

  const hasAdminPrivilege = user.role === 'ADMIN' || myRole === 'PROJECT_ADMIN';

  const fetchProjectDashboard = async () => {
    setIsDashboardLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) setProjectDashboard(data.dashboard);
    } catch (err) {
      console.error('Failed to load project dashboard:', err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useDashboardRefresh(user?.companyId, fetchProjectDashboard, id);

  useEffect(() => {
    if (activeTab === 'dashboard' && hasAdminPrivilege) fetchProjectDashboard();
  }, [activeTab, id, hasAdminPrivilege]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (!hasAdminPrivilege) return;
    setIsSavingSettings(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: editName, description: editDescription })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update settings');
      setProject(data.project);
      alert('Settings updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!hasAdminPrivilege) return;
    if (!window.confirm('Are you sure you want to archive this project?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/archive`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to archive project');
      setProject(data.project);
      alert('Project archived successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async () => {
    if (!hasAdminPrivilege) return;
    if (!window.confirm('Are you sure you want to delete this project? This action is irreversible.')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete project');
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setMemberError('');
    setIsAddingMember(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add member');
      setMembers([...members, data.member]);
      setSelectedUserId('');
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberRecordId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setMemberError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/members/${memberRecordId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to remove member');
      setMembers(members.filter(m => m._id !== memberRecordId));
    } catch (err) {
      setMemberError(err.message);
    }
  };

  const handleChangeRole = async (memberRecordId, newRole) => {
    setMemberError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/members/${memberRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update member role');
      setMembers(members.map(m => m._id === memberRecordId ? data.member : m));
    } catch (err) {
      setMemberError(err.message);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;
    setTicketCreateError('');
    setIsCreatingTicket(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: ticketTitle,
          description: ticketDesc,
          type: ticketType,
          priority: ticketPriority,
          assigneeId: ticketAssignee || null
        })
      });
      const data = await response.json();
      const result = handleUpgradeResponse(response, data, navigate);
      if (result.upgrade) return;
      if (!result.ok) throw new Error(result.error);
      setTicketListKey((k) => k + 1);
      setTicketTitle('');
      setTicketDesc('');
      setTicketType('BUG');
      setTicketPriority('MEDIUM');
      setTicketAssignee('');
      setShowCreateForm(false);
    } catch (err) {
      setTicketCreateError(err.message);
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ...(hasAdminPrivilege ? [{ id: 'dashboard', label: 'Dashboard', icon: BarChart3 }] : []),
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'members', label: 'Members', icon: Users },
    ...(hasAdminPrivilege ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
  ];

  if (isLoading) return <PageLoader />;

  if (error && !project) {
    return (
      <PageShell backLabel="Projects" onBack={() => navigate('/projects')}>
        <Card className="p-8 text-center max-w-sm mx-auto">
          <p className="text-sm font-semibold mb-4 text-destructive">{error}</p>
          <Button variant="ghost" size="auto" onClick={() => navigate('/projects')}>Back to Directory</Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      wide
      backLabel="Projects"
      onBack={() => navigate('/projects')}
      title={project.name}
      badge={<Badge variant={project.status === 'ACTIVE' ? 'active' : 'invited'}>{project.status}</Badge>}
    >
      <div className="mb-8">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'overview' && (
        <Card className="p-8 space-y-6 animate-fade-up">
          <div>
            <span className="detail-label">Project Name</span>
            <h3 className="text-2xl font-extrabold mt-1">{project.name}</h3>
          </div>
          <div>
            <span className="detail-label">Description</span>
            <p className="text-sm leading-relaxed mt-1">{project.description || 'No description provided for this project.'}</p>
          </div>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Status</span>
              <div className="mt-1.5">
                <Badge variant={project.status === 'ACTIVE' ? 'active' : 'invited'}>{project.status}</Badge>
              </div>
            </div>
            <div>
              <span className="detail-label">My Project Role</span>
              <span className="detail-value text-primary">{myRole}</span>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'dashboard' && hasAdminPrivilege && (
        <ProjectDashboardPanel
          data={projectDashboard}
          isLoading={isDashboardLoading}
          projectName={project.name}
        />
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-6 animate-fade-up">
          <ErrorBanner>{ticketCreateError}</ErrorBanner>

          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-lg">Project Tickets</h3>
              <p className="text-xs text-muted-foreground">Manage and track work tickets</p>
            </div>
            {myRole !== 'VIEWER' && (
              <Button variant="primary" size="auto" icon={showCreateForm ? X : Plus} onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? 'Cancel' : 'Create Ticket'}
              </Button>
            )}
          </div>

          {showCreateForm && (
            <Card className="p-6 space-y-5 animate-fade-in">
              <h4 className="font-bold text-base">New Ticket</h4>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <Input label="Title" type="text" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} placeholder="e.g. Login page crashes" disabled={isCreatingTicket} />
                <Textarea label="Description" value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} placeholder="Enter steps to reproduce or details" disabled={isCreatingTicket} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select label="Type" value={ticketType} onChange={(e) => setTicketType(e.target.value)} disabled={isCreatingTicket}>
                    <option value="BUG">Bug</option>
                    <option value="TASK">Task</option>
                    <option value="FEATURE">Feature</option>
                    <option value="IMPROVEMENT">Improvement</option>
                    <option value="EPIC">Epic</option>
                  </Select>
                  <Select label="Priority" value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)} disabled={isCreatingTicket}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="BLOCKER">Blocker</option>
                  </Select>
                  <Select label="Assignee" value={ticketAssignee} onChange={(e) => setTicketAssignee(e.target.value)} disabled={isCreatingTicket}>
                    <option value="">Unassigned</option>
                    <option value={user.id}>{user.name} (Admin)</option>
                    {members.map(m => m.userId && m.userId._id !== user.id && (
                      <option key={m._id} value={m.userId._id}>{m.userId.name}</option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" size="auto" disabled={isCreatingTicket || !ticketTitle.trim()} loading={isCreatingTicket}>
                  {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                </Button>
              </form>
            </Card>
          )}

          <TicketList
            key={ticketListKey}
            user={user}
            projectId={id}
            members={members}
          />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6 animate-fade-up">
          <ErrorBanner>{memberError}</ErrorBanner>

          {hasAdminPrivilege && (
            <Card className="p-6">
              <h4 className="font-bold text-base mb-4">Add Project Member</h4>
              <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full sm:w-1/2">
                  <Select label="Choose Employee" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} disabled={isAddingMember}>
                    <option value="">Select Employee</option>
                    {companyUsers.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</option>
                    ))}
                  </Select>
                </div>
                <div className="w-full sm:w-1/3">
                  <Select label="Project Role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={isAddingMember}>
                    <option value="PROJECT_ADMIN">Project Admin</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="TESTER">Tester</option>
                    <option value="VIEWER">Viewer</option>
                  </Select>
                </div>
                <Button type="submit" size="auto" disabled={isAddingMember || !selectedUserId} loading={isAddingMember} className="w-full sm:w-auto">
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </Button>
              </form>
            </Card>
          )}

          <div className="space-y-3">
            {members.map((record) => {
              const isSelf = record.userId?._id === user.id;
              return (
                <Card key={record._id} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-base tracking-tight">
                      {record.userId?.name}
                      {isSelf && <span className="text-xs text-muted-foreground font-normal ml-1">(you)</span>}
                    </h4>
                    <p className="text-sm text-muted-foreground">{record.userId?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasAdminPrivilege && !isSelf ? (
                      <select value={record.role} onChange={(e) => handleChangeRole(record._id, e.target.value)} className="filter-select">
                        <option value="PROJECT_ADMIN">Project Admin</option>
                        <option value="DEVELOPER">Developer</option>
                        <option value="TESTER">Tester</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <Badge variant="closed">{record.role}</Badge>
                    )}
                    {hasAdminPrivilege && !isSelf && (
                      <button type="button" onClick={() => handleRemoveMember(record._id)} className="p-2 rounded-lg border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white transition-all cursor-pointer" title="Remove Member">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'settings' && hasAdminPrivilege && (
        <div className="space-y-6 animate-fade-up">
          <Card className="p-8">
            <h4 className="font-extrabold text-xl mb-6">Project Settings</h4>
            <form onSubmit={handleUpdateSettings} className="space-y-5">
              <Input label="Project Name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter project name" disabled={isSavingSettings} />
              <Textarea label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Brief summary of the project workspace" disabled={isSavingSettings} />
              <Button type="submit" size="auto" disabled={isSavingSettings || !editName.trim()} loading={isSavingSettings}>
                {isSavingSettings ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Card>

          <div className="danger-zone">
            <div>
              <h4 className="font-extrabold text-destructive text-lg">Danger Zone</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Sensitive workspace administrative operations</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-4 border-t border-destructive/10">
              {project.status === 'ACTIVE' && (
                <Button variant="outline" size="auto" onClick={handleArchiveProject} className="!text-amber-600 !border-amber-500/30 !bg-amber-500/10">
                  Archive Project
                </Button>
              )}
              <Button variant="danger" size="auto" onClick={handleDeleteProject}>
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
