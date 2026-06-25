import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { getBillingInfo, getSaasDashboard } from '../services/subscriptionService.js';
import { syncUsage } from '../services/usageService.js';
import { createAuditLog } from '../services/auditService.js';
import { subscriptionIncludes } from '../utils/queryIncludes.js';
import { shapeSubscription, toApiDoc } from '../utils/apiShape.js';
import { isUniqueConstraintError } from '../utils/dbHelpers.js';

export const listPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({ order: [['price', 'ASC']] });
    return res.status(200).json({ success: true, plans: plans.map(toApiDoc) });
  } catch (error) {
    console.error('List plans error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createPlan = async (req, res) => {
  try {
    const { name, price, maxProjects, maxEmployees, maxStorageGB, maxTicketsPerMonth, features } = req.body;
    if (!name?.trim() || maxProjects == null || maxEmployees == null) {
      return res.status(400).json({ success: false, message: 'Name, maxProjects, and maxEmployees are required' });
    }

    const plan = await Plan.create({
      name: name.trim().toUpperCase(),
      price: price ?? 0,
      maxProjects,
      maxEmployees,
      maxStorageGB: maxStorageGB ?? 1,
      maxTicketsPerMonth: maxTicketsPerMonth ?? 100,
      features: features || []
    });

    return res.status(201).json({ success: true, plan: toApiDoc(plan) });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(400).json({ success: false, message: 'Plan name already exists' });
    }
    console.error('Create plan error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      include: subscriptionIncludes(),
      order: [['updatedAt', 'DESC']]
    });
    return res.status(200).json({
      success: true,
      subscriptions: subscriptions.map(shapeSubscription)
    });
  } catch (error) {
    console.error('List subscriptions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const before = {
      planId: subscription.planId,
      status: subscription.status,
      endDate: subscription.endDate,
      renewalDate: subscription.renewalDate
    };

    const { planId, status, endDate, renewalDate } = req.body;
    if (planId) subscription.planId = planId;
    if (status) subscription.status = status;
    if (endDate !== undefined) subscription.endDate = endDate;
    if (renewalDate !== undefined) subscription.renewalDate = renewalDate;

    await subscription.save();
    await syncUsage(subscription.companyId);

    await createAuditLog({
      companyId: subscription.companyId,
      actorId: req.user.id,
      entityType: 'SUBSCRIPTION',
      entityId: subscription.id,
      action: 'SUBSCRIPTION_CHANGED',
      before,
      after: {
        planId: subscription.planId,
        status: subscription.status,
        endDate: subscription.endDate,
        renewalDate: subscription.renewalDate
      },
      req
    });

    const populated = await Subscription.findByPk(subscription.id, { include: subscriptionIncludes() });
    return res.status(200).json({ success: true, subscription: shapeSubscription(populated) });
  } catch (error) {
    console.error('Update subscription error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getBilling = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user?.companyId) {
      return res.status(400).json({ success: false, message: 'No company associated' });
    }

    const billing = await getBillingInfo(user.companyId);
    return res.status(200).json({
      success: true,
      billing: { ...billing, canUpgrade: user.role === 'ADMIN' }
    });
  } catch (error) {
    console.error('Get billing error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSaasDashboardStats = async (req, res) => {
  try {
    const stats = await getSaasDashboard();
    return res.status(200).json({ success: true, dashboard: stats });
  } catch (error) {
    console.error('SaaS dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
