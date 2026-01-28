const mongoose = require('mongoose')

const testSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['iq', 'eq'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 15 // minutes
  },
  questionCount: {
    type: Number,
    default: 20
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Test', testSchema)
