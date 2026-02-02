const express = require('express')
const router = express.Router()
const Post = require('../models/Post')

// Helper: Generate unique slug
const generateUniqueSlug = async (title, excludeId = null) => {
  let slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  let uniqueSlug = slug
  let counter = 1
  
  while (true) {
    const query = { slug: uniqueSlug }
    if (excludeId) {
      query._id = { $ne: excludeId }
    }
    const existing = await Post.findOne(query)
    if (!existing) break
    uniqueSlug = `${slug}-${counter}`
    counter++
  }
  
  return uniqueSlug
}

// ==================== PUBLIC ROUTES ====================

// GET /posts - List published posts with pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      search,
      featured
    } = req.query
    
    const query = { status: 'published' }
    
    // Filter by category
    if (category) {
      query.category = category
    }
    
    // Filter by tag
    if (tag) {
      query.tags = tag
    }
    
    // Search
    if (search) {
      query.$text = { $search: search }
    }
    
    // Featured only
    if (featured === 'true') {
      query.isFeatured = true
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [posts, total] = await Promise.all([
      Post.find(query)
        .select('title slug excerpt thumbnail category tags publishedAt readingTime views isFeatured authorName')
        .sort(featured === 'true' ? { featuredOrder: 1 } : { publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Post.countDocuments(query)
    ])
    
    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /posts/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Post.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    
    res.json({ 
      success: true, 
      categories: categories.map(c => ({ name: c._id, count: c.count }))
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /posts/tags - Get all tags with counts
router.get('/tags', async (req, res) => {
  try {
    const tags = await Post.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ])
    
    res.json({ 
      success: true, 
      tags: tags.map(t => ({ name: t._id, count: t.count }))
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /posts/related/:id - Get related posts
router.get('/related/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }
    
    // Find posts with same category or tags
    const relatedPosts = await Post.find({
      _id: { $ne: post._id },
      status: 'published',
      $or: [
        { category: post.category },
        { tags: { $in: post.tags } }
      ]
    })
    .select('title slug excerpt thumbnail category publishedAt readingTime')
    .sort({ publishedAt: -1 })
    .limit(4)
    .lean()
    
    res.json({ success: true, posts: relatedPosts })
  } catch (error) {
    console.error('Error fetching related posts:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /posts/:slug - Get single post by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ 
      slug: req.params.slug,
      status: 'published'
    }).lean()
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }
    
    // Increment view count (non-blocking)
    Post.updateOne({ _id: post._id }, { $inc: { views: 1 } }).exec()
    
    res.json({ success: true, post })
  } catch (error) {
    console.error('Error fetching post:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// ==================== ADMIN ROUTES ====================

// GET /posts/admin/list - List all posts for admin
router.get('/admin/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, search } = req.query
    
    const query = {}
    if (status && status !== 'all') query.status = status
    if (category && category !== 'all') query.category = category
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ]
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [posts, total] = await Promise.all([
      Post.find(query)
        .select('title slug excerpt thumbnail category status publishedAt createdAt views isFeatured')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Post.countDocuments(query)
    ])
    
    // Get status counts
    const statusCounts = await Post.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    
    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count
        return acc
      }, {})
    })
  } catch (error) {
    console.error('Error fetching admin posts:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /posts/admin/:id - Get single post for editing
router.get('/admin/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean()
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }
    
    res.json({ success: true, post })
  } catch (error) {
    console.error('Error fetching post for edit:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST /posts - Create new post
router.post('/', async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      thumbnail,
      blocks,
      category,
      tags,
      status,
      scheduledAt,
      seo,
      isFeatured,
      featuredOrder,
      authorName
    } = req.body
    
    console.log('Creating post with data:', { title, status, seo })
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' })
    }
    
    // Generate unique slug
    const finalSlug = slug || await generateUniqueSlug(title)
    
    const postData = {
      title,
      slug: finalSlug,
      excerpt: excerpt || '',
      thumbnail: thumbnail || '',
      blocks: blocks || [],
      category: category || 'general',
      tags: tags || [],
      status: status || 'draft',
      publishedAt: status === 'published' ? new Date() : null,
      scheduledAt: status === 'scheduled' ? scheduledAt : null,
      isFeatured: isFeatured || false,
      featuredOrder: featuredOrder || 0,
      authorName: authorName || 'Admin'
    }
    
    // Only add seo if it has valid content
    if (seo && Object.keys(seo).length > 0) {
      postData.seo = seo
    }
    
    const post = new Post(postData)
    
    await post.save()
    
    res.status(201).json({ 
      success: true, 
      message: 'Post created successfully',
      post 
    })
  } catch (error) {
    console.error('Error creating post:', error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Slug already exists' })
    }
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PUT /posts/:id - Update post
router.put('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }
    
    const {
      title,
      slug,
      excerpt,
      thumbnail,
      blocks,
      category,
      tags,
      status,
      scheduledAt,
      seo,
      isFeatured,
      featuredOrder,
      authorName
    } = req.body
    
    // Update fields
    if (title) post.title = title
    if (slug && slug !== post.slug) {
      post.slug = await generateUniqueSlug(slug, post._id)
    }
    if (excerpt !== undefined) post.excerpt = excerpt
    if (thumbnail !== undefined) post.thumbnail = thumbnail
    if (blocks) post.blocks = blocks
    if (category) post.category = category
    if (tags) post.tags = tags
    if (seo && Object.keys(seo).length > 0) {
      post.seo = { ...post.seo, ...seo }
    }
    if (isFeatured !== undefined) post.isFeatured = isFeatured
    if (featuredOrder !== undefined) post.featuredOrder = featuredOrder
    if (authorName !== undefined) post.authorName = authorName
    
    // Handle status change
    if (status && status !== post.status) {
      post.status = status
      if (status === 'published' && !post.publishedAt) {
        post.publishedAt = new Date()
      }
      if (status === 'scheduled') {
        post.scheduledAt = scheduledAt
      }
    }
    
    await post.save()
    
    res.json({ 
      success: true, 
      message: 'Post updated successfully',
      post 
    })
  } catch (error) {
    console.error('Error updating post:', error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Slug already exists' })
    }
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// DELETE /posts/:id - Delete post
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id)
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }
    
    res.json({ success: true, message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST /posts/:id/duplicate - Duplicate post
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await Post.findById(req.params.id).lean()
    
    if (!original) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }
    
    const newSlug = await generateUniqueSlug(original.title + ' copy')
    
    const duplicate = new Post({
      ...original,
      _id: undefined,
      title: original.title + ' (Copy)',
      slug: newSlug,
      status: 'draft',
      publishedAt: null,
      views: 0,
      createdAt: undefined,
      updatedAt: undefined
    })
    
    await duplicate.save()
    
    res.json({ 
      success: true, 
      message: 'Post duplicated successfully',
      post: duplicate 
    })
  } catch (error) {
    console.error('Error duplicating post:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST /posts/:id/toggle-featured - Toggle featured status
router.post('/:id/toggle-featured', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' })
    }
    
    post.isFeatured = !post.isFeatured
    await post.save()
    
    res.json({ 
      success: true, 
      message: post.isFeatured ? 'Đã đánh dấu nổi bật' : 'Đã bỏ đánh dấu nổi bật',
      isFeatured: post.isFeatured
    })
  } catch (error) {
    console.error('Error toggling featured:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /posts/sitemap - Generate sitemap data
router.get('/sitemap/data', async (req, res) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .select('slug updatedAt')
      .sort({ updatedAt: -1 })
      .lean()
    
    res.json({ 
      success: true, 
      urls: posts.map(p => ({
        loc: `/blog/${p.slug}`,
        lastmod: p.updatedAt.toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.8
      }))
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router
