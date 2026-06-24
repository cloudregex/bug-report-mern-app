import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import { PageLoader } from './components/ui/Spinner.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateCompany from './pages/CreateCompany.jsx';
import Employees from './pages/Employees.jsx';
import AddEmployee from './pages/AddEmployee.jsx';
import EmployeeDetails from './pages/EmployeeDetails.jsx';
import Projects from './pages/Projects.jsx';
import CreateProject from './pages/CreateProject.jsx';
import ProjectDetails from './pages/ProjectDetails.jsx';
import Tickets from './pages/Tickets.jsx';
import TicketDetails from './pages/TicketDetails.jsx';
import SaasDashboard from './pages/SaasDashboard.jsx';
import Billing from './pages/Billing.jsx';
import SecurityDashboard from './pages/SecurityDashboard.jsx';

const API_BASE_URL = 'http://localhost:5000/api';

const useAuthUser = () => {
  const token = localStorage.getItem('token');
  const [isLoading, setIsLoading] = useState(!!token);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetch(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUser(d.user);
        else localStorage.removeItem('token');
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setIsLoading(false));
  }, [token]);

  return { token, user, isLoading };
};

const ProtectedRoute = ({ checkCompany = true }) => {
  const { token, user, isLoading } = useAuthUser();

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="min-h-screen dashboard-bg">
        <PageLoader message="Verifying credentials..." />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'SUPER_ADMIN') {
    return <Navigate to="/saas" replace />;
  }

  if (checkCompany) {
    if (!user.companyId) return <Navigate to="/create-company" replace />;
  } else if (user.companyId) {
    return <Navigate to="/" replace />;
  }

  return <Outlet context={{ user }} />;
};

const AdminRoute = () => {
  const { token, user, isLoading } = useAuthUser();

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="min-h-screen dashboard-bg">
        <PageLoader message="Verifying credentials..." />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;

  return <Outlet context={{ user }} />;
};

const SuperAdminRoute = () => {
  const { token, user, isLoading } = useAuthUser();

  if (!token) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="min-h-screen dashboard-bg">
        <PageLoader message="Verifying credentials..." />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />;

  return <Outlet context={{ user }} />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<SuperAdminRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/saas" element={<SaasDashboard />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute checkCompany={true} />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/billing" element={<Billing />} />
            <Route element={<AdminRoute />}>
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/add" element={<AddEmployee />} />
              <Route path="/employees/:id" element={<EmployeeDetails />} />
              <Route path="/security" element={<SecurityDashboard />} />
            </Route>
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/create" element={<CreateProject />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetails />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute checkCompany={false} />}>
          <Route path="/create-company" element={<CreateCompany />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
