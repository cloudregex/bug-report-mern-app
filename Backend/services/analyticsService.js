import { Op, fn, col, literal } from 'sequelize';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Mention from '../models/Mention.js';
import Activity from '../models/Activity.js';
import TicketMetrics from '../models/TicketMetrics.js';
import { activityIncludes } from '../utils/queryIncludes.js';
import { shapeActivities, toApiDoc } from '../utils/apiShape.js';

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

const baseTicketWhere = (companyId, extra = {}) => ({
  companyId,
  isDeleted: false,
  ...extra
});

const fillDateSeries = (rows, days = 7) => {
  const map = new Map(rows.map((r) => [r.date, Number(r.count)]));
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
    const projects = await Project.findAll({
      where: { companyId, isDeleted: false },
      attributes: ['id']
    });
    return projects.map((p) => p.id);
  }
  const members = await ProjectMember.findAll({
    where: { userId, companyId },
    attributes: ['projectId']
  });
  return members.map((m) => m.projectId);
};

export const getTicketsByStatus = async (where) => {
  const rows = await Ticket.findAll({
    where,
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    order: [[literal('count'), 'DESC']],
    raw: true
  });
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
};

export const getTicketsByPriority = async (where) => {
  const order = ['BLOCKER', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const rows = await Ticket.findAll({
    where,
    attributes: ['priority', [fn('COUNT', col('id')), 'count']],
    group: ['priority'],
    raw: true
  });
  const map = new Map(rows.map((r) => [r.priority, Number(r.count)]));
  return order.filter((p) => map.has(p)).map((p) => ({ priority: p, count: map.get(p) }));
};

export const getEmployeeWorkload = async (where, limit = 10) => {
  const rows = await Ticket.findAll({
    where: {
      ...where,
      assigneeId: { [Op.ne]: null },
      status: { [Op.notIn]: CLOSED_STATUSES }
    },
    attributes: [
      'assigneeId',
      [fn('COUNT', col('Ticket.id')), 'count']
    ],
    include: [{
      model: User,
      as: 'assignee',
      attributes: ['name']
    }],
    group: ['assigneeId', 'assignee.id', 'assignee.name'],
    order: [[literal('count'), 'DESC']],
    limit,
    subQuery: false
  });

  return rows.map((row) => ({
    userId: row.assigneeId,
    name: row.assignee?.name || 'Unknown',
    count: Number(row.get('count'))
  }));
};

export const getTicketsCreatedPerDay = async (where, days = 7) => {
  const rows = await Ticket.findAll({
    where: {
      ...where,
      createdAt: { [Op.gte]: daysAgo(days) }
    },
    attributes: [
      [fn('DATE', col('created_at')), 'date'],
      [fn('COUNT', col('id')), 'count']
    ],
    group: [fn('DATE', col('created_at'))],
    order: [[fn('DATE', col('created_at')), 'ASC']],
    raw: true
  });
  return fillDateSeries(rows, days);
};

export const getResolutionMetrics = async (where) => {
  const [resolvedStats, openCount, reopenedCount, closedCount] = await Promise.all([
    Ticket.findOne({
      where: { ...where, resolvedAt: { [Op.ne]: null } },
      attributes: [
        [fn('AVG', literal('TIMESTAMPDIFF(MICROSECOND, created_at, resolved_at) / 1000')), 'avgMs'],
        [fn('COUNT', col('id')), 'count']
      ],
      raw: true
    }),
    Ticket.count({ where: { ...where, status: { [Op.in]: OPEN_STATUSES } } }),
    Ticket.count({ where: { ...where, status: 'REOPENED' } }),
    Ticket.count({ where: { ...where, status: { [Op.in]: CLOSED_STATUSES } } })
  ]);

  const openTickets = await Ticket.findAll({
    where: { ...where, status: { [Op.in]: OPEN_STATUSES } },
    attributes: ['createdAt']
  });
  const avgAgeMs = openTickets.length
    ? openTickets.reduce((sum, t) => sum + (Date.now() - t.createdAt.getTime()), 0) / openTickets.length
    : 0;

  const avgResolutionMs = Number(resolvedStats?.avgMs || 0);
  const resolvedCount = Number(resolvedStats?.count || 0);
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
  const where = { companyId };
  if (projectIds?.length) where.projectId = { [Op.in]: projectIds };

  const activities = await Activity.findAll({
    where,
    include: activityIncludes(),
    order: [['createdAt', 'DESC']],
    limit
  });

  return shapeActivities(activities);
};

export const getCompanyOverview = async (companyId) => {
  const match = baseTicketWhere(companyId);
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
    Project.count({ where: { companyId, isDeleted: false } }),
    User.count({ where: { companyId, role: { [Op.in]: ['ADMIN', 'EMPLOYEE'] } } }),
    Ticket.count({ where: { ...match, status: { [Op.in]: OPEN_STATUSES } } }),
    Ticket.count({
      where: {
        ...match,
        priority: { [Op.in]: ['CRITICAL', 'BLOCKER'] },
        status: { [Op.in]: OPEN_STATUSES }
      }
    }),
    Ticket.count({
      where: {
        ...match,
        dueDate: { [Op.lt]: new Date(), [Op.ne]: null },
        status: { [Op.notIn]: CLOSED_STATUSES }
      }
    }),
    Ticket.count({
      where: {
        ...match,
        resolvedAt: { [Op.gte]: todayStart, [Op.lte]: todayEnd }
      }
    }),
    getTicketsByStatus(match),
    getTicketsByPriority({ ...match, status: { [Op.in]: OPEN_STATUSES } }),
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
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const weekStart = daysAgo(7);
  const base = baseTicketWhere(companyId);

  const [
    assignedTickets,
    mentions,
    dueToday,
    completedThisWeek,
    ticketsByStatus,
    ticketsByPriority,
    recentActivity
  ] = await Promise.all([
    Ticket.count({
      where: { ...base, assigneeId: userId, status: { [Op.in]: OPEN_STATUSES } }
    }),
    Mention.count({ where: { companyId, mentionedUserId: userId } }),
    Ticket.count({
      where: {
        ...base,
        assigneeId: userId,
        dueDate: { [Op.gte]: todayStart, [Op.lte]: todayEnd },
        status: { [Op.notIn]: CLOSED_STATUSES }
      }
    }),
    Ticket.count({
      where: { ...base, assigneeId: userId, resolvedAt: { [Op.gte]: weekStart } }
    }),
    getTicketsByStatus({ ...base, assigneeId: userId, status: { [Op.in]: OPEN_STATUSES } }),
    getTicketsByPriority({ ...base, assigneeId: userId, status: { [Op.in]: OPEN_STATUSES } }),
    Activity.findAll({
      where: { companyId, actorId: userId },
      include: [{ model: Ticket, as: 'ticket', attributes: ['id', 'ticketNumber', 'title'] }],
      order: [['createdAt', 'DESC']],
      limit: 8
    }).then((rows) => rows.map((row) => {
      const plain = toApiDoc(row);
      if (plain.ticket) plain.ticketId = plain.ticket;
      return plain;
    }))
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
  const match = baseTicketWhere(companyId, { projectId });

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
    Ticket.count({ where: { ...match, status: { [Op.in]: OPEN_STATUSES } } }),
    Ticket.count({ where: { ...match, type: 'BUG', status: { [Op.in]: OPEN_STATUSES } } }),
    Ticket.count({
      where: {
        ...match,
        priority: { [Op.in]: ['CRITICAL', 'BLOCKER'] },
        status: { [Op.in]: OPEN_STATUSES }
      }
    }),
    Ticket.count({
      where: {
        ...match,
        dueDate: { [Op.lt]: new Date(), [Op.ne]: null },
        status: { [Op.notIn]: CLOSED_STATUSES }
      }
    }),
    ProjectMember.count({ where: { projectId, companyId } }),
    getTicketsByStatus(match),
    getTicketsByPriority({ ...match, status: { [Op.in]: OPEN_STATUSES } }),
    getEmployeeWorkload(match),
    getResolutionMetrics(match),
    getTicketsCreatedPerDay(match),
    getRecentActivity(companyId, [projectId], 8)
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
  const date = startOfDay().toISOString().slice(0, 10);
  if (!created && !closed && resolutionMs == null) return;

  const existing = await TicketMetrics.findOne({ where: { companyId, date } });

  const updates = {
    companyId,
    date,
    ticketsCreated: (existing?.ticketsCreated || 0) + (created || 0),
    ticketsClosed: (existing?.ticketsClosed || 0) + (closed || 0)
  };

  if (resolutionMs != null) {
    const prevCount = existing?.ticketsClosed || 0;
    const prevAvg = existing?.avgResolutionTime || 0;
    const newCount = prevCount + (closed || 1);
    updates.avgResolutionTime = newCount > 0
      ? ((prevAvg * prevCount) + resolutionMs) / newCount
      : resolutionMs;
  } else if (existing?.avgResolutionTime != null) {
    updates.avgResolutionTime = existing.avgResolutionTime;
  }

  await TicketMetrics.upsert(updates);
};

export const applyResolutionTimestamp = (ticket, newStatus) => {
  if (CLOSED_STATUSES.includes(newStatus) && !ticket.resolvedAt) {
    ticket.resolvedAt = new Date();
  } else if (newStatus === 'REOPENED') {
    ticket.resolvedAt = null;
  }
};
