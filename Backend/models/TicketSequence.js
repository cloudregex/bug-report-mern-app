import mongoose from 'mongoose';

const ticketSequenceSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  currentNumber: {
    type: Number,
    default: 100 // Starts numbering at 101
  }
});

const TicketSequence = mongoose.model('TicketSequence', ticketSequenceSchema);
export default TicketSequence;
