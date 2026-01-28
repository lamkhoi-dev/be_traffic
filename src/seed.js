require('dotenv').config()
const mongoose = require('mongoose')
const Test = require('./models/Test')
const Question = require('./models/Question')
const Site = require('./models/Site')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iqtest'

// IQ Test data
const iqTests = [
  {
    type: 'iq',
    name: 'Logical Reasoning',
    description: 'Đánh giá khả năng suy luận logic và nhận diện mẫu hình cơ bản',
    duration: 15,
    questionCount: 20,
    difficulty: 'easy'
  },
  {
    type: 'iq',
    name: 'Number Sequences',
    description: 'Test khả năng phân tích dãy số và tìm quy luật',
    duration: 15,
    questionCount: 20,
    difficulty: 'medium'
  },
  {
    type: 'iq',
    name: 'Visual Patterns',
    description: 'Đánh giá tư duy không gian và hình học',
    duration: 15,
    questionCount: 20,
    difficulty: 'medium'
  },
  {
    type: 'iq',
    name: 'Word Analogies',
    description: 'Test khả năng suy luận từ ngữ và mối quan hệ ngữ nghĩa',
    duration: 15,
    questionCount: 20,
    difficulty: 'medium'
  },
  {
    type: 'iq',
    name: 'Advanced Logic',
    description: 'Bài test tổng hợp nâng cao dành cho những ai tự tin về khả năng logic',
    duration: 20,
    questionCount: 20,
    difficulty: 'hard'
  }
]

// EQ Test data
const eqTests = [
  {
    type: 'eq',
    name: 'Self-Awareness',
    description: 'Khám phá mức độ nhận thức về cảm xúc và hành vi của bản thân',
    duration: 15,
    questionCount: 20,
    difficulty: 'easy'
  },
  {
    type: 'eq',
    name: 'Empathy',
    description: 'Đánh giá khả năng thấu hiểu và đồng cảm với người khác',
    duration: 15,
    questionCount: 20,
    difficulty: 'medium'
  },
  {
    type: 'eq',
    name: 'Social Skills',
    description: 'Kiểm tra kỹ năng giao tiếp và tương tác xã hội',
    duration: 15,
    questionCount: 20,
    difficulty: 'medium'
  },
  {
    type: 'eq',
    name: 'Emotion Management',
    description: 'Đánh giá khả năng kiểm soát và điều tiết cảm xúc',
    duration: 15,
    questionCount: 20,
    difficulty: 'medium'
  },
  {
    type: 'eq',
    name: 'Relationship IQ',
    description: 'Đánh giá trí tuệ trong việc xây dựng và duy trì các mối quan hệ',
    duration: 20,
    questionCount: 20,
    difficulty: 'hard'
  }
]

