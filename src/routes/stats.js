const express = require('express')
const router = express.Router()
const Session = require('../models/Session')
const Task = require('../models/Task')
const Site = require('../models/Site')
const Test = require('../models/Test')

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const totalSessions = await Session.countDocuments()
    const completedSessions = await Session.countDocuments({ status: 'completed' })
    const pendingTasks = await Session.countDocuments({ status: 'pending_task' })
    const totalSites = await Site.countDocuments({ isActive: true })
    const todaySessions = await Session.countDocuments({ createdAt: { $gte: today } })
    
    const successRate = totalSessions > 0 
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0

    // Get recent sessions
    const recentSessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('testId', 'name type')
      .lean()
    
    const formattedSessions = recentSessions.map(s => ({
      ...s,
      testName: s.testId?.name || 'N/A'
    }))

    res.json({
      stats: {
        totalSessions,
        completedSessions,
        pendingTasks,
        totalSites,
        todaySessions,
        successRate
      },
      recentSessions: formattedSessions
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Detailed stats for stats page
router.get('/detailed', async (req, res) => {
  try {
    const range = req.query.range || '7d'
    let days = 7
    if (range === '30d') days = 30
    if (range === '90d') days = 90
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Daily sessions
    const daily = await Session.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
    
    // Fill missing dates
    const dailyMap = new Map(daily.map(d => [d._id, d.count]))
    const filledDaily = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      filledDaily.push({
        date: dateStr,
        count: dailyMap.get(dateStr) || 0
      })
    }

    // Stats by test
    const byTest = await Session.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$testId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'tests',
          localField: '_id',
          foreignField: '_id',
          as: 'test'
        }
      },
      { $unwind: '$test' },
      {
        $project: {
          name: '$test.name',
          type: '$test.type',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ])

    // Stats by site
    const bySite = await Task.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$siteId',
          visits: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'sites',
          localField: '_id',
          foreignField: '_id',
          as: 'site'
        }
      },
      { $unwind: '$site' },
      {
        $project: {
          name: '$site.name',
          domain: '$site.domain',
          visits: 1
        }
      },
      { $sort: { visits: -1 } }
    ])

    // Totals
    const totalSessions = await Session.countDocuments({ createdAt: { $gte: startDate } })
    const completed = await Session.countDocuments({ status: 'completed', createdAt: { $gte: startDate } })
    const pending = await Session.countDocuments({ status: 'pending_task', createdAt: { $gte: startDate } })
    const completionRate = totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 0

    res.json({
      daily: filledDaily,
      byTest,
      bySite,
      totals: {
        totalSessions,
        completed,
        pending,
        completionRate
      }
    })
  } catch (error) {
    console.error('Detailed stats error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Overview stats
router.get('/overview', async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments()
    const completedSessions = await Session.countDocuments({ status: 'completed' })
    const totalTasks = await Task.countDocuments()
    const completedTasks = await Task.countDocuments({ status: 'completed' })
    const totalSites = await Site.countDocuments({ isActive: true })
    
    res.json({
      totalSessions,
      completedSessions,
      totalTasks,
      completedTasks,
      totalSites,
      completionRate: totalSessions > 0 
        ? ((completedSessions / totalSessions) * 100).toFixed(2)
        : 0
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Daily stats
router.get('/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const sessions = await Session.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ])
    
    res.json(sessions)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Stats by site
router.get('/sites', async (req, res) => {
  try {
    const sites = await Site.find({ isActive: true })
      .select('name domain totalVisits totalCompleted')
      .sort({ totalVisits: -1 })
    
    res.json(sites)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
