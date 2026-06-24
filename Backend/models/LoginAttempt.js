import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  success: {
    type: Boolean,
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

loginAttemptSchema.index({ email: 1, createdAt: -1 });
loginAttemptSchema.index({ ipAddress: 1, createdAt: -1 });
loginAttemptSchema.index({ success: 1, createdAt: -1 });

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);
export default LoginAttempt;