// IQ Questions - Bài 1: Logical Reasoning
const iqQuestions1 = [
  { question: 'Số tiếp theo trong dãy: 2, 4, 8, 16, ?', options: [{ id: 'A', text: '24' }, { id: 'B', text: '32' }, { id: 'C', text: '30' }, { id: 'D', text: '20' }], correctAnswer: 'B' },
  { question: 'Nếu TẤT CẢ chó đều là động vật, và TẤT CẢ động vật đều cần ăn, thì:', options: [{ id: 'A', text: 'Một số chó không cần ăn' }, { id: 'B', text: 'Tất cả chó đều cần ăn' }, { id: 'C', text: 'Không chó nào cần ăn' }, { id: 'D', text: 'Không thể kết luận' }], correctAnswer: 'B' },
  { question: 'Từ nào KHÔNG cùng nhóm với các từ còn lại?', options: [{ id: 'A', text: 'Cà chua' }, { id: 'B', text: 'Khoai tây' }, { id: 'C', text: 'Cà rốt' }, { id: 'D', text: 'Táo' }], correctAnswer: 'D' },
  { question: 'Hoàn thành dãy: 1, 1, 2, 3, 5, 8, ?', options: [{ id: 'A', text: '11' }, { id: 'B', text: '12' }, { id: 'C', text: '13' }, { id: 'D', text: '10' }], correctAnswer: 'C' },
  { question: 'MÁY TÍNH : TÍNH TOÁN :: ĐIỆN THOẠI : ?', options: [{ id: 'A', text: 'Nghe nhạc' }, { id: 'B', text: 'Liên lạc' }, { id: 'C', text: 'Chơi game' }, { id: 'D', text: 'Chụp ảnh' }], correctAnswer: 'B' },
  { question: 'Nếu A > B và B > C, thì:', options: [{ id: 'A', text: 'A = C' }, { id: 'B', text: 'A < C' }, { id: 'C', text: 'A > C' }, { id: 'D', text: 'Không xác định' }], correctAnswer: 'C' },
  { question: 'Số nào không thuộc dãy: 2, 5, 10, 17, 26, 35?', options: [{ id: 'A', text: '10' }, { id: 'B', text: '26' }, { id: 'C', text: '35' }, { id: 'D', text: '17' }], correctAnswer: 'C' },
  { question: 'SÁCH : ĐỌC :: NHẠC : ?', options: [{ id: 'A', text: 'Viết' }, { id: 'B', text: 'Nghe' }, { id: 'C', text: 'Chơi' }, { id: 'D', text: 'Hát' }], correctAnswer: 'B' },
  { question: 'Nếu hôm nay là thứ 3, thì 100 ngày sau là thứ mấy?', options: [{ id: 'A', text: 'Thứ 2' }, { id: 'B', text: 'Thứ 4' }, { id: 'C', text: 'Thứ 5' }, { id: 'D', text: 'Thứ 6' }], correctAnswer: 'C' },
  { question: 'Tìm số còn thiếu: 3, 6, 11, 18, ?', options: [{ id: 'A', text: '25' }, { id: 'B', text: '27' }, { id: 'C', text: '29' }, { id: 'D', text: '31' }], correctAnswer: 'B' },
  { question: 'NƯỚC : LỎNG :: ĐÁ : ?', options: [{ id: 'A', text: 'Lạnh' }, { id: 'B', text: 'Rắn' }, { id: 'C', text: 'Trong' }, { id: 'D', text: 'Trắng' }], correctAnswer: 'B' },
  { question: 'Ai cao nhất nếu: An cao hơn Bình, Bình cao hơn Cường, Dũng thấp hơn Cường?', options: [{ id: 'A', text: 'An' }, { id: 'B', text: 'Bình' }, { id: 'C', text: 'Cường' }, { id: 'D', text: 'Dũng' }], correctAnswer: 'A' },
  { question: 'Số tiếp theo: 1, 4, 9, 16, 25, ?', options: [{ id: 'A', text: '30' }, { id: 'B', text: '36' }, { id: 'C', text: '49' }, { id: 'D', text: '32' }], correctAnswer: 'B' },
  { question: 'Từ nào khác biệt: MÈO, CHÓ, CÁ, CHIM?', options: [{ id: 'A', text: 'Mèo' }, { id: 'B', text: 'Chó' }, { id: 'C', text: 'Cá' }, { id: 'D', text: 'Chim' }], correctAnswer: 'C' },
  { question: 'GIÁO VIÊN : TRƯỜNG HỌC :: BÁC SĨ : ?', options: [{ id: 'A', text: 'Bệnh nhân' }, { id: 'B', text: 'Bệnh viện' }, { id: 'C', text: 'Thuốc' }, { id: 'D', text: 'Y tế' }], correctAnswer: 'B' },
  { question: 'Nếu X + Y = 10 và X - Y = 4, thì X = ?', options: [{ id: 'A', text: '5' }, { id: 'B', text: '6' }, { id: 'C', text: '7' }, { id: 'D', text: '8' }], correctAnswer: 'C' },
  { question: 'Dãy số nào khác: 2-4-6, 3-6-9, 4-8-10, 5-10-15?', options: [{ id: 'A', text: '2-4-6' }, { id: 'B', text: '3-6-9' }, { id: 'C', text: '4-8-10' }, { id: 'D', text: '5-10-15' }], correctAnswer: 'C' },
  { question: 'MẶT TRỜI : NGÀY :: MẶT TRĂNG : ?', options: [{ id: 'A', text: 'Sáng' }, { id: 'B', text: 'Tối' }, { id: 'C', text: 'Đêm' }, { id: 'D', text: 'Sao' }], correctAnswer: 'C' },
  { question: 'Số tiếp theo trong dãy: 0, 1, 1, 2, 4, 7, ?', options: [{ id: 'A', text: '11' }, { id: 'B', text: '13' }, { id: 'C', text: '12' }, { id: 'D', text: '14' }], correctAnswer: 'B' },
  { question: 'Kim đồng hồ chỉ 3 giờ, góc giữa 2 kim là bao nhiêu độ?', options: [{ id: 'A', text: '60°' }, { id: 'B', text: '90°' }, { id: 'C', text: '120°' }, { id: 'D', text: '180°' }], correctAnswer: 'B' },
]

