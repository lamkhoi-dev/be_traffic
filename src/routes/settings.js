const express = require('express')
const router = express.Router()
const Settings = require('../models/Settings')
const ResultSettings = require('../models/ResultSettings')

// Default content for terms page
const defaultTerms = {
  title: 'Điều Khoản Sử Dụng',
  lastUpdated: new Date().toLocaleDateString('vi-VN'),
  sections: [
    {
      icon: 'check',
      title: '1. Chấp nhận điều khoản',
      content: 'Bằng việc truy cập và sử dụng website IQ & EQ Test, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng dịch vụ của chúng tôi.'
    },
    {
      icon: 'user',
      title: '2. Điều kiện sử dụng',
      content: '• Bạn phải từ 13 tuổi trở lên để sử dụng dịch vụ\n• Bạn chịu trách nhiệm bảo mật thông tin tài khoản của mình\n• Không được sử dụng dịch vụ cho mục đích bất hợp pháp\n• Không được cố gắng can thiệp hoặc phá hoại hệ thống'
    },
    {
      icon: 'shield',
      title: '3. Quyền sở hữu trí tuệ',
      content: 'Tất cả nội dung trên website bao gồm nhưng không giới hạn: văn bản, đồ họa, logo, hình ảnh, câu hỏi trắc nghiệm, thuật toán đánh giá đều thuộc quyền sở hữu của IQ & EQ Test hoặc các đối tác được cấp phép. Bạn không được sao chép, phân phối hoặc sử dụng cho mục đích thương mại mà không có sự đồng ý bằng văn bản.'
    },
    {
      icon: 'info',
      title: '4. Giới hạn trách nhiệm',
      content: '• Kết quả bài test chỉ mang tính chất tham khảo, không thay thế đánh giá chuyên môn\n• Chúng tôi không chịu trách nhiệm về các quyết định dựa trên kết quả test\n• Dịch vụ được cung cấp "nguyên trạng" không có bảo đảm về tính chính xác tuyệt đối\n• Chúng tôi có quyền thay đổi hoặc ngừng dịch vụ bất cứ lúc nào'
    },
    {
      icon: 'check',
      title: '5. Thay đổi điều khoản',
      content: 'Chúng tôi có quyền cập nhật các điều khoản này bất cứ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới. Chúng tôi khuyến khích bạn thường xuyên kiểm tra trang này để cập nhật thông tin mới nhất.'
    }
  ]
}

// Default content for privacy page
const defaultPrivacy = {
  title: 'Chính Sách Bảo Mật',
  lastUpdated: new Date().toLocaleDateString('vi-VN'),
  sections: [
    {
      icon: 'database',
      title: '1. Thông tin chúng tôi thu thập',
      content: 'Chúng tôi thu thập các loại thông tin sau để cung cấp dịch vụ tốt hơn:\n\n• Thông tin thiết bị: Loại trình duyệt, hệ điều hành, địa chỉ IP\n• Dữ liệu sử dụng: Các bài test đã làm, điểm số, thời gian hoàn thành\n• Thông tin kỹ thuật: Device fingerprint để ngăn chặn gian lận\n\nChúng tôi KHÔNG thu thập thông tin cá nhân nhạy cảm như tên thật, địa chỉ, số điện thoại trừ khi bạn tự nguyện cung cấp.'
    },
    {
      icon: 'lock',
      title: '2. Cách chúng tôi sử dụng thông tin',
      content: 'Thông tin thu thập được sử dụng để:\n\n• Cung cấp và cải thiện dịch vụ test IQ, EQ\n• Phân tích xu hướng và tạo thống kê ẩn danh\n• Ngăn chặn gian lận và đảm bảo tính công bằng\n• Cá nhân hóa trải nghiệm người dùng\n• Gửi thông báo về kết quả test (nếu được yêu cầu)'
    },
    {
      icon: 'cookie',
      title: '3. Cookie và công nghệ theo dõi',
      content: 'Website sử dụng cookies và localStorage để:\n\n• Lưu trữ tiến trình làm bài test\n• Ghi nhớ cài đặt người dùng\n• Phân tích lưu lượng truy cập (Google Analytics)\n• Ngăn chặn việc làm lại test nhiều lần\n\nBạn có thể tắt cookies trong trình duyệt, nhưng một số tính năng có thể không hoạt động đúng.'
    },
    {
      icon: 'shield',
      title: '4. Bảo mật dữ liệu',
      content: 'Chúng tôi cam kết bảo vệ dữ liệu của bạn bằng:\n\n• Mã hóa SSL/TLS cho tất cả kết nối\n• Lưu trữ dữ liệu trên máy chủ bảo mật\n• Giới hạn quyền truy cập nội bộ\n• Không bán hoặc chia sẻ dữ liệu với bên thứ ba\n• Xóa dữ liệu session sau 30 ngày không hoạt động'
    },
    {
      icon: 'user',
      title: '5. Quyền của bạn',
      content: 'Bạn có quyền:\n\n• Truy cập: Yêu cầu bản sao dữ liệu của bạn\n• Chỉnh sửa: Yêu cầu sửa thông tin không chính xác\n• Xóa: Yêu cầu xóa dữ liệu của bạn\n• Phản đối: Từ chối việc sử dụng dữ liệu cho mục đích marketing\n\nĐể thực hiện các quyền này, vui lòng liên hệ với chúng tôi qua email.'
    },
    {
      icon: 'email',
      title: '6. Liên hệ về bảo mật',
      content: 'Nếu bạn có câu hỏi hoặc lo ngại về chính sách bảo mật, vui lòng liên hệ:\n\n📧 Email: privacy@iqeqtest.com\n🌐 Website: iqeqtest.com/contact\n\nChúng tôi sẽ phản hồi trong vòng 48 giờ làm việc.'
    }
  ]
}

