import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Pro Football (NFL) 3x3 grid validator. FAIL CLOSED (2026-07-22): when the
 * model can't verify, do NOT accept - return an explicit unverified verdict.
 */

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "football-grid";
const cacheKeyOf = (p: string, r: string, c: string) =>
  `${p}|${r}|${c}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://ballpark-hero.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];
function isAllowedOrigin(o: string) {
  return allowedOrigins.includes(o) || o.endsWith(".lovableproject.com") || o.endsWith(".lovable.app");
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
function isRateLimited(ip: string) {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  e.count++;
  return e.count > 30;
}

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const POSITIONS: Record<string, string[]> = {
  "quarterback": ["qb"],
  "running back": ["rb", "fb", "hb"],
  "wide receiver": ["wr"],
  "tight end": ["te"],
  "offensive lineman": ["t", "g", "c", "ol", "ot", "og"],
  "defensive end": ["de", "edge"],
  "defensive tackle": ["dt", "nt", "dl"],
  "linebacker": ["lb", "ilb", "olb", "mlb"],
  "cornerback": ["cb", "db"],
  "safety": ["s", "fs", "ss", "db"],
  "kicker": ["k", "pk"],
  "punter": ["p"],
};

/* Round 401: a college label matches a school exactly, never by substring.
   The old test (c.includes(l) || l.includes(c)) accepted an Ohio player for
   Ohio State, a Florida State player for Florida, a Miami (Ohio) player for
   Miami. The spellings on the right are the stints table's own, normalised;
   a college label this list does not know still has to match a school
   exactly, and a miss falls through to the AI as before. */
const COLLEGE_ALIASES: Record<string, string[]> = {
  "alabama": ["alabama"],
  "auburn": ["auburn"],
  "clemson": ["clemson"],
  "florida": ["florida"],
  "florida state": ["florida state"],
  "georgia": ["georgia"],
  "lsu": ["louisiana state", "lsu"],
  "miami": ["miami", "miami fla", "miami fl"],
  "michigan": ["michigan"],
  "notre dame": ["notre dame"],
  "ohio state": ["ohio state"],
  "oklahoma": ["oklahoma"],
  "oregon": ["oregon"],
  "penn state": ["penn state"],
  "stanford": ["stanford"],
  "tennessee": ["tennessee"],
  "texas": ["texas"],
  "texas a m": ["texas a m", "texas a amp m"],
  "usc": ["southern california", "usc"],
  "wisconsin": ["wisconsin"],
};

type Verdict = true | false | "unknown";
interface Stint {
  player_name: string; team: string; position: string | null; college: string | null;
  first_season: number; last_season: number; debut_season: number | null; debut_age: number | null;
}

function json(obj: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ valid: false, error: "Too many requests" }, corsHeaders, 429);

  let sanitized = { player: "", row: "", col: "" };
  try {
    const { playerName, rowAttribute, colAttribute } = await req.json();
    if (!playerName || !rowAttribute || !colAttribute) return json({ valid: false, error: "Missing required fields" }, corsHeaders);
    sanitized = {
      player: String(playerName).slice(0, 80).replace(/[\n\r]/g, ""),
      row: String(rowAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
      col: String(colAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
    };
  } catch {
    return json({ valid: false, error: "Bad request" }, corsHeaders, 400);
  }

  // FAIL CLOSED: when the model can't verify, do NOT accept. Return an explicit
  // unverified verdict so the grid shows "couldn't verify, try again".
  const unverified = () =>
    json({ valid: false, unverified: true, reason: "Couldn't verify your answer right now, please try again.", fullName: null }, corsHeaders);

  const cacheKey = cacheKeyOf(sanitized.player, sanitized.row, sanitized.col);
  try {
    const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
      .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
    if (hit?.verdict) return json({ ...(hit.verdict as Record<string, unknown>), cached: true }, corsHeaders);
  } catch { /* cache down */ }

  try {
    const { data } = await sb.from("nfl_player_team_stints")
      .select("player_name, team, position, college, first_season, last_season, debut_season, debut_age")
      .ilike("player_name", sanitized.player).limit(40);
    const stints = (data ?? []) as Stint[];

    if (stints.length > 0) {
      const debut = stints[0].debut_season ?? Math.min(...stints.map((s) => s.first_season));
      const age = stints[0].debut_age;
      const careerComplete = debut >= 2003 || (age != null && age <= 23);
      const properName = stints[0].player_name;

      const evaluate = async (label: string): Promise<Verdict> => {
        const l = norm(label);
        const teamMatch = l.match(/^played for\s+(.+)$/);
        if (teamMatch) {
          const nick = teamMatch[1];
          const { data: codes } = await sb.from("nfl_team_codes").select("team_code, team_name, franchise");
          const wanted = (codes ?? []).filter((c: any) =>
            norm(c.team_name).includes(nick) || norm(c.franchise).includes(nick));
          if (wanted.length === 0) return "unknown";
          const codeSet = new Set(wanted.map((c: any) => c.team_code));
          if (stints.some((s) => codeSet.has(s.team))) return true;
          return careerComplete ? false : "unknown";
        }
        if (POSITIONS[l]) {
          const want = POSITIONS[l];
          const have = stints.map((s) => norm(s.position ?? "")).filter(Boolean);
          if (have.length === 0) return "unknown";
          return have.some((p) => want.includes(p)) ? true : "unknown";
        }
        const colleges = stints.flatMap((s) => (s.college ?? "").split(";")).map((c) => norm(c)).filter(Boolean);
        const wanted = COLLEGE_ALIASES[l] ?? [l];
        if (colleges.length > 0 && colleges.some((c) => wanted.includes(c))) return true;
        return "unknown";
      };

      const rowV = await evaluate(sanitized.row);
      const colV = await evaluate(sanitized.col);

      if (rowV === true && colV === true) {
        const verdict = { valid: true, reason: "Verified from NFL career records.", fullName: properName };
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
        return json(verdict, corsHeaders);
      }
      if (rowV === false || colV === false) {
        const which = rowV === false ? sanitized.row : sanitized.col;
        const verdict = { valid: false, reason: `${properName} does not satisfy "${which}".`, fullName: properName };
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
        return json(verdict, corsHeaders);
      }
    }
  } catch { /* deterministic pass unavailable -> AI */ }

  if (!AI_KEY) return unverified();

  const prompt = `You are a pro football (NFL) trivia expert. Does "${sanitized.player}" satisfy BOTH criteria?\n1. "${sanitized.row}"\n2. "${sanitized.col}"\nConsider the player's whole NFL career: every team, college, draft status/round/pick, position, Pro Bowls, All-Pro, MVP/OPOY/DPOY/ROY awards, and Super Bowl wins. Be lenient with spelling and accept an unambiguous surname.\nReply with ONLY JSON: {"valid":true,"fullName":"First Last"} or {"valid":false,"reason":"brief"}`;

  try {
    const callAI = () => fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 150 }),
    });
    let resp = await callAI();
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 1200));
      resp = await callAI();
    }
    if (!resp.ok) return unverified();
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return unverified();
    const result = JSON.parse(m[0]);
    const verdict = { valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null };
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict, corsHeaders);
  } catch {
    return unverified();
  }
});
