// Cloudflare Worker — Secure Proxy for DeepSeek Chat
// Environment variables (set in Cloudflare Dashboard):
//   DS_KEY: your DeepSeek API key
//   ALLOWED_ORIGIN: your portfolio domain (e.g., https://mpalomaresdigitalsolutions.site)
//   RATE_LIMIT: max requests per IP per minute (default: 20)
//
// Deploy:
//   1. wrangler deploy workers/chat-proxy.js --name portfolio-chat-proxy
//   2. Set env vars: DS_KEY, ALLOWED_ORIGIN in Cloudflare Dashboard
//   3. Your proxy URL: https://portfolio-chat-proxy.YOUR_SUBDOMAIN.workers.dev

// In-memory rate limiting (per-worker, resets on cold start)
const rateStore = new Map();

function resolveAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get('Origin');
  const configuredOrigins = String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const devOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
  ];
  const allowList = new Set([...configuredOrigins, ...devOrigins]);

  if (!requestOrigin) {
    return configuredOrigins[0] || '*';
  }

  if (!env.ALLOWED_ORIGIN) {
    return requestOrigin;
  }

  return allowList.has(requestOrigin) ? requestOrigin : null;
}

export default {
  async fetch(request, env) {
    const allowedOrigin = resolveAllowedOrigin(request, env);
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      if (!allowedOrigin) {
        return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (request.headers.get('Origin') && !allowedOrigin) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = parseInt(env.RATE_LIMIT) || 20;
    const now = Date.now();

    let rateData = rateStore.get(clientIP);
    if (!rateData || now > rateData.reset) {
      rateData = { count: 0, reset: now + 60000 };
      rateStore.set(clientIP, rateData);
    }

    rateData.count += 1;

    if (rateData.count > rateLimit) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { messages, model, max_tokens, temperature, turnstile_token } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (env.TURNSTILE_SECRET && turnstile_token) {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: turnstile_token, remoteip: clientIP }) }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (!env.DS_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    try {
      const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DS_KEY}`
        },
        body: JSON.stringify({
          model: model || 'deepseek-chat',
          messages: messages,
          max_tokens: max_tokens || 300,
          temperature: temperature || 0.7,
          stream: false
        })
      });

      const deepseekData = await deepseekRes.json();

      if (!deepseekRes.ok) {
        return new Response(JSON.stringify({ error: 'Upstream API error', detail: deepseekData }), {
          status: deepseekRes.status, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify(deepseekData), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
