import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';
import Company from '../models/Company.js';
import { syncUsage } from './usageService.js';
import { subscriptionIncludes } from '../utils/queryIncludes.js';
import { shapeSubscription, toApiDoc } from '../utils/apiShape.js';

const UPGRADE_RESPONSE = {
  success: false,
  message: 'Upgrade Required',
  code: 'UPGRADE_REQUIRED'
};

export const ensureAllCompanySubscriptions = async () => {
  const companies = await Company.findAll({ where: { subscriptionId: null } });
  for (const company of companies) {
    await createSubscriptionForCompany(company.id);
  }
};

export const seedPlans = async () => {
  const defaults = [
    {
      name: 'FREE',
      price: 0,
      maxProjects: 2,
      maxEmployees: 5,
      maxStorageGB: 1,
      maxTicketsPerMonth: 50,
      features: ['Basic ticketing', '2 projects', '5 team members']
    },
    {
      name: 'PRO',
      price: 49,
      maxProjects: 50,
      maxEmployees: 100,
      maxStorageGB: 50,
      maxTicketsPerMonth: 5000,
      features: ['Unlimited workflows', '50 projects', '100 team members', 'Priority support']
    }
  ];

  for (const plan of defaults) {
    await Plan.upsert(plan);
  }
};

export const getDefaultPlan = async () => {
  let plan = await Plan.findOne({ where: { name: 'FREE' } });
  if (!plan) {
    await seedPlans();
    plan = await Plan.findOne({ where: { name: 'FREE' } });
  }
  return plan;
};

export const createSubscriptionForCompany = async (companyId, planId = null) => {
  const plan = planId ? await Plan.findByPk(planId) : await getDefaultPlan();
  if (!plan) throw new Error('No plan available');

  const startDate = new Date();
  const renewalDate = new Date(startDate);
  renewalDate.setMonth(renewalDate.getMonth() + 1);

  const subscription = await Subscription.create({
    companyId,
    planId: plan.id,
    startDate,
    renewalDate,
    status: 'TRIAL'
  });

  await Company.update({ subscriptionId: subscription.id }, { where: { id: companyId } });
  await syncUsage(companyId);

  return Subscription.findByPk(subscription.id, { include: subscriptionIncludes() });
};

export const getCompanySubscription = async (companyId) => {
  const company = await Company.findByPk(companyId);
  if (!company?.subscriptionId) {
    return createSubscriptionForCompany(companyId);
  }
  return Subscription.findByPk(company.subscriptionId, { include: subscriptionIncludes() });
};

export const getActivePlan = async (companyId) => {
  const subscription = await getCompanySubscription(companyId);
  if (!subscription) return null;
  if (['EXPIRED', 'CANCELLED'].includes(subscription.status)) {
    return null;
  }
  return subscription.plan || subscription.get?.('plan');
};

const assertActiveSubscription = async (companyId) => {
  const subscription = await getCompanySubscription(companyId);
  if (!subscription || ['EXPIRED', 'CANCELLED'].includes(subscription.status)) {
    return { allowed: false, response: { ...UPGRADE_RESPONSE, reason: 'Subscription inactive' } };
  }
  const plan = subscription.plan || subscription.get?.('plan');
  if (!plan) {
    return { allowed: false, response: { ...UPGRADE_RESPONSE, reason: 'No plan assigned' } };
  }
  return { allowed: true, plan, subscription };
};

export const checkProjectLimit = async (companyId) => {
  const check = await assertActiveSubscription(companyId);
  if (!check.allowed) return check;

  const usage = await syncUsage(companyId);
  if (usage.projectsCount >= check.plan.maxProjects) {
    return {
      allowed: false,
      response: {
        ...UPGRADE_RESPONSE,
        reason: 'Project limit reached',
        limit: check.plan.maxProjects,
        current: usage.projectsCount
      }
    };
  }
  return { allowed: true, plan: check.plan, usage };
};

