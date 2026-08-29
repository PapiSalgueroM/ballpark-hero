import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* Soccer player/team validator. FREE Gemini key -> gemini-2.5-flash (2.0-flash
 * has no free quota on this key). Falls back to the Lovable gateway.
 *
 * Round 315: TWO changes to the deployed v5, which is the base of this file
 * (the repo copy had drifted; v5 is what actually ran).
 *
 * 1. FAIL CLOSED. v5's every failure path returned valid:true ("accept
 *    unverified so games never 500"), which is the exact July 2026 P1 shape
 *    the repo's standing rule bans: with the quota exhausted, every nonsense
 *    answer was accepted. Failure now returns
 *    {valid:false, unverified:true, reason:"...try again"}, which clients
 *    treat as a no-penalty retry, never as a verdict.
 * 2. POSITION FIT. The owner placed ter Stegen at CM in Build Your XI and v5
 *    passed it, because the position never reached the check. The slot's
 *    role now rides along (optional, so older clients keep working) and the
 *    prompt refuses a player who has never genuinely played it.
 */
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

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
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return false; }
  e.count++;
  return e.count > RATE_LIMIT_MAX;
}
setInterval(() => { const now = Date.now(); for (const [ip, e] of rateLimitMap) if (now > e.resetAt) rateLimitMap.delete(ip); }, 300_000);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ error: "Rate limit exceeded" }, 429);

  let playerName = "", teamName = "", isNation = false, pos: string | null = null;
  try {
    const b = await req.json();
    playerName = String(b.playerName || ""); teamName = String(b.teamName || ""); isNation = !!b.isNation;
    if (!playerName || playerName.length > 100 || !teamName || teamName.length > 100) return json({ error: "Invalid input" }, 400);
    pos = typeof b.position === "string" && /^[A-Z]{2,3}$/.test(b.position) ? b.position : null;
  } catch { return json({ error: "Bad request" }, 400); }

  /* the fail-closed answer for every path where nothing was actually checked */
  const unverified = () => json({ valid: false, unverified: true, reason: "Couldn't verify that answer. Try again in a second." });
  if (!AI_KEY) return unverified();

  const teamType = isNation ? "national team" : "club";
  const positionRule = pos
    ? ` The player must ALSO genuinely fit the position ${pos}: valid only if they have played ${pos} or a directly adjacent role at senior level (LB/LWB and RB/RWB adjacent, LW/LM and RW/RM adjacent, CDM/CM/CAM adjacent within the midfield family, ST/CF adjacent). A goalkeeper is NEVER valid in an outfield slot and an outfield player is NEVER valid in goal; someone famous at another position who never played ${pos} is invalid.`
    : "";
  const prompt = `You are a soccer database (knowledge through 2026). Has "${playerName}" ever played senior competitive football for the ${teamType} "${teamName}" (including the 2025-26 season and loan spells)?${positionRule} Count a player as active if they still play club football anywhere. Be lenient with spelling; resolve nicknames (Messi=Lionel Messi, CR7=Cristiano Ronaldo). Reply with ONLY JSON: {"valid":true/false,"reason":"short","fullName":"First Last"}. fullName must always be the player's commonly known full name.`;

  try {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 200 }),
    });
    if (!resp.ok) return unverified();
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return unverified();
    const parsed = JSON.parse(m[0]);
    return json({ valid: !!parsed.valid, reason: parsed.reason || null, fullName: parsed.fullName || playerName });
  } catch { return unverified(); }
});
