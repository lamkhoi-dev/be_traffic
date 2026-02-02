/**
 * Generate random verification code
 * @returns {string} 6 character uppercase code
 */
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars like 0,O,1,I
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Generate random site key
 * @returns {string} 10 character alphanumeric key
 */
const generateSiteKey = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let key = ''
  for (let i = 0; i < 10; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

/**
 * Calculate score from answers
 * @param {Array} answers - User's answers
 * @param {Array} questions - Questions with correct answers
 * @returns {Object} score, maxScore, correctCount
 */
const calculateScore = (answers, questions) => {
  let correctCount = 0
  const answerMap = {}
  
  answers.forEach(a => {
    answerMap[a.questionId] = a.answer
  })
  
  questions.forEach(q => {
    if (answerMap[q._id.toString()] === q.correctAnswer) {
      correctCount++
    }
  })
  
  const maxScore = questions.length * 5
  const score = correctCount * 5
  
  // Convert to IQ scale (70-150)
  const iqScore = Math.round(70 + (correctCount / questions.length) * 80)
  
  return {
    score: iqScore,
    maxScore: 150,
    correctCount
  }
}

/**
 * Generate analysis based on score using settings from DB
 * @param {number} score 
 * @param {number} maxScore 
 * @param {Array} scoreLevels - Score levels from ResultSettings
 * @returns {Object} analysis
 */
const generateAnalysis = (score, maxScore, scoreLevels = null) => {
  // Default levels if no settings provided
  const defaultLevels = [
    {
      minScore: 130,
      maxScore: 150,
      level: 'Xuất sắc',
      emoji: '🏆',
      description: 'Bạn có năng lực trí tuệ vượt trội, thuộc nhóm 2% người có điểm số cao nhất.',
      strengths: ['Tư duy logic xuất sắc', 'Khả năng phân tích vượt trội'],
      improvements: ['Tiếp tục thử thách bản thân']
    },
    {
      minScore: 115,
      maxScore: 129,
      level: 'Trên trung bình',
      emoji: '⭐',
      description: 'Bạn có khả năng tư duy logic tốt, thuộc nhóm 15% người có điểm số cao.',
      strengths: ['Suy luận logic tốt', 'Nhận diện quy luật nhanh'],
      improvements: ['Cải thiện tốc độ làm bài', 'Rèn luyện thêm']
    },
    {
      minScore: 100,
      maxScore: 114,
      level: 'Trung bình',
      emoji: '👍',
      description: 'Bạn có năng lực trí tuệ ở mức trung bình, tương đương với đa số mọi người.',
      strengths: ['Nền tảng tư duy logic ổn định', 'Khả năng học hỏi tốt'],
      improvements: ['Rèn luyện thêm các bài tập suy luận', 'Cải thiện khả năng tập trung']
    },
    {
      minScore: 70,
      maxScore: 99,
      level: 'Cần cải thiện',
      emoji: '💪',
      description: 'Kết quả cho thấy bạn cần rèn luyện thêm. Với sự kiên trì, bạn hoàn toàn có thể cải thiện!',
      strengths: ['Có tiềm năng phát triển', 'Sẵn sàng học hỏi'],
      improvements: ['Bắt đầu với các bài tập cơ bản', 'Rèn luyện đều đặn mỗi ngày']
    }
  ]

  const levels = scoreLevels && scoreLevels.length > 0 ? scoreLevels : defaultLevels
  
  // Find matching level
  const matchedLevel = levels.find(l => score >= l.minScore && score <= l.maxScore)
  
  if (matchedLevel) {
    return {
      level: matchedLevel.level,
      emoji: matchedLevel.emoji,
      description: matchedLevel.description,
      strengths: matchedLevel.strengths || [],
      improvements: matchedLevel.improvements || []
    }
  }
  
  // Fallback to last level if no match
  const lastLevel = levels[levels.length - 1]
  return {
    level: lastLevel.level,
    emoji: lastLevel.emoji,
    description: lastLevel.description,
    strengths: lastLevel.strengths || [],
    improvements: lastLevel.improvements || []
  }
}

/**
 * Generate advice based on percentage correct using settings from DB
 * @param {number} correctCount 
 * @param {number} totalQuestions 
 * @param {Array} adviceRanges - Advice ranges from ResultSettings
 * @returns {Array} advice list
 */
const generateAdvice = (correctCount, totalQuestions, adviceRanges = null) => {
  const percent = Math.round((correctCount / totalQuestions) * 100)
  
  // Default advice ranges if no settings provided
  const defaultRanges = [
    {
      minPercent: 80,
      maxPercent: 100,
      advices: [
        '👏 Xuất sắc! Bạn đã nắm vững hầu hết kiến thức.',
        '🎯 Tiếp tục duy trì phong độ này nhé!',
        '📚 Thử thách bản thân với các bài test khó hơn.'
      ]
    },
    {
      minPercent: 60,
      maxPercent: 79,
      advices: [
        '👍 Kết quả tốt! Bạn đã nắm được phần lớn kiến thức.',
        '📖 Xem lại những câu sai để hiểu rõ hơn.',
        '🎯 Tập trung vào các dạng câu hỏi bạn còn yếu.'
      ]
    },
    {
      minPercent: 40,
      maxPercent: 59,
      advices: [
        '💡 Bạn đã có nền tảng cơ bản.',
        '📚 Cần ôn tập thêm để cải thiện kết quả.',
        '🔄 Thử làm lại bài test sau khi ôn tập.'
      ]
    },
    {
      minPercent: 0,
      maxPercent: 39,
      advices: [
        '💪 Đừng nản chí! Ai cũng có thể cải thiện.',
        '📖 Hãy dành thời gian học và ôn tập kỹ hơn.',
        '🎯 Bắt đầu từ những kiến thức cơ bản nhất.'
      ]
    }
  ]
  
  const ranges = adviceRanges && adviceRanges.length > 0 ? adviceRanges : defaultRanges
  
  // Find matching range
  const matchedRange = ranges.find(r => percent >= r.minPercent && percent <= r.maxPercent)
  
  if (matchedRange) {
    return matchedRange.advices || []
  }
  
  // Fallback to last range
  const lastRange = ranges[ranges.length - 1]
  return lastRange.advices || []
}

module.exports = {
  generateCode,
  generateSiteKey,
  calculateScore,
  generateAnalysis,
  generateAdvice
}
