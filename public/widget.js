/**
 * Traffic Boost Widget
 * Embed this script on target websites to display verification code widget
 * 
 * Usage: <script src="https://yourserver.com/widget.js?id=SITE_KEY"></script>
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  const API_BASE = (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src.includes('widget.js')) {
        const url = new URL(scripts[i].src);
        return url.origin;
      }
    }
    return window.location.origin;
  })();

  // Get site key from script URL
  const getSiteKey = () => {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src.includes('widget.js')) {
        const url = new URL(scripts[i].src);
        return url.searchParams.get('id');
      }
    }
    return null;
  };

  // Generate device fingerprint (cross-browser compatible)
  const getFingerprint = () => {
    const stored = localStorage.getItem('device_fp');
    if (stored) return stored;

    const data = [
      screen.width,
      screen.height,
      screen.colorDepth,
      window.devicePixelRatio || 1,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.platform,
      navigator.language
    ].join('|');

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const fp = Math.abs(hash).toString(36);
    localStorage.setItem('device_fp', fp);
    return fp;
  };

  // CSS Styles
  const styles = `
    .tbw-container {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 400px;
      margin: 20px auto;
      padding: 24px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .tbw-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .tbw-icon {
      width: 60px;
      height: 60px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .tbw-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #fff;
    }

    .tbw-subtitle {
      font-size: 14px;
      color: #a0aec0;
      margin: 0;
    }

    .tbw-btn {
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .tbw-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }

    .tbw-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .tbw-countdown {
      text-align: center;
      padding: 24px;
    }

    .tbw-countdown-circle {
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
      position: relative;
    }

    .tbw-countdown-svg {
      transform: rotate(-90deg);
    }

    .tbw-countdown-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 8;
    }

    .tbw-countdown-progress {
      fill: none;
      stroke: url(#tbw-gradient);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dasharray 1s linear;
    }

    .tbw-countdown-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 32px;
      font-weight: 700;
      color: #fff;
    }

    .tbw-countdown-label {
      font-size: 14px;
      color: #a0aec0;
    }

    .tbw-progress-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 16px;
    }

    .tbw-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 3px;
      transition: width 1s linear;
    }

    .tbw-code-box {
      background: rgba(255, 255, 255, 0.05);
      border: 2px dashed rgba(102, 126, 234, 0.5);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 16px 0;
    }

    .tbw-code {
      font-family: 'Courier New', monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #667eea;
      margin: 0;
    }

    .tbw-copy-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 12px;
    }

    .tbw-copy-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }

    .tbw-copy-btn.copied {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .tbw-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }

    .tbw-error-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    .tbw-error-text {
      font-size: 14px;
      color: #fca5a5;
      margin: 0;
      line-height: 1.6;
    }

    .tbw-success-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
    }

    .tbw-note {
      font-size: 13px;
      color: #a0aec0;
      text-align: center;
      margin-top: 16px;
      line-height: 1.5;
    }

    @keyframes tbw-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .tbw-loading {
      animation: tbw-pulse 1.5s ease-in-out infinite;
    }
  `;

  // Widget states
  const STATE = {
    LOADING: 'loading',
    NO_TASK: 'no_task',
    READY: 'ready',
    COUNTDOWN: 'countdown',
    CODE_READY: 'code_ready',
    ERROR: 'error'
  };

  // Widget class
  class TrafficWidget {
    constructor(siteKey) {
      this.siteKey = siteKey;
      this.fingerprint = getFingerprint();
      this.state = STATE.LOADING;
      this.taskId = null;
      this.code = null;
      this.countdown = 60;
      this.countdownInterval = null;
      
      this.init();
    }

    async init() {
      this.injectStyles();
      this.createContainer();
      await this.checkTask();
    }

    injectStyles() {
      const style = document.createElement('style');
      style.textContent = styles;
      document.head.appendChild(style);
    }

    createContainer() {
      this.container = document.createElement('div');
      this.container.id = 'traffic-widget';
      this.container.className = 'tbw-container';
      
      // Try to insert at target element or append to body
      const target = document.querySelector('#traffic-widget-target') || document.body;
      target.appendChild(this.container);
      
      this.render();
    }

    async checkTask() {
      try {
        const response = await fetch(
          `${API_BASE}/api/tasks/check?fingerprint=${this.fingerprint}&siteKey=${this.siteKey}`
        );
        const data = await response.json();

        if (data.success && data.hasTask) {
          this.taskId = data.taskId;
          this.state = STATE.READY;
        } else {
          this.state = STATE.NO_TASK;
          this.errorMessage = data.message;
        }
      } catch (error) {
        this.state = STATE.ERROR;
        this.errorMessage = 'Không thể kết nối đến server';
      }
      
      this.render();
    }

    async startCountdown() {
      try {
        const response = await fetch(`${API_BASE}/api/tasks/start-countdown`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: this.taskId,
            fingerprint: this.fingerprint
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.state = STATE.COUNTDOWN;
          this.countdown = data.countdownSeconds || 60;
          this.render();
          this.runCountdown();
        }
      } catch (error) {
        this.state = STATE.ERROR;
        this.errorMessage = 'Lỗi khi bắt đầu đếm ngược';
        this.render();
      }
    }

    runCountdown() {
      this.countdownInterval = setInterval(() => {
        this.countdown--;
        this.updateCountdownUI();
        
        if (this.countdown <= 0) {
          clearInterval(this.countdownInterval);
          this.fetchCode();
        }
      }, 1000);
    }

    updateCountdownUI() {
      const textEl = this.container.querySelector('.tbw-countdown-text');
      const progressEl = this.container.querySelector('.tbw-countdown-progress');
      const fillEl = this.container.querySelector('.tbw-progress-fill');
      
      if (textEl) textEl.textContent = this.countdown;
      if (progressEl) {
        const circumference = 2 * Math.PI * 52;
        const progress = (this.countdown / 60) * circumference;
        progressEl.style.strokeDasharray = `${progress} ${circumference}`;
      }
      if (fillEl) {
        fillEl.style.width = `${((60 - this.countdown) / 60) * 100}%`;
      }
    }

    async fetchCode() {
      try {
        const response = await fetch(
          `${API_BASE}/api/tasks/${this.taskId}/code?fingerprint=${this.fingerprint}`
        );
        const data = await response.json();
        
        if (data.success) {
          this.code = data.code;
          this.state = STATE.CODE_READY;
        } else {
          this.errorMessage = data.message;
          this.state = STATE.ERROR;
        }
      } catch (error) {
        this.state = STATE.ERROR;
        this.errorMessage = 'Lỗi khi lấy mã';
      }
      
      this.render();
    }

    copyCode() {
      navigator.clipboard.writeText(this.code).then(() => {
        const btn = this.container.querySelector('.tbw-copy-btn');
        btn.classList.add('copied');
        btn.innerHTML = '✓ Đã sao chép!';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '📋 Sao chép mã';
        }, 2000);
      });
    }

    render() {
      let html = '';

      switch (this.state) {
        case STATE.LOADING:
          html = this.renderLoading();
          break;
        case STATE.NO_TASK:
          html = this.renderNoTask();
          break;
        case STATE.READY:
          html = this.renderReady();
          break;
        case STATE.COUNTDOWN:
          html = this.renderCountdown();
          break;
        case STATE.CODE_READY:
          html = this.renderCodeReady();
          break;
        case STATE.ERROR:
          html = this.renderError();
          break;
      }

      this.container.innerHTML = html;
      this.attachEvents();
    }

    renderLoading() {
      return `
        <div class="tbw-header">
          <div class="tbw-icon tbw-loading">⏳</div>
          <h3 class="tbw-title">Đang kiểm tra...</h3>
          <p class="tbw-subtitle">Vui lòng đợi trong giây lát</p>
        </div>
      `;
    }

    renderNoTask() {
      return `
        <div class="tbw-error">
          <div class="tbw-error-icon">⚠️</div>
          <p class="tbw-error-text">${this.errorMessage || 'Bạn chưa tạo bất kỳ nhiệm vụ nào trên thiết bị này. Vui lòng sử dụng đúng thiết bị đã tạo nhiệm vụ hoặc tạo lại một nhiệm vụ mới.'}</p>
        </div>
      `;
    }

    renderReady() {
      return `
        <div class="tbw-header">
          <div class="tbw-icon">🎯</div>
          <h3 class="tbw-title">Nhiệm vụ của bạn</h3>
          <p class="tbw-subtitle">Bấm nút bên dưới và đợi 60 giây để nhận mã xác nhận</p>
        </div>
        <button class="tbw-btn" id="tbw-start-btn">
          🔓 Bấm để lấy mã
        </button>
      `;
    }

    renderCountdown() {
      const circumference = 2 * Math.PI * 52;
      const progress = (this.countdown / 60) * circumference;
      
      return `
        <div class="tbw-countdown">
          <div class="tbw-countdown-circle">
            <svg class="tbw-countdown-svg" width="120" height="120">
              <defs>
                <linearGradient id="tbw-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#667eea"/>
                  <stop offset="100%" stop-color="#764ba2"/>
                </linearGradient>
              </defs>
              <circle class="tbw-countdown-bg" cx="60" cy="60" r="52"/>
              <circle class="tbw-countdown-progress" cx="60" cy="60" r="52" 
                      stroke-dasharray="${progress} ${circumference}"/>
            </svg>
            <div class="tbw-countdown-text">${this.countdown}</div>
          </div>
          <p class="tbw-countdown-label">Vui lòng đợi...</p>
          <div class="tbw-progress-bar">
            <div class="tbw-progress-fill" style="width: ${((60 - this.countdown) / 60) * 100}%"></div>
          </div>
        </div>
        <p class="tbw-note">⏱️ Không rời khỏi trang này trong quá trình đếm ngược</p>
      `;
    }

    renderCodeReady() {
      return `
        <div class="tbw-header">
          <div class="tbw-success-icon">✓</div>
          <h3 class="tbw-title">Mã xác nhận của bạn</h3>
        </div>
        <div class="tbw-code-box">
          <p class="tbw-code">${this.code}</p>
        </div>
        <button class="tbw-copy-btn" id="tbw-copy-btn">
          📋 Sao chép mã
        </button>
        <p class="tbw-note">Quay lại trang test và nhập mã này để xem kết quả của bạn</p>
      `;
    }

    renderError() {
      return `
        <div class="tbw-error">
          <div class="tbw-error-icon">❌</div>
          <p class="tbw-error-text">${this.errorMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'}</p>
        </div>
      `;
    }

    attachEvents() {
      const startBtn = this.container.querySelector('#tbw-start-btn');
      if (startBtn) {
        startBtn.addEventListener('click', () => this.startCountdown());
      }

      const copyBtn = this.container.querySelector('#tbw-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copyCode());
      }
    }
  }

  // Initialize widget
  const siteKey = getSiteKey();
  if (siteKey) {
    // Wait for DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => new TrafficWidget(siteKey));
    } else {
      new TrafficWidget(siteKey);
    }
  } else {
    console.error('Traffic Widget: Missing site key (id parameter)');
  }
})();
