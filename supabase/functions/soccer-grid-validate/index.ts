import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Soccer 3x3 grid validator (2026-07-15 rewrite, v2).
 *
 * Resolution order:
 *   1. verified-verdict cache (Postgres)
 *   2. DETERMINISTIC check against public.soccer_player_club_stints
 *      (80,577 stints / 27,850 players / 4,923 clubs, 2004-2026)
 *   3. AI (free Gemini) only for what the data cannot settle
 *   4. FAIL CLOSED when the model can't verify (2026-07-22): do NOT accept an
 *      unchecked answer. Return an explicit unverified verdict so the client
 *      shows "couldn't verify, try again" instead of silently accepting.
 *
 * Negative-safety: player_market_values starts in 2004, so a bare 2004 debut is
 * ambiguous - the player may have played earlier (Rijkaard, Hagi) and must NOT
 * be rejected. We therefore treat a career as fully covered when the player
 * either debuted in 2005+, or debuted at the 2004 floor while 21 or younger
 * (Messi was 16, Ronaldo 18, Sneijder 19 - those careers plainly start here).
 * Everything still uncertain falls through and is never falsely rejected.
 */

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "soccer-grid";
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

const DEMONYM: Record<string, string> = {
  dutch: "netherlands", french: "france", brazilian: "brazil", english: "england",
  spanish: "spain", german: "germany", italian: "italy", portuguese: "portugal",
  argentine: "argentina", argentinian: "argentina", belgian: "belgium", croatian: "croatia",
  serbian: "serbia", swedish: "sweden", norwegian: "norway", danish: "denmark",
  polish: "poland", turkish: "turkey", russian: "russia", ukrainian: "ukraine",
  scottish: "scotland", welsh: "wales", irish: "ireland", uruguayan: "uruguay",
  colombian: "colombia", chilean: "chile", mexican: "mexico", american: "united states",
  japanese: "japan", korean: "south korea", nigerian: "nigeria", ghanaian: "ghana",
  senegalese: "senegal", ivorian: "ivory coast", moroccan: "morocco", algerian: "algeria",
  egyptian: "egypt", cameroonian: "cameroon", swiss: "switzerland", austrian: "austria",
  greek: "greece", czech: "czech republic", slovak: "slovakia", romanian: "romania",
  hungarian: "hungary", finnish: "finland", icelandic: "iceland", australian: "australia",
  canadian: "canada", paraguayan: "paraguay", peruvian: "peru", ecuadorian: "ecuador",
  venezuelan: "venezuela", bosnian: "bosnia-herzegovina", slovenian: "slovenia",
  albanian: "albania", bulgarian: "bulgaria", israeli: "israel", iranian: "iran",
};

type Verdict = true | false | "unknown";
interface Stint {
  player_name: string; club: string; nationality: string | null; position: string | null;
  first_year: number; last_year: number; debut_year: number | null; debut_age: number | null;
}

function parseCriterion(label: string): { kind: "club" | "league" | "position" | "nationality"; value: string } {
  const l = label.trim();
  const club = l.match(/^played for\s+(.+)$/i);
  if (club) return { kind: "club", value: club[1] };
  const league = l.match(/^played in\s+(.+)$/i);
  if (league) return { kind: "league", value: league[1] };
  if (/goalkeeper|\(GK\)/i.test(l)) return { kind: "position", value: "gk" };
  if (/defender|\(DEF\)/i.test(l)) return { kind: "position", value: "def" };
  if (/midfield|\(MID\)/i.test(l)) return { kind: "position", value: "mid" };
  if (/forward|striker|winger|\(FWD\)/i.test(l)) return { kind: "position", value: "fwd" };
  return { kind: "nationality", value: l };
}

function positionBucket(pos: string | null): string | null {
  const p = norm(pos ?? "");
  if (!p) return null;
  if (p.includes("keeper")) return "gk";
  if (p.includes("back") || p.includes("defend")) return "def";
  if (p.includes("midfield")) return "mid";
  if (p.includes("forward") || p.includes("winger") || p.includes("striker")) return "fwd";
  return null;
}

