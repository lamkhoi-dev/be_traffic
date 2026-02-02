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
  // Instruction images - ảnh minh hoạ cho các bước hướng dẫn
  step2Image: {
    type: String,
    default: ''  // URL ảnh cho bước 2 - Truy cập website
  },
  step3Image: {
    type: String,
    default: ''  // URL ảnh cho bước 3 - Lấy mã xác nhận
  },
  targetElement: {
    type: String,
    default: '#traffic-widget'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Quota management - số lượng traffic cần chạy
  quota: {
    type: Number,
    default: 0  // 0 = unlimited
  },
  remainingQuota: {
    type: Number,
    default: 0
  },
  // Priority - tỉ lệ phân bổ traffic (weight-based)
  priority: {
    type: Number,
    default: 1,  // 1 = normal priority
    min: 0,
    max: 100
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  totalCompleted: {
    type: Number,
    default: 0
  },
  // Custom step configuration for task page
  taskSteps: {
    step1: {
      label: { type: String, default: '1' },
      title: { type: String, default: 'Tìm kiếm trên Google' },
      description: { type: String, default: 'Mở Google và tìm kiếm từ khóa:' }
    },
    step2: {
      label: { type: String, default: '2' },
      title: { type: String, default: 'Truy cập website' },
      description: { type: String, default: 'Tìm và click vào kết quả' }
    },
    step3: {
      label: { type: String, default: '3' },
      title: { type: String, default: 'Lấy mã xác nhận' },
      description: { type: String, default: 'Cuộn xuống footer, bấm vào chữ "Mã Code" và đợi 60 giây để nhận mã xác nhận' }
    },
    step4: {
      label: { type: String, default: '4' },
      title: { type: String, default: 'Nhập mã bên dưới' },
      description: { type: String, default: 'Copy mã và dán vào ô bên dưới để xem kết quả' }
    }
  }
}, {
  timestamps: true
})

// Index - siteKey already has unique:true which creates an index
siteSchema.index({ isActive: 1 })

module.exports = mongoose.model('Site', siteSchema)
