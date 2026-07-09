import { useState } from 'react';
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  Bug, LayoutDashboard, FolderKanban, Users, LogOut, Menu, X, ChevronRight, Ticket, CreditCard, Building2, Shield,
} from 'lucide-react';
import { NotificationProvider } from '../../context/NotificationContext';
import NotificationBell from '../notifications/NotificationBell';
import Avatar from '../ui/Avatar';

const sharedNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/tickets', label: 'Tickets', icon: Ticket, exact: true },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/billing', label: 'Billing', icon: CreditCard },
];

const employeeNavItems = [
  ...sharedNavItems,
  { path: '/clients', label: 'Clients', icon: Users },
];

const adminNavItems = [
  ...sharedNavItems,
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/security', label: 'Security', icon: Shield },
];

const clientNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
];

const superAdminNavItems = [
  { path: '/saas', label: 'Platform', icon: Building2, exact: true },
];

export default function AppLayout() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = isSuperAdmin
    ? superAdminNavItems
    : isAdmin
      ? adminNavItems
      : user?.role === 'CLIENT'
        ? clientNavItems
        : employeeNavItems;


  return (
    <NotificationProvider user={user}>
      <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Bug size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="sidebar-brand-name">Bug Tracker</span>
              <span className="sidebar-brand-tag">
                {isSuperAdmin ? 'Platform Admin' : 'Citizens Foundation'}
              </span>
            </div>
          </div>
          <button type="button" className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon, exact }) => (
            <button
              key={path}
              type="button"
              onClick={() => { navigate(path); setSidebarOpen(false); }}
              className={`sidebar-link ${isActive(path, exact) ? 'sidebar-link-active' : ''}`}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
              {isActive(path, exact) && <ChevronRight size={14} className="sidebar-link-chevron" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar name={user?.name} size="sm" />
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name}</p>
              <p className="sidebar-user-role">{user?.role}</p>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} strokeWidth={2} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button type="button" className="topbar-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-spacer" />
          {!isSuperAdmin && <NotificationBell />}
        </header>

        <div className="app-content">
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
    </NotificationProvider>
  );
}
