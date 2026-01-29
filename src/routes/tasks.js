const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const Site = require('../models/Site')
const { generateCode } = require('../utils/helpers')

// Check if user has a valid task for this site (called by widget) - POST version
router.post('/check', async (req, res) => {
  try {
    const { fingerprint, siteKey } = req.body
    
    console.log('[Task Check] fingerprint:', fingerprint, 'siteKey:', siteKey)
    
    if (!fingerprint || !siteKey) {
      return res.status(400).json({ success: false, message: 'Missing parameters' })
    }
    
    // Find site by key
    const site = await Site.findOne({ siteKey, isActive: true })
    if (!site) {
      console.log('[Task Check] Site not found:', siteKey)
      return res.json({ 
        success: false,
        hasTask: false,
        message: 'Site not found or inactive' 
      })
    }
    
    console.log('[Task Check] Site found:', site._id, site.name)
    
    // Find valid task - tìm theo fingerprint và siteKey (qua siteId)
    let task = await Task.findOne({
      fingerprint,
      siteId: site._id,
      status: { $in: ['pending', 'in_progress'] },
      expiresAt: { $gt: new Date() }
    })
    
    // Nếu không tìm thấy, thử tìm task pending/in_progress bất kỳ của fingerprint này
    // (trường hợp siteId cũ sau khi seed)
    if (!task) {
      console.log('[Task Check] No task found with siteId, trying without siteId filter...')
      task = await Task.findOne({
        fingerprint,
        status: { $in: ['pending', 'in_progress'] },
        expiresAt: { $gt: new Date() }
      })
      
      if (task) {
        console.log('[Task Check] Found task with different siteId:', task._id, 'task.siteId:', task.siteId)
        // Cập nhật siteId cho đúng
        task.siteId = site._id
        await task.save()
        console.log('[Task Check] Updated task siteId to:', site._id)
      }
    }
    
    if (!task) {
      console.log('[Task Check] No pending task found for fingerprint:', fingerprint)
      return res.json({
        success: false,
        hasTask: false,
        message: 'No pending task for this device'
      })
    }
    
    console.log('[Task Check] Task found:', task._id, 'status:', task.status)
    
    res.json({
      success: true,
      hasTask: true,
      task: {
        _id: task._id,
        status: task.status,
        code: task.code || null
      }
    })
  } catch (error) {
    console.error('[Task Check] Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET version for backward compatibility
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

// Generate code after countdown (widget calls this after 60 seconds)
router.post('/:taskId/generate-code', async (req, res) => {
  try {
    const { taskId } = req.params
    const { fingerprint } = req.body
    
    console.log('[Generate Code] taskId:', taskId, 'fingerprint:', fingerprint)
    
    const task = await Task.findOne({
      _id: taskId,
      fingerprint,
      status: { $in: ['pending', 'in_progress'] }
    })
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' })
    }
    
    // Generate code if not exists
    if (!task.code) {
      task.code = generateCode()
    }
    
    task.status = 'in_progress'
    task.codeGeneratedAt = new Date()
    await task.save()
    
    console.log('[Generate Code] Code generated:', task.code)
    
    res.json({
      success: true,
      code: task.code
    })
  } catch (error) {
    console.error('[Generate Code] Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create task for testing (called from test page)
router.post('/create-test', async (req, res) => {
  try {
    const { fingerprint, siteKey } = req.body
    
    console.log('[Create Test Task] fingerprint:', fingerprint, 'siteKey:', siteKey)
    
    if (!fingerprint || !siteKey) {
      return res.status(400).json({ success: false, message: 'Missing fingerprint or siteKey' })
    }
    
    // Find site
    const site = await Site.findOne({ siteKey, isActive: true })
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' })
    }
    
    // Check if already has pending task
    const existingTask = await Task.findOne({
      fingerprint,
      siteId: site._id,
      status: { $in: ['pending', 'in_progress'] },
      expiresAt: { $gt: new Date() }
    })
    
    if (existingTask) {
      console.log('[Create Test Task] Existing task found:', existingTask._id)
      return res.json({
        success: true,
        message: 'You already have a pending task',
        task: {
          _id: existingTask._id,
          status: existingTask.status,
          siteKey: siteKey,
          siteName: site.name,
          siteUrl: site.url
        }
      })
    }
    
    // Create a dummy session ID for testing (required by Task model)
    const mongoose = require('mongoose')
    const dummySessionId = new mongoose.Types.ObjectId()
    
    // Create new task with code
    const task = new Task({
      sessionId: dummySessionId, // Dummy session for testing
      fingerprint,
      siteId: site._id,
      code: generateCode(), // Generate code immediately
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    })
    
    await task.save()
    
    console.log('[Create Test Task] New task created:', task._id, 'code:', task.code)
    
    res.json({
      success: true,
      message: 'Task created successfully',
      task: {
        _id: task._id,
        status: task.status,
        siteKey: siteKey,
        siteName: site.name,
        siteUrl: site.url
      }
    })
  } catch (error) {
    console.error('[Create Test Task] Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
