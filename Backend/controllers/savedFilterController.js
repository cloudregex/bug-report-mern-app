import SavedFilter from '../models/SavedFilter.js';
import User from '../models/User.js';
import { toApiDoc } from '../utils/apiShape.js';

export const getSavedFilters = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user?.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const filters = await SavedFilter.findAll({
      where: { companyId: user.companyId, userId: user.id },
      order: [['name', 'ASC']]
    });

    return res.status(200).json({ success: true, savedFilters: filters.map(toApiDoc) });
  } catch (error) {
    console.error('Get saved filters error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createSavedFilter = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user?.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const { name, filters } = req.body;
    if (!name?.trim() || !filters || typeof filters !== 'object') {
      return res.status(400).json({ success: false, message: 'Name and filters are required' });
    }

    const savedFilter = await SavedFilter.create({
      companyId: user.companyId,
      userId: user.id,
      name: name.trim(),
      filters
    });

    return res.status(201).json({ success: true, savedFilter: toApiDoc(savedFilter) });
  } catch (error) {
    console.error('Create saved filter error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateSavedFilter = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user?.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const savedFilter = await SavedFilter.findOne({
      where: { id: req.params.id, companyId: user.companyId, userId: user.id }
    });
    if (!savedFilter) {
      return res.status(404).json({ success: false, message: 'Saved filter not found' });
    }

    if (req.body.name?.trim()) savedFilter.name = req.body.name.trim();
    if (req.body.filters && typeof req.body.filters === 'object') savedFilter.filters = req.body.filters;

    await savedFilter.save();
    return res.status(200).json({ success: true, savedFilter: toApiDoc(savedFilter) });
  } catch (error) {
    console.error('Update saved filter error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteSavedFilter = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user?.companyId) {
      return res.status(400).json({ success: false, message: 'User must belong to a company' });
    }

    const deleted = await SavedFilter.destroy({
      where: { id: req.params.id, companyId: user.companyId, userId: user.id }
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Saved filter not found' });
    }

    return res.status(200).json({ success: true, message: 'Saved filter deleted' });
  } catch (error) {
    console.error('Delete saved filter error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
