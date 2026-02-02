/**
 * Traffic Boost Widget v2.3
 * Chỉ hiện "Mã Code" - bấm vào đếm ngược - xong hiện mã - bấm để copy
 * Block widget in incognito/private browsing mode
 * 
 * Usage: <script src="https://yourserver.com/widget.js?siteKey=SITE_KEY"></script>
 */

(function() {
  'use strict';

  const WIDGET_VERSION = '2.3.0';
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

  // Robust incognito detection (from Joe12387/detectIncognito)
  const detectIncognito = () => {
    return new Promise((resolve, reject) => {
      let browserName = 'Unknown';

      function callback(isPrivate) {
        resolve({ isPrivate, browserName });
      }

      function feid() {
        let toFixedEngineID = 0;
        try {
          const neg = parseInt("-1");
          neg.toFixed(neg);
        } catch (e) {
          toFixedEngineID = e.message.length;
        }
        return toFixedEngineID;
      }

      function isSafari() { return feid() === 44 || feid() === 43; }
      function isChrome() { return feid() === 51; }
      function isFirefox() { return feid() === 25; }
      function isMSIE() { return navigator.msSaveBlob !== undefined; }

      function identifyChromium() {
        const ua = navigator.userAgent;
        if (ua.match(/Chrome/)) {
          if (navigator.brave !== undefined) return 'Brave';
          else if (ua.match(/Edg/)) return 'Edge';
          else if (ua.match(/OPR/)) return 'Opera';
          return 'Chrome';
        }
        return 'Chromium';
      }

      // Safari test using OPFS
      async function safariPrivateTest() {
        if (typeof navigator.storage?.getDirectory === 'function') {
          try {
            await navigator.storage.getDirectory();
            callback(false);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            callback(message.includes('unknown transient reason'));
          }
        } else if (navigator.maxTouchPoints !== undefined) {
          try {
            const tmp = String(Math.random());
            const dbReq = indexedDB.open(tmp, 1);
            dbReq.onupgradeneeded = function(ev) {
              const db = ev.target.result;
              try {
                db.createObjectStore('t', { autoIncrement: true }).put(new Blob());
                callback(false);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                callback(msg.includes('are not yet supported'));
              } finally {
                db.close();
                indexedDB.deleteDatabase(tmp);
              }
            };
            dbReq.onerror = function() { callback(false); };
          } catch (e) {
            callback(false);
          }
        } else {
          try { window.openDatabase(null, null, null, null); } 
          catch (e) { callback(true); return; }
          try { localStorage.setItem('test', '1'); localStorage.removeItem('test'); } 
          catch (e) { callback(true); return; }
          callback(false);
        }
      }

      // Chrome test using storage quota
      function chromePrivateTest() {
        if (navigator.webkitTemporaryStorage) {
          navigator.webkitTemporaryStorage.queryUsageAndQuota(
            function(usage, quota) {
              const quotaInMib = Math.round(quota / (1024 * 1024));
              const heapLimit = window.performance?.memory?.jsHeapSizeLimit || 1073741824;
              const quotaLimitInMib = Math.round(heapLimit / (1024 * 1024)) * 2;
              callback(quotaInMib < quotaLimitInMib);
            },
            function(e) { callback(false); }
          );
        } else if (window.webkitRequestFileSystem) {
          window.webkitRequestFileSystem(0, 1, 
            function() { callback(false); },
            function() { callback(true); }
          );
        } else {
          callback(false);
        }
      }

      // Firefox test using OPFS or IndexedDB
      async function firefoxPrivateTest() {
        if (typeof navigator.storage?.getDirectory === 'function') {
          try {
            await navigator.storage.getDirectory();
            callback(false);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            callback(message.includes('Security error'));
          }
        } else {
          const request = indexedDB.open('inPrivate');
          request.onerror = function(event) {
            if (request.error && request.error.name === 'InvalidStateError') {
              event.preventDefault();
            }
            callback(true);
          };
          request.onsuccess = function() {
            indexedDB.deleteDatabase('inPrivate');
            callback(false);
          };
        }
      }

      function msiePrivateTest() {
        callback(window.indexedDB === undefined);
      }

      // Main detection
      if (isSafari()) {
        browserName = 'Safari';
        safariPrivateTest();
      } else if (isChrome()) {
        browserName = identifyChromium();
        chromePrivateTest();
      } else if (isFirefox()) {
        browserName = 'Firefox';
        firefoxPrivateTest();
      } else if (isMSIE()) {
        browserName = 'Internet Explorer';
        msiePrivateTest();
      } else {
        // Unknown browser - assume not private
        callback(false);
      }
    });
  };

  const getFingerprint = async () => {
    const result = await detectIncognito();
    const isIncognito = result.isPrivate ? 1 : 0;
    
    const dataArray = [
      screen.width,
      screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0,
      isIncognito
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
      color: #ffffff;
      text-align: center;
      padding: 8px 16px;
      cursor: pointer;
      position: relative;
      z-index: 2147483647;
      background: rgba(100, 100, 100, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 20px;
      display: inline-block;
    }
    .tbw-text:hover {
      color: #667eea;
    }
    .tbw-text.counting {
      color: #ffffff;
    }
    .tbw-text.code {
      font-family: monospace;
      font-weight: 700;
      letter-spacing: 1px;
      color: #ffffff;
    }
    .tbw-text.copied {
      color: #10b981;
    }
    .tbw-wrapper {
      text-align: center;
      padding: 10px 0;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  class TrafficWidget {
    constructor() {
      this.siteKey = getSiteKey();
      this.fingerprint = null;
      this.task = null;
      this.countdown = COUNTDOWN_SECONDS;
      this.intervalId = null;
      this.state = 'idle';
      this.element = null;
      this.currentCode = null;
    }

    async init() {
      if (!this.siteKey) return;

      // Check incognito first - don't show widget in incognito mode
      try {
        const result = await detectIncognito();
        if (result.isPrivate) {
          log(`Incognito mode detected (${result.browserName}) - widget disabled`);
          return;
        }
        log(`Normal mode detected (${result.browserName})`);
      } catch (e) {
        log('Could not detect incognito mode, continuing...');
      }

      // Get fingerprint first (async due to incognito detection)
      this.fingerprint = await getFingerprint();

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
      // Create wrapper for centering
      const wrapper = document.createElement('div');
      wrapper.className = 'tbw-wrapper';
      
      this.element = document.createElement('div');
      this.element.className = 'tbw-text';
      this.element.id = 'tbw-widget';
      this.element.textContent = 'Mã Code';
      this.element.addEventListener('click', () => this.onClick());

      wrapper.appendChild(this.element);

      const footer = document.querySelector('footer');
      if (footer) {
        footer.appendChild(wrapper);
      } else {
        document.body.appendChild(wrapper);
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
