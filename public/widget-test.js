/**
 * Widget Test - Kiểm tra kết nối API
 * Chèn vào web bất kỳ để test
 */
(function() {
  'use strict';
  
  const API_BASE = 'https://betraffic-production.up.railway.app';
  
  // Tạo styles
  const styles = `
    .iq-widget-test {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .iq-widget-test-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 15px 25px;
      border-radius: 50px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .iq-widget-test-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }
    .iq-widget-test-popup {
      position: absolute;
      bottom: 60px;
      right: 0;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 20px;
      min-width: 280px;
      display: none;
    }
    .iq-widget-test-popup.show {
      display: block;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .iq-widget-test-title {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .iq-widget-test-status {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .iq-widget-test-status.success {
      background: #d4edda;
      color: #155724;
    }
    .iq-widget-test-status.error {
      background: #f8d7da;
      color: #721c24;
    }
    .iq-widget-test-status.loading {
      background: #fff3cd;
      color: #856404;
    }
    .iq-widget-test-info {
      font-size: 11px;
      color: #666;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
  `;
  
  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  // Create widget HTML
  const widget = document.createElement('div');
  widget.className = 'iq-widget-test';
  widget.innerHTML = `
    <div class="iq-widget-test-popup" id="iq-test-popup">
      <div class="iq-widget-test-title">
        🧪 Widget Test
      </div>
      <div class="iq-widget-test-status loading" id="iq-test-status">
        Đang kiểm tra kết nối...
      </div>
      <div class="iq-widget-test-info">
        <strong>API:</strong> ${API_BASE}<br>
        <strong>Time:</strong> <span id="iq-test-time">-</span>
      </div>
    </div>
    <button class="iq-widget-test-btn" id="iq-test-btn">
      <span>🔌</span>
      <span>Test Connection</span>
    </button>
  `;
  
  document.body.appendChild(widget);
  
  // Elements
  const btn = document.getElementById('iq-test-btn');
  const popup = document.getElementById('iq-test-popup');
  const status = document.getElementById('iq-test-status');
  const timeEl = document.getElementById('iq-test-time');
  
  let isOpen = false;
  
  // Toggle popup
  btn.addEventListener('click', async () => {
    isOpen = !isOpen;
    popup.classList.toggle('show', isOpen);
    
    if (isOpen) {
      await testConnection();
    }
  });
  
  // Test API connection
  async function testConnection() {
    status.className = 'iq-widget-test-status loading';
    status.innerHTML = '⏳ Đang gọi API...';
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      const latency = Date.now() - startTime;
      
      if (data.status === 'ok') {
        status.className = 'iq-widget-test-status success';
        status.innerHTML = `
          ✅ <strong>Kết nối thành công!</strong><br>
          <small>Latency: ${latency}ms</small><br>
          <small>Server time: ${new Date(data.timestamp).toLocaleString('vi-VN')}</small>
        `;
        timeEl.textContent = new Date().toLocaleTimeString('vi-VN');
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      status.className = 'iq-widget-test-status error';
      status.innerHTML = `
        ❌ <strong>Lỗi kết nối!</strong><br>
        <small>${error.message}</small>
      `;
      timeEl.textContent = 'Error';
    }
  }
  
  console.log('🧪 IQ Test Widget loaded from:', API_BASE);
})();
