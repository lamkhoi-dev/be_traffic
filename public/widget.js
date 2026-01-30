/**
 * Traffic Boost Widget - Stealth Mode v2.0
 * Ngụy trang thành dòng chữ nhỏ màu trắng ở footer
 * Chỉ hiện khi có task pending cho device fingerprint
 * 
 * Usage: <script src="https://yourserver.com/widget.js?siteKey=SITE_KEY"></script>
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '2.0.3'; // v2.0.3 - Footer text-only placement
  const COUNTDOWN_SECONDS = 60;
  
  // API Base - Always use production Railway URL
  const API_BASE = 'https://betraffic-production.up.railway.app';

  // Get site key from script URL
  const getSiteKey = () => {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src.includes('widget.js')) {
        const url = new URL(scripts[i].src);
        return url.searchParams.get('siteKey') || url.searchParams.get('id');
      }
    }
    return null;
  };

  // Generate device fingerprint (cross-browser compatible on same device)
  // Chỉ dùng các thuộc tính ỔN ĐỊNH - không thay đổi theo zoom/cửa sổ
  // ĐÃ BỎ: devicePixelRatio vì nó thay đổi theo browser zoom level
  const getFingerprint = () => {
    const dataArray = [
      screen.width,           // Độ phân giải màn hình - ổn định
      screen.height,          // Độ phân giải màn hình - ổn định
      screen.colorDepth,      // Độ sâu màu - phần cứng
      Intl.DateTimeFormat().resolvedOptions().timeZone,  // Timezone - hệ thống
      new Date().getTimezoneOffset(),  // Timezone offset - hệ thống
      navigator.hardwareConcurrency || 0,  // CPU cores - phần cứng
      navigator.maxTouchPoints || 0   // Touch support - phần cứng
    ];
    
    const data = dataArray.join('|');
    
    // Debug log để xem raw data
    console.log('[Widget DEBUG] Fingerprint raw data:', {
      screenWidth: screen.width,
      screenHeight: screen.height,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      joinedString: data
    });

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const fp = 'FP_' + Math.abs(hash).toString(36).toUpperCase();
    console.log('[Widget DEBUG] Generated fingerprint:', fp);
    return fp;
  };

  // Logger
  const log = (msg, data = null) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    if (data) {
      console.log(`[Widget ${timestamp}] ${msg}`, data);
    } else {
      console.log(`[Widget ${timestamp}] ${msg}`);
    }
  };

  // CSS Styles - Footer text-only
  const styles = `
    .tbw-stealth {
      position: static;
      z-index: 99999;
      font-family: Arial, sans-serif;
      background: transparent;
      border-top: none;
      padding: 6px 0 0;
      display: block;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }

    .tbw-stealth-trigger {
      font-size: 12px;
      color: inherit;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      font-weight: 600;
      text-decoration: underline;
    }

    .tbw-stealth-trigger:hover {
      color: #667eea;
    }

    .tbw-popup {
      display: none;
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f1220;
      border-radius: 10px;
      padding: 12px 14px;
      min-width: 160px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.45);
      border: 1px solid rgba(102, 126, 234, 0.25);
      z-index: 100000;
      color: white;
      font-family: Arial, sans-serif;
    }

    .tbw-popup.show {
      display: block;
      animation: tbw-fadeIn 0.3s ease;
    }

    @keyframes tbw-fadeIn {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    .tbw-popup-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 6px;
    }

    .tbw-popup-close {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .tbw-popup-close:hover {
      color: #fff;
    }

    .tbw-countdown-display {
      text-align: center;
      padding: 6px 0 2px;
    }

    .tbw-countdown-number {
      font-size: 28px;
      font-weight: 700;
      color: #667eea;
    }

    .tbw-progress {
      height: 3px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      margin: 8px 0 4px;
      overflow: hidden;
    }

    .tbw-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 1s linear;
    }

    .tbw-code-display {
      text-align: center;
      margin: 6px 0 2px;
    }

    .tbw-code {
      font-family: monospace;
      font-size: 22px;
      font-weight: 700;
      color: #8ab4ff;
      letter-spacing: 2px;
      cursor: pointer;
      user-select: none;
    }

    .tbw-code.copied {
      color: #10b981;
    }

    .tbw-hidden {
      display: none !important;
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Widget class
  class TrafficWidget {
    constructor() {
      this.siteKey = getSiteKey();
      this.fingerprint = getFingerprint();
      this.task = null;
      this.countdown = COUNTDOWN_SECONDS;
      this.intervalId = null;
      this.isPopupOpen = false;
      
      log('Widget initialized', {
        siteKey: this.siteKey,
        fingerprint: this.fingerprint,
        apiBase: API_BASE
      });
    }

    async init() {
      if (!this.siteKey) {
        log('❌ No siteKey found in URL');
        return;
      }

      // Chỉ hiện widget khi có task (cùng thiết bị/fingerprint)
      const hasTask = await this.checkTask();
      if (hasTask) {
        this.renderWidget();
      } else {
        log('Widget hidden - no pending task for this device');
      }
    }

    async checkTask() {
      try {
        log(`Checking for pending task with fingerprint: ${this.fingerprint}`);
        
        const response = await fetch(`${API_BASE}/api/tasks/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fingerprint: this.fingerprint,
            siteKey: this.siteKey
          })
        });

        const data = await response.json();
        log('Task check response:', data);

        if (data.hasTask && data.task) {
          this.task = data.task;
          return true;
        } else {
          log(`No pending task for fingerprint: ${this.fingerprint} on site: ${this.siteKey}`);
          return false;
        }
      } catch (error) {
        log('❌ Error checking task:', error.message);
        return false;
      }
    }

    renderWidget() {
      log('Rendering footer text widget...');

      // Create container
      const container = document.createElement('div');
      container.className = 'tbw-stealth';
      container.id = 'tbw-widget';

      container.innerHTML = `
        <button class="tbw-stealth-trigger" id="tbw-trigger">Mã Code</button>
        <div class="tbw-popup" id="tbw-popup">
          <div class="tbw-popup-header">
            <button class="tbw-popup-close" id="tbw-close">×</button>
          </div>
          <div id="tbw-content">
            <!-- Content will be injected here -->
          </div>
        </div>
      `;

      const footer = document.querySelector('footer');
      if (footer) {
        footer.appendChild(container);
      } else {
        document.body.appendChild(container);
      }

      // Event listeners
      document.getElementById('tbw-trigger').addEventListener('click', () => this.openPopup());
      document.getElementById('tbw-close').addEventListener('click', () => this.closePopup());

      log('Widget rendered - footer text');
    }

    async openPopup() {
      const popup = document.getElementById('tbw-popup');
      popup.classList.add('show');
      this.isPopupOpen = true;
      
      // Check task khi mở popup
      const hasTask = await this.checkTask();
      
      if (!hasTask) {
        // Không có task, hiện thông báo
        this.showNoTask();
        return;
      }
      
      // Luôn đếm ngược client-side, không check task.code
      // Nếu đã có code trong localStorage thì hiện luôn
      const savedCode = localStorage.getItem(`tbw_code_${this.task._id}`);
      if (savedCode) {
        this.showCode(savedCode);
      } else {
        // Reset countdown mỗi lần mở
        this.countdown = COUNTDOWN_SECONDS;
        this.startCountdown();
      }
      
      log('Popup opened');
    }

    showNoTask() {
      const content = document.getElementById('tbw-content');
      content.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 10px;">😔</div>
          <p style="color: #a0aec0; margin-bottom: 15px;">Bạn chưa có nhiệm vụ nào trên thiết bị này</p>
          <p style="font-size: 12px; color: #666;">Hãy hoàn thành bài test IQ/EQ trước để nhận mã xác nhận</p>
        </div>
      `;
    }

    closePopup() {
      const popup = document.getElementById('tbw-popup');
      popup.classList.remove('show');
      this.isPopupOpen = false;
      log('Popup closed');
    }

    startCountdown() {
      const content = document.getElementById('tbw-content');
      
      content.innerHTML = `
        <div class="tbw-countdown-display">
          <div class="tbw-countdown-number" id="tbw-time">${this.countdown}</div>
        </div>
        <div class="tbw-progress">
          <div class="tbw-progress-bar" id="tbw-progress" style="width: 100%"></div>
        </div>
      `;

      log('Countdown started:', this.countdown);

      this.intervalId = setInterval(() => {
        this.countdown--;
        
        const timeEl = document.getElementById('tbw-time');
        const progressEl = document.getElementById('tbw-progress');
        
        if (timeEl) timeEl.textContent = this.countdown;
        if (progressEl) progressEl.style.width = `${(this.countdown / COUNTDOWN_SECONDS) * 100}%`;

        if (this.countdown <= 0) {
          clearInterval(this.intervalId);
          this.generateCode();
        }
      }, 1000);
    }

    async generateCode() {
      log('Generating code...');
      
      try {
        const response = await fetch(`${API_BASE}/api/tasks/${this.task._id}/generate-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fingerprint: this.fingerprint
          })
        });

        const data = await response.json();
        log('Code generated:', data);

        if (data.success && data.code) {
          this.task.code = data.code;
          this.showCode(data.code);
        } else {
          this.showError(data.message || 'Không thể tạo mã');
        }
      } catch (error) {
        log('❌ Error generating code:', error.message);
        this.showError('Lỗi kết nối server');
      }
    }

    showCode(code) {
      const content = document.getElementById('tbw-content');
      
      // Lưu code vào localStorage để không cần đếm lại
      if (this.task && this.task._id) {
        localStorage.setItem(`tbw_code_${this.task._id}`, code);
      }
      
      content.innerHTML = `
        <div class="tbw-code-display">
          <div class="tbw-code" id="tbw-code" title="Bấm để sao chép">${code}</div>
        </div>
      `;
      document.getElementById('tbw-code').addEventListener('click', () => this.copyCode(code));
      
      log('Code displayed:', code);
    }

    copyCode(code) {
      navigator.clipboard.writeText(code).then(() => {
        const codeEl = document.getElementById('tbw-code');
        codeEl.classList.add('copied');
        
        setTimeout(() => {
          codeEl.classList.remove('copied');
        }, 1200);
        
        log('Code copied to clipboard');
      }).catch(err => {
        log('❌ Failed to copy:', err);
        // Fallback: select text
        const codeEl = document.getElementById('tbw-code');
        const range = document.createRange();
        range.selectNode(codeEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      });
    }

    showError(message) {
      const content = document.getElementById('tbw-content');
      content.innerHTML = `
        <div style="text-align: center; color: #f87171; padding: 20px;">
          <div style="font-size: 40px; margin-bottom: 10px;">❌</div>
          <p>${message}</p>
        </div>
      `;
      log('Error shown:', message);
    }
  }

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const widget = new TrafficWidget();
      widget.init();
    });
  } else {
    const widget = new TrafficWidget();
    widget.init();
  }

  // Expose for debugging
  window.TBWidget = {
    version: WIDGET_VERSION,
    getFingerprint,
    API_BASE
  };

  log('Widget script loaded v' + WIDGET_VERSION);
})();
