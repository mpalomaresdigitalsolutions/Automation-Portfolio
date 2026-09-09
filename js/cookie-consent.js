/**
 * Cookie & Privacy Consent Banner
 * Marlon Palomares Digital Solutions
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'mp_cookie_consent';

  // Inject styles
  const style = document.createElement('style');
  style.id = 'cookie-consent-styles';
  style.textContent = `
    .cc-banner-wrap {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(140%);
      width: min(760px, calc(100% - 32px));
      z-index: 999999;
      background: rgba(11, 14, 26, 0.95);
      border: 1px solid rgba(0, 212, 255, 0.28);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(0, 212, 255, 0.15);
      border-radius: 16px;
      padding: 22px 26px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #e8f0ff;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
      opacity: 0;
      transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .cc-banner-wrap.cc-visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    .cc-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .cc-icon {
      font-size: 1.35rem;
      line-height: 1;
    }
    .cc-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #fff;
    }
    .cc-title span {
      color: #00d4ff;
    }
    .cc-text {
      font-size: 0.88rem;
      line-height: 1.55;
      color: #93a1b8;
      margin: 0 0 18px 0;
    }
    .cc-link {
      color: #00d4ff;
      text-decoration: underline;
      text-underline-offset: 2px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .cc-link:hover {
      color: #7b2fff;
    }
    .cc-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .cc-btn {
      font-family: 'Space Mono', monospace;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 9px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      outline: none;
    }
    .cc-btn-accept {
      background: linear-gradient(135deg, #00d4ff, #0077ff);
      color: #060810;
      border-color: rgba(0, 212, 255, 0.4);
      box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);
    }
    .cc-btn-accept:hover {
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.45);
      transform: translateY(-1px);
    }
    .cc-btn-essential {
      background: transparent;
      color: #93a1b8;
      border-color: rgba(148, 163, 184, 0.25);
    }
    .cc-btn-essential:hover {
      border-color: rgba(0, 212, 255, 0.4);
      color: #fff;
      background: rgba(0, 212, 255, 0.05);
    }
    @media (max-width: 580px) {
      .cc-banner-wrap {
        bottom: 16px;
        padding: 18px 20px;
      }
      .cc-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      .cc-btn {
        width: 100%;
        padding: 11px 16px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create markup
  const banner = document.createElement('div');
  banner.className = 'cc-banner-wrap';
  banner.id = 'cookieConsentBanner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'false');
  banner.setAttribute('aria-label', 'Cookie and Privacy Policy Notice');

  banner.innerHTML = `
    <div class="cc-header">
      <span class="cc-icon">🍪</span>
      <div class="cc-title">Cookie & <span>Privacy Notice</span></div>
    </div>
    <p class="cc-text">
      This portfolio uses cookies and analytics to measure site traffic, optimize load performance, and improve your browsing experience. You can choose to accept all cookies or proceed with essential cookies only. For details on how your data is handled, view our <a href="privacy.html" class="cc-link" target="_blank" rel="noopener">Privacy Policy</a>.
    </p>
    <div class="cc-actions">
      <button type="button" class="cc-btn cc-btn-essential" id="ccEssentialBtn">Essential Only</button>
      <button type="button" class="cc-btn cc-btn-accept" id="ccAcceptAllBtn">Accept All</button>
    </div>
  `;

  document.body.appendChild(banner);

  function showBanner() {
    requestAnimationFrame(() => {
      banner.classList.add('cc-visible');
    });
  }

  function hideBanner() {
    banner.classList.remove('cc-visible');
  }

  function saveConsent(level) {
    try {
      localStorage.setItem(STORAGE_KEY, level);
    } catch (e) {
      // Storage unavailable or disabled
    }
    hideBanner();
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: { level: level } }));
  }

  // Bind buttons
  const acceptBtn = banner.querySelector('#ccAcceptAllBtn');
  const essentialBtn = banner.querySelector('#ccEssentialBtn');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      saveConsent('all');
    });
  }

  if (essentialBtn) {
    essentialBtn.addEventListener('click', function() {
      saveConsent('essential');
    });
  }

  // Expose global reopen function
  window.openCookieConsent = function() {
    showBanner();
  };

  // Bind any elements with #cookieConsentSettingsBtn or data-reopen-cookie-banner
  document.addEventListener('DOMContentLoaded', function() {
    const triggers = document.querySelectorAll('#cookieConsentSettingsBtn, [data-reopen-cookie-banner]');
    triggers.forEach(el => {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        window.openCookieConsent();
      });
    });
  });

  // Check existing consent
  let existingConsent = null;
  try {
    existingConsent = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  if (!existingConsent) {
    // Delay slightly for smooth page entry
    setTimeout(showBanner, 500);
  }
})();
