const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'image'],
    default: 'single_choice'
  },
  question: {
    type: String,
    required: true
  },
  image: String,
  options: [{
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    image: String
  }],
  correctAnswer: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 5
  },
  explanation: String
}, {
  timestamps: true
})

// Index for faster queries
questionSchema.index({ testId: 1, order: 1 })

module.exports = mongoose.model('Question', questionSchema)
