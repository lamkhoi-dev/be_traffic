const mongoose = require('mongoose')

// ============ SUB-SCHEMAS ============

// Score Level Schema (for IQ, EQ, etc.)
const scoreLevelSchema = new mongoose.Schema({
  minScore: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  level: { type: String, required: true },
  emoji: { type: String, default: '⭐' },
  description: { type: String, required: true },
  color: { type: String, default: '#3b82f6' }, // Tailwind blue-500
  gradient: { type: String, default: 'from-blue-500 to-purple-600' },
  strengths: [{ type: String }],
  improvements: [{ type: String }]
}, { _id: true })

// Percent Range Schema (for school tests)
const percentRangeSchema = new mongoose.Schema({
  minPercent: { type: Number, required: true },
  maxPercent: { type: Number, required: true },
  level: { type: String, required: true },
  emoji: { type: String, default: '📊' },
  description: { type: String },
  color: { type: String, default: '#10b981' },
  advices: [{ type: String }]
}, { _id: true })

// MBTI Type Schema
const mbtiTypeSchema = new mongoose.Schema({
  type: { type: String, required: true }, // INTJ, ENFP, etc.
  title: { type: String, required: true }, // "Kiến trúc sư", "Người truyền cảm hứng"
  nickname: { type: String }, // "The Architect"
  description: { type: String, required: true },
  emoji: { type: String, default: '🧠' },
  color: { type: String, default: '#8b5cf6' },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  careers: [{ type: String }],
  relationships: { type: String },
  celebrities: [{ type: String }]
}, { _id: true })

// MBTI Dimension Label Schema
const mbtiDimensionSchema = new mongoose.Schema({
  code: { type: String, required: true }, // EI, SN, TF, JP
  leftLabel: { type: String, required: true }, // "Hướng ngoại (E)"
  rightLabel: { type: String, required: true }, // "Hướng nội (I)"
  leftCode: { type: String, required: true }, // E
  rightCode: { type: String, required: true }, // I
  description: { type: String }
}, { _id: true })

// Comparison Config Schema
const comparisonSchema = new mongoose.Schema({
  averageScore: { type: Number, default: 100 },
  showComparison: { type: Boolean, default: true },
  percentileRanks: [{
    maxPercentile: { type: Number },
    label: { type: String }
  }]
}, { _id: false })

// Custom Section Schema (for extensibility)
const customSectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['text', 'list', 'chart', 'cards', 'html'], default: 'text' },
  title: { type: String, required: true },
  icon: { type: String }, // emoji or icon name
  content: { type: mongoose.Schema.Types.Mixed }, // flexible content
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
  conditions: { type: mongoose.Schema.Types.Mixed } // show/hide based on conditions
}, { _id: true })

// ============ MAIN SCHEMA ============

const resultProfileSchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // Which test types use this profile
  testTypes: [{
    type: String,
    required: true
  }],
  
  // Layout type determines which config to use
  layoutType: {
    type: String,
    enum: ['score', 'percent', 'mbti', 'custom'],
    required: true,
    default: 'score'
  },
  
  // ===== SCORE-BASED CONFIG (IQ, EQ) =====
  scoreConfig: {
    scoreLevels: [scoreLevelSchema],
    adviceRanges: [percentRangeSchema], // Reuse percent range for advice
    minScore: { type: Number, default: 70 },
    maxScore: { type: Number, default: 150 },
    comparison: comparisonSchema
  },
  
  // ===== PERCENT-BASED CONFIG (School tests) =====
  percentConfig: {
    percentRanges: [percentRangeSchema],
    showCorrectAnswers: { type: Boolean, default: true },
    showWrongAnswers: { type: Boolean, default: true },
    showUnanswered: { type: Boolean, default: true },
    showQuestionReview: { type: Boolean, default: true },
    passingPercent: { type: Number, default: 50 }
  },
  
  // ===== MBTI CONFIG =====
  mbtiConfig: {
    types: [mbtiTypeSchema],
    dimensions: [mbtiDimensionSchema],
    showDimensionScores: { type: Boolean, default: true },
    showPersonalityDetails: { type: Boolean, default: true },
    showCareerSuggestions: { type: Boolean, default: true },
    showCelebrities: { type: Boolean, default: false }
  },
  
  // ===== CUSTOM CONFIG (Future extensibility) =====
  customConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // ===== DISPLAY OPTIONS =====
  displayOptions: {
    showHeader: { type: Boolean, default: true },
    showScore: { type: Boolean, default: true },
    showPercentile: { type: Boolean, default: true },
    showComparison: { type: Boolean, default: true },
    showStrengths: { type: Boolean, default: true },
    showImprovements: { type: Boolean, default: true },
    showAdvice: { type: Boolean, default: true },
    showQuestionDetails: { type: Boolean, default: true },
    showShareButtons: { type: Boolean, default: true },
    showRetryButton: { type: Boolean, default: true },
    customSections: [customSectionSchema]
  },
  
  // ===== THEME & STYLING =====
  theme: {
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#8b5cf6' },
    accentColor: { type: String, default: '#10b981' },
    backgroundColor: { type: String, default: 'from-slate-900 via-purple-900/20 to-slate-900' },
    cardBackground: { type: String, default: 'rgba(255,255,255,0.05)' },
    textColor: { type: String, default: '#ffffff' },
    gradients: {
      excellent: { type: String, default: 'from-yellow-400 to-orange-500' },
      good: { type: String, default: 'from-green-400 to-emerald-500' },
      average: { type: String, default: 'from-blue-400 to-cyan-500' },
      belowAverage: { type: String, default: 'from-purple-400 to-pink-500' },
      needsWork: { type: String, default: 'from-slate-400 to-slate-500' }
    }
  },
  
  // ===== LABELS (Customizable text) =====
  labels: {
    pageTitle: { type: String, default: 'Chúc mừng!' },
    pageSubtitle: { type: String, default: 'Bạn đã hoàn thành bài test' },
    scoreLabel: { type: String, default: 'Điểm số' },
    correctAnswers: { type: String, default: 'Câu đúng' },
    wrongAnswers: { type: String, default: 'Câu sai' },
    unanswered: { type: String, default: 'Chưa làm' },
    percentile: { type: String, default: 'Percentile' },
    strengths: { type: String, default: 'Điểm mạnh' },
    improvements: { type: String, default: 'Cần cải thiện' },
    advice: { type: String, default: 'Lời khuyên dành cho bạn' },
    questionDetails: { type: String, default: 'Chi tiết câu hỏi' },
    comparison: { type: String, default: 'So sánh với người khác' },
    retryButton: { type: String, default: 'Làm lại' },
    shareButton: { type: String, default: 'Chia sẻ kết quả' },
    homeButton: { type: String, default: 'Về trang chủ' },
    // MBTI specific
    mbtiType: { type: String, default: 'Loại tính cách của bạn' },
    mbtiDimensions: { type: String, default: 'Phân tích chi tiết' },
    mbtiCareers: { type: String, default: 'Nghề nghiệp phù hợp' },
    mbtiCelebrities: { type: String, default: 'Người nổi tiếng cùng loại' }
  },
  
  // ===== INHERITANCE =====
  inheritFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResultProfile',
    default: null
  },
  
  // ===== META =====
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  updatedBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
})

// Indexes
resultProfileSchema.index({ testTypes: 1 })
resultProfileSchema.index({ layoutType: 1 })
resultProfileSchema.index({ isDefault: 1 })
resultProfileSchema.index({ isActive: 1 })

// ============ STATIC METHODS ============

// Get profile for a specific test type
resultProfileSchema.statics.getProfileForTestType = async function(testType) {
  // First try to find active profile for this test type
  let profile = await this.findOne({
    testTypes: testType,
    isActive: true
  }).sort({ isDefault: -1, updatedAt: -1 })
  
  // If found and has inheritance, merge with parent
  if (profile && profile.inheritFrom) {
    const parent = await this.findById(profile.inheritFrom)
    if (parent) {
      profile = mergeProfiles(parent.toObject(), profile.toObject())
    }
  }
  
  // If not found, try to find by layout type
  if (!profile) {
    const layoutMap = {
      'iq': 'score',
      'eq': 'score',
      'mbti': 'mbti',
      'grade10': 'percent',
      'grade11': 'percent',
      'grade12': 'percent'
    }
    const layoutType = layoutMap[testType] || 'score'
    
    profile = await this.findOne({
      layoutType,
      isDefault: true,
      isActive: true
    })
  }
  
  // If still not found, create default
  if (!profile) {
    profile = await this.createDefaultProfile(testType)
  }
  
  return profile
}

