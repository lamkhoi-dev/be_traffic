const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true
  },
  fingerprint: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'expired'],
    default: 'pending'
  },
  codeGeneratedAt: Date,
  codeRevealedAt: Date,
  verifiedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  }
}, {
  timestamps: true
})

// Indexes
taskSchema.index({ fingerprint: 1, siteId: 1 })
taskSchema.index({ sessionId: 1 })
taskSchema.index({ code: 1 })
taskSchema.index({ status: 1 })
taskSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('Task', taskSchema)
