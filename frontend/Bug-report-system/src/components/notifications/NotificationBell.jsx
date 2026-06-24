import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AtSign, CheckCheck, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import Badge from '../ui/Badge';

const TYPE_ICONS = {
  TICKET_ASSIGNED: '🎫',
  MENTIONED: '@',
  COMMENT_ADDED: '💬',
  STATUS_CHANGED: '↔',
  PRIORITY_CHANGED: '⚡',
  PROJECT_MEMBER_ADDED: '👥',
};

function getNotificationLink(notification, mentions = []) {
  if (notification.entityType === 'TICKET') {
    return `/tickets/${notification.entityId}`;
  }
  if (notification.entityType === 'PROJECT') {
    return `/projects/${notification.entityId}`;
  }
  if (notification.entityType === 'COMMENT') {
    const mention = mentions.find(
      (m) => (m.commentId?._id || m.commentId) === notification.entityId
    );
    const ticketId = mention?.ticketId?._id || mention?.ticketId;
    if (ticketId) return `/tickets/${ticketId}`;
  }
  return null;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const {
    notifications,
    mentions,
    unreadCount,
    isOpen,
    activePanel,
    setActivePanel,
    openPanel,
    closePanel,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closePanel();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closePanel]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) await markRead(notification._id);
    const link = getNotificationLink(notification, mentions);
    closePanel();
    if (link) navigate(link);
  };

  const handleMentionClick = (mention) => {
    closePanel();
    const ticketId = mention.ticketId?._id || mention.ticketId;
    if (ticketId) navigate(`/tickets/${ticketId}`);
  };

  return (
    <div className="notification-bell-wrap" ref={panelRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => (isOpen ? closePanel() : openPanel('notifications'))}
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel animate-scale-in">
          <div className="notification-panel-header">
            <div className="notification-panel-tabs">
              <button
                type="button"
                className={`notification-panel-tab ${activePanel === 'notifications' ? 'active' : ''}`}
                onClick={() => setActivePanel('notifications')}
              >
                <Bell size={14} />
                Notifications
                {unreadCount > 0 && <span className="notification-tab-count">{unreadCount}</span>}
              </button>
              <button
                type="button"
                className={`notification-panel-tab ${activePanel === 'mentions' ? 'active' : ''}`}
                onClick={() => setActivePanel('mentions')}
              >
                <AtSign size={14} />
                Mentions
                {mentions.length > 0 && <span className="notification-tab-count">{mentions.length}</span>}
              </button>
            </div>
            <div className="notification-panel-actions">
              {activePanel === 'notifications' && unreadCount > 0 && (
                <button type="button" className="notification-mark-all" onClick={markAllRead} title="Mark all read">
                  <CheckCheck size={14} />
                </button>
              )}
              <button type="button" className="notification-close" onClick={closePanel}>
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="notification-panel-body">
            {activePanel === 'notifications' && (
              notifications.length === 0 ? (
                <p className="notification-empty">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <span className="notification-item-icon">{TYPE_ICONS[n.type] || '•'}</span>
                    <div className="notification-item-content">
                      <p className="notification-item-title">
                        {n.title}
                        {n.type === 'MENTIONED' && <Badge variant="open" className="ml-2">@</Badge>}
                      </p>
                      <p className="notification-item-message">{n.message}</p>
                      <p className="notification-item-meta">
                        {n.actorId?.name} · {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.isRead && <span className="notification-unread-dot" />}
                  </button>
                ))
              )
            )}

            {activePanel === 'mentions' && (
              mentions.length === 0 ? (
                <p className="notification-empty">No mentions yet</p>
              ) : (
                mentions.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    className="notification-item"
                    onClick={() => handleMentionClick(m)}
                  >
                    <span className="notification-item-icon">@</span>
                    <div className="notification-item-content">
                      <p className="notification-item-title">
                        {m.mentionedBy?.name || 'Someone'} mentioned you
                      </p>
                      <p className="notification-item-message">
                        {m.ticketId?.ticketNumber && (
                          <span className="font-mono text-primary">{m.ticketId.ticketNumber}</span>
                        )}
                        {m.ticketId?.title && ` — ${m.ticketId.title}`}
                      </p>
                      {m.commentId?.content && (
                        <p className="notification-item-preview">&ldquo;{m.commentId.content.slice(0, 80)}&rdquo;</p>
                      )}
                      <p className="notification-item-meta">{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
