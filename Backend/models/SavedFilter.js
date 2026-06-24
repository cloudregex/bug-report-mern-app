import mongoose from 'mongoose';

const savedFilterSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

savedFilterSchema.index({ companyId: 1, userId: 1 });

const SavedFilter = mongoose.model('SavedFilter', savedFilterSchema);
export default SavedFilter;
