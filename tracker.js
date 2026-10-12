/**
 * Lightweight Client-Side Analytics Tracker for Marlon Palomares Portfolio
 * Automatically records pageviews, session IDs, device telemetry, and clicks/interactions.
 */
(function() {
  'use strict';

  var SUPABASE_URL = 'https://dkkriesneublbmrihgvp.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRra3JpZXNuZXVibGJtcmloZ3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzk2NjIsImV4cCI6MjA5ODMxNTY2Mn0.xBzuqJ4kCLWMxvT6CRNIpSMDVcBQvq42Xeg0OnHfPCY';

  // Generate or retrieve persistent anonymous visitor ID (localStorage)
  function getVisitorId() {
    try {
      var id = localStorage.getItem('_v_id');
      if (!id) {
        id = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('_v_id', id);
      }
      return id;
    } catch (e) {
      return 'v_anon';
    }
  }

  // Generate or retrieve session ID (sessionStorage)
  function getSessionId() {
    try {
      var id = sessionStorage.getItem('_s_id');
      if (!id) {
        id = 's_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        sessionStorage.setItem('_s_id', id);
      }
      return id;
    } catch (e) {
      return 's_anon';
    }
  }

  // Detect device category
  function getDeviceType() {
    var ua = navigator.userAgent || '';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Detect browser name
  function getBrowserName() {
    var ua = navigator.userAgent || '';
    if (/edg/i.test(ua)) return 'Edge';
    if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) return 'Chrome';
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
    if (/firefox|fxios/i.test(ua)) return 'Firefox';
    if (/opr|opera/i.test(ua)) return 'Opera';
    return 'Other';
  }

  // Clean current path including slug if present
  function getCurrentPagePath() {
    var path = window.location.pathname || '/';
    if (window.location.search) {
      var params = new URLSearchParams(window.location.search);
      var slug = params.get('slug');
      if (slug) {
        path += '?slug=' + slug;
      }
    }
    return path;
  }

  // Send payload to Supabase REST endpoint
  function sendPayload(endpoint, data) {
    try {
      var url = SUPABASE_URL + '/rest/v1/' + endpoint;
      var body = JSON.stringify(data);
      
      if (navigator.sendBeacon && window.Blob) {
        var blob = new Blob([body], { type: 'application/json' });
        // Add headers via URL or fallback fetch if needed
      }

      fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: body,
        keepalive: true
      }).catch(function() {
        // Silently catch network drops without disrupting user experience
      });
    } catch (err) {
      // Ignore client error
    }
  }

  var startTime = Date.now();
  var visitorId = getVisitorId();
  var sessionId = getSessionId();
  var pagePath = getCurrentPagePath();

  // 1. Log Pageview immediately
  function recordPageview() {
    var payload = {
      session_id: sessionId,
      visitor_id: visitorId,
      page_path: pagePath,
      page_title: document.title || 'Marlon Palomares Portfolio',
      referrer: document.referrer || 'Direct / Bookmark',
      device_type: getDeviceType(),
      browser: getBrowserName(),
      screen_resolution: (window.screen.width || 0) + 'x' + (window.screen.height || 0),
      duration_seconds: 0
    };
    sendPayload('analytics_pageviews', payload);
  }

  // 2. Global Click & Interaction Tracker
  function recordClick(e) {
    var target = e.target.closest('a, button, [data-track], [data-event], .btn, .btn-cta, .proj-link, .project-card, .blog-card');
    if (!target) return;

    var text = (target.innerText || target.value || target.getAttribute('aria-label') || target.title || '').trim().replace(/\s+/g, ' ');
    if (text.length > 100) text = text.substring(0, 100) + '...';

    var href = target.getAttribute('href') || target.dataset.url || '';
    var customEvent = target.dataset.track || target.dataset.event;

    // Categorize Event Name
    var eventName = 'click_interaction';
    if (customEvent) {
      eventName = customEvent;
    } else if (href.indexOf('book.html') !== -1 || href.indexOf('calendly') !== -1) {
      eventName = 'click_book_meeting';
    } else if (target.classList.contains('btn-cta') || target.classList.contains('btn-primary')) {
      eventName = 'click_primary_cta';
    } else if (/github\.com|linkedin\.com|twitter\.com|x\.com|mailto:|tel:|wa\.me/i.test(href)) {
      eventName = 'click_outbound_social';
    } else if (target.closest('.blog-card') || href.indexOf('blog.html') !== -1) {
      eventName = 'click_blog_post';
    } else if (target.closest('.project-card') || target.classList.contains('proj-link')) {
      eventName = 'click_project_view';
    } else if (target.closest('nav') || target.closest('header')) {
      eventName = 'click_navigation';
    }

    var eventPayload = {
      session_id: sessionId,
      visitor_id: visitorId,
      event_name: eventName,
      element_text: text || target.tagName.toLowerCase(),
      element_id: target.id || null,
      element_class: target.className ? String(target.className).slice(0, 80) : null,
      target_url: href || null,
      page_path: pagePath
    };

    sendPayload('analytics_events', eventPayload);
  }

  // 3. Optional Custom Event Trigger
  window.trackCustomEvent = function(eventName, text, targetUrl) {
    sendPayload('analytics_events', {
      session_id: sessionId,
      visitor_id: visitorId,
      event_name: eventName || 'custom_event',
      element_text: text || '',
      target_url: targetUrl || '',
      page_path: pagePath
    });
  };

  // Attach Listeners
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordPageview);
  } else {
    recordPageview();
  }

  document.addEventListener('click', recordClick, true);

})();
