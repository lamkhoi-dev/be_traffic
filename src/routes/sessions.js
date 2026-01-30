const express = require('express')
const router = express.Router()
const Session = require('../models/Session')
const Task = require('../models/Task')
const Site = require('../models/Site')
const Question = require('../models/Question')
const { generateCode, calculateScore, generateAnalysis } = require('../utils/helpers')

// Start a new session
router.post('/start', async (req, res) => {
  try {
    const { testId, fingerprint } = req.body
    
    if (!testId || !fingerprint) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }
    
    const session = new Session({
      testId,
      fingerprint,
      startedAt: new Date()
    })
    
    await session.save()
    
    res.json({
      success: true,
      sessionId: session._id
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Submit test answers
router.post('/submit', async (req, res) => {
  try {
    const { sessionId, answers, fingerprint } = req.body
    
    const session = await Session.findById(sessionId)
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' })
    }
    
    if (session.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Session already submitted' })
    }
    
    // Calculate score
    const questions = await Question.find({ testId: session.testId })
    const { score, maxScore, correctCount } = calculateScore(answers, questions)
    
    // Generate analysis
    const analysis = generateAnalysis(score, maxScore, session.testId)
    
    // Get random active site for task
    const sites = await Site.find({ isActive: true })
    if (sites.length === 0) {
      return res.status(500).json({ success: false, message: 'No active sites available' })
    }
    const randomSite = sites[Math.floor(Math.random() * sites.length)]
    
    // Check if already has pending task for this fingerprint (đồng bộ với trang test)
    const existingTask = await Task.findOne({
      fingerprint,
      siteId: randomSite._id,
      status: { $in: ['pending', 'in_progress'] },
      expiresAt: { $gt: new Date() }
    })
    
    let task
    if (existingTask) {
      console.log('[Submit Test] Reusing existing task:', existingTask._id)
      task = existingTask
      // Update sessionId to current session
      task.sessionId = session._id
      await task.save()
    } else {
      // Create new task
      const code = generateCode()
      task = new Task({
        sessionId: session._id,
        siteId: randomSite._id,
        fingerprint,
        code,
        status: 'pending'
      })
      await task.save()
      console.log('[Submit Test] Created new task:', task._id)
    }
    
    // Update session
    session.answers = answers
    session.score = score
    session.maxScore = maxScore
    session.percentile = Math.min(99, Math.max(1, Math.round((score / maxScore) * 100)))
    session.analysis = analysis
    session.status = 'submitted'
    session.submittedAt = new Date()
    await session.save()
    
    // Update site stats
    await Site.findByIdAndUpdate(randomSite._id, { $inc: { totalVisits: 1 } })
    
    res.json({
      success: true,
      taskId: task._id,
      targetSite: {
        name: randomSite.name,
        domain: randomSite.domain,
        url: randomSite.url,
        searchKeyword: randomSite.searchKeyword,
        instruction: randomSite.instruction
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get session info (only if unlocked)
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('testId')
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' })
    }
    
    // Always return result for demo purposes
    // In production, check: if (!session.unlocked)
    
    res.json({
      type: session.testId?.type || 'iq',
      testName: session.testId?.name || 'IQ Test',
      score: session.score,
      maxScore: session.maxScore,
      percentile: session.percentile,
      correctAnswers: session.answers?.filter((a, i) => a.answer === 'correct').length || Math.round(session.score / 5),
      totalQuestions: session.testId?.questionCount || 20,
      timeSpent: '12:34',
      analysis: session.analysis || {
        level: 'Trên trung bình',
        description: 'Bạn có khả năng tư duy tốt',
        strengths: ['Suy luận logic', 'Nhận diện quy luật'],
        improvements: ['Cần cải thiện tốc độ']
      },
      comparison: {
        average: 100,
        yourRank: `Top ${100 - session.percentile}%`
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get task info for session
router.get('/:id/task', async (req, res) => {
  try {
    const task = await Task.findOne({ sessionId: req.params.id }).populate('siteId')
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' })
    }
    
    res.json({
      taskId: task._id,
      siteName: task.siteId?.name || 'Target Website',
      siteUrl: task.siteId?.url || 'https://example.com',
      searchKeyword: task.siteId?.searchKeyword || 'example keyword',
      instruction: task.siteId?.instruction || 'Truy cập website và lấy mã xác nhận',
      status: task.status
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
