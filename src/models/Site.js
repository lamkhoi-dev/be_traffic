const mongoose = require('mongoose')

const siteSchema = new mongoose.Schema({
  siteKey: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  url: String,
  searchKeyword: String,
  instruction: {
    type: String,
    default: 'Truy cập website và lấy mã xác nhận'
  },
  targetElement: {
    type: String,
    default: '#traffic-widget'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  totalCompleted: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// Index - siteKey already has unique:true which creates an index
siteSchema.index({ isActive: 1 })

module.exports = mongoose.model('Site', siteSchema)
