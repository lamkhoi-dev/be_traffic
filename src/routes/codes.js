const express = require('express')
const router = express.Router()
const Task = require('../models/Task')
const Session = require('../models/Session')
const Site = require('../models/Site')

// Verify code
router.post('/verify', async (req, res) => {
  try {
    const { sessionId, code, fingerprint } = req.body
    
    console.log('[Verify Code] code:', code, 'fingerprint:', fingerprint)
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã' })
    }
    
    if (!fingerprint) {
      return res.status(400).json({ success: false, message: 'Không xác định được thiết bị' })
    }
    
    // Tìm task của fingerprint này với code khớp và status = in_progress (đã đếm xong)
    let task = await Task.findOne({ 
      fingerprint, 
      code: code.toUpperCase(),
      status: 'in_progress'
    }).sort({ createdAt: -1 })
    
    console.log('[Verify Code] Task found with in_progress:', task?._id)
    
    // Nếu không tìm thấy in_progress, kiểm tra xem đã completed chưa
    if (!task) {
      const completedTask = await Task.findOne({
        fingerprint,
        code: code.toUpperCase(),
        status: 'completed'
      })
      
      if (completedTask) {
        console.log('[Verify Code] Task already completed:', completedTask._id)
        return res.json({ success: true, message: 'Mã đã được xác nhận trước đó', alreadyVerified: true })
      }
      
      // Kiểm tra có task pending không (chưa đếm xong)
      const pendingTask = await Task.findOne({
        fingerprint,
        code: code.toUpperCase(),
        status: 'pending'
      })
      
      if (pendingTask) {
        console.log('[Verify Code] Task still pending:', pendingTask._id)
        return res.status(400).json({ success: false, message: 'Bạn chưa hoàn thành đếm ngược trên trang đích' })
      }
      
      return res.status(404).json({ success: false, message: 'Mã không hợp lệ hoặc không phải của bạn' })
    }
    
    // DEMO123 is a bypass code for testing
    const isValidCode = code.toUpperCase() === 'DEMO123' || (task.code && task.code.toUpperCase() === code.toUpperCase())
    
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
    
    // Update session and get test type
    const session = await Session.findById(sessionId).populate('testId')
    if (session) {
      session.unlocked = true
      session.status = 'completed'
      session.completedAt = new Date()
      await session.save()
    }
    
    // Get test type for frontend redirect
    const testType = session?.testId?.type || 'iq'
    
    // Update site stats and decrement quota
    const site = await Site.findById(task.siteId)
    if (site) {
      site.totalCompleted += 1
      // Decrement remaining quota if site has limited quota
      if (site.quota > 0 && site.remainingQuota > 0) {
        site.remainingQuota -= 1
        console.log('[Verify Code] Decremented quota for site:', site.name, 'remaining:', site.remainingQuota)
      }
      await site.save()
    }
    
    res.json({
      success: true,
      message: 'Code verified successfully',
      testType
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
