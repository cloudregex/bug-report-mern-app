import User from '../models/User.js';
import Company from '../models/Company.js';
import { createSubscriptionForCompany } from '../services/subscriptionService.js';
import { toApiDoc } from '../utils/apiShape.js';

export const createCompany = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.companyId) {
      return res.status(400).json({
        success: false,
        message: 'You already belong to a company. Use registration to create a new organisation.'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required' });
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existingCompany = await Company.findOne({ where: { slug } });
    if (existingCompany) {
      return res.status(400).json({ success: false, message: 'A company with a similar name or slug already exists' });
    }

    const company = await Company.create({
      name: name.trim(),
      slug,
      createdBy: req.user.id
    });

    const subscription = await createSubscriptionForCompany(company.id);
    company.subscriptionId = subscription.id;
    await company.save();

    await User.update({ companyId: company.id }, { where: { id: req.user.id } });

    return res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company: toApiDoc(company)
    });
  } catch (error) {
    console.error('Create company error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMyCompany = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.companyId) {
      return res.status(200).json({ success: true, company: null });
    }

    const company = await Company.findByPk(user.companyId);
    return res.status(200).json({ success: true, company: toApiDoc(company) });
  } catch (error) {
    console.error('Get company error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
