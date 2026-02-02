const mongoose = require('mongoose')

const sectionSchema = new mongoose.Schema({
  icon: { type: String, default: 'check' },
  title: { type: String, required: true },
  content: { type: String, required: true }
}, { _id: false })

const pageContentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  lastUpdated: { type: String, default: () => new Date().toLocaleDateString('vi-VN') },
  sections: [sectionSchema]
}, { _id: false })

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: ['terms', 'privacy', 'contact', 'about']
  },
  content: {
    type: pageContentSchema,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
})

// Index for quick lookup
settingsSchema.index({ key: 1 })

module.exports = mongoose.model('Settings', settingsSchema)
