const express = require('express')
const router = express.Router()
const ResultProfile = require('../models/ResultProfile')

// ============ MIDDLEWARE ============

// Simple admin auth check
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  // In production, verify JWT token here
  next()
}

// ============ PUBLIC ROUTES ============

// GET /api/result-profiles/test-types - Get available test types
router.get('/test-types', async (req, res) => {
  try {
    const testTypes = ResultProfile.getAvailableTestTypes()
    res.json({ success: true, testTypes })
  } catch (error) {
    console.error('Error getting test types:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/result-profiles/by-test/:testType - Get profile for specific test type
router.get('/by-test/:testType', async (req, res) => {
  try {
    const { testType } = req.params
    const profile = await ResultProfile.getProfileForTestType(testType)
    res.json({ success: true, profile })
  } catch (error) {
    console.error('Error getting profile by test type:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============ ADMIN ROUTES ============

// GET /api/result-profiles - List all profiles
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { layoutType, testType, isActive } = req.query
    
    const filter = {}
    if (layoutType) filter.layoutType = layoutType
    if (testType) filter.testTypes = testType
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    
    const profiles = await ResultProfile.find(filter)
      .populate('inheritFrom', 'name layoutType')
      .sort({ isDefault: -1, updatedAt: -1 })
    
    res.json({ success: true, profiles })
  } catch (error) {
    console.error('Error listing profiles:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/result-profiles/:id - Get single profile
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
      .populate('inheritFrom', 'name layoutType testTypes')
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    res.json({ success: true, profile })
  } catch (error) {
    console.error('Error getting profile:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/result-profiles - Create new profile
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      testTypes,
      layoutType,
      scoreConfig,
      percentConfig,
      mbtiConfig,
      customConfig,
      displayOptions,
      theme,
      labels,
      inheritFrom,
      isDefault,
      isActive
    } = req.body
    
    if (!name || !testTypes || !layoutType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, testTypes, and layoutType are required' 
      })
    }
    
    // If setting as default, unset other defaults for same test types
    if (isDefault) {
      await ResultProfile.updateMany(
        { testTypes: { $in: testTypes }, isDefault: true },
        { isDefault: false }
      )
    }
    
    const profile = new ResultProfile({
      name,
      description,
      testTypes,
      layoutType,
      scoreConfig,
      percentConfig,
      mbtiConfig,
      customConfig,
      displayOptions,
      theme,
      labels,
      inheritFrom,
      isDefault: isDefault || false,
      isActive: isActive !== false
    })
    
    await profile.save()
    
    res.status(201).json({ success: true, profile })
  } catch (error) {
    console.error('Error creating profile:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/result-profiles/:id - Update profile
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    const updateFields = [
      'name', 'description', 'testTypes', 'layoutType',
      'scoreConfig', 'percentConfig', 'mbtiConfig', 'customConfig',
      'displayOptions', 'theme', 'labels', 'inheritFrom', 'isActive'
    ]
    
    for (const field of updateFields) {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field]
      }
    }
    
    // Handle isDefault specially
    if (req.body.isDefault === true && !profile.isDefault) {
      // Unset other defaults for same test types
      await ResultProfile.updateMany(
        { 
          _id: { $ne: profile._id },
          testTypes: { $in: profile.testTypes }, 
          isDefault: true 
        },
        { isDefault: false }
      )
      profile.isDefault = true
    } else if (req.body.isDefault === false) {
      profile.isDefault = false
    }
    
    profile.updatedBy = 'admin'
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/result-profiles/:id - Delete profile
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    // Don't allow deleting default profiles
    if (profile.isDefault) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete default profile. Set another profile as default first.' 
      })
    }
    
    // Check if any other profile inherits from this
    const dependentProfiles = await ResultProfile.find({ inheritFrom: profile._id })
    if (dependentProfiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${dependentProfiles.length} profile(s) inherit from this profile.`,
        dependentProfiles: dependentProfiles.map(p => ({ _id: p._id, name: p.name }))
      })
    }
    
    await profile.deleteOne()
    
    res.json({ success: true, message: 'Profile deleted' })
  } catch (error) {
    console.error('Error deleting profile:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/result-profiles/:id/clone - Clone profile
router.post('/:id/clone', requireAdmin, async (req, res) => {
  try {
    const sourceProfile = await ResultProfile.findById(req.params.id)
    
    if (!sourceProfile) {
      return res.status(404).json({ success: false, message: 'Source profile not found' })
    }
    
    const { name, testTypes } = req.body
    
    // Create clone
    const cloneData = sourceProfile.toObject()
    delete cloneData._id
    delete cloneData.createdAt
    delete cloneData.updatedAt
    
    cloneData.name = name || `${sourceProfile.name} (Copy)`
    cloneData.testTypes = testTypes || sourceProfile.testTypes
    cloneData.isDefault = false // Clones are never default
    cloneData.createdBy = 'admin'
    
    const clonedProfile = new ResultProfile(cloneData)
    await clonedProfile.save()
    
    res.status(201).json({ success: true, profile: clonedProfile })
  } catch (error) {
    console.error('Error cloning profile:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/result-profiles/:id/set-default - Set as default for test types
router.post('/:id/set-default', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    // Unset other defaults for same test types
    await ResultProfile.updateMany(
      { 
        _id: { $ne: profile._id },
        testTypes: { $in: profile.testTypes }, 
        isDefault: true 
      },
      { isDefault: false }
    )
    
    profile.isDefault = true
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    console.error('Error setting default:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/result-profiles/create-defaults - Create default profiles for all test types
router.post('/create-defaults', requireAdmin, async (req, res) => {
  try {
    const testTypes = ResultProfile.getAvailableTestTypes()
    const created = []
    const skipped = []
    
    for (const { value: testType, layoutType } of testTypes) {
      // Check if profile already exists
      const existing = await ResultProfile.findOne({ testTypes: testType })
      
      if (existing) {
        skipped.push(testType)
        continue
      }
      
      const profile = await ResultProfile.createDefaultProfile(testType)
      created.push({ testType, profileId: profile._id, name: profile.name })
    }
    
    res.json({ 
      success: true, 
      message: `Created ${created.length} profiles, skipped ${skipped.length}`,
      created,
      skipped
    })
  } catch (error) {
    console.error('Error creating defaults:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============ SCORE CONFIG ROUTES ============

// POST /api/result-profiles/:id/score-level - Add score level
router.post('/:id/score-level', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    if (!profile.scoreConfig) {
      profile.scoreConfig = { scoreLevels: [], adviceRanges: [] }
    }
    
    profile.scoreConfig.scoreLevels.push(req.body)
    // Sort by minScore descending
    profile.scoreConfig.scoreLevels.sort((a, b) => b.minScore - a.minScore)
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/result-profiles/:id/score-level/:levelId - Update score level
router.put('/:id/score-level/:levelId', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    const levelIndex = profile.scoreConfig.scoreLevels.findIndex(
      l => l._id.toString() === req.params.levelId
    )
    
    if (levelIndex === -1) {
      return res.status(404).json({ success: false, message: 'Score level not found' })
    }
    
    Object.assign(profile.scoreConfig.scoreLevels[levelIndex], req.body)
    profile.scoreConfig.scoreLevels.sort((a, b) => b.minScore - a.minScore)
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/result-profiles/:id/score-level/:levelId - Delete score level
router.delete('/:id/score-level/:levelId', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    profile.scoreConfig.scoreLevels = profile.scoreConfig.scoreLevels.filter(
      l => l._id.toString() !== req.params.levelId
    )
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============ PERCENT CONFIG ROUTES ============

// POST /api/result-profiles/:id/percent-range - Add percent range
router.post('/:id/percent-range', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    if (!profile.percentConfig) {
      profile.percentConfig = { percentRanges: [] }
    }
    
    profile.percentConfig.percentRanges.push(req.body)
    profile.percentConfig.percentRanges.sort((a, b) => b.minPercent - a.minPercent)
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/result-profiles/:id/percent-range/:rangeId - Update percent range
router.put('/:id/percent-range/:rangeId', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    const rangeIndex = profile.percentConfig.percentRanges.findIndex(
      r => r._id.toString() === req.params.rangeId
    )
    
    if (rangeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Percent range not found' })
    }
    
    Object.assign(profile.percentConfig.percentRanges[rangeIndex], req.body)
    profile.percentConfig.percentRanges.sort((a, b) => b.minPercent - a.minPercent)
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/result-profiles/:id/percent-range/:rangeId - Delete percent range
router.delete('/:id/percent-range/:rangeId', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    profile.percentConfig.percentRanges = profile.percentConfig.percentRanges.filter(
      r => r._id.toString() !== req.params.rangeId
    )
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ============ ADVICE RANGE ROUTES ============

// POST /api/result-profiles/:id/advice-range - Add advice range
router.post('/:id/advice-range', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    if (!profile.scoreConfig) {
      profile.scoreConfig = { scoreLevels: [], adviceRanges: [] }
    }
    
    profile.scoreConfig.adviceRanges.push(req.body)
    profile.scoreConfig.adviceRanges.sort((a, b) => b.minPercent - a.minPercent)
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/result-profiles/:id/advice-range/:rangeId - Update advice range
router.put('/:id/advice-range/:rangeId', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    const rangeIndex = profile.scoreConfig.adviceRanges.findIndex(
      r => r._id.toString() === req.params.rangeId
    )
    
    if (rangeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Advice range not found' })
    }
    
    Object.assign(profile.scoreConfig.adviceRanges[rangeIndex], req.body)
    profile.scoreConfig.adviceRanges.sort((a, b) => b.minPercent - a.minPercent)
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/result-profiles/:id/advice-range/:rangeId - Delete advice range
router.delete('/:id/advice-range/:rangeId', requireAdmin, async (req, res) => {
  try {
    const profile = await ResultProfile.findById(req.params.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' })
    }
    
    profile.scoreConfig.adviceRanges = profile.scoreConfig.adviceRanges.filter(
      r => r._id.toString() !== req.params.rangeId
    )
    await profile.save()
    
    res.json({ success: true, profile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
