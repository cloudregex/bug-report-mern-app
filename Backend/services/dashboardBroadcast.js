import { getIO } from '../socket.js';

export const emitDashboardUpdate = (companyId, eventType, projectId = null) => {
  try {
    const payload = { eventType, projectId, at: new Date().toISOString() };
    getIO().to(`company:${companyId}`).emit('dashboard:updated', payload);
    if (projectId) {
      getIO().to(`project:${projectId}`).emit('dashboard:updated', payload);
    }
  } catch (err) {
    console.warn('[DashboardBroadcast] emit failed:', err.message);
  }
};
