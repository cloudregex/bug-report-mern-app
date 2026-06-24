import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  price: {
    type: Number,
    default: 0
  },
  maxProjects: {
    type: Number,
    required: true
  },
  maxEmployees: {
    type: Number,
    required: true
  },
  maxStorageGB: {
    type: Number,
    default: 1
  },
  maxTicketsPerMonth: {
    type: Number,
    default: 100
  },
  features: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