// GET settings by key (public)
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params
    
    if (!['terms', 'privacy', 'contact', 'about'].includes(key)) {
      return res.status(400).json({ message: 'Invalid settings key' })
    }
    
    let settings = await Settings.findOne({ key })
    
    // Return default content if not found
    if (!settings) {
      const defaults = {
        terms: defaultTerms,
        privacy: defaultPrivacy
      }
      return res.json({ content: defaults[key] || null })
    }
    
    res.json({ content: settings.content })
  } catch (error) {
    console.error('Error fetching settings:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT update settings (admin only)
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const { content } = req.body
    
    if (!['terms', 'privacy', 'contact', 'about'].includes(key)) {
      return res.status(400).json({ message: 'Invalid settings key' })
    }
    
    if (!content || !content.title || !content.sections) {
      return res.status(400).json({ message: 'Invalid content structure' })
    }
    
    // Update lastUpdated
    content.lastUpdated = new Date().toLocaleDateString('vi-VN')
    
    const settings = await Settings.findOneAndUpdate(
      { key },
      { 
        key,
        content,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    )
    
    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      content: settings.content 
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET all settings (admin only)
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.find({})
    
    // Build response with defaults for missing keys
    const allSettings = {
      terms: settings.find(s => s.key === 'terms')?.content || defaultTerms,
      privacy: settings.find(s => s.key === 'privacy')?.content || defaultPrivacy
    }
    
    res.json(allSettings)
  } catch (error) {
    console.error('Error fetching all settings:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ==================== RESULT SETTINGS ====================

// GET result settings
router.get('/result/config', async (req, res) => {
  try {
    const settings = await ResultSettings.getSettings()
    res.json({ success: true, settings })
  } catch (error) {
    console.error('Error fetching result settings:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PUT update result settings
router.put('/result/config', async (req, res) => {
  try {
    const { 
      pageTitle,
      scoreLevels,
      adviceRanges,
      comparison,
      labels,
      colors
    } = req.body
    
    let settings = await ResultSettings.findOne({ key: 'result_config' })
    
    if (!settings) {
      settings = await ResultSettings.getSettings() // Creates default
    }
    
    // Update fields
    if (pageTitle !== undefined) settings.pageTitle = pageTitle
    if (scoreLevels !== undefined) settings.scoreLevels = scoreLevels
    if (adviceRanges !== undefined) settings.adviceRanges = adviceRanges
    if (comparison !== undefined) settings.comparison = comparison
    if (labels !== undefined) settings.labels = { ...settings.labels, ...labels }
    if (colors !== undefined) settings.colors = { ...settings.colors, ...colors }
    
    settings.updatedAt = new Date()
    await settings.save()
    
    res.json({ 
      success: true, 
      message: 'Result settings updated successfully',
      settings 
    })
  } catch (error) {
    console.error('Error updating result settings:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST add new score level
router.post('/result/score-level', async (req, res) => {
  try {
    const { minScore, maxScore, level, emoji, description, strengths, improvements } = req.body
    
    if (minScore === undefined || maxScore === undefined || !level || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'minScore, maxScore, level, and description are required' 
      })
    }
    
    const settings = await ResultSettings.getSettings()
    
    settings.scoreLevels.push({
      minScore,
      maxScore,
      level,
      emoji: emoji || '⭐',
      description,
      strengths: strengths || [],
      improvements: improvements || []
    })
    
    // Sort by minScore descending
    settings.scoreLevels.sort((a, b) => b.minScore - a.minScore)
    
    await settings.save()
    
    res.json({ 
      success: true, 
      message: 'Score level added successfully',
      settings 
    })
  } catch (error) {
    console.error('Error adding score level:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PUT update specific score level
router.put('/result/score-level/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const settings = await ResultSettings.getSettings()
    
    const levelIndex = settings.scoreLevels.findIndex(l => l._id.toString() === id)
    if (levelIndex === -1) {
      return res.status(404).json({ success: false, message: 'Score level not found' })
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        settings.scoreLevels[levelIndex][key] = updates[key]
      }
    })
    
    // Re-sort
    settings.scoreLevels.sort((a, b) => b.minScore - a.minScore)
    
    await settings.save()
    
    res.json({ 
      success: true, 
      message: 'Score level updated successfully',
      settings 
    })
  } catch (error) {
    console.error('Error updating score level:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// DELETE score level
router.delete('/result/score-level/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const settings = await ResultSettings.getSettings()
    
    settings.scoreLevels = settings.scoreLevels.filter(l => l._id.toString() !== id)
    
    await settings.save()
    
    res.json({ 
      success: true, 
      message: 'Score level deleted successfully',
      settings 
    })
  } catch (error) {
    console.error('Error deleting score level:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST add advice range
router.post('/result/advice-range', async (req, res) => {
  try {
    const { minPercent, maxPercent, advices } = req.body
    
    if (minPercent === undefined || maxPercent === undefined || !advices) {
      return res.status(400).json({ 
        success: false, 
        message: 'minPercent, maxPercent, and advices are required' 
      })
    }
    
    const settings = await ResultSettings.getSettings()
    
    settings.adviceRanges.push({
      minPercent,
      maxPercent,
      advices
    })
    
    // Sort by minPercent descending
    settings.adviceRanges.sort((a, b) => b.minPercent - a.minPercent)
    
    await settings.save()
    
    res.json({ 
      success: true, 
      message: 'Advice range added successfully',
      settings 
    })
  } catch (error) {
    console.error('Error adding advice range:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// PUT update advice range
router.put('/result/advice-range/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    const settings = await ResultSettings.getSettings()
    
    const rangeIndex = settings.adviceRanges.findIndex(r => r._id.toString() === id)
    if (rangeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Advice range not found' })
    }
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        settings.adviceRanges[rangeIndex][key] = updates[key]
      }
    })
    
    settings.adviceRanges.sort((a, b) => b.minPercent - a.minPercent)
    
    await settings.save()
    
    res.json({ 
      success: true, 
      message: 'Advice range updated successfully',
      settings 
    })
  } catch (error) {
    console.error('Error updating advice range:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// DELETE advice range
router.delete('/result/advice-range/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const settings = await ResultSettings.getSettings()
    
    settings.adviceRanges = settings.adviceRanges.filter(r => r._id.toString() !== id)
    
    await settings.save()
    
    res.json({ 
      success: true, 
      message: 'Advice range deleted successfully',
      settings 
    })
  } catch (error) {
    console.error('Error deleting advice range:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST reset to default settings
router.post('/result/reset', async (req, res) => {
  try {
    await ResultSettings.deleteOne({ key: 'result_config' })
    const settings = await ResultSettings.getSettings() // Creates new default
    
    res.json({ 
      success: true, 
      message: 'Result settings reset to default',
      settings 
    })
  } catch (error) {
    console.error('Error resetting result settings:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router
