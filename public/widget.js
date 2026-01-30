/**
 * Traffic Boost Widget v2.1
 * Chỉ hiện "Mã Code" - bấm vào đếm ngược - xong hiện mã - bấm để copy
 * 
 * Usage: <script src="https://yourserver.com/widget.js?siteKey=SITE_KEY"></script>
 */

(function() {
  'use strict';

  const WIDGET_VERSION = '2.1.0';
  const COUNTDOWN_SECONDS = 60;
  const API_BASE = 'https://betraffic-production.up.railway.app';

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

  const getFingerprint = () => {
    const dataArray = [
      screen.width,
      screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0
    ];
    const data = dataArray.join('|');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'FP_' + Math.abs(hash).toString(36).toUpperCase();
  };

  const log = (msg) => console.log(`[Widget] ${msg}`);

  const styles = `
    .tbw-text {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
      padding: 6px 0;
      cursor: pointer;
    }
    .tbw-text:hover {
      color: #667eea;
    }
    .tbw-text.counting {
      color: #667eea;
    }
    .tbw-text.code {
      font-family: monospace;
      font-weight: 700;
      letter-spacing: 1px;
      color: #667eea;
    }
    .tbw-text.copied {
      color: #10b981;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  class TrafficWidget {
    constructor() {
      this.siteKey = getSiteKey();
      this.fingerprint = getFingerprint();
      this.task = null;
      this.countdown = COUNTDOWN_SECONDS;
      this.intervalId = null;
      this.state = 'idle';
      this.element = null;
      this.currentCode = null;
    }

    async init() {
      if (!this.siteKey) return;

      const hasTask = await this.checkTask();
      if (hasTask) {
        this.render();
      }
    }

    async checkTask() {
      try {
        const response = await fetch(`${API_BASE}/api/tasks/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprint: this.fingerprint, siteKey: this.siteKey })
        });
        const data = await response.json();
        if (data.hasTask && data.task) {
          this.task = data.task;
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }

    render() {
      this.element = document.createElement('div');
      this.element.className = 'tbw-text';
      this.element.id = 'tbw-widget';
      
      const savedCode = this.task ? localStorage.getItem(`tbw_code_${this.task._id}`) : null;
      if (savedCode) {
        this.showCode(savedCode);
      } else {
        this.element.textContent = 'Mã Code';
        this.element.addEventListener('click', () => this.onClick());
      }

      const footer = document.querySelector('footer');
      if (footer) {
        footer.appendChild(this.element);
      } else {
        document.body.appendChild(this.element);
      }
    }

    async onClick() {
      if (this.state === 'idle') {
        const hasTask = await this.checkTask();
        if (hasTask) {
          this.startCountdown();
        }
      } else if (this.state === 'code') {
        this.copyCode();
      }
    }

    startCountdown() {
      this.state = 'counting';
      this.countdown = COUNTDOWN_SECONDS;
      this.element.classList.add('counting');
      this.element.textContent = this.countdown;

      this.intervalId = setInterval(() => {
        this.countdown--;
        this.element.textContent = this.countdown;

        if (this.countdown <= 0) {
          clearInterval(this.intervalId);
          this.generateCode();
        }
      }, 1000);
    }

    async generateCode() {
      this.element.textContent = '...';
      
      try {
        const response = await fetch(`${API_BASE}/api/tasks/${this.task._id}/generate-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprint: this.fingerprint })
        });

        const data = await response.json();

        if (data.success && data.code) {
          this.showCode(data.code);
        } else {
          this.element.textContent = 'Lỗi';
          this.element.classList.remove('counting');
          this.state = 'idle';
        }
      } catch (error) {
        this.element.textContent = 'Lỗi';
        this.element.classList.remove('counting');
        this.state = 'idle';
      }
    }

    showCode(code) {
      this.state = 'code';
      this.currentCode = code;
      this.element.classList.remove('counting');
      this.element.classList.add('code');
      this.element.textContent = code;
      
      if (this.task && this.task._id) {
        localStorage.setItem(`tbw_code_${this.task._id}`, code);
      }
      
      this.element.onclick = () => this.copyCode();
    }

    copyCode() {
      navigator.clipboard.writeText(this.currentCode).then(() => {
        this.element.classList.add('copied');
        setTimeout(() => {
          this.element.classList.remove('copied');
        }, 1000);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TrafficWidget().init());
  } else {
    new TrafficWidget().init();
  }

  window.TBWidget = { version: WIDGET_VERSION, getFingerprint, API_BASE };
})();
