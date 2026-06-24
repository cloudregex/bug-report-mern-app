import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['PROJECT_ADMIN', 'DEVELOPER', 'TESTER', 'VIEWER'],
    default: 'DEVELOPER'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);
export default ProjectMember;
