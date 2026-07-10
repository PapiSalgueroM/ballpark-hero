import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Pro Football (NFL) 3x3 grid validator. FREE Gemini key -> gemini-2.5-flash
// (2.0-flash has no free quota on this key). Falls back to Lovable gateway,
// then accept-unverified so the daily grid never 500s.
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

// Verified-verdict cache (2026-07-10): repeat guesses are answered from
// Postgres instead of burning the free Gemini quota (10 requests/min).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected in edge runtime.
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "football-grid";
const cacheKeyOf = (p: string, r: string, c: string) =>
  `${p}|${r}|${c}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://id-preview--d69b1c20-4988-43ae-947e-7c6feb3ed683.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];
function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith(".lovableproject.com")) return true;
  if (origin.endsWith(".lovable.app")) return true;
  return false;
}
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  e.count++;
  return e.count > RATE_LIMIT_MAX;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of rateLimitMap) if (now > e.resetAt) rateLimitMap.delete(ip);
}, 300_000);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ valid: false, error: "Too many requests" }, 429);

  let sanitized = { player: "", row: "", col: "" };
  try {
    const { playerName, rowAttribute, colAttribute } = await req.json();
    if (!playerName || !rowAttribute || !colAttribute) return json({ valid: false, error: "Missing required fields" });
    sanitized = {
      player: String(playerName).slice(0, 80).replace(/[\n\r]/g, ""),
      row: String(rowAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
      col: String(colAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
    };
  } catch {
    return json({ valid: false, error: "Bad request" }, 400);
  }

  const accept = () => json({ valid: true, unverified: true, reason: "Accepted (answer-checking offline).", fullName: sanitized.player });

  const cacheKey = cacheKeyOf(sanitized.player, sanitized.row, sanitized.col);
  try {
    const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
      .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
    if (hit?.verdict) return json({ ...(hit.verdict as Record<string, unknown>), cached: true });
  } catch { /* cache down -> fall through to AI */ }

  if (!AI_KEY) return accept();

  const prompt = `You are a pro football (NFL) trivia expert. Does "${sanitized.player}" satisfy BOTH criteria?\n1. "${sanitized.row}"\n2. "${sanitized.col}"\nConsider the player's whole NFL career: every team, college, draft status/round/pick, position, Pro Bowls, All-Pro, MVP/OPOY/DPOY/ROY awards, and Super Bowl wins. Be lenient with spelling and accept an unambiguous surname.\nReply with ONLY JSON: {"valid":true,"fullName":"First Last"} or {"valid":false,"reason":"brief"}`;

  try {
    const callAI = () => fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 150 }),
    });
    let resp = await callAI();
    if (resp.status === 429) {
      // free-tier RPM hit: wait once and retry before failing open
      await new Promise((r) => setTimeout(r, 1200));
      resp = await callAI();
    }
    if (!resp.ok) return accept();
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return accept();
    const result = JSON.parse(m[0]);
    const verdict = { valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null };
    // cache VERIFIED verdicts only — never the fail-open acceptances
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict);
  } catch {
    return accept();
  }
});
