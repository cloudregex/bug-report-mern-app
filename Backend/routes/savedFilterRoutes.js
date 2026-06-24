import express from 'express';
import {
  getSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter
} from '../controllers/savedFilterController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getSavedFilters);
router.post('/', createSavedFilter);
router.put('/:id', updateSavedFilter);
router.delete('/:id', deleteSavedFilter);

export default router;
