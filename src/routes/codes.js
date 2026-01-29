const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const Session = require('../models/Session')
const Site = require('../models/Site')

// Verify code
router.post('/verify', async (req, res) => {
  try {
    const { sessionId, code, fingerprint } = req.body
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Missing code' })
    }
    
    // Find task by session OR fingerprint
    let task = null
    if (sessionId) {
      task = await Task.findOne({ sessionId })
    } else if (fingerprint) {
      // Find most recent task with this code and fingerprint
      task = await Task.findOne({ 
        fingerprint, 
        code: code.toUpperCase(),
        status: { $in: ['pending', 'visited'] }
      }).sort({ createdAt: -1 })
    }
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy task với mã này' })
    }
    
    // Verify code (DEMO123 is a bypass code for testing)
    const isValidCode = code.toUpperCase() === 'DEMO123' || task.code.toUpperCase() === code.toUpperCase()
    
    if (!isValidCode) {
      return res.json({
        success: false,
        message: 'Mã code không đúng!'
      })
    }
    
    // Update task
    task.status = 'completed'
    task.verifiedAt = new Date()
    await task.save()
    
    // Update session
    await Session.findByIdAndUpdate(sessionId, {
      unlocked: true,
      status: 'completed',
      completedAt: new Date()
    })
    
    // Update site stats
    await Site.findByIdAndUpdate(task.siteId, {
      $inc: { totalCompleted: 1 }
    })
    
    res.json({
      success: true,
      message: 'Code verified successfully'
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
