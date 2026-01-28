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
 * Generate analysis based on score
 * @param {number} score 
 * @param {number} maxScore 
 * @returns {Object} analysis
 */
const generateAnalysis = (score, maxScore) => {
  let level, description, strengths, improvements
  
  if (score >= 130) {
    level = 'Xuất sắc'
    description = 'Bạn có năng lực trí tuệ vượt trội, thuộc nhóm 2% người có điểm số cao nhất. Khả năng tư duy logic, phân tích và giải quyết vấn đề của bạn rất ấn tượng.'
    strengths = [
      'Tư duy logic xuất sắc',
      'Khả năng phân tích vượt trội',
      'Giải quyết vấn đề phức tạp nhanh chóng',
      'Nhận diện mẫu hình chính xác'
    ]
    improvements = [
      'Tiếp tục thử thách bản thân với các bài toán khó hơn'
    ]
  } else if (score >= 115) {
    level = 'Trên trung bình'
    description = 'Bạn có khả năng tư duy logic tốt, thuộc nhóm 15% người có điểm số cao. Điểm mạnh của bạn nằm ở khả năng phân tích và nhận diện quy luật.'
    strengths = [
      'Suy luận logic tốt',
      'Nhận diện quy luật nhanh',
      'Tư duy phân tích ổn định'
    ]
    improvements = [
      'Cải thiện tốc độ làm bài',
      'Rèn luyện thêm với các bài tập về dãy số'
    ]
  } else if (score >= 100) {
    level = 'Trung bình'
    description = 'Bạn có năng lực trí tuệ ở mức trung bình, tương đương với đa số mọi người. Với việc rèn luyện thường xuyên, bạn có thể cải thiện đáng kể.'
    strengths = [
      'Nền tảng tư duy logic ổn định',
      'Khả năng học hỏi tốt'
    ]
    improvements = [
      'Rèn luyện thêm các bài tập suy luận',
      'Tăng cường bài tập về không gian và hình học',
      'Cải thiện khả năng tập trung'
    ]
  } else {
    level = 'Cần cải thiện'
    description = 'Kết quả cho thấy bạn cần rèn luyện thêm trong lĩnh vực tư duy logic. Đừng lo lắng, với sự kiên trì, bạn hoàn toàn có thể cải thiện!'
    strengths = [
      'Có tiềm năng phát triển',
      'Sẵn sàng học hỏi'
    ]
    improvements = [
      'Bắt đầu với các bài tập cơ bản',
      'Rèn luyện đều đặn mỗi ngày',
      'Học các phương pháp giải quyết vấn đề',
      'Tăng cường đọc sách và giải đố'
    ]
  }
  
  return { level, description, strengths, improvements }
}

module.exports = {
  generateCode,
  generateSiteKey,
  calculateScore,
  generateAnalysis
}
