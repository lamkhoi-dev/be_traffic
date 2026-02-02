const express = require('express')
const router = express.Router()
const Settings = require('../models/Settings')

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

module.exports = router
