const express = require('express')
const router = express.Router()
const Question = require('../models/Question')
const Test = require('../models/Test')

// Get all questions for a test (admin)
router.get('/test/:testId', async (req, res) => {
  try {
    const questions = await Question.find({ testId: req.params.testId })
      .sort({ order: 1 })
    
    res.json({ success: true, questions })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get single question by ID
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' })
    }
    res.json({ success: true, question })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create question
router.post('/', async (req, res) => {
  try {
    const { testId, question, options, correctAnswer, type, image, points, explanation } = req.body
    
    if (!testId || !question || !options || !correctAnswer) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: testId, question, options, correctAnswer' 
      })
    }
    
    // Check if test exists
    const test = await Test.findById(testId)
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' })
    }
    
    // Get next order number
    const lastQuestion = await Question.findOne({ testId }).sort({ order: -1 })
    const order = lastQuestion ? lastQuestion.order + 1 : 1
    
    const newQuestion = new Question({
      testId,
      order,
      type: type || 'single_choice',
      question,
      image,
      options,
      correctAnswer,
      points: points || 5,
      explanation
    })
    
    await newQuestion.save()
    
    // Update test question count
    const questionCount = await Question.countDocuments({ testId })
    await Test.findByIdAndUpdate(testId, { questionCount })
    
    res.status(201).json({ success: true, question: newQuestion })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Bulk create questions
router.post('/bulk', async (req, res) => {
  try {
    const { testId, questions } = req.body
    
    if (!testId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: testId, questions (array)' 
      })
    }
    
    // Check if test exists
    const test = await Test.findById(testId)
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' })
    }
    
    // Get starting order number
    const lastQuestion = await Question.findOne({ testId }).sort({ order: -1 })
    let order = lastQuestion ? lastQuestion.order + 1 : 1
    
    // Prepare questions with order
    const questionsToInsert = questions.map(q => ({
      testId,
      order: order++,
      type: q.type || 'single_choice',
      question: q.question,
      image: q.image,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points || 5,
      explanation: q.explanation
    }))
    
    const insertedQuestions = await Question.insertMany(questionsToInsert)
    
    // Update test question count
    const questionCount = await Question.countDocuments({ testId })
    await Test.findByIdAndUpdate(testId, { questionCount })
    
    res.status(201).json({ 
      success: true, 
      questions: insertedQuestions,
      message: `${insertedQuestions.length} questions created`
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Update question
router.put('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    )
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' })
    }
    
    res.json({ success: true, question })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Reorder questions
router.post('/reorder', async (req, res) => {
  try {
    const { testId, questionOrders } = req.body
    
    if (!testId || !questionOrders || !Array.isArray(questionOrders)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: testId, questionOrders (array of {id, order})' 
      })
    }
    
    // Update each question's order
    const updatePromises = questionOrders.map(({ id, order }) => 
      Question.findByIdAndUpdate(id, { order })
    )
    
    await Promise.all(updatePromises)
    
    res.json({ success: true, message: 'Questions reordered' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' })
    }
    
    const testId = question.testId
    await Question.findByIdAndDelete(req.params.id)
    
    // Update test question count
    const questionCount = await Question.countDocuments({ testId })
    await Test.findByIdAndUpdate(testId, { questionCount })
    
    res.json({ success: true, message: 'Question deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete all questions for a test
router.delete('/test/:testId', async (req, res) => {
  try {
    const result = await Question.deleteMany({ testId: req.params.testId })
    
    // Update test question count
    await Test.findByIdAndUpdate(req.params.testId, { questionCount: 0 })
    
    res.json({ 
      success: true, 
      message: `${result.deletedCount} questions deleted` 
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
