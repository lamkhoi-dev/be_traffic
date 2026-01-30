const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin'],
    default: 'admin'
  },
  lastLogin: Date
}, {
  timestamps: true
})

// Hash password before saving
adminSchema.pre('save', async function() {
  if (!this.isModified('passwordHash')) return
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10)
})

// Compare password method
adminSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash)
}

module.exports = mongoose.model('Admin', adminSchema)
