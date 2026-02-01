/**
 * Script import data cho TẤT CẢ các lớp 10, 11, 12
 * Tự động import tất cả files JSON từ thư mục data
 * 
 * Usage: npm run import-all-grades
 */

require('dotenv').config()
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const Test = require('./models/Test')
const Question = require('./models/Question')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iqtest'

// Subject mapping from file prefix to subject ID
const subjectPrefixMap = {
  toan: 'math',
  ly: 'physics',
  anh: 'english',
  su: 'history'
}

// Subject display names
const subjectNames = {
  math: 'Toán',
  physics: 'Vật lý',
  english: 'Tiếng Anh',
  history: 'Lịch sử'
}

// Grade type mapping
const gradeTypeMap = {
  10: 'grade10',
  11: 'grade11',
  12: 'grade12'
}

function parseFileName(fileName) {
  // Parse file name like toan_1.json, ly_10.json, etc.
  const match = fileName.match(/^(toan|ly|anh|su)_(\d+)\.json$/)
  if (!match) return null
  
  return {
    subjectPrefix: match[1],
    subject: subjectPrefixMap[match[1]],
    testNumber: parseInt(match[2])
  }
}

async function importTestFile(filePath, grade) {
  const fileName = path.basename(filePath)
  const fileInfo = parseFileName(fileName)
  
  if (!fileInfo) {
    console.log(`   ⚠️ Skipping invalid file name: ${fileName}`)
    return { success: false, reason: 'Invalid file name' }
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)
    
    if (!data.test || !data.questions || data.questions.length === 0) {
      console.log(`   ⚠️ Invalid format or empty questions - skipping: ${fileName}`)
      return { success: false, reason: 'Invalid format or empty' }
    }
    
    const { test: testData, questions } = data
    const gradeType = gradeTypeMap[grade]
    
    // Generate test name
    const testName = `${subjectNames[fileInfo.subject]} ${grade} - Đề số ${fileInfo.testNumber}`
    
    // Check if test already exists
    const existingTest = await Test.findOne({ 
      name: testName,
      type: gradeType 
    })
    
    if (existingTest) {
      // Update existing test
      await Question.deleteMany({ testId: existingTest._id })
      
      existingTest.description = testData.description || `Bài kiểm tra ${subjectNames[fileInfo.subject]} lớp ${grade} - Đề số ${fileInfo.testNumber}`
      existingTest.duration = testData.duration || 45
      existingTest.questionCount = questions.length
      existingTest.difficulty = testData.difficulty || 'medium'
      existingTest.subject = fileInfo.subject
      existingTest.grade = grade
      await existingTest.save()
      
      // Re-create questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const question = new Question({
          testId: existingTest._id,
          order: q.order || i + 1,
          type: q.type || 'single_choice',
          question: q.question,
          image: q.image || null,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points || 10,
          explanation: q.explanation || ''
        })
        await question.save()
      }
      
      console.log(`   🔄 Updated: "${testName}" (${questions.length} questions)`)
      return { success: true, testName, questionCount: questions.length, updated: true }
    }
    
    // Create new test
    const test = new Test({
      type: gradeType,
      name: testName,
      description: testData.description || `Bài kiểm tra ${subjectNames[fileInfo.subject]} lớp ${grade} - Đề số ${fileInfo.testNumber}`,
      duration: testData.duration || 45,
      questionCount: questions.length,
      difficulty: testData.difficulty || 'medium',
      subject: fileInfo.subject,
      grade: grade,
      chapter: testData.chapter || null,
      isActive: true
    })
    
    await test.save()
    
    // Create questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const question = new Question({
        testId: test._id,
        order: q.order || i + 1,
        type: q.type || 'single_choice',
        question: q.question,
        image: q.image || null,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 10,
        explanation: q.explanation || ''
      })
      await question.save()
    }
    
    console.log(`   ✅ Created: "${testName}" (${questions.length} questions)`)
    return { success: true, testName, questionCount: questions.length, updated: false }
    
  } catch (error) {
    console.log(`   ❌ Error with ${fileName}: ${error.message}`)
    return { success: false, reason: error.message }
  }
}

