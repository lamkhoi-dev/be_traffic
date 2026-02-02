const mongoose = require('mongoose')

// Schema cho mỗi mức điểm
const scoreLevelSchema = new mongoose.Schema({
  minScore: { type: Number, required: true }, // Điểm tối thiểu để đạt mức này
  maxScore: { type: Number, required: true }, // Điểm tối đa của mức này
  level: { type: String, required: true }, // Tên mức: "Xuất sắc", "Trên trung bình"...
  emoji: { type: String, default: '⭐' }, // Emoji hiển thị
  description: { type: String, required: true }, // Mô tả chi tiết
  strengths: [{ type: String }], // Danh sách điểm mạnh
  improvements: [{ type: String }] // Danh sách điểm cần cải thiện
}, { _id: true })

// Schema cho lời khuyên theo % đúng
const adviceRangeSchema = new mongoose.Schema({
  minPercent: { type: Number, required: true }, // % đúng tối thiểu
  maxPercent: { type: Number, required: true }, // % đúng tối đa
  advices: [{ type: String }] // Danh sách lời khuyên
}, { _id: true })

// Schema cho so sánh
const comparisonSchema = new mongoose.Schema({
  averageScore: { type: Number, default: 100 }, // Điểm trung bình
  // Các mốc percentile
  percentileRanks: [{
    maxPercentile: { type: Number }, // VD: 98 = top 2%
    label: { type: String } // VD: "Top 2%"
  }]
}, { _id: false })

const resultSettingsSchema = new mongoose.Schema({
  // Unique key để dễ query
  key: {
    type: String,
    default: 'result_config',
    unique: true
  },
  
  // Tiêu đề trang kết quả
  pageTitle: {
    type: String,
    default: 'Chúc mừng! Bạn đã hoàn thành bài test'
  },
  
  // Các mức điểm IQ
  scoreLevels: [scoreLevelSchema],
  
  // Lời khuyên theo % đúng
  adviceRanges: [adviceRangeSchema],
  
  // Cấu hình so sánh
  comparison: comparisonSchema,
  
  // Labels tùy chỉnh
  labels: {
    correctAnswers: { type: String, default: 'Câu đúng' },
    wrongAnswers: { type: String, default: 'Câu sai' },
    unanswered: { type: String, default: 'Chưa làm' },
    percentile: { type: String, default: 'Percentile' },
    strengths: { type: String, default: 'Điểm mạnh' },
    improvements: { type: String, default: 'Cần cải thiện' },
    advice: { type: String, default: 'Lời khuyên' },
    questionDetails: { type: String, default: 'Chi tiết câu hỏi' }
  },
  
  // Màu sắc (cho frontend reference)
  colors: {
    excellent: { type: String, default: '#10b981' }, // Xanh lá
    aboveAverage: { type: String, default: '#3b82f6' }, // Xanh dương
    average: { type: String, default: '#f59e0b' }, // Vàng cam
    belowAverage: { type: String, default: '#ef4444' } // Đỏ
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
})

// Index
resultSettingsSchema.index({ key: 1 })

// Static method để lấy hoặc tạo default settings
resultSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ key: 'result_config' })
  
  if (!settings) {
    // Tạo default settings
    settings = await this.create({
      key: 'result_config',
      scoreLevels: [
        {
          minScore: 130,
          maxScore: 150,
          level: 'Xuất sắc',
          emoji: '🏆',
          description: 'Tuyệt vời! Bạn thuộc top 2% những người có chỉ số IQ cao nhất. Khả năng tư duy logic và giải quyết vấn đề của bạn vượt trội.',
          strengths: [
            'Khả năng phân tích và tổng hợp thông tin xuất sắc',
            'Tư duy logic sắc bén, nhận diện quy luật nhanh',
            'Khả năng giải quyết vấn đề phức tạp tốt',
            'Trí nhớ và khả năng tập trung cao'
          ],
          improvements: [
            'Tiếp tục thử thách bản thân với các bài test khó hơn',
            'Chia sẻ kiến thức để giúp đỡ người khác'
          ]
        },
        {
          minScore: 115,
          maxScore: 129,
          level: 'Trên trung bình',
          emoji: '⭐',
          description: 'Rất tốt! Bạn có khả năng tư duy logic tốt hơn đa số mọi người. Bạn thuộc top 15% về khả năng nhận thức.',
          strengths: [
            'Khả năng suy luận logic tốt',
            'Nhận diện quy luật và mẫu hình nhanh',
            'Tư duy linh hoạt trong giải quyết vấn đề'
          ],
          improvements: [
            'Rèn luyện thêm các bài tập tư duy để nâng cao',
            'Thử thách bản thân với các dạng bài khó hơn',
            'Cải thiện tốc độ làm bài'
          ]
        },
        {
          minScore: 100,
          maxScore: 114,
          level: 'Trung bình',
          emoji: '👍',
          description: 'Bạn có khả năng tư duy ở mức trung bình, tương đương với đa số mọi người. Đây là nền tảng tốt để phát triển.',
          strengths: [
            'Khả năng hiểu và xử lý thông tin cơ bản tốt',
            'Có thể học hỏi và cải thiện được'
          ],
          improvements: [
            'Luyện tập thường xuyên các bài tập logic',
            'Đọc sách và chơi các trò chơi kích thích trí não',
            'Rèn luyện khả năng tập trung và chú ý'
          ]
        },
        {
          minScore: 70,
          maxScore: 99,
          level: 'Cần cải thiện',
          emoji: '💪',
          description: 'Bạn có tiềm năng để phát triển. Với sự luyện tập đúng cách, bạn hoàn toàn có thể cải thiện khả năng tư duy của mình.',
          strengths: [
            'Có tinh thần cầu tiến khi tham gia bài test',
            'Có thể cải thiện thông qua luyện tập'
          ],
          improvements: [
            'Bắt đầu với các bài tập tư duy cơ bản',
            'Luyện tập đều đặn mỗi ngày 15-30 phút',
            'Chơi các trò chơi logic như Sudoku, puzzle',
            'Đọc sách và mở rộng kiến thức'
          ]
        }
      ],
      adviceRanges: [
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
            '🎯 Bắt đầu từ những kiến thức cơ bản nhất.',
            '🔄 Làm lại bài test sau khi đã ôn tập đầy đủ.'
          ]
        }
      ],
      comparison: {
        averageScore: 100,
        percentileRanks: [
          { maxPercentile: 98, label: 'Top 2%' },
          { maxPercentile: 85, label: 'Top 15%' },
          { maxPercentile: 50, label: 'Trên 50%' },
          { maxPercentile: 0, label: 'Cần cố gắng' }
        ]
      }
    })
  }
  
  return settings
}

module.exports = mongoose.model('ResultSettings', resultSettingsSchema)
