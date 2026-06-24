import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { MessageSquare, Paperclip, Activity, Upload, FileText, Trash2, AtSign } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import ErrorBanner from '../components/ui/ErrorBanner';
import Avatar from '../components/ui/Avatar';
import { Select } from '../components/ui/Input';
import Spinner, { PageLoader } from '../components/ui/Spinner';
import MentionInput, { renderCommentWithMentions } from '../components/comments/MentionInput';
import { useNotifications } from '../context/NotificationContext';
import { API_BASE_URL } from '../config';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const { joinTicket, leaveTicket, onTicketEvent } = useNotifications();

  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [ticketMentions, setTicketMentions] = useState([]);
  const [myRole, setMyRole] = useState('VIEWER');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [projectMembers, setProjectMembers] = useState([]);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [activeTab, setActiveTab] = useState('comments');
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchTicketDetails = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch ticket details');
      setTicket(data.ticket);
      setHistory(data.history || []);
      setMyRole(data.myRole || 'VIEWER');
      if (data.ticket && data.ticket.projectId) {
        const projId = data.ticket.projectId._id;
        fetchProjectMembers(projId);
        fetchMentionUsers(projId);
        fetchTicketMentions();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectMembers = async (projId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) setProjectMembers(data.members || []);
    } catch (err) {
      console.error('Failed to load project members for dropdown:', err);
    }
  };

  const fetchMentionUsers = async (projId) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const userId = (user._id || user.id)?.toString();
    try {
      const [membersRes, employeesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects/${projId}/members`, { headers }),
        fetch(`${API_BASE_URL}/users/employees`, { headers }),
      ]);
      const membersData = await membersRes.json();
      const employeesData = await employeesRes.json();
      const usersMap = new Map();
      if (membersRes.ok && membersData.success) {
        membersData.members.forEach((m) => {
          if (m.userId?.username) {
            usersMap.set(m.userId._id, { _id: m.userId._id, name: m.userId.name, username: m.userId.username });
          }
        });
      }
      if (employeesRes.ok && employeesData.success) {
        employeesData.employees.forEach((emp) => {
          if (emp.username) {
            usersMap.set(emp._id, { _id: emp._id, name: emp.name, username: emp.username });
          }
        });
      }
      setMentionUsers([...usersMap.values()].filter((u) => u._id?.toString() !== userId));
    } catch (err) {
      console.error('Failed to load mention users:', err);
    }
  };

  const fetchTicketMentions = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/mentions/tickets/${id}/mentions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) setTicketMentions(data.mentions || []);
    } catch (err) {
      console.error('Failed to load ticket mentions:', err);
    }
  };

  const fetchComments = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) setComments(data.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const fetchAttachments = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/attachments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) setAttachments(data.attachments || []);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newCommentText })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setNewCommentText('');
        if (data.comment) {
          setComments((prev) => [...prev, data.comment]);
        } else {
          fetchComments();
        }
        fetchTicketDetails();
        fetchTicketMentions();
      } else {
        setError(data.message || 'Failed to add comment');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to add comment');
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: editingCommentText })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setEditingCommentId(null);
        setEditingCommentText('');
        fetchComments();
      } else {
        setError(data.message || 'Failed to update comment');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) fetchComments();
      else setError(data.message || 'Failed to delete comment');
    } catch (err) {
      console.error(err);
      setError('Failed to delete comment');
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingAttachment(true);
    setUploadError('');
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchAttachments();
        fetchTicketDetails();
      } else {
        setUploadError(data.message || 'Failed to upload attachment');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) fetchAttachments();
      else setError(data.message || 'Failed to delete attachment');
    } catch (err) {
      console.error(err);
      setError('Failed to delete attachment');
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchComments();
    fetchAttachments();
  }, [id]);

  // Socket: join ticket room for real-time updates
  useEffect(() => {
    if (!id) return;
    joinTicket(id);

    const unsubComment = onTicketEvent('comment:created', (comment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === comment._id)) return prev;
        return [...prev, comment];
      });
      fetchTicketDetails();
      fetchTicketMentions();
    });

    const unsubTicket = onTicketEvent('ticket:updated', (updatedTicket) => {
      setTicket((prev) => (prev ? { ...prev, ...updatedTicket } : updatedTicket));
      fetchTicketDetails();
    });

    return () => {
      leaveTicket(id);
      unsubComment();
      unsubTicket();
    };
  }, [id, joinTicket, leaveTicket, onTicketEvent]);

  const activityTimeline = useMemo(() => {
    const mentionEntries = ticketMentions.map((m) => ({
      _id: `mention-${m._id}`,
      type: 'mention',
      actorId: m.mentionedBy,
      createdAt: m.createdAt,
      mentionedUser: m.mentionedUserId,
      commentContent: m.commentId?.content,
    }));

    const historyEntries = history.map((h) => ({ ...h, type: 'activity' }));

    return [...historyEntries, ...mentionEntries].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [history, ticketMentions]);

  const handleStatusChange = async (newStatus) => {
    if (!ticket || isUpdating) return;
    setIsUpdating(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update status');
      setTicket(data.ticket);
      fetchTicketDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!ticket || isUpdating) return;
    setIsUpdating(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ priority: newPriority })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update priority');
      setTicket(data.ticket);
      fetchTicketDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    if (!ticket || isUpdating) return;
    setIsUpdating(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ assigneeId: newAssigneeId || null })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update assignment');
      setTicket(data.ticket);
      fetchTicketDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const tabs = [
    { id: 'comments', label: `Comments (${comments.length})`, icon: MessageSquare },
    { id: 'attachments', label: `Attachments (${attachments.length})`, icon: Paperclip },
    { id: 'activity', label: `Activity (${activityTimeline.length})`, icon: Activity },
  ];

  if (isLoading) return <PageLoader />;

  if (error && !ticket) {
    return (
      <PageShell>
        <Card className="p-8 text-center max-w-sm mx-auto">
          <p className="text-sm font-semibold mb-4 text-destructive">{error}</p>
          <Button variant="ghost" size="auto" onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </PageShell>
    );
  }

  const isViewer = myRole === 'VIEWER';
  const priorityVariant = ticket.priority === 'CRITICAL' || ticket.priority === 'BLOCKER' ? 'critical' : ticket.priority === 'HIGH' ? 'high' : ticket.priority === 'MEDIUM' ? 'medium' : 'low';

  return (
    <PageShell
      wide
      backLabel="Project"
      onBack={() => navigate(`/projects/${ticket.projectId?._id}`)}
      badge={
        <>
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-muted text-primary">{ticket.ticketNumber}</span>
          <Badge variant={priorityVariant}>{ticket.priority}</Badge>
        </>
      }
    >
      <ErrorBanner className="!mb-6">{error}</ErrorBanner>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 space-y-6">
            <div>
              <Badge variant={ticket.type === 'BUG' ? 'critical' : ticket.type === 'FEATURE' ? 'open' : 'closed'}>{ticket.type}</Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">{ticket.title}</h2>
            </div>
            <div>
              <span className="detail-label">Description</span>
              <p className="text-sm leading-relaxed mt-2 p-4 bg-input/10 border border-border/30 rounded-xl whitespace-pre-wrap">
                {ticket.description || 'No description provided.'}
              </p>
            </div>
            <div className="detail-grid text-xs">
              <div>
                <span className="detail-label">Reporter</span>
                <span className="detail-value">{ticket.reporterId?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="detail-label">Created</span>
                <span className="detail-value">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>

          <Card padding={false} className="overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/30">
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="!bg-transparent !border-0" />
            </div>

            <div className="p-6">
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  <form onSubmit={handleAddComment} className="flex gap-4 items-start">
                    <Avatar name={user.name} size="sm" />
                    <div className="flex-1 space-y-2.5">
                      <MentionInput
                        value={newCommentText}
                        onChange={setNewCommentText}
                        mentionUsers={mentionUsers}
                        placeholder="Write a comment... Use @ to mention someone"
                      />
                      <Button type="submit" size="auto" disabled={!newCommentText.trim()}>Comment</Button>
                    </div>
                  </form>

                  <div className="space-y-4 pt-4 border-t border-border/40">
                    {comments.map((c) => {
                      const isAuthor = c.authorId?._id === user.id;
                      const isAdmin = user.role === 'ADMIN';
                      const isEditing = editingCommentId === c._id;

                      return (
                        <div key={c._id} className="flex gap-4 items-start group">
                          <Avatar name={c.authorId?.name} size="sm" />
                          <div className="flex-1 min-w-0 comment-bubble">
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <span className="text-xs font-bold">{c.authorId?.name || 'Unknown'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                                {c.edited && <Badge variant="closed">Edited</Badge>}
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="space-y-2 mt-2">
                                <textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} rows="2" className="field-input field-textarea text-sm" />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleUpdateComment(c._id)} disabled={!editingCommentText.trim()}>Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {renderCommentWithMentions(c.content)}
                              </p>
                            )}

                            {!isEditing && (isAuthor || isAdmin) && (
                              <div className="absolute right-3 bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isAuthor && (
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingCommentId(c._id); setEditingCommentText(c.content); }}>Edit</Button>
                                )}
                                <Button size="sm" variant="danger" onClick={() => handleDeleteComment(c._id)}>Delete</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {comments.length === 0 && (
                      <p className="text-center py-6 text-xs text-muted-foreground font-medium">No comments posted yet.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-6">
                  <div className="upload-zone">
                    <input type="file" onChange={handleUploadAttachment} disabled={isUploadingAttachment} />
                    <div className="flex flex-col items-center gap-2">
                      {isUploadingAttachment ? (
                        <>
                          <Spinner size="lg" />
                          <p className="text-sm text-muted-foreground font-semibold">Uploading attachment...</p>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-muted-foreground" />
                          <p className="text-sm font-semibold">Click or drag a file to upload</p>
                          <p className="text-xs text-muted-foreground">Supports screenshots or logs (Max: 10MB)</p>
                        </>
                      )}
                    </div>
                  </div>

                  {uploadError && <p className="text-xs text-destructive font-semibold text-center">{uploadError}</p>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/40">
                    {attachments.map((att) => {
                      const isImage = att.mimeType && att.mimeType.startsWith('image/');
                      const fileUrl = att.fileUrl.startsWith('http') ? att.fileUrl : `http://localhost:5000${att.fileUrl}`;

                      return (
                        <div key={att._id} className="flex items-center gap-3 p-3 bg-muted/10 border border-border/40 rounded-xl group relative">
                          {isImage ? (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
                              <img src={fileUrl} alt={att.fileName} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                            </a>
                          ) : (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg border border-border bg-input/20 flex items-center justify-center flex-shrink-0 hover:bg-input/40 transition-colors text-muted-foreground">
                              <FileText size={20} />
                            </a>
                          )}
                          <div className="min-w-0 flex-1">
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="block text-xs font-bold truncate hover:text-primary transition-colors">{att.fileName}</a>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {(att.fileSize / 1024).toFixed(1)} KB • {att.uploadedBy?.name || 'Unknown'}
                            </span>
                          </div>
                          {(att.uploadedBy?._id === user.id || user.role === 'ADMIN') && (
                            <button type="button" onClick={() => handleDeleteAttachment(att._id)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-auto" title="Delete Attachment">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {attachments.length === 0 && (
                      <div className="col-span-full py-8 text-center">
                        <p className="text-xs text-muted-foreground font-medium">No attachments uploaded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="timeline text-sm">
                  {activityTimeline.map((entry) => {
                    if (entry.type === 'mention') {
                      return (
                        <div key={entry._id} className="timeline-item">
                          <span className="timeline-dot mention-dot" />
                          <p className="text-xs flex items-center gap-1.5 flex-wrap">
                            <AtSign size={12} className="text-primary" />
                            <strong className="font-bold">{entry.actorId?.name}</strong>
                            mentioned
                            <strong className="font-bold">{entry.mentionedUser?.name || 'someone'}</strong>
                          </p>
                          {entry.commentContent && (
                            <p className="text-[11px] text-muted-foreground mt-1 pl-5 italic">
                              &ldquo;{entry.commentContent.slice(0, 80)}{entry.commentContent.length > 80 ? '...' : ''}&rdquo;
                            </p>
                          )}
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                      );
                    }

                    const log = entry;
                    let logText = '';
                    switch (log.action) {
                      case 'TICKET_CREATED':
                        logText = `created the ticket ${log.metadata?.ticketNumber || ''}`;
                        break;
                      case 'ASSIGNEE_CHANGED':
                        logText = `changed assignee: ${log.metadata?.oldAssignee || 'Unassigned'} → ${log.metadata?.newAssignee || 'Unassigned'}`;
                        break;
                      case 'STATUS_CHANGED':
                        logText = `changed status: ${log.metadata?.oldStatus || 'None'} → ${log.metadata?.newStatus || 'None'}`;
                        break;
                      case 'PRIORITY_CHANGED':
                        logText = `changed priority: ${log.metadata?.oldPriority || 'None'} → ${log.metadata?.newPriority || 'None'}`;
                        break;
                      case 'COMMENT_ADDED':
                        logText = `added a comment: "${log.metadata?.contentSummary || ''}"`;
                        break;
                      case 'ATTACHMENT_UPLOADED':
                        logText = `uploaded attachment: ${log.metadata?.fileName || ''}`;
                        break;
                      default:
                        logText = `${log.action.replace(/_/g, ' ').toLowerCase()}`;
                    }

                    return (
                      <div key={log._id} className="timeline-item">
                        <span className="timeline-dot" />
                        <p className="text-xs">
                          <strong className="font-bold">{log.actorId?.name}</strong> {logText}
                        </p>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {activityTimeline.length === 0 && (
                    <p className="text-muted-foreground text-xs font-semibold">No activities logged yet.</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <h3 className="font-bold text-base">Ticket Attributes</h3>

            <div>
              {isViewer ? (
                <div>
                  <span className="detail-label">Status</span>
                  <span className="detail-value block mt-1">{ticket.status}</span>
                </div>
              ) : (
                <Select label="Status" value={ticket.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={isUpdating}>
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">Todo</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="TESTING">Testing</option>
                  <option value="DONE">Done</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REOPENED">Reopened</option>
                </Select>
              )}
            </div>

            <div>
              {isViewer ? (
                <div>
                  <span className="detail-label">Priority</span>
                  <span className="detail-value block mt-1">{ticket.priority}</span>
                </div>
              ) : (
                <Select label="Priority" value={ticket.priority} onChange={(e) => handlePriorityChange(e.target.value)} disabled={isUpdating}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="BLOCKER">Blocker</option>
                </Select>
              )}
            </div>

            <div>
              {isViewer ? (
                <div>
                  <span className="detail-label">Assignee</span>
                  <span className="detail-value block mt-1">{ticket.assigneeId?.name || 'Unassigned'}</span>
                </div>
              ) : (
                <Select label="Assignee" value={ticket.assigneeId?._id || ''} onChange={(e) => handleAssigneeChange(e.target.value)} disabled={isUpdating}>
                  <option value="">Unassigned</option>
                  <option value={ticket.reporterId?._id}>{ticket.reporterId?.name} (Reporter)</option>
                  {projectMembers.map(m => m.userId && m.userId._id !== ticket.reporterId?._id && (
                    <option key={m._id} value={m.userId._id}>{m.userId.name}</option>
                  ))}
                </Select>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
