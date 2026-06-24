import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';

const NotificationContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children, user }) {
  const [notifications, setNotifications] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('notifications');
  const socketRef = useRef(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications?limit=30`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  const fetchMentions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/mentions?limit=30`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setMentions(data.mentions || []);
    } catch (err) {
      console.error('Failed to fetch mentions:', err);
    }
  }, []);

  const markRead = useCallback(async (notificationId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }, []);

  const openPanel = useCallback((panel = 'notifications') => {
    setActivePanel(panel);
    setIsOpen(true);
    fetchNotifications();
    fetchMentions();
  }, [fetchNotifications, fetchMentions]);

  const closePanel = useCallback(() => setIsOpen(false), []);

  // Socket connection
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetchUnreadCount();

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    if (user?.companyId) {
      socket.emit('join:company', user.companyId);
    }

    socket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    });

    socket.on('mention:created', ({ mention, notification }) => {
      setMentions((prev) => [{
        _id: mention._id,
        mentionedBy: mention.mentionedBy,
        ticketId: mention.ticketId,
        commentId: mention.commentId,
        createdAt: new Date().toISOString(),
      }, ...prev].slice(0, 50));
      if (notification) {
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        setUnreadCount((c) => c + 1);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchUnreadCount]);

  const joinTicket = useCallback((ticketId) => {
    socketRef.current?.emit('join:ticket', ticketId);
  }, []);

  const leaveTicket = useCallback((ticketId) => {
    socketRef.current?.emit('leave:ticket', ticketId);
  }, []);

  const onTicketEvent = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const joinCompany = useCallback((companyId) => {
    socketRef.current?.emit('join:company', companyId);
  }, []);

  const joinProject = useCallback((projectId) => {
    socketRef.current?.emit('join:project', projectId);
  }, []);

  const leaveProject = useCallback((projectId) => {
    socketRef.current?.emit('leave:project', projectId);
  }, []);

  const onDashboardUpdate = useCallback((handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('dashboard:updated', handler);
    return () => socket.off('dashboard:updated', handler);
  }, []);

  const value = {
    notifications,
    mentions,
    unreadCount,
    isOpen,
    activePanel,
    setActivePanel,
    openPanel,
    closePanel,
    fetchNotifications,
    fetchMentions,
    fetchUnreadCount,
    markRead,
    markAllRead,
    joinTicket,
    leaveTicket,
    onTicketEvent,
    joinCompany,
    joinProject,
    leaveProject,
    onDashboardUpdate,
    socket: socketRef,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
