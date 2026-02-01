const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  fingerprint: {
    type: String,
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    answer: String,
    timeSpent: Number // seconds
  }],
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 100
  },
  percentile: {
    type: Number,
    default: 50
  },
  analysis: {
    // For IQ/EQ tests
    level: String,
    description: String,
    strengths: [String],
    improvements: [String],
    // For MBTI tests
    mbtiType: String,
    result: mongoose.Schema.Types.Mixed, // Store full MBTI result object
    scores: mongoose.Schema.Types.Mixed, // { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    dimensionScores: mongoose.Schema.Types.Mixed, // { EI: {...}, SN: {...}, TF: {...}, JP: {...} }
    dimensions: mongoose.Schema.Types.Mixed // MBTI dimensions info
  },
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'completed'],
    default: 'in_progress'
  },
  unlocked: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: Date,
  completedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}, {
  timestamps: true
})

// Indexes
sessionSchema.index({ fingerprint: 1 })
sessionSchema.index({ status: 1 })
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('Session', sessionSchema)
