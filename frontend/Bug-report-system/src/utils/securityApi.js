import { API_BASE_URL } from '../config';

export const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const fetchCompanySecurityDashboard = async () => {
  const res = await fetch(`${API_BASE_URL}/security/dashboard`, { headers: authHeaders() });
  return res.json();
};

export const fetchPlatformSecurityDashboard = async () => {
  const res = await fetch(`${API_BASE_URL}/security/platform-dashboard`, { headers: authHeaders() });
  return res.json();
};

export const fetchAuditLogs = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const qs = query.toString();
  const res = await fetch(`${API_BASE_URL}/audit-logs${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
  return res.json();
};

export const fetchSessions = async () => {
  const res = await fetch(`${API_BASE_URL}/sessions`, { headers: authHeaders() });
  return res.json();
};

export const revokeSession = async (sessionId) => {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.json();
};