export const checkEmployeeLimit = async (companyId) => {
  const check = await assertActiveSubscription(companyId);
  if (!check.allowed) return check;

  const usage = await syncUsage(companyId);
  if (usage.employeesCount >= check.plan.maxEmployees) {
    return {
      allowed: false,
      response: {
        ...UPGRADE_RESPONSE,
        reason: 'Employee limit reached',
        limit: check.plan.maxEmployees,
        current: usage.employeesCount
      }
    };
  }
  return { allowed: true, plan: check.plan, usage };
};

export const checkTicketLimit = async (companyId) => {
  const check = await assertActiveSubscription(companyId);
  if (!check.allowed) return check;

  const usage = await syncUsage(companyId);
  if (usage.ticketsCreatedThisMonth >= check.plan.maxTicketsPerMonth) {
    return {
      allowed: false,
      response: {
        ...UPGRADE_RESPONSE,
        reason: 'Monthly ticket limit reached',
        limit: check.plan.maxTicketsPerMonth,
        current: usage.ticketsCreatedThisMonth
      }
    };
  }
  return { allowed: true, plan: check.plan, usage };
};

export const getBillingInfo = async (companyId) => {
  const subscription = await getCompanySubscription(companyId);
  const usage = await syncUsage(companyId);
  const plan = subscription?.plan || subscription?.get?.('plan');

  return {
    plan: plan ? {
      name: plan.name,
      price: Number(plan.price),
      maxProjects: plan.maxProjects,
      maxEmployees: plan.maxEmployees,
      maxStorageGB: plan.maxStorageGB,
      maxTicketsPerMonth: plan.maxTicketsPerMonth,
      features: plan.features
    } : null,
    subscription: subscription ? {
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      renewalDate: subscription.renewalDate
    } : null,
    usage: {
      projectsCount: usage.projectsCount,
      employeesCount: usage.employeesCount,
      storageUsed: usage.storageUsed,
      ticketsCreatedThisMonth: usage.ticketsCreatedThisMonth
    }
  };
};

export const getSaasDashboard = async () => {
  const [totalCompanies, subscriptions, plans] = await Promise.all([
    Company.count(),
    Subscription.findAll({ include: subscriptionIncludes(), order: [['updatedAt', 'DESC']] }),
    Plan.findAll()
  ]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL');
  const expiredSubscriptions = subscriptions.filter((s) => s.status === 'EXPIRED');

  const mrr = activeSubscriptions.reduce((sum, s) => {
    const plan = s.plan || s.get?.('plan');
    return sum + Number(plan?.price || 0);
  }, 0);

  const topCompanies = await Promise.all(
    subscriptions.slice(0, 10).map(async (sub) => {
      const company = sub.company || sub.get?.('company');
      const companyId = company?.id || sub.companyId;
      const usage = await syncUsage(companyId);
      const plan = sub.plan || sub.get?.('plan');
      return {
        companyId,
        companyName: company?.name || 'Unknown',
        plan: plan?.name,
        status: sub.status,
        employeesCount: usage.employeesCount,
        projectsCount: usage.projectsCount
      };
    })
  );

  topCompanies.sort((a, b) => (b.employeesCount + b.projectsCount) - (a.employeesCount + a.projectsCount));

  let totalStorage = 0;
  for (const sub of subscriptions) {
    const company = sub.company || sub.get?.('company');
    const usage = await syncUsage(company?.id || sub.companyId);
    totalStorage += usage.storageUsed || 0;
  }

  return {
    totalCompanies,
    mrr,
    activeSubscriptions: activeSubscriptions.length,
    expiredSubscriptions: expiredSubscriptions.length,
    storageUsageGB: totalStorage,
    topCompanies: topCompanies.slice(0, 5),
    plans: plans.map((p) => ({ name: p.name, price: Number(p.price), _id: p.id }))
  };
};

export const getShapedSubscription = (subscription) => {
  const shaped = shapeSubscription(subscription);
  if (shaped.plan) shaped.planId = shaped.plan;
  if (shaped.company) shaped.companyId = shaped.company;
  return shaped;
};

export { toApiDoc };
