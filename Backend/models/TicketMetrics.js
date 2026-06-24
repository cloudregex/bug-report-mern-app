import mongoose from 'mongoose';

const ticketMetricsSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  ticketsCreated: {
    type: Number,
    default: 0
  },
  ticketsClosed: {
    type: Number,
    default: 0
  },
  avgResolutionTime: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

ticketMetricsSchema.index({ companyId: 1, date: 1 }, { unique: true });

const TicketMetrics = mongoose.model('TicketMetrics', ticketMetricsSchema);
export default TicketMetrics;
