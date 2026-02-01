const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Test = require('../models/Test')
const Question = require('../models/Question')
const Session = require('../models/Session')
const Task = require('../models/Task')
const Site = require('../models/Site')
const { generateCode } = require('../utils/helpers')

// Subject mapping
const SUBJECT_MAP = {
  math: 'math',
  physics: 'physics',
  english: 'english',
  history: 'history',
  toan: 'math',
  ly: 'physics',
  anh: 'english',
  su: 'history'
}

// Get all tests (public - only active)
router.get('/', async (req, res) => {
  try {
    // Check if admin request (include inactive tests)
    const includeInactive = req.query.all === 'true'
    const query = includeInactive ? {} : { isActive: true }
    
    const tests = await Test.find(query).sort({ createdAt: -1 })
    res.json({ success: true, tests })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get tests by type (iq or eq)
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params
    if (!['iq', 'eq'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid test type' })
    }
    
    const tests = await Test.find({ type, isActive: true })
    res.json({ success: true, tests })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get tests by grade and subject (NEW)
router.get('/grade/:grade/subject/:subject', async (req, res) => {
  try {
    const grade = parseInt(req.params.grade)
    const subjectInput = req.params.subject
    const subject = SUBJECT_MAP[subjectInput] || subjectInput
    
    if (grade < 1 || grade > 12) {
      return res.status(400).json({ success: false, message: 'Invalid grade (1-12)' })
    }
    
    if (!['math', 'physics', 'english', 'history'].includes(subject)) {
      return res.status(400).json({ success: false, message: 'Invalid subject' })
    }
    
    // For grades 7-9, map to source grades 10-12
    let sourceGrade = grade
    if (grade === 7) sourceGrade = 10
    else if (grade === 8) sourceGrade = 11
    else if (grade === 9) sourceGrade = 12
    
    const gradeType = `grade${sourceGrade}`
    
    const tests = await Test.find({ 
      type: gradeType, 
      subject: subject,
      isActive: true 
    }).sort({ name: 1 })
    
    res.json({ success: true, tests, sourceGrade, requestedGrade: grade })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get tests by grade type (grade10, grade11, grade12)
router.get('/grade-type/:gradeType', async (req, res) => {
  try {
    const { gradeType } = req.params
    if (!['grade10', 'grade11', 'grade12'].includes(gradeType)) {
      return res.status(400).json({ success: false, message: 'Invalid grade type' })
    }
    
    const tests = await Test.find({ type: gradeType, isActive: true })
    res.json({ success: true, tests })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get assessment test with mixed questions from all subjects and grades
router.get('/assessment/:assessmentId', async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId)
    
    if (assessmentId < 1 || assessmentId > 50) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID (1-50)' })
    }
    
    // Use assessmentId as seed for consistent random selection
    const seed = assessmentId
    
    // Get all questions from grade10, grade11, grade12 tests
    const gradeTypes = ['grade10', 'grade11', 'grade12']
    const subjects = ['math', 'physics', 'english', 'history']
    
    // Get all tests from these grade types
    const tests = await Test.find({ 
      type: { $in: gradeTypes },
      isActive: true 
    })
    
    const testIds = tests.map(t => t._id)
    
    // Get all questions from these tests
    const allQuestions = await Question.find({ 
      testId: { $in: testIds }
    })
    
    if (allQuestions.length < 30) {
      return res.status(400).json({ 
        success: false, 
        message: `Không đủ câu hỏi. Hiện có ${allQuestions.length} câu, cần ít nhất 30 câu.`
      })
    }
    
    // Seeded random function for consistent results
    const seededRandom = (s) => {
      const x = Math.sin(s++) * 10000
      return x - Math.floor(x)
    }
    
    // Shuffle array with seed
    const shuffleWithSeed = (array, s) => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(s + i) * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    
    // Create a test-to-info map
    const testInfoMap = {}
    tests.forEach(t => {
      testInfoMap[t._id.toString()] = {
        subject: t.subject,
        grade: t.type.replace('grade', '')
      }
    })
    
    // Add subject and grade info to questions
    const questionsWithInfo = allQuestions.map(q => {
      const testInfo = testInfoMap[q.testId.toString()] || {}
      return {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        subject: testInfo.subject,
        grade: testInfo.grade
      }
    })
    
    // Shuffle and pick 30 questions
    const shuffled = shuffleWithSeed(questionsWithInfo, seed)
    const selectedQuestions = shuffled.slice(0, 30)
    
    res.json({ 
      success: true, 
      assessmentId,
      questions: selectedQuestions,
      totalQuestions: 30,
      duration: 45
    })
  } catch (error) {
    console.error('Assessment error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get single test by ID
router.get('/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' })
    }
    res.json({ success: true, test })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get test with questions
router.get('/:id/questions', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' })
    }
    
    // Check if admin request (include answers)
    const includeAnswers = req.query.admin === 'true'
    
    const questions = await Question.find({ testId: req.params.id })
      .sort({ order: 1 })
      .select(includeAnswers ? '' : '-correctAnswer -explanation')
    
    res.json({ success: true, test, questions })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create test (admin)
router.post('/', async (req, res) => {
  try {
    const { type, name, description, duration, questionCount, difficulty, isActive } = req.body
    
    if (!type || !name || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields: type, name, description' })
    }
    
    const test = new Test({
      type,
      name,
      description,
      duration: duration || 15,
      questionCount: questionCount || 20,
      difficulty: difficulty || 'medium',
      isActive: isActive !== undefined ? isActive : true
    })
    
    await test.save()
    res.status(201).json({ success: true, test })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Update test (admin)
router.put('/:id', async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' })
    }
    res.json({ success: true, test })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Toggle test active status
router.post('/:id/toggle-active', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' })
    }
    
    test.isActive = !test.isActive
    await test.save()
    
    res.json({ success: true, test, message: `Test ${test.isActive ? 'activated' : 'deactivated'}` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete test (admin)
router.delete('/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' })
    }
    
    // Delete all questions for this test
    await Question.deleteMany({ testId: req.params.id })
    await Test.findByIdAndDelete(req.params.id)
    
    res.json({ success: true, message: 'Test and all its questions deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ========== MBTI TEST ==========
const fs = require('fs')
const path = require('path')

// Get MBTI test with random 30 questions
router.get('/mbti/start', async (req, res) => {
  try {
    // Load MBTI data - __dirname is /app/src/routes, so go up 2 levels to /app/public
    const mbtiPath = path.join(__dirname, '../../public/data/mbti.json')
    const mbtiData = JSON.parse(fs.readFileSync(mbtiPath, 'utf8'))
    
    // Seeded random for consistent shuffling per session
    const seed = Date.now()
    const seededRandom = (s) => {
      const x = Math.sin(s++) * 10000
      return x - Math.floor(x)
    }
    
    // Group questions by dimension
    const questionsByDimension = {
      EI: mbtiData.questions.filter(q => q.dimension === 'EI'),
      SN: mbtiData.questions.filter(q => q.dimension === 'SN'),
      TF: mbtiData.questions.filter(q => q.dimension === 'TF'),
      JP: mbtiData.questions.filter(q => q.dimension === 'JP')
    }
    
    // Select random questions from each dimension (7-8 per dimension = 30 total)
    const selectedQuestions = []
    const questionsPerDimension = { EI: 8, SN: 8, TF: 7, JP: 7 } // 8+8+7+7 = 30
    
    Object.keys(questionsPerDimension).forEach((dim, dimIdx) => {
      const dimQuestions = [...questionsByDimension[dim]]
      // Shuffle
      for (let i = dimQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + dimIdx * 100 + i) * (i + 1))
        ;[dimQuestions[i], dimQuestions[j]] = [dimQuestions[j], dimQuestions[i]]
      }
      // Take required number
      selectedQuestions.push(...dimQuestions.slice(0, questionsPerDimension[dim]))
    })
    
    // Shuffle all selected questions
    for (let i = selectedQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + 1000 + i) * (i + 1))
      ;[selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]]
    }
    
    res.json({
      success: true,
      test: {
        name: mbtiData.name,
        description: mbtiData.description,
        duration: mbtiData.duration,
        questionCount: 30
      },
      questions: selectedQuestions.map((q, idx) => ({
        id: q.id,
        index: idx + 1,
        dimension: q.dimension,
        question: q.question,
        options: q.options
      })),
      dimensions: mbtiData.dimensions
    })
  } catch (error) {
    console.error('MBTI start error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Submit MBTI test - creates session and task, returns taskId
router.post('/mbti/submit', async (req, res) => {
  try {
    const { answers, fingerprint } = req.body // { questionId: 'A' or 'B', ... }
    
    if (!answers || Object.keys(answers).length < 20) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cần trả lời ít nhất 20 câu hỏi để có kết quả chính xác' 
      })
    }

    if (!fingerprint) {
      return res.status(400).json({ success: false, message: 'Missing fingerprint' })
    }
    
    // Load MBTI data
    const mbtiPath = path.join(__dirname, '../../public/data/mbti.json')
    const mbtiData = JSON.parse(fs.readFileSync(mbtiPath, 'utf8'))
    
    // Create question map
    const questionMap = {}
    mbtiData.questions.forEach(q => {
      questionMap[q.id] = q
    })
    
    // Calculate scores
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
    
    Object.entries(answers).forEach(([qId, answerId]) => {
      const question = questionMap[parseInt(qId)]
      if (question) {
        const selectedOption = question.options.find(o => o.id === answerId)
        if (selectedOption && selectedOption.value) {
          scores[selectedOption.value]++
        }
      }
    })
    
    // Determine type
    const mbtiType = 
      (scores.E >= scores.I ? 'E' : 'I') +
      (scores.S >= scores.N ? 'S' : 'N') +
      (scores.T >= scores.F ? 'T' : 'F') +
      (scores.J >= scores.P ? 'J' : 'P')
    
    // Get result details
    const result = mbtiData.results[mbtiType]
    
    // Calculate percentages for each dimension
    const dimensionScores = {
      EI: { 
        E: scores.E, I: scores.I, 
        total: scores.E + scores.I,
        dominant: scores.E >= scores.I ? 'E' : 'I',
        percentage: scores.E + scores.I > 0 ? Math.round((Math.max(scores.E, scores.I) / (scores.E + scores.I)) * 100) : 50
      },
      SN: { 
        S: scores.S, N: scores.N, 
        total: scores.S + scores.N,
        dominant: scores.S >= scores.N ? 'S' : 'N',
        percentage: scores.S + scores.N > 0 ? Math.round((Math.max(scores.S, scores.N) / (scores.S + scores.N)) * 100) : 50
      },
      TF: { 
        T: scores.T, F: scores.F, 
        total: scores.T + scores.F,
        dominant: scores.T >= scores.F ? 'T' : 'F',
        percentage: scores.T + scores.F > 0 ? Math.round((Math.max(scores.T, scores.F) / (scores.T + scores.F)) * 100) : 50
      },
      JP: { 
        J: scores.J, P: scores.P, 
        total: scores.J + scores.P,
        dominant: scores.J >= scores.P ? 'J' : 'P',
        percentage: scores.J + scores.P > 0 ? Math.round((Math.max(scores.J, scores.P) / (scores.J + scores.P)) * 100) : 50
      }
    }

    // Find or create MBTI test in database
    let mbtiTest = await Test.findOne({ type: 'mbti' })
    if (!mbtiTest) {
      mbtiTest = new Test({
        name: mbtiData.name,
        type: 'mbti',
        duration: mbtiData.duration,
        questionCount: 30
      })
      await mbtiTest.save()
    }

    // Create session to store MBTI result
    const session = new Session({
      testId: mbtiTest._id,
      fingerprint,
      status: 'submitted',
      score: 0, // MBTI doesn't have score
      maxScore: 0,
      percentile: 0,
      analysis: {
        mbtiType,
        result: result,
        scores,
        dimensionScores,
        dimensions: mbtiData.dimensions
      },
      startedAt: new Date(),
      submittedAt: new Date()
    })
    await session.save()

    // Check if already has pending task for this fingerprint
    let existingTask = await Task.findOne({
      fingerprint,
      status: { $in: ['pending', 'in_progress'] },
      expiresAt: { $gt: new Date() }
    }).populate('siteId')

    let task
    let targetSite

    if (existingTask) {
      task = existingTask
      task.sessionId = session._id
      await task.save()
      targetSite = existingTask.siteId
    } else {
      // Create new task with weighted random site
      const sites = await Site.find({ 
        isActive: true,
        $or: [{ quota: 0 }, { remainingQuota: { $gt: 0 } }]
      })
      
      if (sites.length === 0) {
        return res.status(500).json({ success: false, message: 'No active sites available' })
      }
      
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
    }

    // Update site stats
    await Site.findByIdAndUpdate(targetSite._id, { $inc: { totalVisits: 1 } })

    res.json({
      success: true,
      sessionId: session._id,
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
    console.error('MBTI submit error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get MBTI result (only if session unlocked)
router.get('/mbti/result/:sessionId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).populate('testId')
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' })
    }

    // Check if test is MBTI
    if (session.testId?.type !== 'mbti') {
      return res.status(400).json({ success: false, message: 'Invalid session type' })
    }

    // Check if unlocked
    if (!session.unlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Vui lòng hoàn thành nhiệm vụ để xem kết quả!',
        requireTask: true
      })
    }

    // Return stored MBTI result
    const analysis = session.analysis || {}
    
    res.json({
      success: true,
      type: analysis.mbtiType,
      result: {
        ...analysis.result,
        type: analysis.mbtiType
      },
      scores: analysis.scores,
      dimensionScores: analysis.dimensionScores,
      dimensions: analysis.dimensions,
      answeredCount: 30
    })
  } catch (error) {
    console.error('MBTI result error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// OLD: Calculate MBTI result directly (kept for backward compatibility but now redirects)
router.post('/mbti/result', async (req, res) => {
  // Now requires going through submit flow
  return res.status(400).json({
    success: false,
    message: 'Please use /mbti/submit endpoint instead'
  })
})

module.exports = router
