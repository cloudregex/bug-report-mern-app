export const UPGRADE_CODE = 'UPGRADE_REQUIRED';

export const isUpgradeRequired = (data) => data?.code === UPGRADE_CODE;

export const getUpgradeMessage = (data) => {
  if (!data?.reason) return data?.message || 'Upgrade required';
  let msg = data.reason;
  if (data.limit != null && data.current != null) {
    msg += ` (${data.current}/${data.limit} used)`;
  }
  return msg;
};

export const redirectToBilling = (navigate, reason) => {
  const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  navigate(`/billing${params}`);
};

export const isAtLimit = (usage, plan, resource) => {
  if (!usage || !plan) return false;
  const limits = {
    projects: ['projectsCount', 'maxProjects'],
    employees: ['employeesCount', 'maxEmployees'],
    tickets: ['ticketsCreatedThisMonth', 'maxTicketsPerMonth'],
  };
  const [usageKey, maxKey] = limits[resource] || [];
  if (!usageKey || plan[maxKey] == null) return false;
  return (usage[usageKey] ?? 0) >= plan[maxKey];
};

export const handleUpgradeResponse = (response, data, navigate) => {
  if (response.ok) return { ok: true, data };
  if (isUpgradeRequired(data)) {
    redirectToBilling(navigate, data.reason);
    return { ok: false, upgrade: true, data };
  }
  return { ok: false, error: data.message || 'Request failed', data };
};
