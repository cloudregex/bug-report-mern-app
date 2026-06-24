import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenId: {
    type: String,
    required: true,
    unique: true
  },
  device: {
    type: String,
    default: 'Unknown Device'
  },
  ipAddress: {
    type: String,
    default: null
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ tokenId: 1 });

const UserSession = mongoose.model('UserSession', userSessionSchema);
export default UserSession;
