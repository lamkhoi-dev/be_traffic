const express = require('express')
const router = express.Router()
const Site = require('../models/Site')
const { generateSiteKey } = require('../utils/helpers')

// Get all sites
router.get('/', async (req, res) => {
  try {
    const sites = await Site.find().sort({ createdAt: -1 })
    res.json(sites)
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
    const { name, domain, url, searchKeyword, instruction, targetElement } = req.body
    
    const site = new Site({
      siteKey: generateSiteKey(),
      name,
      domain,
      url,
      searchKeyword,
      instruction,
      targetElement
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
    const site = await Site.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' })
    }
    res.json(site)
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
        : 0
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
