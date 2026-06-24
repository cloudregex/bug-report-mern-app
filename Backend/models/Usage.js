import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  projectsCount: {
    type: Number,
    default: 0
  },
  employeesCount: {
    type: Number,
    default: 0
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  ticketsCreatedThisMonth: {
    type: Number,
    default: 0
  },
  usageMonth: {
    type: String,
    default: () => new Date().toISOString().slice(0, 7)
  }
}, {
  timestamps: true
});

const Usage = mongoose.model('Usage', usageSchema);
export default Usage;
