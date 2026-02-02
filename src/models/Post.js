const mongoose = require('mongoose')

// Block types cho content linh hoạt
const blockSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'heading',      // Tiêu đề h2, h3, h4
      'paragraph',    // Đoạn văn
      'image',        // Ảnh với caption
      'gallery',      // Nhiều ảnh
      'list',         // Danh sách bullet/number
      'quote',        // Trích dẫn
      'code',         // Code block
      'embed',        // YouTube, TikTok, etc
      'callout',      // Box thông báo (info, warning, success, error)
      'divider',      // Đường kẻ ngang
      'table',        // Bảng dữ liệu
      'faq',          // FAQ accordion
      'button',       // CTA button
      'html'          // Custom HTML
    ]
  },
  // Heading
  level: { type: Number, min: 2, max: 6 }, // h2-h6
  
  // Common content
  content: { type: String },
  
  // Image
  src: { type: String },
  alt: { type: String },
  caption: { type: String },
  
  // Gallery
  images: [{
    src: { type: String },
    alt: { type: String },
    caption: { type: String }
  }],
  
  // List
  style: { type: String, enum: ['bullet', 'number', 'check'] },
  items: [{ type: String }],
  
  // Quote
  author: { type: String },
  
  // Code
  language: { type: String },
  
  // Embed
  url: { type: String },
  platform: { type: String, enum: ['youtube', 'tiktok', 'facebook', 'twitter', 'instagram', 'other'] },
  
  // Callout
  calloutType: { type: String, enum: ['info', 'warning', 'success', 'error', 'tip'] },
  title: { type: String },
  
  // Table
  headers: [{ type: String }],
  rows: [[{ type: String }]],
  
  // FAQ
  faqs: [{
    question: { type: String },
    answer: { type: String }
  }],
  
  // Button
  buttonText: { type: String },
  buttonUrl: { type: String },
  buttonStyle: { type: String, enum: ['primary', 'secondary', 'outline'] },
  
  // HTML
  htmlContent: { type: String }
}, { _id: true })

// SEO Schema
const seoSchema = new mongoose.Schema({
  metaTitle: { type: String, maxlength: 70 },
  metaDescription: { type: String, maxlength: 160 },
  keywords: [{ type: String }],
  canonicalUrl: { type: String },
  noIndex: { type: Boolean, default: false },
  noFollow: { type: Boolean, default: false },
  // Open Graph
  ogTitle: { type: String },
  ogDescription: { type: String },
  ogImage: { type: String },
  // Twitter Card
  twitterTitle: { type: String },
  twitterDescription: { type: String },
  twitterImage: { type: String },
  // Structured Data
  articleType: { type: String, enum: ['Article', 'BlogPosting', 'NewsArticle'], default: 'BlogPosting' },
  author: { type: String, default: 'IQ & EQ Test' }
}, { _id: false })

const postSchema = new mongoose.Schema({
  // Basic info
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    maxlength: 500,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  
  // Content blocks
  blocks: [blockSchema],
  
  // Categorization
  category: {
    type: String,
    required: true,
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
  },
  
  // SEO
  seo: {
    type: seoSchema,
    default: () => ({})
  },
  
  // Stats
  views: {
    type: Number,
    default: 0
  },
  readingTime: {
    type: Number,
    default: 0 // minutes
  },
  
  // Related
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  
  // Featured
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredOrder: {
    type: Number,
    default: 0
  },
  
  // Author info (optional)
  authorName: {
    type: String,
    default: 'Admin'
  },
  authorAvatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
})

// Indexes for performance
postSchema.index({ slug: 1 })
postSchema.index({ status: 1, publishedAt: -1 })
postSchema.index({ category: 1 })
postSchema.index({ tags: 1 })
postSchema.index({ isFeatured: 1, featuredOrder: 1 })
postSchema.index({ createdAt: -1 })

// Text search index
postSchema.index({ 
  title: 'text', 
  excerpt: 'text', 
  'blocks.content': 'text',
  tags: 'text'
})

// Auto-generate slug from title
postSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
  
  // Calculate reading time
  if (this.isModified('blocks')) {
    let wordCount = 0
    this.blocks.forEach(block => {
      if (block.content) {
        wordCount += block.content.split(/\s+/).length
      }
      if (block.items) {
        block.items.forEach(item => {
          wordCount += item.split(/\s+/).length
        })
      }
    })
    this.readingTime = Math.ceil(wordCount / 200) // 200 words per minute
  }
  
  next()
})

// Virtual for full URL
postSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`
})

// Method to increment view
postSchema.methods.incrementView = async function() {
  this.views += 1
  await this.save()
}

// Static method to get categories
postSchema.statics.getCategories = async function() {
  return this.distinct('category', { status: 'published' })
}

// Static method to get tags
postSchema.statics.getTags = async function() {
  const posts = await this.find({ status: 'published' }, 'tags')
  const tagCounts = {}
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

module.exports = mongoose.model('Post', postSchema)