function clubMatches(stintClub: string, wanted: string): boolean {
  const a = norm(stintClub), b = norm(wanted);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function evaluate(crit: { kind: string; value: string }, stints: Stint[], careerComplete: boolean): Verdict {
  if (stints.length === 0) return "unknown";
  if (crit.kind === "club") {
    if (stints.some((s) => clubMatches(s.club, crit.value))) return true;
    return careerComplete ? false : "unknown";
  }
  if (crit.kind === "nationality") {
    const want = DEMONYM[norm(crit.value)] ?? norm(crit.value);
    const have = stints.map((s) => norm(s.nationality ?? "")).filter(Boolean);
    if (have.length === 0) return "unknown";
    if (have.some((n) => n === want || n.includes(want) || want.includes(n))) return true;
    return false; // nationality does not change over a career
  }
  if (crit.kind === "position") {
    const buckets = stints.map((s) => positionBucket(s.position)).filter(Boolean) as string[];
    if (buckets.length === 0) return "unknown";
    return buckets.includes(crit.value) ? true : "unknown"; // players change roles; never hard-reject
  }
  return "unknown"; // league: no league data held
}

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

  // FAIL CLOSED: when the model can't verify, do NOT accept the answer. Return an
  // explicit unverified verdict (valid:false + unverified:true) so the grid shows
  // "couldn't verify, try again" and never records it as a wrong guess.
  const unverified = () =>
    json({ valid: false, unverified: true, reason: "Couldn't verify your answer right now — please try again.", fullName: null });

  const cacheKey = cacheKeyOf(sanitized.player, sanitized.row, sanitized.col);
  try {
    const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
      .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
    if (hit?.verdict) return json({ ...(hit.verdict as Record<string, unknown>), cached: true });
  } catch { /* cache down -> continue */ }

  const COLS = "player_name, club, nationality, position, first_year, last_year, debut_year, debut_age";

  try {
    const { data } = await sb.from("soccer_player_club_stints").select(COLS)
      .ilike("player_name", sanitized.player).limit(60);
    let stints = (data ?? []) as Stint[];

    // surname fallback, only when it resolves to exactly one player
    if (stints.length === 0 && sanitized.player.trim().split(/\s+/).length === 1) {
      const { data: bySurname } = await sb.from("soccer_player_club_stints").select(COLS)
        .ilike("player_name", `% ${sanitized.player.trim()}`).limit(60);
      const names = new Set((bySurname ?? []).map((r: any) => norm(r.player_name)));
      if (names.size === 1) stints = (bySurname ?? []) as Stint[];
    }

    if (stints.length > 0) {
      const debutYear = stints[0].debut_year ?? Math.min(...stints.map((s) => s.first_year));
      const debutAge = stints[0].debut_age;
      const careerComplete = debutYear >= 2005 || (debutAge != null && debutAge <= 21);

      const rowV = evaluate(parseCriterion(sanitized.row), stints, careerComplete);
      const colV = evaluate(parseCriterion(sanitized.col), stints, careerComplete);
      const properName = stints[0].player_name;

      if (rowV === true && colV === true) {
        const verdict = { valid: true, reason: "Verified from career records.", fullName: properName };
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
        return json(verdict);
      }
      if (rowV === false || colV === false) {
        const which = rowV === false ? sanitized.row : sanitized.col;
        const verdict = { valid: false, reason: `${properName} does not satisfy "${which}".`, fullName: properName };
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
        return json(verdict);
      }
    }
  } catch { /* deterministic pass unavailable -> AI */ }

  if (!AI_KEY) return unverified();

  const prompt = `You are a football/soccer trivia expert (knowledge through 2026). Does "${sanitized.player}" satisfy BOTH criteria?\n1. "${sanitized.row}"\n2. "${sanitized.col}"\nConsider all clubs (including loans), nationality, position (GK/DEF/MID/FWD), and honours (Champions League, World Cup, Ballon d'Or, league titles, Golden Boot, 100+ caps, leagues played in). Be lenient with spelling and accept an unambiguous surname.\nReply with ONLY JSON: {"valid":true,"fullName":"First Last"} or {"valid":false,"reason":"brief"}`;

  try {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 150 }),
    });
    if (!resp.ok) return unverified();
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return unverified();
    const result = JSON.parse(m[0]);
    const verdict = { valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null };
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict);
  } catch {
    return unverified();
  }
});
