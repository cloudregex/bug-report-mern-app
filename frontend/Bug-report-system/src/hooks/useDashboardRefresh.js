import { useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';

export function useDashboardRefresh(companyId, onRefresh, projectId = null) {
  const { joinCompany, joinProject, leaveProject, onDashboardUpdate } = useNotifications();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!companyId) return;
    joinCompany(companyId);
  }, [companyId, joinCompany]);

  useEffect(() => {
    if (!projectId) return;
    joinProject(projectId);
    return () => leaveProject(projectId);
  }, [projectId, joinProject, leaveProject]);

  useEffect(() => {
    const unsubscribe = onDashboardUpdate(() => {
      onRefreshRef.current?.();
    });
    return unsubscribe;
  }, [onDashboardUpdate]);
}
