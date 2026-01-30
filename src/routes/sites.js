const express = require('express')
const router = express.Router()
const Site = require('../models/Site')
const { generateSiteKey } = require('../utils/helpers')

// Get all sites
router.get('/', async (req, res) => {
  try {
    const sites = await Site.find().sort({ createdAt: -1 })
    res.json({ success: true, sites })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get site by key (for widget)
router.get('/key/:siteKey', async (req, res) => {
  try {
    const site = await Site.findOne({ siteKey: req.params.siteKey, isActive: true })
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' })
    }
    res.json(site)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create new site
router.post('/', async (req, res) => {
  try {
    const { name, domain, url, searchKeyword, instruction, targetElement, quota, priority, step2Image, step3Image } = req.body
    
    const site = new Site({
      siteKey: generateSiteKey(),
      name,
      domain,
      url,
      searchKeyword,
      instruction,
      targetElement,
      step2Image: step2Image || '',
      step3Image: step3Image || '',
      quota: quota || 0,
      remainingQuota: quota || 0,  // Initialize remaining = quota
      priority: priority || 1
    })
    
    await site.save()
    
    res.status(201).json({
      success: true,
      site,
      embedCode: `<script src="${process.env.BASE_URL || 'http://localhost:5000'}/widget.js?id=${site.siteKey}"></script>`
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Update site
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body }
    
    // If quota is being updated, also update remainingQuota proportionally
    if (updateData.quota !== undefined) {
      const site = await Site.findById(req.params.id)
      if (site) {
        const oldQuota = site.quota || 0
        const newQuota = updateData.quota || 0
        
        if (oldQuota === 0) {
          // Was unlimited, now has quota - set remaining to full quota
          updateData.remainingQuota = newQuota
        } else if (newQuota === 0) {
          // Was limited, now unlimited
          updateData.remainingQuota = 0
        } else {
          // Adjust remaining proportionally or set to new quota if increasing
          const used = oldQuota - site.remainingQuota
          updateData.remainingQuota = Math.max(0, newQuota - used)
        }
      }
    }
    
    const site = await Site.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' })
    }
    res.json({ success: true, site })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Reset quota for a site
router.post('/:id/reset-quota', async (req, res) => {
  try {
    const { newQuota } = req.body
    const site = await Site.findById(req.params.id)
    
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' })
    }
    
    // Reset quota
    if (newQuota !== undefined) {
      site.quota = newQuota
      site.remainingQuota = newQuota
    } else {
      // Reset to original quota
      site.remainingQuota = site.quota
    }
    
    await site.save()
    
    res.json({ 
      success: true, 
      site,
      message: `Quota reset to ${site.remainingQuota}`
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete site
router.delete('/:id', async (req, res) => {
  try {
    await Site.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Site deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get site stats
router.get('/:id/stats', async (req, res) => {
  try {
    const site = await Site.findById(req.params.id)
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' })
    }
    
    res.json({
      totalVisits: site.totalVisits,
      totalCompleted: site.totalCompleted,
      completionRate: site.totalVisits > 0 
        ? ((site.totalCompleted / site.totalVisits) * 100).toFixed(2) 
        : 0,
      quota: site.quota,
      remainingQuota: site.remainingQuota,
      priority: site.priority
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
