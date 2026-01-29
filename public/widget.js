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
  const WIDGET_VERSION = '2.0.0';
  const COUNTDOWN_SECONDS = 60;
  
  // Get API base from script URL
  const API_BASE = (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src.includes('widget.js')) {
        const url = new URL(scripts[i].src);
        return url.origin;
      }
    }
    return 'https://betraffic-production.up.railway.app';
  })();

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
  const getFingerprint = () => {
    const data = [
      screen.width,
      screen.height,
      screen.colorDepth,
      screen.availWidth,
      screen.availHeight,
      window.devicePixelRatio || 1,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0,
      navigator.platform,
      navigator.language
    ].join('|');

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return 'FP_' + Math.abs(hash).toString(36).toUpperCase();
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

  // CSS Styles - Footer banner dễ nhìn
  const styles = `
    .tbw-stealth {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-top: 2px solid #667eea;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
    }

    .tbw-stealth-icon {
      font-size: 24px;
    }

    .tbw-stealth-text {
      color: #a0aec0;
      font-size: 14px;
    }

    .tbw-stealth-trigger {
      font-size: 14px;
      color: white;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      padding: 10px 24px;
      border-radius: 25px;
      font-weight: 600;
      transition: all 0.3s;
      text-decoration: none;
    }

    .tbw-stealth-trigger:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .tbw-popup {
      display: none;
      position: fixed;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a2e;
      border-radius: 12px;
      padding: 20px;
      min-width: 320px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      border: 1px solid rgba(102, 126, 234, 0.3);
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
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .tbw-popup-title {
      font-size: 14px;
      font-weight: 600;
      color: #a0aec0;
    }

    .tbw-popup-close {
      background: none;
      border: none;
      color: #666;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .tbw-popup-close:hover {
      color: #fff;
    }

    .tbw-countdown-display {
      text-align: center;
      padding: 15px 0;
    }

    .tbw-countdown-number {
      font-size: 48px;
      font-weight: 700;
      color: #667eea;
    }

    .tbw-countdown-label {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }

    .tbw-progress {
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      margin: 15px 0;
      overflow: hidden;
    }

    .tbw-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 1s linear;
    }

    .tbw-code-display {
      background: rgba(102, 126, 234, 0.1);
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      margin: 10px 0;
    }

    .tbw-code {
      font-family: monospace;
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
      letter-spacing: 3px;
    }

    .tbw-copy-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
      transition: transform 0.2s;
    }

    .tbw-copy-btn:hover {
      transform: translateY(-1px);
    }

    .tbw-copy-btn.copied {
      background: #059669;
    }

    .tbw-hidden {
      display: none !important;
    }

    .tbw-note {
      font-size: 11px;
      color: #666;
      text-align: center;
      margin-top: 10px;
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

      // Check for pending task
      await this.checkTask();
    }

    async checkTask() {
      try {
        log('Checking for pending task...');
        
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
          this.renderWidget();
        } else {
          log('No pending task for this device on this site');
        }
      } catch (error) {
        log('❌ Error checking task:', error.message);
      }
    }

    renderWidget() {
      log('Rendering footer banner widget...');

      // Create container
      const container = document.createElement('div');
      container.className = 'tbw-stealth';
      container.id = 'tbw-widget';

      container.innerHTML = `
        <span class="tbw-stealth-icon">🎁</span>
        <span class="tbw-stealth-text">Bạn có mã xác nhận đang chờ!</span>
        <button class="tbw-stealth-trigger" id="tbw-trigger">
          👉 Nhận mã ngay
        </button>
        <div class="tbw-popup" id="tbw-popup">
          <div class="tbw-popup-header">
            <span class="tbw-popup-title">🔐 Mã xác nhận</span>
            <button class="tbw-popup-close" id="tbw-close">×</button>
          </div>
          <div id="tbw-content">
            <!-- Content will be injected here -->
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Event listeners
      document.getElementById('tbw-trigger').addEventListener('click', () => this.openPopup());
      document.getElementById('tbw-close').addEventListener('click', () => this.closePopup());

      log('Widget rendered - banner visible at bottom');
    }

    openPopup() {
      const popup = document.getElementById('tbw-popup');
      popup.classList.add('show');
      this.isPopupOpen = true;
      
      if (!this.task.code) {
        this.startCountdown();
      } else {
        this.showCode(this.task.code);
      }
      
      log('Popup opened');
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
          <div class="tbw-countdown-label">giây còn lại</div>
        </div>
        <div class="tbw-progress">
          <div class="tbw-progress-bar" id="tbw-progress" style="width: 100%"></div>
        </div>
        <p class="tbw-note">Vui lòng đợi để nhận mã xác nhận</p>
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
      
      content.innerHTML = `
        <div class="tbw-code-display">
          <div class="tbw-code" id="tbw-code">${code}</div>
        </div>
        <button class="tbw-copy-btn" id="tbw-copy">
          📋 Sao chép mã
        </button>
        <p class="tbw-note">Quay lại trang test để nhập mã này</p>
      `;

      document.getElementById('tbw-copy').addEventListener('click', () => this.copyCode(code));
      
      log('Code displayed:', code);
    }

    copyCode(code) {
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('tbw-copy');
        btn.textContent = '✅ Đã sao chép!';
        btn.classList.add('copied');
        
        setTimeout(() => {
          btn.textContent = '📋 Sao chép mã';
          btn.classList.remove('copied');
        }, 2000);
        
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
