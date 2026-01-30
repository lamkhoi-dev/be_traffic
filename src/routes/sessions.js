const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
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
    
    // Validate testId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: 'Invalid testId format' })
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
    
    // Validate sessionId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid sessionId format' })
    }
    
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
    
    // Check if already has any pending/in_progress task for this fingerprint (any site)
    let existingTask = await Task.findOne({
      fingerprint,
      status: { $in: ['pending', 'in_progress'] },
      expiresAt: { $gt: new Date() }
    }).populate('siteId')
    
    let task
    let targetSite
    
    if (existingTask) {
      // Reuse existing task - update sessionId to current session
      console.log('[Submit Test] Reusing existing task:', existingTask._id, 'for site:', existingTask.siteId?.name)
      task = existingTask
      task.sessionId = session._id
      await task.save()
      targetSite = existingTask.siteId
    } else {
      // No pending task - create new one with weighted random site based on priority and quota
      // Only select sites that have remaining quota > 0 OR quota = 0 (unlimited)
      const sites = await Site.find({ 
        isActive: true,
        $or: [
          { quota: 0 },  // Unlimited quota
          { remainingQuota: { $gt: 0 } }  // Has remaining quota
        ]
      })
      
      if (sites.length === 0) {
        return res.status(500).json({ success: false, message: 'No active sites with available quota' })
      }
      
      // Weighted random selection based on priority
      const totalWeight = sites.reduce((sum, site) => sum + (site.priority || 1), 0)
      let random = Math.random() * totalWeight
      let randomSite = sites[0]
      
      for (const site of sites) {
        random -= (site.priority || 1)
        if (random <= 0) {
          randomSite = site
          break
        }
      }
      
      console.log('[Submit Test] Creating new task for site:', randomSite.name, 'priority:', randomSite.priority)
      
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
      targetSite = randomSite
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
    await Site.findByIdAndUpdate(targetSite._id, { $inc: { totalVisits: 1 } })
    
    res.json({
      success: true,
      taskId: task._id,
      targetSite: {
        name: targetSite.name,
        domain: targetSite.domain,
        url: targetSite.url,
        searchKeyword: targetSite.searchKeyword,
        instruction: targetSite.instruction
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
      step2Image: task.siteId?.step2Image || '',
      step3Image: task.siteId?.step3Image || '',
      status: task.status
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