// IQ Questions - Bài 2: Number Sequences
const iqQuestions2 = [
  { question: 'Tìm số tiếp theo: 2, 6, 12, 20, 30, ?', options: [{ id: 'A', text: '40' }, { id: 'B', text: '42' }, { id: 'C', text: '44' }, { id: 'D', text: '46' }], correctAnswer: 'B' },
  { question: 'Dãy số: 1, 2, 4, 7, 11, 16, ?', options: [{ id: 'A', text: '21' }, { id: 'B', text: '22' }, { id: 'C', text: '23' }, { id: 'D', text: '24' }], correctAnswer: 'B' },
  { question: 'Số tiếp theo: 3, 5, 9, 17, 33, ?', options: [{ id: 'A', text: '49' }, { id: 'B', text: '57' }, { id: 'C', text: '65' }, { id: 'D', text: '73' }], correctAnswer: 'C' },
  { question: 'Tìm số còn thiếu: 2, 3, 5, 7, 11, 13, ?', options: [{ id: 'A', text: '15' }, { id: 'B', text: '17' }, { id: 'C', text: '19' }, { id: 'D', text: '21' }], correctAnswer: 'B' },
  { question: 'Dãy số: 1, 8, 27, 64, ?', options: [{ id: 'A', text: '100' }, { id: 'B', text: '125' }, { id: 'C', text: '216' }, { id: 'D', text: '81' }], correctAnswer: 'B' },
  { question: 'Số tiếp theo: 5, 10, 20, 40, ?', options: [{ id: 'A', text: '60' }, { id: 'B', text: '70' }, { id: 'C', text: '80' }, { id: 'D', text: '100' }], correctAnswer: 'C' },
  { question: 'Tìm số: 1, 3, 6, 10, 15, ?', options: [{ id: 'A', text: '20' }, { id: 'B', text: '21' }, { id: 'C', text: '22' }, { id: 'D', text: '25' }], correctAnswer: 'B' },
  { question: 'Dãy: 2, 5, 11, 23, ?', options: [{ id: 'A', text: '35' }, { id: 'B', text: '41' }, { id: 'C', text: '47' }, { id: 'D', text: '53' }], correctAnswer: 'C' },
  { question: 'Số tiếp: 100, 50, 25, 12.5, ?', options: [{ id: 'A', text: '5' }, { id: 'B', text: '6' }, { id: 'C', text: '6.25' }, { id: 'D', text: '7.5' }], correctAnswer: 'C' },
  { question: 'Tìm số: 1, 2, 6, 24, 120, ?', options: [{ id: 'A', text: '240' }, { id: 'B', text: '480' }, { id: 'C', text: '600' }, { id: 'D', text: '720' }], correctAnswer: 'D' },
  { question: 'Dãy: 7, 14, 28, 56, ?', options: [{ id: 'A', text: '84' }, { id: 'B', text: '98' }, { id: 'C', text: '112' }, { id: 'D', text: '126' }], correctAnswer: 'C' },
  { question: 'Số: 4, 9, 16, 25, ?', options: [{ id: 'A', text: '30' }, { id: 'B', text: '36' }, { id: 'C', text: '42' }, { id: 'D', text: '49' }], correctAnswer: 'B' },
  { question: 'Tìm: 1, 4, 10, 22, 46, ?', options: [{ id: 'A', text: '70' }, { id: 'B', text: '82' }, { id: 'C', text: '94' }, { id: 'D', text: '100' }], correctAnswer: 'C' },
  { question: 'Dãy: 3, 7, 15, 31, ?', options: [{ id: 'A', text: '47' }, { id: 'B', text: '55' }, { id: 'C', text: '63' }, { id: 'D', text: '71' }], correctAnswer: 'C' },
  { question: 'Số: 1000, 500, 250, 125, ?', options: [{ id: 'A', text: '50' }, { id: 'B', text: '62.5' }, { id: 'C', text: '75' }, { id: 'D', text: '100' }], correctAnswer: 'B' },
  { question: 'Tìm: 2, 6, 18, 54, ?', options: [{ id: 'A', text: '108' }, { id: 'B', text: '126' }, { id: 'C', text: '162' }, { id: 'D', text: '216' }], correctAnswer: 'C' },
  { question: 'Dãy: 5, 8, 14, 26, 50, ?', options: [{ id: 'A', text: '74' }, { id: 'B', text: '86' }, { id: 'C', text: '98' }, { id: 'D', text: '110' }], correctAnswer: 'C' },
  { question: 'Số: 1, 5, 13, 29, ?', options: [{ id: 'A', text: '53' }, { id: 'B', text: '57' }, { id: 'C', text: '61' }, { id: 'D', text: '65' }], correctAnswer: 'C' },
  { question: 'Tìm: 10, 8, 6, 4, ?', options: [{ id: 'A', text: '0' }, { id: 'B', text: '2' }, { id: 'C', text: '3' }, { id: 'D', text: '1' }], correctAnswer: 'B' },
  { question: 'Dãy: 1, 3, 7, 15, 31, ?', options: [{ id: 'A', text: '47' }, { id: 'B', text: '55' }, { id: 'C', text: '63' }, { id: 'D', text: '71' }], correctAnswer: 'C' },
]

