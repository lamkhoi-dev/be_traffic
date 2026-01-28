const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const Session = require('../models/Session')
const Site = require('../models/Site')

// Verify code
router.post('/verify', async (req, res) => {
  try {
    const { sessionId, code, fingerprint } = req.body
    
    if (!sessionId || !code) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }
    
    // Find task by session
    const task = await Task.findOne({ sessionId })
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' })
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