// Create default profile for test type
resultProfileSchema.statics.createDefaultProfile = async function(testType) {
  const layoutMap = {
    'iq': 'score',
    'eq': 'score',
    'mbti': 'mbti',
    'grade10': 'percent',
    'grade11': 'percent',
    'grade12': 'percent'
  }
  const layoutType = layoutMap[testType] || 'score'
  
  const defaults = getDefaultConfig(layoutType)
  
  const profile = await this.create({
    name: `Default ${testType.toUpperCase()} Profile`,
    description: `Cấu hình mặc định cho bài test ${testType}`,
    testTypes: [testType],
    layoutType,
    ...defaults,
    isDefault: true,
    isActive: true
  })
  
  return profile
}

// Get all available test types
resultProfileSchema.statics.getAvailableTestTypes = function() {
  return [
    { value: 'iq', label: 'IQ Test', layoutType: 'score' },
    { value: 'eq', label: 'EQ Test', layoutType: 'score' },
    { value: 'mbti', label: 'MBTI Test', layoutType: 'mbti' },
    { value: 'grade10', label: 'Lớp 10', layoutType: 'percent' },
    { value: 'grade11', label: 'Lớp 11', layoutType: 'percent' },
    { value: 'grade12', label: 'Lớp 12', layoutType: 'percent' },
    { value: 'toan', label: 'Toán', layoutType: 'percent' },
    { value: 'ly', label: 'Vật lý', layoutType: 'percent' },
    { value: 'hoa', label: 'Hóa học', layoutType: 'percent' },
    { value: 'anh', label: 'Tiếng Anh', layoutType: 'percent' },
    { value: 'sinh', label: 'Sinh học', layoutType: 'percent' },
    { value: 'su', label: 'Lịch sử', layoutType: 'percent' },
    { value: 'dia', label: 'Địa lý', layoutType: 'percent' }
  ]
}

// ============ HELPER FUNCTIONS ============

function mergeProfiles(parent, child) {
  const merged = { ...parent }
  
  // Override with child values, but keep parent values if child is empty
  for (const key of Object.keys(child)) {
    if (child[key] !== null && child[key] !== undefined) {
      if (typeof child[key] === 'object' && !Array.isArray(child[key])) {
        merged[key] = { ...parent[key], ...child[key] }
      } else if (Array.isArray(child[key]) && child[key].length > 0) {
        merged[key] = child[key]
      } else if (!Array.isArray(child[key])) {
        merged[key] = child[key]
      }
    }
  }
  
  return merged
}