// IQ Questions - Bài 3-5 (similar patterns)
const generateMoreIQQuestions = () => {
  const templates = [
    { q: 'Số tiếp theo trong dãy: {a}, {b}, {c}, {d}, ?', type: 'sequence' },
    { q: 'Tìm từ khác biệt trong nhóm', type: 'odd_one' },
    { q: '{A} : {B} :: {C} : ?', type: 'analogy' },
    { q: 'Nếu {condition}, thì {result}?', type: 'logic' },
  ]
  
  // Generate 60 more questions for tests 3-5
  const questions = []
  for (let i = 0; i < 60; i++) {
    questions.push({
      question: `Câu hỏi IQ nâng cao #${i + 1}: Tìm quy luật và chọn đáp án đúng`,
      options: [
        { id: 'A', text: 'Đáp án A' },
        { id: 'B', text: 'Đáp án B' },
        { id: 'C', text: 'Đáp án C' },
        { id: 'D', text: 'Đáp án D' }
      ],
      correctAnswer: ['A', 'B', 'C', 'D'][i % 4]
    })
  }
  return questions
}

// EQ Questions
const eqQuestions1 = [
  { question: 'Khi gặp tình huống căng thẳng, bạn thường:', options: [{ id: 'A', text: 'Bình tĩnh phân tích và tìm giải pháp' }, { id: 'B', text: 'Lo lắng nhưng cố gắng giải quyết' }, { id: 'C', text: 'Tránh né hoặc trì hoãn' }, { id: 'D', text: 'Dễ bị choáng ngợp và hoảng loạn' }], correctAnswer: 'A' },
  { question: 'Khi một người bạn đang buồn, bạn sẽ:', options: [{ id: 'A', text: 'Lắng nghe và chia sẻ cảm xúc cùng họ' }, { id: 'B', text: 'Đưa ra lời khuyên ngay lập tức' }, { id: 'C', text: 'Cố gắng làm họ vui lên bằng đùa vui' }, { id: 'D', text: 'Để họ một mình vì không biết phải làm gì' }], correctAnswer: 'A' },
  { question: 'Bạn nhận ra cảm xúc của mình như thế nào?', options: [{ id: 'A', text: 'Luôn nhận biết rõ ràng và có thể gọi tên' }, { id: 'B', text: 'Thường nhận ra sau một lúc suy nghĩ' }, { id: 'C', text: 'Đôi khi khó phân biệt các cảm xúc' }, { id: 'D', text: 'Hiếm khi chú ý đến cảm xúc của mình' }], correctAnswer: 'A' },
  { question: 'Khi bị chỉ trích, phản ứng đầu tiên của bạn là:', options: [{ id: 'A', text: 'Lắng nghe và xem xét ý kiến đó' }, { id: 'B', text: 'Hơi khó chịu nhưng cố giữ bình tĩnh' }, { id: 'C', text: 'Phản bác ngay lập tức' }, { id: 'D', text: 'Cảm thấy tổn thương và thu mình lại' }], correctAnswer: 'A' },
  { question: 'Trong cuộc tranh luận, bạn thường:', options: [{ id: 'A', text: 'Cố gắng hiểu quan điểm của người khác' }, { id: 'B', text: 'Tập trung vào việc chứng minh mình đúng' }, { id: 'C', text: 'Dễ nổi nóng khi bị phản đối' }, { id: 'D', text: 'Né tránh tranh luận hoàn toàn' }], correctAnswer: 'A' },
  { question: 'Khi ai đó thành công, bạn cảm thấy:', options: [{ id: 'A', text: 'Vui mừng và chúc mừng họ thật lòng' }, { id: 'B', text: 'Vui nhưng hơi ghen tị' }, { id: 'C', text: 'Thờ ơ, không quan tâm' }, { id: 'D', text: 'Ghen tị và so sánh với bản thân' }], correctAnswer: 'A' },
  { question: 'Bạn xử lý cảm xúc tiêu cực như thế nào?', options: [{ id: 'A', text: 'Nhận diện và tìm cách giải tỏa lành mạnh' }, { id: 'B', text: 'Cố gắng kiềm chế và bỏ qua' }, { id: 'C', text: 'Trút giận lên người khác' }, { id: 'D', text: 'Để nó tích tụ cho đến khi bùng nổ' }], correctAnswer: 'A' },
  { question: 'Khả năng đọc cảm xúc người khác của bạn:', options: [{ id: 'A', text: 'Rất tốt, thường nhận ra ngay' }, { id: 'B', text: 'Khá tốt khi chú ý' }, { id: 'C', text: 'Trung bình, đôi khi bỏ lỡ' }, { id: 'D', text: 'Kém, thường không nhận ra' }], correctAnswer: 'A' },
  { question: 'Khi phải đưa ra quyết định quan trọng:', options: [{ id: 'A', text: 'Cân nhắc cả logic và cảm xúc' }, { id: 'B', text: 'Chủ yếu dựa vào logic' }, { id: 'C', text: 'Chủ yếu theo cảm xúc' }, { id: 'D', text: 'Do dự và khó quyết định' }], correctAnswer: 'A' },
  { question: 'Bạn thể hiện cảm xúc tích cực như thế nào?', options: [{ id: 'A', text: 'Tự nhiên và cởi mở' }, { id: 'B', text: 'Kín đáo nhưng thành thật' }, { id: 'C', text: 'Khó khăn trong việc thể hiện' }, { id: 'D', text: 'Hiếm khi thể hiện' }], correctAnswer: 'A' },
  { question: 'Khi có xung đột với người khác:', options: [{ id: 'A', text: 'Tìm cách giải quyết và thỏa hiệp' }, { id: 'B', text: 'Cố gắng nhường nhịn' }, { id: 'C', text: 'Kiên quyết giữ quan điểm' }, { id: 'D', text: 'Tránh né và im lặng' }], correctAnswer: 'A' },
  { question: 'Bạn phản ứng thế nào khi thất bại?', options: [{ id: 'A', text: 'Rút kinh nghiệm và cố gắng tiếp' }, { id: 'B', text: 'Buồn nhưng nhanh chóng vượt qua' }, { id: 'C', text: 'Đổ lỗi cho hoàn cảnh' }, { id: 'D', text: 'Tự trách bản thân quá mức' }], correctAnswer: 'A' },
  { question: 'Mức độ tự tin của bạn:', options: [{ id: 'A', text: 'Tự tin nhưng vẫn khiêm tốn' }, { id: 'B', text: 'Tự tin trong một số lĩnh vực' }, { id: 'C', text: 'Thường thiếu tự tin' }, { id: 'D', text: 'Quá tự tin hoặc quá tự ti' }], correctAnswer: 'A' },
  { question: 'Khi người khác cần giúp đỡ:', options: [{ id: 'A', text: 'Sẵn sàng giúp đỡ trong khả năng' }, { id: 'B', text: 'Giúp khi được nhờ' }, { id: 'C', text: 'Tùy thuộc vào mối quan hệ' }, { id: 'D', text: 'Thường ngại giúp đỡ' }], correctAnswer: 'A' },
  { question: 'Bạn xử lý sự thay đổi như thế nào?', options: [{ id: 'A', text: 'Thích ứng nhanh và linh hoạt' }, { id: 'B', text: 'Chấp nhận sau thời gian' }, { id: 'C', text: 'Khó chịu và kháng cự' }, { id: 'D', text: 'Rất lo lắng và sợ hãi' }], correctAnswer: 'A' },
  { question: 'Khả năng kiểm soát xung động:', options: [{ id: 'A', text: 'Tốt, luôn suy nghĩ trước khi hành động' }, { id: 'B', text: 'Khá tốt trong hầu hết tình huống' }, { id: 'C', text: 'Đôi khi khó kiểm soát' }, { id: 'D', text: 'Thường hành động bốc đồng' }], correctAnswer: 'A' },
  { question: 'Bạn đặt mục tiêu như thế nào?', options: [{ id: 'A', text: 'Rõ ràng và có kế hoạch thực hiện' }, { id: 'B', text: 'Có mục tiêu nhưng hay trì hoãn' }, { id: 'C', text: 'Mơ hồ, không cụ thể' }, { id: 'D', text: 'Hiếm khi đặt mục tiêu' }], correctAnswer: 'A' },
  { question: 'Khi cảm thấy cô đơn:', options: [{ id: 'A', text: 'Chủ động kết nối với người khác' }, { id: 'B', text: 'Tìm hoạt động để khuây khỏa' }, { id: 'C', text: 'Chịu đựng một mình' }, { id: 'D', text: 'Trở nên buồn bã và thu mình' }], correctAnswer: 'A' },
  { question: 'Bạn phản ứng khi bị hiểu lầm:', options: [{ id: 'A', text: 'Bình tĩnh giải thích' }, { id: 'B', text: 'Hơi bực nhưng vẫn giải thích' }, { id: 'C', text: 'Tức giận và phản ứng mạnh' }, { id: 'D', text: 'Im lặng và ấm ức' }], correctAnswer: 'A' },
  { question: 'Mức độ lạc quan của bạn:', options: [{ id: 'A', text: 'Lạc quan nhưng thực tế' }, { id: 'B', text: 'Thường tích cực' }, { id: 'C', text: 'Hay lo lắng về tương lai' }, { id: 'D', text: 'Thường bi quan' }], correctAnswer: 'A' },
]

