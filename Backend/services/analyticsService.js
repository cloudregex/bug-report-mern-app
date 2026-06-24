import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Mention from '../models/Mention.js';
import Activity from '../models/Activity.js';
import TicketMetrics from '../models/TicketMetrics.js';

const CLOSED_STATUSES = ['DONE', 'CLOSED'];
const OPEN_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'REOPENED'];

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const daysAgo = (n) => {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
};

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const baseTicketMatch = (companyId, extra = {}) => ({
  companyId: toObjectId(companyId),
  isDeleted: false,
  ...extra
});

const fillDateSeries = (rows, days = 7) => {
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) || 0 });
  }
  return result;
};

export const getAccessibleProjectIds = async (userId, companyId, role) => {
  if (role === 'ADMIN') {
    const projects = await Project.find({ companyId, isDeleted: false }).select('_id');
    return projects.map((p) => p._id);
  }
  const members = await ProjectMember.find({ userId, companyId }).select('projectId');
  return members.map((m) => m.projectId);
};

export const getTicketsByStatus = async (match) => {
  const rows = await Ticket.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return rows.map((r) => ({ status: r._id, count: r.count }));
};

export const getTicketsByPriority = async (match) => {
  const order = ['BLOCKER', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const rows = await Ticket.aggregate([
    { $match: match },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);
  const map = new Map(rows.map((r) => [r._id, r.count]));
  return order.filter((p) => map.has(p)).map((p) => ({ priority: p, count: map.get(p) }));
};

export const getEmployeeWorkload = async (match, limit = 10) => {
  const rows = await Ticket.aggregate([
    { $match: { ...match, assigneeId: { $ne: null }, status: { $nin: CLOSED_STATUSES } } },
    { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $project: { _id: 0, userId: '$_id', name: '$user.name', count: 1 } }
  ]);
  return rows;
};

export const getTicketsCreatedPerDay = async (match, days = 7) => {
  const rows = await Ticket.aggregate([
    { $match: { ...match, createdAt: { $gte: daysAgo(days) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  return fillDateSeries(rows, days);
};

export const getResolutionMetrics = async (match) => {
  const [resolvedStats, openCount, reopenedCount, closedCount] = await Promise.all([
    Ticket.aggregate([
      { $match: { ...match, resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } },
          count: { $sum: 1 }
        }
      }
    ]),
    Ticket.countDocuments({ ...match, status: { $in: OPEN_STATUSES } }),
    Ticket.countDocuments({ ...match, status: 'REOPENED' }),
    Ticket.countDocuments({ ...match, status: { $in: CLOSED_STATUSES } })
  ]);

  const openTickets = await Ticket.find({ ...match, status: { $in: OPEN_STATUSES } }).select('createdAt');
  const avgAgeMs = openTickets.length
    ? openTickets.reduce((sum, t) => sum + (Date.now() - t.createdAt.getTime()), 0) / openTickets.length
    : 0;

  const avgResolutionMs = resolvedStats[0]?.avgMs || 0;
  const resolvedCount = resolvedStats[0]?.count || 0;
  const reopenRate = resolvedCount > 0 ? Math.round((reopenedCount / resolvedCount) * 100) : 0;

  return {
    avgResolutionHours: Math.round((avgResolutionMs / (1000 * 60 * 60)) * 10) / 10,
    avgTicketAgeDays: Math.round((avgAgeMs / (1000 * 60 * 60 * 24)) * 10) / 10,
    reopenRate,
    openTickets: openCount,
    closedTickets: closedCount
  };
};

export const getRecentActivity = async (companyId, projectIds = null, limit = 10) => {
  const match = { companyId: toObjectId(companyId) };
  if (projectIds?.length) match.projectId = { $in: projectIds };

  return Activity.find(match)
    .populate('actorId', 'name')
    .populate('ticketId', 'ticketNumber title')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export const getCompanyOverview = async (companyId) => {
  const match = baseTicketMatch(companyId);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [
    projects,
    employees,
    openTickets,
    criticalTickets,
    overdueTickets,
    closedToday,
    ticketsByStatus,
    ticketsByPriority,
    ticketsCreatedPerDay,
    workload,
    resolution,
    recentActivity
  ] = await Promise.all([
    Project.countDocuments({ companyId, isDeleted: false }),
    User.countDocuments({ companyId, role: { $in: ['ADMIN', 'EMPLOYEE'] } }),
    Ticket.countDocuments({ ...match, status: { $in: OPEN_STATUSES } }),
    Ticket.countDocuments({ ...match, priority: { $in: ['CRITICAL', 'BLOCKER'] }, status: { $in: OPEN_STATUSES } }),
    Ticket.countDocuments({
      ...match,
      dueDate: { $lt: new Date(), $ne: null },
      status: { $nin: CLOSED_STATUSES }
    }),
    Ticket.countDocuments({
      ...match,
      resolvedAt: { $gte: todayStart, $lte: todayEnd }
    }),
    getTicketsByStatus(match),
    getTicketsByPriority({ ...match, status: { $in: OPEN_STATUSES } }),
    getTicketsCreatedPerDay(match),
    getEmployeeWorkload(match),
    getResolutionMetrics(match),
    getRecentActivity(companyId, null, 10)
  ]);

  return {
    projects,
    employees,
    openTickets,
    criticalTickets,
    overdueTickets,
    closedToday,
    ticketsByStatus,
    ticketsByPriority,
    ticketsCreatedPerDay,
    workload,
    resolution,
    recentActivity
  };
};

export const getMyDashboard = async (userId, companyId) => {
  const uid = toObjectId(userId);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const weekStart = daysAgo(7);

  const base = baseTicketMatch(companyId);

  const [
    assignedTickets,
    mentions,
    dueToday,
    completedThisWeek,
    ticketsByStatus,
    ticketsByPriority,
    recentActivity
  ] = await Promise.all([
    Ticket.countDocuments({ ...base, assigneeId: uid, status: { $in: OPEN_STATUSES } }),
    Mention.countDocuments({ companyId: toObjectId(companyId), mentionedUserId: uid }),
    Ticket.countDocuments({
      ...base,
      assigneeId: uid,
      dueDate: { $gte: todayStart, $lte: todayEnd },
      status: { $nin: CLOSED_STATUSES }
    }),
    Ticket.countDocuments({
      ...base,
      assigneeId: uid,
      resolvedAt: { $gte: weekStart }
    }),
    getTicketsByStatus({ ...base, assigneeId: uid, status: { $in: OPEN_STATUSES } }),
    getTicketsByPriority({ ...base, assigneeId: uid, status: { $in: OPEN_STATUSES } }),
    Activity.find({ companyId: toObjectId(companyId), actorId: uid })
      .populate('ticketId', 'ticketNumber title')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
  ]);

  return {
    assignedTickets,
    mentions,
    dueToday,
    completedThisWeek,
    ticketsByStatus,
    ticketsByPriority,
    recentActivity
  };
};

export const getProjectDashboard = async (projectId, companyId) => {
  const match = baseTicketMatch(companyId, { projectId: toObjectId(projectId) });

  const [
    openTickets,
    openBugs,
    criticalTickets,
    overdueTickets,
    activeMembers,
    ticketsByStatus,
    ticketsByPriority,
    workload,
    resolution,
    ticketsCreatedPerDay,
    recentActivity
  ] = await Promise.all([
    Ticket.countDocuments({ ...match, status: { $in: OPEN_STATUSES } }),
    Ticket.countDocuments({ ...match, type: 'BUG', status: { $in: OPEN_STATUSES } }),
    Ticket.countDocuments({ ...match, priority: { $in: ['CRITICAL', 'BLOCKER'] }, status: { $in: OPEN_STATUSES } }),
    Ticket.countDocuments({
      ...match,
      dueDate: { $lt: new Date(), $ne: null },
      status: { $nin: CLOSED_STATUSES }
    }),
    ProjectMember.countDocuments({ projectId, companyId }),
    getTicketsByStatus(match),
    getTicketsByPriority({ ...match, status: { $in: OPEN_STATUSES } }),
    getEmployeeWorkload(match),
    getResolutionMetrics(match),
    getTicketsCreatedPerDay(match),
    getRecentActivity(companyId, [toObjectId(projectId)], 8)
  ]);

  const healthScore = openTickets === 0
    ? 100
    : Math.max(0, Math.min(100, Math.round(100 - (criticalTickets * 15) - (overdueTickets * 10))));

  return {
    projectHealth: healthScore,
    activeMembers,
    openBugs,
    openTickets,
    criticalTickets,
    overdueTickets,
    ticketsByStatus,
    ticketsByPriority,
    workload,
    resolution,
    ticketsCreatedPerDay,
    recentActivity
  };
};

export const recordDailyMetrics = async (companyId, { created = 0, closed = 0, resolutionMs = null } = {}) => {
  const date = startOfDay();
  const update = { $inc: {} };
  if (created) update.$inc.ticketsCreated = created;
  if (closed) update.$inc.ticketsClosed = closed;

  if (!Object.keys(update.$inc).length && resolutionMs == null) return;

  const existing = await TicketMetrics.findOne({ companyId, date });
  if (resolutionMs != null) {
    const prevCount = existing?.ticketsClosed || 0;
    const prevAvg = existing?.avgResolutionTime || 0;
    const newCount = prevCount + (closed || 1);
    const newAvg = newCount > 0
      ? ((prevAvg * prevCount) + resolutionMs) / newCount
      : resolutionMs;
    update.$set = { avgResolutionTime: newAvg };
  }

  await TicketMetrics.findOneAndUpdate(
    { companyId, date },
    update,
    { upsert: true, new: true }
  );
};

export const applyResolutionTimestamp = (ticket, newStatus) => {
  if (CLOSED_STATUSES.includes(newStatus) && !ticket.resolvedAt) {
    ticket.resolvedAt = new Date();
  } else if (newStatus === 'REOPENED') {
    ticket.resolvedAt = null;
  }
};
