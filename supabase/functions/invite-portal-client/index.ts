import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const allowedOrigins = new Set([
  "https://mpalomaresdigitalsolutions.online",
  "https://mpalomaresdigitalsolutions.site",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
]);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function corsHeaders(origin: string | null): HeadersInit | null {
  if (!origin || !allowedOrigins.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(status: number, body: Record<string, unknown>, cors: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function cleanString(value: unknown, max: number, required = false): string | null {
  if (typeof value !== "string") return required ? null : "";
  const cleaned = value.trim();
  if ((required && !cleaned) || cleaned.length > max) return null;
  return cleaned;
}

function rateLimited(request: Request): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")
    || "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);
  if (!cors) return new Response("Origin not allowed", { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json(405, { success: false, error_code: "METHOD_NOT_ALLOWED" }, cors);
  if (rateLimited(request)) return json(429, { success: false, error_code: "RATE_LIMITED", message: "Please wait before trying again." }, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { success: false, error_code: "SERVER_CONFIGURATION" }, cors);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { success: false, error_code: "AUTH_REQUIRED" }, cors);
  }

  const token = authorization.slice(7);
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !callerData.user?.email) {
    return json(401, { success: false, error_code: "INVALID_SESSION" }, cors);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const callerEmail = callerData.user.email.toLowerCase();
  const { data: portalAdmin, error: adminError } = await adminClient
    .from("portal_users")
    .select("id")
    .eq("email", callerEmail)
    .eq("role", "admin")
    .maybeSingle();
  if (adminError || !portalAdmin) {
    return json(403, { success: false, error_code: "ADMIN_REQUIRED" }, cors);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return json(413, { success: false, error_code: "REQUEST_TOO_LARGE" }, cors);
    body = JSON.parse(raw);
  } catch {
    return json(400, { success: false, error_code: "INVALID_JSON" }, cors);
  }

  const name = cleanString(body.name, 120, true);
  const emailValue = cleanString(body.email, 254, true);
  const email = emailValue?.toLowerCase() || null;
  const company = cleanString(body.company, 160);
  const phone = cleanString(body.phone, 40);
  const logoUrl = cleanString(body.logo_url, 500);
  const brandColor = cleanString(body.brand_color, 20);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const colorPattern = /^#[0-9a-fA-F]{6}$/;
  if (!name || !email || !emailPattern.test(email) || company === null || phone === null || logoUrl === null || brandColor === null) {
    return json(400, { success: false, error_code: "INVALID_INPUT", message: "Check the client details and try again." }, cors);
  }
  if (brandColor && !colorPattern.test(brandColor)) {
    return json(400, { success: false, error_code: "INVALID_BRAND_COLOR", message: "Brand color must use #RRGGBB format." }, cors);
  }
  if (logoUrl) {
    try { const parsed = new URL(logoUrl); if (parsed.protocol !== "https:") throw new Error(); }
    catch { return json(400, { success: false, error_code: "INVALID_LOGO_URL", message: "Logo URL must be a valid HTTPS address." }, cors); }
  }

  const redirectTo = "https://mpalomaresdigitalsolutions.online/login.html";
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { display_name: name },
  });
  if (inviteError || !inviteData.user) {
    return json(409, { success: false, error_code: "INVITE_NOT_COMPLETED", message: "Unable to complete this invitation. Review the address or existing client record." }, cors);
  }

  const { error: provisionError } = await adminClient.rpc("provision_portal_client", {
    p_actor_email: callerEmail,
    p_name: name,
    p_email: email,
    p_company: company || null,
    p_phone: phone || null,
    p_logo_url: logoUrl || null,
    p_brand_color: brandColor || null,
  });
  if (provisionError) {
    await adminClient.auth.admin.deleteUser(inviteData.user.id).catch(() => undefined);
    return json(409, { success: false, error_code: "PROVISIONING_FAILED", message: "The invitation could not be completed. No portal account was created." }, cors);
  }

  return json(200, { success: true, message: "Client invitation sent." }, cors);
});

