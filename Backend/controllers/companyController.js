import Company from '../models/Company.js';
import User from '../models/User.js';
import { createSubscriptionForCompany } from '../services/subscriptionService.js';

// Create a new company (legacy flow for logged-in users without a company)
export const createCompany = async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.companyId) {
      return res.status(400).json({
        success: false,
        message: 'You already belong to a company. Use registration to create a new organisation.'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    // Generate slug from company name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Check if slug is unique
    const existingCompany = await Company.findOne({ slug });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'A company with a similar name or slug already exists'
      });
    }

    // Create Company
    const company = new Company({
      name: name.trim(),
      slug,
      createdBy: req.user.id // set from token
    });

    await company.save();

    const subscription = await createSubscriptionForCompany(company._id);
    company.subscriptionId = subscription._id;
    await company.save();

    // Update User.companyId
    await User.findByIdAndUpdate(req.user.id, {
      companyId: company._id
    });

    return res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company
    });
  } catch (error) {
    console.error('Create company error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current user's company details
export const getMyCompany = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.companyId) {
      return res.status(200).json({
        success: true,
        company: null
      });
    }

    const company = await Company.findById(user.companyId);
    return res.status(200).json({
      success: true,
      company
    });
  } catch (error) {
    console.error('Get company error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