function getDefaultConfig(layoutType) {
  switch (layoutType) {
    case 'score':
      return {
        scoreConfig: {
          scoreLevels: [
            {
              minScore: 130, maxScore: 150,
              level: 'Xuất sắc', emoji: '🏆',
              description: 'Tuyệt vời! Bạn thuộc top 2% những người có chỉ số cao nhất.',
              color: '#f59e0b', gradient: 'from-yellow-400 to-orange-500',
              strengths: ['Khả năng phân tích xuất sắc', 'Tư duy logic sắc bén', 'Giải quyết vấn đề phức tạp tốt'],
              improvements: ['Tiếp tục thử thách bản thân', 'Chia sẻ kiến thức']
            },
            {
              minScore: 115, maxScore: 129,
              level: 'Trên trung bình', emoji: '⭐',
              description: 'Rất tốt! Bạn có khả năng tư duy tốt hơn đa số mọi người.',
              color: '#10b981', gradient: 'from-green-400 to-emerald-500',
              strengths: ['Suy luận logic tốt', 'Nhận diện quy luật nhanh'],
              improvements: ['Rèn luyện thêm bài tập', 'Cải thiện tốc độ']
            },
            {
              minScore: 100, maxScore: 114,
              level: 'Trung bình', emoji: '👍',
              description: 'Bạn có khả năng tư duy ở mức trung bình.',
              color: '#3b82f6', gradient: 'from-blue-400 to-cyan-500',
              strengths: ['Xử lý thông tin cơ bản tốt', 'Có thể cải thiện'],
              improvements: ['Luyện tập logic thường xuyên', 'Đọc sách']
            },
            {
              minScore: 70, maxScore: 99,
              level: 'Cần cải thiện', emoji: '💪',
              description: 'Bạn có tiềm năng để phát triển với sự luyện tập đúng cách.',
              color: '#8b5cf6', gradient: 'from-purple-400 to-pink-500',
              strengths: ['Tinh thần cầu tiến', 'Có thể cải thiện'],
              improvements: ['Bắt đầu bài tập cơ bản', 'Luyện tập đều đặn']
            }
          ],
          adviceRanges: [
            { minPercent: 80, maxPercent: 100, level: 'Xuất sắc', emoji: '🎯', advices: ['Xuất sắc! Tiếp tục duy trì phong độ!', 'Thử thách với bài test khó hơn'] },
            { minPercent: 60, maxPercent: 79, level: 'Tốt', emoji: '👍', advices: ['Kết quả tốt! Xem lại những câu sai', 'Tập trung vào điểm yếu'] },
            { minPercent: 40, maxPercent: 59, level: 'Trung bình', emoji: '📚', advices: ['Cần ôn tập thêm', 'Thử làm lại sau khi ôn'] },
            { minPercent: 0, maxPercent: 39, level: 'Cần cố gắng', emoji: '💪', advices: ['Đừng nản! Hãy ôn tập kỹ hơn', 'Bắt đầu từ kiến thức cơ bản'] }
          ],
          minScore: 70,
          maxScore: 150,
          comparison: {
            averageScore: 100,
            showComparison: true,
            percentileRanks: [
              { maxPercentile: 98, label: 'Top 2%' },
              { maxPercentile: 85, label: 'Top 15%' },
              { maxPercentile: 50, label: 'Trên 50%' }
            ]
          }
        }
      }
      
    case 'percent':
      return {
        percentConfig: {
          percentRanges: [
            { minPercent: 90, maxPercent: 100, level: 'Xuất sắc', emoji: '🏆', color: '#f59e0b', description: 'Bạn đã nắm vững kiến thức!', advices: ['Tiếp tục phát huy!', 'Thử thách bản thân với bài khó hơn'] },
            { minPercent: 70, maxPercent: 89, level: 'Giỏi', emoji: '⭐', color: '#10b981', description: 'Kết quả rất tốt!', advices: ['Xem lại những câu sai', 'Củng cố thêm kiến thức'] },
            { minPercent: 50, maxPercent: 69, level: 'Khá', emoji: '👍', color: '#3b82f6', description: 'Bạn đã qua mức trung bình', advices: ['Ôn tập thêm các phần còn yếu', 'Luyện tập thêm'] },
            { minPercent: 30, maxPercent: 49, level: 'Trung bình', emoji: '📚', color: '#8b5cf6', description: 'Cần cố gắng thêm', advices: ['Xem lại lý thuyết', 'Làm thêm bài tập'] },
            { minPercent: 0, maxPercent: 29, level: 'Yếu', emoji: '💪', color: '#ef4444', description: 'Cần ôn tập lại', advices: ['Học lại từ đầu', 'Nhờ thầy cô hỗ trợ'] }
          ],
          showCorrectAnswers: true,
          showWrongAnswers: true,
          showUnanswered: true,
          showQuestionReview: true,
          passingPercent: 50
        }
      }
      
    case 'mbti':
      return {
        mbtiConfig: {
          dimensions: [
            { code: 'EI', leftLabel: 'Hướng ngoại (E)', rightLabel: 'Hướng nội (I)', leftCode: 'E', rightCode: 'I', description: 'Nguồn năng lượng' },
            { code: 'SN', leftLabel: 'Giác quan (S)', rightLabel: 'Trực giác (N)', leftCode: 'S', rightCode: 'N', description: 'Cách thu thập thông tin' },
            { code: 'TF', leftLabel: 'Lý trí (T)', rightLabel: 'Cảm xúc (F)', leftCode: 'T', rightCode: 'F', description: 'Cách ra quyết định' },
            { code: 'JP', leftLabel: 'Nguyên tắc (J)', rightLabel: 'Linh hoạt (P)', leftCode: 'J', rightCode: 'P', description: 'Lối sống' }
          ],
          types: [], // Will be populated from mbti.json
          showDimensionScores: true,
          showPersonalityDetails: true,
          showCareerSuggestions: true,
          showCelebrities: false
        }
      }
      
    default:
      return {}
  }
}

module.exports = mongoose.model('ResultProfile', resultProfileSchema)
