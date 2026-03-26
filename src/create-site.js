// Script tạo site cho chouchouphuquoc.com.vn
require('dotenv').config()
const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iqtest'

const siteSchema = new mongoose.Schema({
  siteKey: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  domain: { type: String, required: true },
  url: String,
  searchKeyword: String,
  instruction: { type: String, default: 'Truy cập website và lấy mã xác nhận' },
  targetElement: { type: String, default: '#traffic-widget' },
  isActive: { type: Boolean, default: true },
  totalVisits: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 }
}, { timestamps: true })

const Site = mongoose.model('Site', siteSchema)

// Generate site key
function generateSiteKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = 'SITE_'
  for (let i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

async function createSite() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const siteKey = generateSiteKey()
    
    const site = new Site({
      siteKey: siteKey,
      name: 'Chou Chou Phu Quoc',
      domain: 'chouchouphuquoc.com.vn',
      url: 'https://chouchouphuquoc.com.vn/',
      searchKeyword: 'chou chou phu quoc',
      instruction: 'Truy cập website Chou Chou Phú Quốc và đợi lấy mã xác nhận',
      isActive: true
    })

    await site.save()
    
    console.log('\n✅ Site created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📌 Site Key: ${siteKey}`)
    console.log(`🌐 Domain: chouchouphuquoc.com.vn`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📋 Script để chèn vào WordPress:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    const serverUrl = process.env.SERVER_URL || 'https://api.your-domain.com'
    console.log(`<script src="${serverUrl}/widget.js?siteKey=${siteKey}"></script>`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

createSite()
