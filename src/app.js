require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const path = require('path')

// Import routes
const testRoutes = require('./routes/tests')
const sessionRoutes = require('./routes/sessions')
const taskRoutes = require('./routes/tasks')
const codeRoutes = require('./routes/codes')
const siteRoutes = require('./routes/sites')
const statsRoutes = require('./routes/stats')
const adminRoutes = require('./routes/admin')

const app = express()

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// CORS - Allow widget to be loaded from any domain
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use('/api/', limiter)

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files for widget
app.use('/static', express.static(path.join(__dirname, '../public')))

// Widget.js route with CORS headers
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.sendFile(path.join(__dirname, '../public/widget.js'))
})

// Widget-test.js route
app.get('/widget-test.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile(path.join(__dirname, '../public/widget-test.js'))
})

// API Routes
app.use('/api/tests', testRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/codes', codeRoutes)
app.use('/api/sites', siteRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iqtest'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB')
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err)
  })

// Start server
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 API: http://localhost:${PORT}/api`)
  console.log(`📦 Widget: http://localhost:${PORT}/widget.js`)
})

module.exports = app
