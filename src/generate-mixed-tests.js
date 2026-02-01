/**
 * Script tạo bài test xáo trộn từ các bài gốc
 * 
 * Cách hoạt động:
 * - Đọc tất cả file từ mỗi môn (ví dụ: toan_1.json đến toan_10.json)
 * - Gộp tất cả câu hỏi thành pool
 * - Random lấy 20 câu tạo bài mới (toan_11.json đến toan_20.json)
 * 
 * Chạy: node src/generate-mixed-tests.js
 * Lưu ý: Script sẽ bỏ qua các file đã tồn tại, nên nếu muốn tạo lại thì xóa file cũ trước.
 */

const fs = require('fs');
const path = require('path');

// Cấu hình
const CONFIG = {
  // Các lớp cần xử lý
  grades: ['grade-10', 'grade-11', 'grade-12'],
  
  // Các môn học (prefix của tên file)
  subjects: ['toan', 'ly', 'hoa', 'sinh', 'anh', 'su', 'dia', 'van'],
  
  // Số bài gốc mỗi môn
  originalTestCount: 10,
  
  // Số bài mới cần tạo
  newTestCount: 10,
  
  // Số câu hỏi mỗi bài
  questionsPerTest: 20,
  
  // Thời gian làm bài (phút)
  duration: 45,
  
  // Thư mục chứa data
  dataDir: path.join(__dirname, '../public/data')
};

// Map tên môn tiếng Việt
const SUBJECT_NAMES = {
  'toan': { name: 'Toán', subject: 'math' },
  'ly': { name: 'Vật lý', subject: 'physics' },
  'hoa': { name: 'Hóa học', subject: 'chemistry' },
  'sinh': { name: 'Sinh học', subject: 'biology' },
  'anh': { name: 'Tiếng Anh', subject: 'english' },
  'su': { name: 'Lịch sử', subject: 'history' },
  'dia': { name: 'Địa lý', subject: 'geography' },
  'van': { name: 'Ngữ văn', subject: 'literature' }
};

// Map tên lớp
const GRADE_NAMES = {
  'grade-10': { grade: 10, type: 'grade10' },
  'grade-11': { grade: 11, type: 'grade11' },
  'grade-12': { grade: 12, type: 'grade12' }
};

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Đọc tất cả câu hỏi từ các bài gốc của một môn
 */
function readAllQuestions(gradeDir, subjectPrefix) {
  const allQuestions = [];
  
  for (let i = 1; i <= CONFIG.originalTestCount; i++) {
    const filePath = path.join(gradeDir, `${subjectPrefix}_${i}.json`);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (data.questions && Array.isArray(data.questions)) {
          // Thêm nguồn gốc để debug nếu cần
          const questionsWithSource = data.questions.map(q => ({
            ...q,
            _sourceFile: `${subjectPrefix}_${i}.json`
          }));
          allQuestions.push(...questionsWithSource);
        }
      } catch (err) {
        console.warn(`  ⚠️  Lỗi đọc file ${filePath}: ${err.message}`);
      }
    }
  }
  
  return allQuestions;
}

/**
 * Tạo bài test mới từ pool câu hỏi
 */
function createNewTest(questions, gradeFolder, subjectPrefix, testNumber) {
  const gradeInfo = GRADE_NAMES[gradeFolder];
  const subjectInfo = SUBJECT_NAMES[subjectPrefix];
  
  // Shuffle và lấy 20 câu
  const shuffled = shuffleArray(questions);
  const selectedQuestions = shuffled.slice(0, CONFIG.questionsPerTest);
  
  // Reset order và xóa _sourceFile
  const cleanedQuestions = selectedQuestions.map((q, index) => {
    const { _sourceFile, ...questionWithoutSource } = q;
    return {
      ...questionWithoutSource,
      order: index + 1
    };
  });
  
  // Tạo object test mới
  const newTest = {
    test: {
      type: gradeInfo.type,
      subject: subjectInfo.subject,
      name: `${subjectInfo.name} ${gradeInfo.grade} - Đề ôn tập tổng hợp số ${String(testNumber).padStart(2, '0')}`,
      description: `Đề luyện tập tổng hợp số ${testNumber}, câu hỏi được chọn ngẫu nhiên từ các đề gốc.`,
      duration: CONFIG.duration,
      questionCount: CONFIG.questionsPerTest,
      difficulty: 'medium',
      grade: gradeInfo.grade,
      chapter: testNumber
    },
    questions: cleanedQuestions
  };
  
  return newTest;
}

