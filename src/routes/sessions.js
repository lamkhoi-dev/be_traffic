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
    
    if (existingTask && existingTask.siteId) {
      // Reuse existing task - update sessionId to current session
      console.log('[Submit Test] Reusing existing task:', existingTask._id, 'for site:', existingTask.siteId?.name)
      task = existingTask
      task.sessionId = session._id
      await task.save()
      targetSite = existingTask.siteId
    } else {
      // If existingTask has no valid siteId, delete it and create new one
      if (existingTask) {
        console.log('[Submit Test] Existing task has invalid siteId, deleting:', existingTask._id)
        await Task.findByIdAndDelete(existingTask._id)
      }
      
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
    
    // Check if session is unlocked (task completed)
    if (!session.unlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Vui lòng hoàn thành nhiệm vụ để xem kết quả!',
        requireTask: true
      })
    }
    
    // Get all questions for this test to show detailed results
    // After populate, session.testId is an object, need to use _id for query
    const testIdForQuery = session.testId?._id || session.testId
    const questions = await Question.find({ testId: testIdForQuery }).sort({ order: 1 })
    
    // Debug: Log session answers structure
    console.log('[Get Session] TestId for query:', testIdForQuery?.toString())
    console.log('[Get Session] Questions found:', questions.length)
    console.log('[Get Session] Session answers count:', session.answers?.length)
    console.log('[Get Session] Sample answer:', JSON.stringify(session.answers?.[0], null, 2))
    console.log('[Get Session] Sample question ID:', questions[0]?._id?.toString())
    
    // Build detailed question results
    const questionDetails = questions.map((q, index) => {
      // Find user's answer - compare as strings
      const questionIdStr = q._id.toString()
      const userAnswer = session.answers?.find(a => {
        const answerQuestionId = a.questionId?.toString() || a.questionId
        return answerQuestionId === questionIdStr
      })
      
      const isCorrect = userAnswer?.answer === q.correctAnswer
      const isUnanswered = !userAnswer || !userAnswer.answer
      
      return {
        questionNumber: index + 1,
        question: q.question,
        image: q.image || null,
        options: q.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          image: opt.image || null
        })),
        userAnswer: userAnswer?.answer || null,
        correctAnswer: q.correctAnswer,
        isCorrect: !isUnanswered && isCorrect,
        isUnanswered,
        explanation: q.explanation || null,
        points: q.points || 5
      }
    })
    
    // Calculate stats
    const correctCount = questionDetails.filter(q => q.isCorrect).length
    const wrongCount = questionDetails.filter(q => !q.isCorrect && !q.isUnanswered).length
    const unansweredCount = questionDetails.filter(q => q.isUnanswered).length
    
    res.json({
      type: session.testId?.type || 'iq',
      testName: session.testId?.name || 'IQ Test',
      score: session.score,
      maxScore: session.maxScore,
      percentile: session.percentile,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      unansweredQuestions: unansweredCount,
      totalQuestions: questions.length || session.testId?.questionCount || 20,
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
      },
      questionDetails, // Detailed question-by-question breakdown
      advice: generateAdvice(correctCount, questions.length, session.percentile)
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Generate advice based on performance
function generateAdvice(correctCount, totalQuestions, percentile) {
  const percentage = (correctCount / totalQuestions) * 100
  
  const adviceList = []
  
  if (percentage >= 90) {
    adviceList.push('🌟 Xuất sắc! Bạn đã làm rất tốt bài kiểm tra này.')
    adviceList.push('💪 Hãy tiếp tục duy trì phong độ và thử sức với các bài test khó hơn.')
    adviceList.push('📚 Bạn có thể giúp đỡ bạn bè cùng học tập.')
  } else if (percentage >= 70) {
    adviceList.push('👍 Kết quả tốt! Bạn đã nắm vững phần lớn kiến thức.')
    adviceList.push('📖 Xem lại những câu sai để hiểu rõ hơn về các lỗi.')
    adviceList.push('🎯 Tập trung vào các dạng câu hỏi bạn còn yếu.')
  } else if (percentage >= 50) {
    adviceList.push('✨ Kết quả trung bình, còn nhiều dư địa để cải thiện.')
    adviceList.push('📝 Hãy xem kỹ những câu trả lời sai và tìm hiểu nguyên nhân.')
    adviceList.push('⏰ Luyện tập thường xuyên sẽ giúp bạn tiến bộ.')
    adviceList.push('💡 Thử chia nhỏ thời gian học và ôn tập đều đặn.')
  } else {
    adviceList.push('🌱 Đừng nản lòng! Mỗi lần làm sai là một cơ hội để học.')
    adviceList.push('📚 Hãy quay lại ôn tập kiến thức cơ bản.')
    adviceList.push('🤝 Tìm bạn học hoặc gia sư để được hỗ trợ.')
    adviceList.push('📅 Lập kế hoạch học tập cụ thể và kiên trì thực hiện.')
  }
  
  if (percentile < 50) {
    adviceList.push('📈 Bạn cần nỗ lực nhiều hơn để cải thiện thứ hạng.')
  }
  
  return adviceList
}

// Get task info for session
router.get('/:id/task', async (req, res) => {
  try {
    const task = await Task.findOne({ sessionId: req.params.id }).populate('siteId')
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' })
    }
    
    // Get custom task steps or use defaults
    const defaultSteps = {
      step1: { label: '1', title: 'Tìm kiếm trên Google', description: 'Mở Google và tìm kiếm từ khóa:' },
      step2: { label: '2', title: 'Truy cập website', description: 'Tìm và click vào kết quả' },
      step3: { label: '3', title: 'Lấy mã xác nhận', description: 'Cuộn xuống footer, bấm vào chữ "Mã Code" và đợi 60 giây để nhận mã xác nhận' },
      step4: { label: '4', title: 'Nhập mã bên dưới', description: 'Copy mã và dán vào ô bên dưới để xem kết quả' }
    }
    
    const taskSteps = task.siteId?.taskSteps || defaultSteps
    
    res.json({
      taskId: task._id,
      siteName: task.siteId?.name || 'Target Website',
      siteUrl: task.siteId?.url || 'https://example.com',
      searchKeyword: task.siteId?.searchKeyword || 'example keyword',
      instruction: task.siteId?.instruction || 'Truy cập website và lấy mã xác nhận',
      step2Image: task.siteId?.step2Image || '',
      step3Image: task.siteId?.step3Image || '',
      taskSteps: {
        step1: { ...defaultSteps.step1, ...taskSteps.step1 },
        step2: { ...defaultSteps.step2, ...taskSteps.step2 },
        step3: { ...defaultSteps.step3, ...taskSteps.step3 },
        step4: { ...defaultSteps.step4, ...taskSteps.step4 }
      },
      status: task.status
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