// More EQ questions for tests 2-5
const generateMoreEQQuestions = () => {
  const questions = []
  const topics = [
    'Khi đối mặt với áp lực công việc',
    'Trong mối quan hệ gia đình',
    'Khi giao tiếp với người lạ',
    'Khi nhận được phản hồi tiêu cực',
    'Trong tình huống cạnh tranh',
    'Khi phải làm việc nhóm',
    'Khi có bất đồng ý kiến',
    'Trong thời điểm khó khăn',
  ]
  
  for (let i = 0; i < 80; i++) {
    const topic = topics[i % topics.length]
    questions.push({
      question: `${topic}, bạn thường xử lý như thế nào?`,
      options: [
        { id: 'A', text: 'Xử lý một cách bình tĩnh và hiệu quả' },
        { id: 'B', text: 'Cố gắng kiểm soát và tìm giải pháp' },
        { id: 'C', text: 'Đôi khi gặp khó khăn trong việc xử lý' },
        { id: 'D', text: 'Thường cảm thấy quá tải' }
      ],
      correctAnswer: 'A'
    })
  }
  return questions
}

// Demo site
const demoSite = {
  siteKey: 'DEMO123456',
  name: 'Demo Website',
  domain: 'demo.example.com',
  url: 'https://demo.example.com',
  searchKeyword: 'demo website traffic',
  instruction: 'Truy cập website demo và lấy mã xác nhận',
  isActive: true
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Clear existing data
    await Test.deleteMany({})
    await Question.deleteMany({})
    await Site.deleteMany({})
    console.log('🗑️ Cleared existing data')

    // Create IQ tests
    const iqQuestionsAll = [...iqQuestions1, ...iqQuestions2, ...generateMoreIQQuestions()]
    for (let i = 0; i < iqTests.length; i++) {
      const test = await Test.create(iqTests[i])
      const startIdx = i * 20
      const testQuestions = iqQuestionsAll.slice(startIdx, startIdx + 20)
      
      for (let j = 0; j < testQuestions.length; j++) {
        await Question.create({
          testId: test._id,
          order: j + 1,
          type: 'single_choice',
          ...testQuestions[j],
          points: 5
        })
      }
      console.log(`✅ Created IQ test: ${test.name}`)
    }

    // Create EQ tests
    const eqQuestionsAll = [...eqQuestions1, ...generateMoreEQQuestions()]
    for (let i = 0; i < eqTests.length; i++) {
      const test = await Test.create(eqTests[i])
      const startIdx = i * 20
      const testQuestions = eqQuestionsAll.slice(startIdx, startIdx + 20)
      
      for (let j = 0; j < testQuestions.length; j++) {
        await Question.create({
          testId: test._id,
          order: j + 1,
          type: 'single_choice',
          ...testQuestions[j],
          points: 5
        })
      }
      console.log(`✅ Created EQ test: ${test.name}`)
    }

    // Create demo site
    await Site.create(demoSite)
    console.log('✅ Created demo site')

    console.log('\n🎉 Seed completed successfully!')
    console.log(`📊 Created:`)
    console.log(`   - 5 IQ tests (100 questions)`)
    console.log(`   - 5 EQ tests (100 questions)`)
    console.log(`   - 1 demo site`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Seed error:', error)
    process.exit(1)
  }
}

seed()
