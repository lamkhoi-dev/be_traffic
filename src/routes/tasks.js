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
    
    // Check if already has ANY pending task (regardless of site)
    const existingTask = await Task.findOne({
      fingerprint,
      status: { $in: ['pending', 'in_progress'] },
      expiresAt: { $gt: new Date() }
    }).populate('siteId')
    
    if (existingTask) {
      console.log('[Create Test Task] Existing task found:', existingTask._id, 'for site:', existingTask.siteId?.name)
      return res.json({
        success: true,
        message: 'You already have a pending task',
        task: {
          _id: existingTask._id,
          status: existingTask.status,
          siteKey: existingTask.siteId?.siteKey,
          siteName: existingTask.siteId?.name,
          siteUrl: existingTask.siteId?.url
        }
      })
    }
    
    // No existing task - find site and create new one
    const site = await Site.findOne({ siteKey, isActive: true })
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' })
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

// ============ ADMIN API ============

// Get all tasks with filters (for admin)
router.get('/admin/list', async (req, res) => {
  try {
    const { status, siteId, limit = 100, page = 1 } = req.query
    
    const filter = {}
    if (status && status !== 'all') {
      filter.status = status
    }
    if (siteId && siteId !== 'all') {
      filter.siteId = siteId
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('siteId', 'name siteKey url')
        .populate('sessionId', 'score totalQuestions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(filter)
    ])
    
    // Get stats
    const [pending, inProgress, completed, expired] = await Promise.all([
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({ status: 'in_progress' }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'expired' })
    ])
    
    res.json({
      success: true,
      tasks,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats: { pending, inProgress, completed, expired, total: pending + inProgress + completed + expired }
    })
  } catch (error) {
    console.error('[Admin Tasks] Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get real-time stats (lightweight endpoint for polling)
router.get('/admin/realtime-stats', async (req, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const [pending, inProgress, completed, expired, todayTotal, todayCompleted, recentTasks] = await Promise.all([
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({ status: 'in_progress' }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'expired' }),
      Task.countDocuments({ createdAt: { $gte: todayStart } }),
      Task.countDocuments({ status: 'completed', verifiedAt: { $gte: todayStart } }),
      Task.find()
        .populate('siteId', 'name siteKey')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean()
    ])
    
    res.json({
      success: true,
      stats: {
        pending,
        inProgress,
        completed,
        expired,
        total: pending + inProgress + completed + expired,
        todayTotal,
        todayCompleted
      },
      recentTasks,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Realtime Stats] Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete a task
router.delete('/admin/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id)
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' })
    }
    res.json({ success: true, message: 'Task deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Bulk delete tasks
router.post('/admin/bulk-delete', async (req, res) => {
  try {
    const { taskIds } = req.body
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ success: false, message: 'taskIds array required' })
    }
    
    const result = await Task.deleteMany({ _id: { $in: taskIds } })
    res.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Clear expired tasks
router.post('/admin/clear-expired', async (req, res) => {
  try {
    const result = await Task.deleteMany({ status: 'expired' })
    res.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
