const express = require('express')
const router = express.Router()
const Test = require('../models/Test')
const Question = require('../models/Question')

// Get all tests
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find({ isActive: true })
    res.json(tests)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get tests by type (iq or eq)
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params
    if (!['iq', 'eq'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid test type' })
    }
    
    const tests = await Test.find({ type, isActive: true })
    res.json(tests)
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
    
    const questions = await Question.find({ testId: req.params.id })
      .sort({ order: 1 })
      .select('-correctAnswer -explanation') // Hide answers
    
    res.json({ test, questions })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create test (admin)
router.post('/', async (req, res) => {
  try {
    const test = new Test(req.body)
    await test.save()
    res.status(201).json(test)
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
    res.json(test)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete test (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id)
    await Question.deleteMany({ testId: req.params.id })
    res.json({ success: true, message: 'Test deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