/**
 * Xử lý một môn học trong một lớp
 */
function processSubject(gradeFolder, subjectPrefix) {
  const gradeDir = path.join(CONFIG.dataDir, gradeFolder);
  
  // Kiểm tra thư mục tồn tại
  if (!fs.existsSync(gradeDir)) {
    console.log(`  📁 Tạo thư mục ${gradeFolder}`);
    fs.mkdirSync(gradeDir, { recursive: true });
  }
  
  // Đọc tất cả câu hỏi
  const allQuestions = readAllQuestions(gradeDir, subjectPrefix);
  
  if (allQuestions.length === 0) {
    console.log(`  ⏭️  Không có file ${subjectPrefix}_*.json trong ${gradeFolder}`);
    return { created: 0, skipped: true };
  }
  
  console.log(`  📚 Tìm thấy ${allQuestions.length} câu hỏi từ môn ${subjectPrefix}`);
  
  // Kiểm tra đủ câu hỏi không
  if (allQuestions.length < CONFIG.questionsPerTest) {
    console.log(`  ⚠️  Chỉ có ${allQuestions.length} câu, cần ít nhất ${CONFIG.questionsPerTest} câu`);
    return { created: 0, skipped: true };
  }
  
  let created = 0;
  
  // Tạo các bài test mới
  for (let i = 1; i <= CONFIG.newTestCount; i++) {
    const testNumber = CONFIG.originalTestCount + i; // 11, 12, 13, ...
    const newFilePath = path.join(gradeDir, `${subjectPrefix}_${testNumber}.json`);
    
    // Kiểm tra file đã tồn tại chưa
    if (fs.existsSync(newFilePath)) {
      console.log(`  ⏭️  File ${subjectPrefix}_${testNumber}.json đã tồn tại, bỏ qua`);
      continue;
    }
    
    // Tạo bài test mới
    const newTest = createNewTest(allQuestions, gradeFolder, subjectPrefix, testNumber);
    
    // Ghi file
    fs.writeFileSync(newFilePath, JSON.stringify(newTest, null, 2), 'utf8');
    console.log(`  ✅ Tạo ${subjectPrefix}_${testNumber}.json (${newTest.questions.length} câu)`);
    created++;
  }
  
  return { created, skipped: false };
}

/**
 * Xử lý một lớp
 */
function processGrade(gradeFolder) {
  console.log(`\n📂 Xử lý ${gradeFolder.toUpperCase()}`);
  console.log('─'.repeat(40));
  
  let totalCreated = 0;
  let subjectsProcessed = 0;
  
  for (const subject of CONFIG.subjects) {
    const result = processSubject(gradeFolder, subject);
    totalCreated += result.created;
    if (!result.skipped) subjectsProcessed++;
  }
  
  return { totalCreated, subjectsProcessed };
}

/**
 * Main function
 */
function main() {
  console.log('═'.repeat(50));
  console.log('🎯 SCRIPT TẠO BÀI TEST XÁO TRỘN');
  console.log('═'.repeat(50));
  console.log(`📁 Thư mục data: ${CONFIG.dataDir}`);
  console.log(`📝 Số bài gốc mỗi môn: ${CONFIG.originalTestCount}`);
  console.log(`📝 Số bài mới cần tạo: ${CONFIG.newTestCount}`);
  console.log(`❓ Số câu hỏi/bài: ${CONFIG.questionsPerTest}`);
  console.log(`📚 Các môn: ${CONFIG.subjects.join(', ')}`);
  console.log(`🎓 Các lớp: ${CONFIG.grades.join(', ')}`);
  
  let grandTotal = 0;
  
  for (const grade of CONFIG.grades) {
    const { totalCreated } = processGrade(grade);
    grandTotal += totalCreated;
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`🎉 HOÀN THÀNH! Đã tạo ${grandTotal} file mới.`);
  console.log('═'.repeat(50));
}

// Chạy script
main();
