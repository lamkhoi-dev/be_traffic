const express = require('express')
const router = express.Router()
const Test = require('../models/Test')
const Question = require('../models/Question')

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

module.exports = router
