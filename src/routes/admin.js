const express = require('express')
const jwt = require('jsonwebtoken')
const Admin = require('../models/Admin')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const decoded = jwt.verify(token, JWT_SECRET)
    const admin = await Admin.findById(decoded.id)
    if (!admin) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    
    req.admin = admin
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    const admin = await Admin.findOne({ username })
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const isValid = await admin.comparePassword(password)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    // Update last login
    admin.lastLogin = new Date()
    await admin.save()
    
    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get current admin
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    admin: {
      id: req.admin._id,
      username: req.admin.username,
      role: req.admin.role
    }
  })
})

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    const isValid = await req.admin.comparePassword(currentPassword)
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    
    req.admin.passwordHash = newPassword
    await req.admin.save()
    
    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create initial admin (only if no admins exist)
router.post('/setup', async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments()
    if (adminCount > 0) {
      return res.status(400).json({ error: 'Admin already exists' })
    }
    
    const { username, password } = req.body
    const admin = await Admin.create({
      username,
      passwordHash: password,
      role: 'super_admin'
    })
    
    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({
      message: 'Admin created successfully',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Setup error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
module.exports.authMiddleware = authMiddleware
