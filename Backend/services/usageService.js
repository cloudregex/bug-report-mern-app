import Project from '../models/Project.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Usage from '../models/Usage.js';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export const computeUsageCounts = async (companyId) => {
  const monthStart = startOfMonth();
  const [projectsCount, employeesCount, ticketsCreatedThisMonth] = await Promise.all([
    Project.countDocuments({ companyId, isDeleted: false }),
    User.countDocuments({ companyId, role: { $in: ['ADMIN', 'EMPLOYEE'] } }),
    Ticket.countDocuments({ companyId, isDeleted: false, createdAt: { $gte: monthStart } })
  ]);

  return {
    projectsCount,
    employeesCount,
    storageUsed: 0,
    ticketsCreatedThisMonth,
    usageMonth: currentMonth()
  };
};

export const syncUsage = async (companyId) => {
  const counts = await computeUsageCounts(companyId);
  return Usage.findOneAndUpdate(
    { companyId },
    { $set: counts },
    { upsert: true, new: true }
  );
};

export const getUsage = async (companyId) => syncUsage(companyId);

export const incrementTicketUsage = async (companyId) => {
  const month = currentMonth();
  const usage = await Usage.findOne({ companyId });
  if (!usage || usage.usageMonth !== month) {
    return syncUsage(companyId);
  }
  usage.ticketsCreatedThisMonth += 1;
  await usage.save();
  return usage;
};
