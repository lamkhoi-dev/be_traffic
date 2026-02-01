const mongoose = require('mongoose')

const testSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['iq', 'eq', 'grade10', 'grade11', 'grade12'],
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
  // New fields for school subjects
  subject: {
    type: String,
    enum: ['math', 'physics', 'chemistry', 'biology', 'literature', 'english', 'history', 'geography', null],
    default: null
  },
  grade: {
    type: Number,
    min: 1,
    max: 12,
    default: null
  },
  chapter: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Test', testSchema)
