// Cloudflare Worker - secure public chat proxy and protected admin AI routes.
// Required secrets: DS_KEY, ALLOWED_ORIGIN. Optional: TURNSTILE_SECRET, ADMIN_TOKEN.
const rateStore = new Map();
const CHAT_SYSTEM = `You are Marlon Palomares Digital Solutions' website assistant. Help visitors understand Google Ads, GoHighLevel/Zapier automation, Claude Code AI workflows, Meta Ads, conversion tracking, and lead-generation systems. Be accurate, concise, and friendly. Do not invent prices, results, clients, certifications, or guarantees. Never request passwords, payment details, or sensitive personal data. If a visitor shows buying intent, ask one useful qualification question (service, business type, current challenge, budget, or timeline), then recommend the free strategy call: https://calendar.app.google/7SukeeU8ezSXwkiX8. Keep replies under 120 words.`;

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}
function resolveAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!origin) return allowed[0] || null;
  return allowed.includes(origin) ? origin : null;
}
function cors(origin) {
  return { 'Access-Control-Allow-Origin': origin || 'null', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
function extractBearer(request) {
  const value = request.headers.get('Authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}
async function isAdmin(request, env) {
  const supplied = extractBearer(request);
  const configured = String(env.ADMIN_TOKEN || '');
  if (configured && supplied === configured) return true;
  if (!supplied || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return false;
  try {
    const authHeaders = { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${supplied}` };
    const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: authHeaders });
    if (!userResponse.ok) return false;
    const user = await userResponse.json();
    if (!user?.email) return false;
    const email = encodeURIComponent(String(user.email).toLowerCase());
    const roleResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/portal_users?select=role&email=eq.${email}`, { headers: authHeaders });
    if (!roleResponse.ok) return false;
    const rows = await roleResponse.json();
    return Array.isArray(rows) && rows.some(row => row && row.role === 'admin');
  } catch {
    return false;
  }
}
function validateMessages(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 10) return null;
  const clean = input.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 2000) }))
    .filter(m => m.content);
  if (!clean.length || clean[clean.length - 1].role !== 'user') return null;
  if (clean.reduce((total, m) => total + m.content.length, 0) > 10000) return null;
  return clean;
}
async function verifyTurnstile(request, env, token, clientIP) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token || typeof token !== 'string') return false;
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: clientIP }) });
  const data = await result.json();
  return Boolean(data.success);
}

export default {
  async fetch(request, env) {
    const origin = resolveAllowedOrigin(request, env);
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return origin ? new Response(null, { headers }) : json({ error: 'Origin not allowed' }, 403, headers);
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
    if (request.headers.get('Origin') && !origin) return json({ error: 'Origin not allowed' }, 403, headers);
    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > 24000) return json({ error: 'Request too large' }, 413, headers);

    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const limit = Math.min(Math.max(parseInt(env.RATE_LIMIT || '12', 10) || 12, 1), 60);
    const now = Date.now();
    let bucket = rateStore.get(clientIP);
    if (!bucket || now > bucket.reset) { bucket = { count: 0, reset: now + 60000 }; rateStore.set(clientIP, bucket); }
    bucket.count += 1;
    if (bucket.count > limit) return json({ error: 'Rate limit exceeded. Try again later.' }, 429, { ...headers, 'Retry-After': '60' });

    const url = new URL(request.url);
    const adminRoute = url.pathname.endsWith('/generate-contract') || url.pathname.endsWith('/generate-invoice-items');
    if (adminRoute && !(await isAdmin(request, env))) return json({ error: 'Admin authorization required' }, 401, headers);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400, headers); }
    if (!env.DS_KEY) return json({ error: 'Server configuration error' }, 500, headers);

    if (adminRoute) {
      // Keep existing admin generators available, but never expose them through the public chat contract.
      const prompt = url.pathname.endsWith('/generate-contract')
        ? `Generate a professional service agreement for client ${String(body.clientName || '').slice(0,120)} and project ${String(body.projectName || '').slice(0,120)}. Service: ${String(body.serviceType || 'Digital Marketing Services').slice(0,120)}. Budget: ${String(body.budget || '0').slice(0,40)}. Start date: ${String(body.startDate || '').slice(0,40)}. Include Services, Term, Fees, Payment Terms, Termination, Confidentiality, Governing Law, and signatures. Plain text only.`
        : `Generate valid JSON invoice line items for project ${String(body.projectName || 'Digital Marketing').slice(0,120)}, service ${String(body.serviceType || 'Digital Marketing Services').slice(0,120)}, budget ${String(body.budget || '0').slice(0,40)}. Return only an array of {"desc":string,"qty":number,"rate":number}.`;
      if (url.pathname.endsWith('/generate-contract') && (!body.clientName || !body.projectName)) return json({ error: 'clientName and projectName required' }, 400, headers);
      const upstream = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DS_KEY}` }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: url.pathname.endsWith('/generate-contract') ? 1400 : 700, temperature: .2, stream: false }) });
      const data = await upstream.json();
      if (!upstream.ok) return json({ error: 'Upstream AI error' }, 502, headers);
      const generated = data?.choices?.[0]?.message?.content || '';
      if (url.pathname.endsWith('/generate-invoice-items')) {
        try {
          const parsed = JSON.parse(generated.replace(/^```json\s*|\s*```$/g, '').trim());
          return json({ items: Array.isArray(parsed) ? parsed : [] }, 200, headers);
        } catch { return json({ error: 'AI returned invalid invoice data' }, 502, headers); }
      }
      return json({ content: generated }, 200, headers);
    }

    const messages = validateMessages(body.messages);
    if (!messages) return json({ error: 'Send 1-10 user/assistant messages; the final message must be from the user.' }, 400, headers);
    if (body.turnstile_required && !(await verifyTurnstile(request, env, body.turnstile_token, clientIP))) return json({ error: 'CAPTCHA verification failed' }, 403, headers);

    try {
      const upstream = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DS_KEY}` }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: CHAT_SYSTEM }, ...messages], max_tokens: 320, temperature: .4, stream: false }) });
      const data = await upstream.json();
      if (!upstream.ok) return json({ error: 'Upstream AI error' }, 502, headers);
      return json({ reply: data?.choices?.[0]?.message?.content || 'I could not generate a reply right now.' }, 200, headers);
    } catch { return json({ error: 'Internal server error' }, 500, headers); }
  }
};