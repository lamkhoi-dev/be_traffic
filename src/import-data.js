/**
 * Script import data từ file JSON vào database
 * Usage: 
 *   npm run import-data -- <path-to-json-or-folder>
 * 
 * Examples:
 *   npm run import-data -- server/public/data/grade-10/toan-10-chuong1.json
 *   npm run import-data -- server/public/data/grade-10/
 */

require('dotenv').config()
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const Test = require('./models/Test')
const Question = require('./models/Question')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iqtest'

// Subject name mapping for display
const subjectNames = {
  math: 'Toán',
  physics: 'Vật lý',
  chemistry: 'Hóa học',
  biology: 'Sinh học',
  literature: 'Ngữ văn',
  english: 'Tiếng Anh',
  history: 'Lịch sử',
  geography: 'Địa lý'
}

async function importFromFile(filePath) {
  console.log(`\n📄 Importing: ${filePath}`)
  
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)
    
    if (!data.test || !data.questions) {
      console.log(`   ⚠️ Invalid format - skipping`)
      return { success: false, reason: 'Invalid format' }
    }
    
    const { test: testData, questions } = data
    
    // Check if test already exists
    const existingTest = await Test.findOne({ 
      name: testData.name,
      type: testData.type 
    })
    
    if (existingTest) {
      console.log(`   ⚠️ Test already exists: "${testData.name}" - skipping`)
      return { success: false, reason: 'Already exists' }
    }
    
    // Create test
    const test = new Test({
      type: testData.type,
      name: testData.name,
      description: testData.description,
      duration: testData.duration || 45,
      questionCount: questions.length,
      difficulty: testData.difficulty || 'medium',
      subject: testData.subject || null,
      grade: testData.grade || null,
      chapter: testData.chapter || null,
      isActive: true
    })
    
    await test.save()
    console.log(`   ✅ Created test: "${test.name}"`)
    
    // Create questions
    let createdCount = 0
    for (const q of questions) {
      const question = new Question({
        testId: test._id,
        order: q.order,
        type: q.type || 'single_choice',
        question: q.question,
        image: q.image || null,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 10,
        explanation: q.explanation || ''
      })
      
      await question.save()
      createdCount++
    }
    
    console.log(`   ✅ Created ${createdCount} questions`)
    
    return { success: true, testName: test.name, questionCount: createdCount }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    return { success: false, reason: error.message }
  }
}

async function importFromFolder(folderPath) {
  console.log(`\n📁 Scanning folder: ${folderPath}`)
  
  const files = fs.readdirSync(folderPath)
  const jsonFiles = files.filter(f => f.endsWith('.json'))
  
  console.log(`   Found ${jsonFiles.length} JSON files`)
  
  const results = []
  for (const file of jsonFiles) {
    const fullPath = path.join(folderPath, file)
    const result = await importFromFile(fullPath)
    results.push({ file, ...result })
  }
  
  return results
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║               📚 Import Data Script                            ║
╠════════════════════════════════════════════════════════════════╣
║  Usage:                                                        ║
║    npm run import-data -- <path>                               ║
║                                                                ║
║  Examples:                                                     ║
║    npm run import-data -- public/data/grade-10/toan-10.json    ║
║    npm run import-data -- public/data/grade-10/                ║
║    npm run import-data -- public/data/                         ║
╚════════════════════════════════════════════════════════════════╝
    `)
    process.exit(0)
  }
  
  const inputPath = args[0]
  const fullPath = path.resolve(inputPath)
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Path not found: ${fullPath}`)
    process.exit(1)
  }
  
  // Connect to database
  console.log('🔌 Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB')
  
  const stats = fs.statSync(fullPath)
  let results = []
  
  if (stats.isDirectory()) {
    // Import all JSON files in folder (including subfolders)
    const subFolders = fs.readdirSync(fullPath)
    
    for (const item of subFolders) {
      const itemPath = path.join(fullPath, item)
      const itemStats = fs.statSync(itemPath)
      
      if (itemStats.isDirectory()) {
        const folderResults = await importFromFolder(itemPath)
        results.push(...folderResults)
      } else if (item.endsWith('.json')) {
        const result = await importFromFile(itemPath)
        results.push({ file: item, ...result })
      }
    }
  } else {
    // Import single file
    const result = await importFromFile(fullPath)
    results.push({ file: path.basename(fullPath), ...result })
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('═'.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`✅ Successful: ${successful.length}`)
  successful.forEach(r => {
    console.log(`   - ${r.file}: ${r.testName} (${r.questionCount} questions)`)
  })
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`)
    failed.forEach(r => {
      console.log(`   - ${r.file}: ${r.reason}`)
    })
  }
  
  console.log('═'.repeat(60))
  
  await mongoose.disconnect()
  console.log('\n✅ Done!')
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
