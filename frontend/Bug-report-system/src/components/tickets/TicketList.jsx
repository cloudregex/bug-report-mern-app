import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bookmark, BookmarkPlus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ErrorBanner from '../ui/ErrorBanner';
import { PageLoader } from '../ui/Spinner';
import { priorityBadgeClass, ticketStatusBadgeClass } from '../ui/Badge';
import { API_BASE_URL } from '../../config.js';
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'DONE', label: 'Done' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REOPENED', label: 'Reopened' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'BLOCKER', label: 'Blocker' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'updatedAt', label: 'Updated At' },
];

const ROLE_QUICK_FILTERS = {
  EMPLOYEE: { label: 'My Tickets', filters: { assignee: 'me' } },
  PROJECT_ADMIN: { label: 'Critical Bugs', filters: { priority: 'CRITICAL', type: 'BUG' } },
  ADMIN: { label: 'Overdue Tickets', filters: { overdue: 'true' } },
  TESTER: { label: 'In Testing', filters: { status: 'TESTING' } },
};

function buildQueryString(filters, page, limit) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  params.set('page', String(page));
  params.set('limit', String(limit));
  return params.toString();
}

export default function TicketList({
  user,
  projectId = null,
  members = [],
  showProjectColumn = false,
  defaultFilters = {},
}) {
  const navigate = useNavigate();
  const searchDebounce = useRef(null);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    type: '',
    project: projectId || '',
    assignee: '',
    sort: 'newest',
    overdue: '',
    ...defaultFilters,
  });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [savedFilters, setSavedFilters] = useState([]);
  const [selectedSavedFilter, setSelectedSavedFilter] = useState('');

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    const qs = buildQueryString(
      { ...filters, project: projectId || filters.project },
      page,
      limit
    );
    try {
      const response = await fetch(`${API_BASE_URL}/tickets?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load tickets');
      }
      setTickets(data.tickets || []);
      setPagination(data.pagination || { total: 0, page: 1, limit, pages: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, limit, projectId]);

  const fetchSavedFilters = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/saved-filters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) setSavedFilters(data.savedFilters || []);
    } catch (err) {
      console.error('Failed to load saved filters:', err);
    }
  }, []);

  useEffect(() => {
    if (!projectId) {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/projects/my`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.success) setProjects(d.projects || []); })
        .catch(() => {});
    }
    if (user?.role === 'ADMIN') {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/users/employees`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.success) setEmployees(d.employees || []); })
        .catch(() => {});
    }
    fetchSavedFilters();
  }, [projectId, user?.role, fetchSavedFilters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.priority, filters.type, filters.project, filters.assignee, filters.search, filters.sort, filters.overdue]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedSavedFilter('');
  };

  const handleSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      updateFilter('search', value);
    }, 400);
  };

  const applyQuickFilter = (quickFilters) => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      type: '',
      project: projectId || '',
      assignee: '',
      sort: 'newest',
      overdue: '',
      ...quickFilters,
    });
    setSearchInput('');
    setSelectedSavedFilter('');
    setPage(1);
  };

  const applySavedFilter = (filterId) => {
    setSelectedSavedFilter(filterId);
    if (!filterId) return;
    const saved = savedFilters.find((f) => f._id === filterId);
    if (!saved) return;
    const f = saved.filters || {};
    setFilters({
      search: f.search || '',
      status: f.status || '',
      priority: f.priority || '',
      type: f.type || '',
      project: projectId || f.project || '',
      assignee: f.assignee || f.assigneeId || '',
      sort: f.sort || 'newest',
      overdue: f.overdue || '',
    });
    setSearchInput(f.search || '');
    setPage(1);
  };

  const handleSaveFilter = async () => {
    const name = window.prompt('Name this filter (e.g. My Critical Bugs):');
    if (!name?.trim()) return;
    const token = localStorage.getItem('token');
    const filterPayload = { ...filters };
    if (projectId) delete filterPayload.project;
    try {
      const response = await fetch(`${API_BASE_URL}/saved-filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), filters: filterPayload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save filter');
      await fetchSavedFilters();
      setSelectedSavedFilter(data.savedFilter._id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSavedFilter = async () => {
    if (!selectedSavedFilter) return;
    if (!window.confirm('Delete this saved filter?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/saved-filters/${selectedSavedFilter}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete filter');
      setSelectedSavedFilter('');
      await fetchSavedFilters();
    } catch (err) {
      alert(err.message);
    }
  };

  const quickFilterKey = user?.role === 'ADMIN'
    ? 'ADMIN'
    : members.find((m) => m.userId?._id === user?.id)?.role === 'PROJECT_ADMIN'
      ? 'PROJECT_ADMIN'
      : members.find((m) => m.userId?._id === user?.id)?.role === 'TESTER'
        ? 'TESTER'
        : 'EMPLOYEE';

  const quickFilter = ROLE_QUICK_FILTERS[quickFilterKey];

  const assigneeOptions = [
    { value: '', label: 'All Assignees' },
    { value: 'me', label: 'Me' },
    { value: 'unassigned', label: 'Unassigned' },
    ...employees.map((e) => ({ value: e._id, label: e.name })),
    ...members
      .filter((m) => m.userId && !employees.some((e) => e._id === m.userId._id))
      .map((m) => ({ value: m.userId._id, label: m.userId.name })),
  ];

  const uniqueAssignees = assigneeOptions.filter(
    (opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx
  );

  return (
    <div className="space-y-4">
      <ErrorBanner>{error}</ErrorBanner>

      {quickFilter && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyQuickFilter(quickFilter.filters)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            {quickFilter.label}
          </button>
        </div>
      )}

      <div className="filter-bar">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tickets..."
            className="filter-select w-full !pl-8"
          />
        </div>

        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="filter-select">
          {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
        </select>

        <select value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)} className="filter-select">
          {PRIORITY_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
        </select>

        <select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)} className="filter-select">
          <option value="">All Types</option>
          <option value="BUG">Bug</option>
          <option value="TASK">Task</option>
          <option value="FEATURE">Feature</option>
          <option value="IMPROVEMENT">Improvement</option>
          <option value="EPIC">Epic</option>
        </select>

        {!projectId && (
          <select value={filters.project} onChange={(e) => updateFilter('project', e.target.value)} className="filter-select">
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        )}

        <select value={filters.assignee} onChange={(e) => updateFilter('assignee', e.target.value)} className="filter-select">
          {uniqueAssignees.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
        </select>

        <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} className="filter-select">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Bookmark size={14} className="text-muted-foreground" />
        <select
          value={selectedSavedFilter}
          onChange={(e) => applySavedFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">Saved Filters</option>
          {savedFilters.map((sf) => (
            <option key={sf._id} value={sf._id}>{sf.name}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" icon={BookmarkPlus} onClick={handleSaveFilter}>
          Save
        </Button>
        {selectedSavedFilter && (
          <Button variant="ghost" size="sm" icon={Trash2} onClick={handleDeleteSavedFilter} className="!text-destructive">
            Delete
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {pagination.total} ticket{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : tickets.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground font-medium">No tickets found matching filters.</p>
        </Card>
      ) : (
        <>
          <div className="data-table-wrap overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[120px]">ID</th>
                  <th>Title</th>
                  {showProjectColumn && <th className="w-[140px]">Project</th>}
                  <th className="w-[110px]">Type</th>
                  <th className="w-[110px]">Priority</th>
                  <th className="w-[130px]">Status</th>
                  <th className="w-[150px]">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t._id} onClick={() => navigate(`/tickets/${t._id}`)}>
                    <td className="font-mono font-bold text-primary">{t.ticketNumber}</td>
                    <td className="font-medium">{t.title}</td>
                    {showProjectColumn && (
                      <td className="text-muted-foreground truncate">{t.projectId?.name || '—'}</td>
                    )}
                    <td><Badge variant={t.type === 'BUG' ? 'critical' : t.type === 'FEATURE' ? 'open' : 'closed'}>{t.type}</Badge></td>
                    <td><span className={priorityBadgeClass(t.priority)}>{t.priority}</span></td>
                    <td><span className={ticketStatusBadgeClass(t.status)}>{t.status}</span></td>
                    <td className="text-muted-foreground truncate">{t.assigneeId?.name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination-bar">
              <Button
                variant="ghost"
                size="sm"
                icon={ChevronLeft}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs font-semibold text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
