const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const Site = require('../models/Site')

// Check if user has a valid task for this site (called by widget)
router.get('/check', async (req, res) => {
  try {
    const { fingerprint, siteKey } = req.query
    
    if (!fingerprint || !siteKey) {
      return res.status(400).json({ success: false, message: 'Missing parameters' })
    }
    
    // Find site by key
    const site = await Site.findOne({ siteKey, isActive: true })
    if (!site) {
      return res.json({ 
        success: false, 
        message: 'Site not found or inactive' 
      })
    }
    
    // Find valid task
    const task = await Task.findOne({
      fingerprint,
      siteId: site._id,
      status: { $in: ['pending', 'in_progress'] },
      expiresAt: { $gt: new Date() }
    })
    
    if (!task) {
      return res.json({
        success: false,
        hasTask: false,
        message: 'Bạn chưa tạo bất kỳ nhiệm vụ nào trên thiết bị này. Vui lòng sử dụng đúng thiết bị đã tạo nhiệm vụ hoặc tạo lại một nhiệm vụ mới.'
      })
    }
    
    res.json({
      success: true,
      hasTask: true,
      taskId: task._id,
      status: task.status
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Start countdown (user clicked the button on widget)
router.post('/start-countdown', async (req, res) => {
  try {
    const { taskId, fingerprint } = req.body
    
    const task = await Task.findOne({
      _id: taskId,
      fingerprint,
      status: { $in: ['pending', 'in_progress'] }
    })
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' })
    }
    
    task.status = 'in_progress'
    task.codeGeneratedAt = new Date()
    await task.save()
    
    res.json({
      success: true,
      countdownSeconds: 60
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get code after countdown (widget fetches this after 60 seconds)
router.get('/:taskId/code', async (req, res) => {
  try {
    const { taskId } = req.params
    const { fingerprint } = req.query
    
    const task = await Task.findOne({
      _id: taskId,
      fingerprint,
      status: 'in_progress'
    })
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' })
    }
    
    // Check if 60 seconds have passed
    const elapsed = Date.now() - new Date(task.codeGeneratedAt).getTime()
    if (elapsed < 60000) { // 60 seconds
      const remaining = Math.ceil((60000 - elapsed) / 1000)
      return res.json({
        success: false,
        message: `Please wait ${remaining} more seconds`,
        remainingSeconds: remaining
      })
    }
    
    task.codeRevealedAt = new Date()
    await task.save()
    
    res.json({
      success: true,
      code: task.code
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