async function importGrade(grade) {
  const gradeFolderPath = path.join(__dirname, `../public/data/grade-${grade}`)
  
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📁 Importing Grade ${grade} from: ${gradeFolderPath}`)
  console.log(`${'═'.repeat(60)}`)
  
  if (!fs.existsSync(gradeFolderPath)) {
    console.log(`   ⚠️ Folder not found - skipping grade ${grade}`)
    return []
  }
  
  const files = fs.readdirSync(gradeFolderPath)
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'))
  
  console.log(`   Found ${jsonFiles.length} JSON files`)
  
  const results = []
  
  // Group by subject for nice output
  const subjects = ['toan', 'ly', 'anh', 'su']
  
  for (const subjectPrefix of subjects) {
    const subjectFiles = jsonFiles.filter(f => f.startsWith(subjectPrefix + '_'))
    if (subjectFiles.length === 0) continue
    
    console.log(`\n   📚 ${subjectNames[subjectPrefixMap[subjectPrefix]]} (${subjectFiles.length} files):`)
    
    // Sort by test number
    subjectFiles.sort((a, b) => {
      const numA = parseInt(a.match(/_(\d+)\.json/)?.[1] || 0)
      const numB = parseInt(b.match(/_(\d+)\.json/)?.[1] || 0)
      return numA - numB
    })
    
    for (const file of subjectFiles) {
      const fullPath = path.join(gradeFolderPath, file)
      const result = await importTestFile(fullPath, grade)
      results.push({ file, grade, ...result })
    }
  }
  
  return results
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          📚 IMPORT ALL GRADES (10, 11, 12)                     ║
║          Toán, Lý, Anh, Sử cho tất cả các lớp                  ║
╚════════════════════════════════════════════════════════════════╝
  `)
  
  // Connect to database
  console.log('🔌 Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB')
  
  const allResults = []
  
  // Import each grade
  for (const grade of [10, 11, 12]) {
    const results = await importGrade(grade)
    allResults.push(...results)
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 FINAL IMPORT SUMMARY')
  console.log('═'.repeat(60))
  
  const successful = allResults.filter(r => r.success)
  const created = successful.filter(r => !r.updated)
  const updated = successful.filter(r => r.updated)
  const failed = allResults.filter(r => !r.success)
  
  console.log(`\n✅ Total Successful: ${successful.length}`)
  console.log(`   - Created: ${created.length}`)
  console.log(`   - Updated: ${updated.length}`)
  
  // Group by grade
  for (const grade of [10, 11, 12]) {
    const gradeResults = successful.filter(r => r.grade === grade)
    if (gradeResults.length > 0) {
      console.log(`\n   Lớp ${grade}: ${gradeResults.length} tests`)
      
      // Group by subject
      const subjects = { math: 0, physics: 0, english: 0, history: 0 }
      gradeResults.forEach(r => {
        const fileInfo = parseFileName(r.file)
        if (fileInfo) subjects[fileInfo.subject]++
      })
      
      Object.entries(subjects).forEach(([subj, count]) => {
        if (count > 0) console.log(`      - ${subjectNames[subj]}: ${count}`)
      })
    }
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`)
    failed.forEach(r => {
      console.log(`   - ${r.file}: ${r.reason}`)
    })
  }
  
  // Calculate total questions
  const totalQuestions = successful.reduce((sum, r) => sum + (r.questionCount || 0), 0)
  console.log(`\n📈 Tổng số câu hỏi: ${totalQuestions}`)
  
  console.log('\n' + '═'.repeat(60))
  
  await mongoose.connection.close()
  console.log('🔌 Disconnected from MongoDB')
  process.exit(0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
