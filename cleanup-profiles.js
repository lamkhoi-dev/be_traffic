/**
 * Script dọn dẹp Result Profiles
 * - Xóa profiles orphan (không match test nào)
 * - Xóa profiles trùng lặp (giữ lại 1)
 * - Tạo profile cho test types chưa có
 * 
 * Chạy: node cleanup-profiles.js
 */

require('dotenv').config()
const mongoose = require('mongoose')

const Test = require('./src/models/Test')
const ResultProfile = require('./src/models/ResultProfile')

async function cleanup() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iq_test'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    // 1. Lấy danh sách test types THỰC trong DB
    const realTestTypes = await Test.distinct('type', { isActive: true })
    console.log(`📋 Test types thực trong DB: [${realTestTypes.join(', ')}]`)
    console.log(`   Tổng: ${realTestTypes.length} loại\n`)

    // 2. Lấy tất cả profiles
    const allProfiles = await ResultProfile.find({})
    console.log(`🎨 Tổng profiles hiện có: ${allProfiles.length}\n`)

    // 3. Phân loại profiles
    const orphanProfiles = []
    const validProfiles = {}
    const duplicateProfiles = []

    for (const profile of allProfiles) {
      // Kiểm tra xem profile có match với test type nào không
      const matchingTypes = profile.testTypes?.filter(type => realTestTypes.includes(type)) || []
      
      if (matchingTypes.length === 0) {
        // ORPHAN: không match test nào
        orphanProfiles.push(profile)
      } else {
        // Có match - kiểm tra trùng
        for (const type of matchingTypes) {
          if (!validProfiles[type]) {
            validProfiles[type] = profile
          } else {
            // DUPLICATE: đã có profile cho type này
            duplicateProfiles.push({ profile, type, existingProfileId: validProfiles[type]._id })
          }
        }
      }
    }

    console.log('=' .repeat(50))
    console.log('📊 KẾT QUẢ PHÂN LOẠI:')
    console.log('=' .repeat(50))
    
    // 3.1 Orphan profiles
    console.log(`\n❌ Profiles ORPHAN (không match test nào): ${orphanProfiles.length}`)
    orphanProfiles.forEach(p => {
      console.log(`   - ${p.name} (testTypes: [${p.testTypes?.join(', ')}])`)
    })
    
    // 3.2 Duplicate profiles
    console.log(`\n❌ Profiles TRÙNG LẶP: ${duplicateProfiles.length}`)
    duplicateProfiles.forEach(item => {
      console.log(`   - ${item.profile.name} trùng với type "${item.type}"`)
    })
    
    // 3.3 Valid profiles
    console.log(`\n✅ Profiles VALID: ${Object.keys(validProfiles).length}`)
    for (const [type, profile] of Object.entries(validProfiles)) {
      console.log(`   - ${type}: ${profile.name}`)
    }
    
    // 3.4 Test types chưa có profile
    const typesWithoutProfile = realTestTypes.filter(type => !validProfiles[type])
    console.log(`\n⚠️ Test types CHƯA CÓ profile: ${typesWithoutProfile.length}`)
    typesWithoutProfile.forEach(type => {
      console.log(`   - ${type}`)
    })

    // ===== THỰC HIỆN CLEANUP =====
    console.log('\n' + '=' .repeat(50))
    console.log('🧹 THỰC HIỆN CLEANUP:')
    console.log('=' .repeat(50))

    // 4.1 Xóa orphan profiles
    if (orphanProfiles.length > 0) {
      const orphanIds = orphanProfiles.map(p => p._id)
      await ResultProfile.deleteMany({ _id: { $in: orphanIds } })
      console.log(`\n✅ Đã xóa ${orphanProfiles.length} orphan profiles`)
    }

    // 4.2 Xóa duplicate profiles
    if (duplicateProfiles.length > 0) {
      const duplicateIds = duplicateProfiles.map(item => item.profile._id)
      await ResultProfile.deleteMany({ _id: { $in: duplicateIds } })
      console.log(`✅ Đã xóa ${duplicateProfiles.length} duplicate profiles`)
    }

    // 4.3 Tạo profile cho types chưa có
    const createdProfiles = []
    for (const type of typesWithoutProfile) {
      const profile = await ResultProfile.createDefaultProfile(type)
      createdProfiles.push({ type, name: profile.name, layoutType: profile.layoutType })
    }
    
    if (createdProfiles.length > 0) {
      console.log(`✅ Đã tạo ${createdProfiles.length} profiles mới:`)
      createdProfiles.forEach(p => {
        console.log(`   - ${p.type}: ${p.name} (${p.layoutType})`)
      })
    }

    // ===== KẾT QUẢ CUỐI =====
    console.log('\n' + '=' .repeat(50))
    console.log('📊 KẾT QUẢ CUỐI CÙNG:')
    console.log('=' .repeat(50))

    const finalProfiles = await ResultProfile.find({})
    const finalTestTypes = await Test.distinct('type', { isActive: true })
    
    console.log(`\n📋 Test types trong DB: ${finalTestTypes.length}`)
    console.log(`🎨 Profiles còn lại: ${finalProfiles.length}`)
    
    // Kiểm tra mapping 1-1
    console.log('\n🔗 Mapping cuối cùng:')
    for (const type of finalTestTypes) {
      const matchingProfiles = finalProfiles.filter(p => p.testTypes?.includes(type))
      const status = matchingProfiles.length === 1 ? '✅' : (matchingProfiles.length === 0 ? '❌' : '⚠️')
      console.log(`   ${status} ${type}: ${matchingProfiles.length} profile(s)`)
      if (matchingProfiles.length > 0) {
        console.log(`      → ${matchingProfiles[0].name} (${matchingProfiles[0].layoutType})`)
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(50))
    console.log('📝 TÓM TẮT THAY ĐỔI:')
    console.log('=' .repeat(50))
    console.log(`   - Đã xóa: ${orphanProfiles.length + duplicateProfiles.length} profiles rác`)
    console.log(`   - Đã tạo: ${createdProfiles.length} profiles mới`)
    console.log(`   - Hiện có: ${finalProfiles.length} profiles cho ${finalTestTypes.length} test types`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
  }
}

cleanup()
