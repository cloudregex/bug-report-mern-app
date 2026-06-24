import mongoose from 'mongoose';

const mentionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  // The specific comment that contains the @mention
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: true
  },
  // The user who was mentioned (@username resolved to _id)
  mentionedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The user who wrote the comment containing the @mention
  mentionedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for "My Mentions" query (GET /mentions)
mentionSchema.index({ mentionedUserId: 1, createdAt: -1 });

// Index for "Ticket Mentions" query (GET /tickets/:id/mentions)
mentionSchema.index({ ticketId: 1, createdAt: -1 });

const Mention = mongoose.model('Mention', mentionSchema);
export default Mention;
