/**
 * Script phân tích Test Types và Result Profiles
 * Chạy: node analyze-profiles.js
 */

require('dotenv').config()
const mongoose = require('mongoose')

// Models
const Test = require('./src/models/Test')
const ResultProfile = require('./src/models/ResultProfile')
const Session = require('./src/models/Session')

async function analyze() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iq_test'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    // ========== 1. PHÂN TÍCH TESTS ==========
    console.log('=' .repeat(60))
    console.log('📋 1. CÁC BÀI TEST TRONG DATABASE')
    console.log('=' .repeat(60))
    
    const allTests = await Test.find({}).select('type name isActive grade subject')
    console.log(`Tổng số tests: ${allTests.length}\n`)
    
    // Group by type
    const testsByType = {}
    allTests.forEach(test => {
      if (!testsByType[test.type]) {
        testsByType[test.type] = []
      }
      testsByType[test.type].push({
        name: test.name,
        isActive: test.isActive,
        grade: test.grade,
        subject: test.subject
      })
    })
    
    console.log('Phân loại theo type:')
    for (const [type, tests] of Object.entries(testsByType)) {
      console.log(`  - ${type}: ${tests.length} tests (active: ${tests.filter(t => t.isActive).length})`)
    }
    
    // Unique types
    const uniqueTestTypes = Object.keys(testsByType)
    console.log(`\n📌 Unique test types: ${uniqueTestTypes.length}`)
    console.log(`   [${uniqueTestTypes.join(', ')}]`)

    // ========== 2. PHÂN TÍCH PROFILES ==========
    console.log('\n' + '=' .repeat(60))
    console.log('🎨 2. CÁC RESULT PROFILES TRONG DATABASE')
    console.log('=' .repeat(60))
    
    const allProfiles = await ResultProfile.find({})
    console.log(`Tổng số profiles: ${allProfiles.length}\n`)
    
    console.log('Chi tiết từng profile:')
    allProfiles.forEach((p, i) => {
      console.log(`\n  [${i + 1}] ${p.name}`)
      console.log(`      - ID: ${p._id}`)
      console.log(`      - Layout: ${p.layoutType}`)
      console.log(`      - Test Types: [${p.testTypes?.join(', ') || 'KHÔNG CÓ'}]`)
      console.log(`      - isDefault: ${p.isDefault}`)
      console.log(`      - isActive: ${p.isActive}`)
      console.log(`      - Created: ${p.createdAt}`)
    })

    // ========== 3. PHÂN TÍCH MAPPING ==========
    console.log('\n' + '=' .repeat(60))
    console.log('🔗 3. MAPPING: TEST TYPE → PROFILES')
    console.log('=' .repeat(60))
    
    const typeToProfiles = {}
    
    // Với mỗi test type, tìm các profiles áp dụng cho nó
    uniqueTestTypes.forEach(type => {
      const matchingProfiles = allProfiles.filter(p => p.testTypes?.includes(type))
      typeToProfiles[type] = matchingProfiles
    })
    
    console.log('\nSố profiles cho mỗi test type:')
    let issuesFound = []
    
    for (const [type, profiles] of Object.entries(typeToProfiles)) {
      const count = profiles.length
      let status = '✅'
      
      if (count === 0) {
        status = '⚠️ KHÔNG CÓ PROFILE'
        issuesFound.push({ type, issue: 'no_profile' })
      } else if (count > 1) {
        status = '❌ NHIỀU PROFILE'
        issuesFound.push({ type, issue: 'multiple_profiles', count })
      }
      
      console.log(`  ${status} ${type}: ${count} profiles`)
      if (count > 0) {
        profiles.forEach(p => {
          console.log(`      → ${p.name} (${p.layoutType}, default: ${p.isDefault})`)
        })
      }
    }

    // ========== 4. VẤN ĐỀ PHÁT HIỆN ==========
    console.log('\n' + '=' .repeat(60))
    console.log('⚠️ 4. VẤN ĐỀ PHÁT HIỆN')
    console.log('=' .repeat(60))
    
    // 4.1 Test types không có profile
    const typesWithoutProfile = Object.entries(typeToProfiles)
      .filter(([_, profiles]) => profiles.length === 0)
      .map(([type]) => type)
    
    console.log(`\n4.1. Test types KHÔNG CÓ profile: ${typesWithoutProfile.length}`)
    if (typesWithoutProfile.length > 0) {
      console.log(`     [${typesWithoutProfile.join(', ')}]`)
    }
    
    // 4.2 Test types có NHIỀU profiles
    const typesWithMultiple = Object.entries(typeToProfiles)
      .filter(([_, profiles]) => profiles.length > 1)
      .map(([type, profiles]) => ({ type, count: profiles.length, profiles: profiles.map(p => p.name) }))
    
    console.log(`\n4.2. Test types có NHIỀU profiles: ${typesWithMultiple.length}`)
    typesWithMultiple.forEach(item => {
      console.log(`     - ${item.type}: ${item.count} profiles`)
      console.log(`       Profiles: [${item.profiles.join(', ')}]`)
    })
    
    // 4.3 Profiles không match với bất kỳ test nào
    const orphanProfiles = allProfiles.filter(p => {
      const hasMatchingTest = p.testTypes?.some(type => uniqueTestTypes.includes(type))
      return !hasMatchingTest
    })
    
    console.log(`\n4.3. Profiles KHÔNG match với test nào: ${orphanProfiles.length}`)
    orphanProfiles.forEach(p => {
      console.log(`     - ${p.name} (testTypes: [${p.testTypes?.join(', ')}])`)
    })
    
    // 4.4 Profiles trùng testTypes
    console.log(`\n4.4. Phân tích trùng lặp testTypes:`)
    const testTypeUsage = {}
    allProfiles.forEach(p => {
      p.testTypes?.forEach(type => {
        if (!testTypeUsage[type]) testTypeUsage[type] = []
        testTypeUsage[type].push(p.name)
      })
    })
    
    Object.entries(testTypeUsage).forEach(([type, profileNames]) => {
      if (profileNames.length > 1) {
        console.log(`     ❌ "${type}" được dùng bởi ${profileNames.length} profiles: [${profileNames.join(', ')}]`)
      }
    })

    // ========== 5. KIỂM TRA SESSIONS ==========
    console.log('\n' + '=' .repeat(60))
    console.log('📊 5. SESSIONS VÀ PROFILE USAGE')
    console.log('=' .repeat(60))
    
    const recentSessions = await Session.find({ status: 'completed' })
      .populate('testId', 'type name')
      .sort({ createdAt: -1 })
      .limit(20)
    
    console.log(`\nGần đây ${recentSessions.length} sessions completed:`)
    
    for (const session of recentSessions) {
      const testType = session.testId?.type || 'unknown'
      const matchingProfiles = typeToProfiles[testType] || []
      const hasProfile = matchingProfiles.length > 0
      
      console.log(`  - Session ${session._id.toString().slice(-6)}`)
      console.log(`    Test: ${session.testId?.name || 'N/A'} (type: ${testType})`)
      console.log(`    Profile áp dụng: ${hasProfile ? matchingProfiles[0].name : '❌ KHÔNG CÓ'}`)
      console.log(`    Layout stored: ${session.layoutType || 'không có'}`)
    }

    // ========== 6. KẾT LUẬN VÀ KHUYẾN NGHỊ ==========
    console.log('\n' + '=' .repeat(60))
    console.log('📝 6. KẾT LUẬN VÀ KHUYẾN NGHỊ')
    console.log('=' .repeat(60))
    
    console.log('\n🔍 PHÂN TÍCH:')
    console.log(`   - Có ${uniqueTestTypes.length} loại test khác nhau trong DB`)
    console.log(`   - Có ${allProfiles.length} profiles đã tạo`)
    console.log(`   - ${typesWithoutProfile.length} loại test KHÔNG CÓ profile`)
    console.log(`   - ${typesWithMultiple.length} loại test có NHIỀU HƠN 1 profile`)
    console.log(`   - ${orphanProfiles.length} profiles không match test nào`)
    
    console.log('\n💡 KHUYẾN NGHỊ:')
    console.log('   1. Mỗi loại test chỉ nên có 1 profile (hoặc dùng isDefault để chọn)')
    console.log('   2. Xóa các profiles orphan không dùng')
    console.log('   3. Tạo profile cho các test types chưa có')
    console.log('   4. Hàm "Tạo mặc định" nên kiểm tra xem profile đã tồn tại chưa')
    
    console.log('\n' + '=' .repeat(60))
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

analyze()
