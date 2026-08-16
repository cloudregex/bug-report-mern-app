import Stripe from 'stripe';
import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

import { syncUsage } from '../services/usageService.js';
import { createAuditLog } from '../services/auditService.js';
import { subscriptionIncludes } from '../utils/queryIncludes.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const FRONTEND_URL = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0] : 'http://localhost:5173';

export const createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body;
    console.log(planId);
    if (!planId) {
      return res.status(400).json({ success: false, message: "PlanID is required " })
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not exists" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user || !user.companyId) {
      return res.status(400).json({ success: false, message: "Company associated user required" });
    }

    if (!stripe) {
      console.log(`[Billing simulator] Upgrading company ${user.companyId} to plan ${plan.name} directly....`);

      const subscription = await Subscription.findOne({ where: { companyId: user.companyId } });
      if (subscription) {
        const before = { planId: subscription.planId, status: subscription.status };

        subscription.planId = plan.id;
        subscription.status = 'ACTIVE';

        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        subscription.renewalDate = renewalDate;
        await subscription.save();

        await syncUsage(user.companyId);
        await createAuditLog({
          companyId: user.companyId,
          actorId: req.user.id,
          entityType: "SUBSCRIPTION",
          entityId: subscription.id,
          action: "SUBSCRIPTION_UPGRADE_SIMULATION",
          before,
          after: {
            planId: subscription.planId,
            status: subscription.status
          },
          req
        });
      }
      return res.status(200).json({
        success: true,
        url: `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`
      });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan`,
              description: `Upgrade to ${plan.name} subscription limit`,
            },
            unit_amount: Math.round(Number(plan.price) * 100), // in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        companyId: user.companyId,
        planId: plan.id,
        userId: user.id
      },
      success_url: `${FRONTEND_URL}/billing?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/billing?payment_status=cancelled`,
    });
    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && stripe) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    else {
      event = req.body;
    }
  }
  catch (error) {
    console.log(error);
    return res.status(400).send(`Webhook error:${error.message}`);
  }

  if (event.type === 'chekout.session.completed') {
    const session = event.data.object;
    const { companyId, planId, userId } = session.metadata;
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;

    try {
      const subscription = await Subscription.findOne({ Where: { companyId } });
      if (subscription) {
        const before = { planId: subscription.planId, status: subscription.status };

        subscription.planId = planId;
        subscription.status = 'ACTIVE';
        subscription.stripeSubscriptionId = stripeSubscriptionId;
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        subscription.renewalDate = renewalDate;
        await subscription.save();
        await syncUsage(companyId);
        await createAuditLog({
          companyId,
          actorId: userId,
          entityType: 'SUBSCRIPTION',
          entityId: subscription.id,
          action: 'SUBSCRIPTION_UPGRADED_STRIPE',
          before,
          after: { planId, status: 'ACTIVE' },
          req: { ip: req.ip, headers: req.headers } // Mock request details for audit logging
        });
        console.log(`[Stripe Webhook] Successfully upgraded company ${companyId} to plan ${planId}`);
      }
    } catch (dbErr) {
      console.error('[Stripe Webhook] Error updating database subscription:', dbErr);
      return res.status(500).json({ success: false, error: 'Database update failed' });
    }
  }
  return res.status(200).json({ received: true });
};

export const verifyCheckout = async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    if (!stripe || sessionId === 'mock_session_id') {
      return res.status(200).json({ success: true, status: 'complete', mock: true });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return res.status(200).json({
      success: true,
      status: session.payment_status,
      customer: session.customer_details
    });
  } catch (error) {
    console.error('Verify checkout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};