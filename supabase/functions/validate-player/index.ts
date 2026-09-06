import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Soccer player/team validator. FREE Gemini key -> gemini-2.5-flash (2.0-flash
 * has no free quota on this key). Falls back to the Lovable gateway.
 *
 * Round 315: TWO changes to the deployed v5, which is the base of this file.
 * 1. FAIL CLOSED. v5's every failure path returned valid:true, which is the
 *    exact July 2026 P1 shape the repo's standing rule bans: with the quota
 *    exhausted, every nonsense answer was accepted. Failure now returns
 *    {valid:false, unverified:true, reason:"...try again"}, which clients
 *    treat as a no-penalty retry, never as a verdict.
 * 2. POSITION FIT. The owner placed ter Stegen at CM in Build Your XI and v5
 *    passed it, so the slot's role rides along and the prompt refuses a player
 *    who has never genuinely played it.
 *
 * ROUND 482: THE DATABASE ANSWERS FIRST, AND THE ANSWER IS REMEMBERED.
 *
 * Build Your XI was DEAD in production, and not because of a bug in the game.
 * Found on 2026-09-06 by reading the completions table: 15 to 27 finished
 * lineups a day through 2026-08-28, then nothing, 215 in one fortnight against
 * 1 in the following week. Six calls to this function that afternoon came back
 * exhausted four times: the free Gemini allowance cannot serve this site, and
 * filling a lineup needs ELEVEN verdicts in a row. Round 413 found the same
 * thing on 2026-09-02 and made the refusal honest, which is not the same as
 * fixing it.
 *
 * The two grid validators survive the same allowance because they CACHE and
 * because they answer from data before they ask a model. This one did neither,
 * so every pick by every player spent an allowance call on a question the
 * site's own database already answers: player_market_values holds 141,916 rows
 * from 2004 to 2026, 27,850 players and their club every year, which IS the
 * question the prompt asks ("has this player ever played for this club").
 *
 * THE RULE THAT SHAPES ALL OF IT: the database may only ever CONFIRM.
 * A hit is verification and is allowed to say valid. A MISS proves nothing at
 * all (a spelling, a nickname, a club or a year the table does not carry) and
 * must fall through to the model, and a model that cannot answer still returns
 * unverified. Nothing here accepts on error. That is the July 2026 P1 rule and
 * it is not bent by having a better source: it is honoured by having one.
 *
 * WHY AN EXPLICIT CLUB MAP AND NOT A SEARCH. The game offers thirty clubs.
 * Matching their names against the table loosely is how you accept a wrong
 * answer: "Barcelona" also matches RCD Espanyol Barcelona and Barcelona SC
 * Guayaquil, and "Sporting CP" also matches Sporting Gijón, Sporting Kansas
 * City and Ceará Sporting Club. Every one of the thirty is written out below
 * against the exact strings the table uses, taken from the table on
 * 2026-09-06, including the five clubs it spells two ways (Juventus FC and
 * Juventus, Bayern Munich and FC Bayern Munich, SSC Napoli and Napoli, AS Roma
 * and Roma, Sevilla FC and Sevilla). Reserve and academy sides
 * (Real Madrid Castilla, FC Porto B, Ajax Amsterdam U21, Juventus Next Gen)
 * are deliberately NOT here: they are different teams, so they fall to the
 * model rather than being confirmed as the first team.
 * A season split between two clubs is one row whose club is both names joined
 * by " / ", so each part is read separately, the same lesson Rarity Round
 * learned when an eq pool refused men whose only spell at a club was a loan.
 */

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "build-your-xi";

const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://ballpark-hero.lovable.app",
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

/* Lowercase and accents stripped, PUNCTUATION KEPT: that, and nothing more, is
   what the name_folded column holds. Measured on the table 2026-09-06, because
   guessing it wrong costs whole players silently: "Marc-André ter Stegen" is
   stored as "marc-andre ter stegen" and "N'Golo Kanté" as "n'golo kante", so a
   fold that flattened the hyphen or the apostrophe would have matched neither
   man and both would have gone to the model as though unknown. */
const dbFold = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/* The same fold with punctuation flattened to spaces. Used ONLY where two
   sources are compared to each other (a squad name against a market values
   name, a club label against this file's own map), never against the column. */
const flat = (s: string) => dbFold(s).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/* A player typing "Marc Andre ter Stegen" means the man stored with a hyphen,
   and a player typing "NGolo Kante" means the man stored with an apostrophe.
   Every gap in the flattened name becomes a single-character wildcard, which
   the stored punctuation fits exactly. It is only reached when the plain
   equality finds nobody, so the indexed lookup still serves almost everyone. */
const likePattern = (s: string) => flat(s).replace(/ /g, "_");

/** The thirty clubs the game offers, against the exact strings the table uses. */
const CLUB_STRINGS: Record<string, string[]> = {
  "real madrid": ["Real Madrid"],
  "barcelona": ["FC Barcelona"],
  "manchester city": ["Manchester City"],
  "liverpool": ["Liverpool FC"],
  "bayern munich": ["Bayern Munich", "FC Bayern Munich"],
  "psg": ["Paris Saint-Germain"],
  "chelsea": ["Chelsea FC"],
  "arsenal": ["Arsenal FC"],
  "manchester united": ["Manchester United"],
  "juventus": ["Juventus FC", "Juventus"],
  "ac milan": ["AC Milan"],
  "inter milan": ["Inter Milan"],
  "borussia dortmund": ["Borussia Dortmund"],
  "atletico madrid": ["Atlético de Madrid"],
  "tottenham": ["Tottenham Hotspur"],
  "napoli": ["SSC Napoli", "Napoli"],
  "benfica": ["SL Benfica"],
  "porto": ["FC Porto"],
  "ajax": ["Ajax Amsterdam"],
  "bayer leverkusen": ["Bayer 04 Leverkusen"],
  "roma": ["AS Roma", "Roma"],
  "sevilla": ["Sevilla FC", "Sevilla"],
  "sporting cp": ["Sporting CP"],
  "newcastle": ["Newcastle United"],
  "aston villa": ["Aston Villa"],
  "west ham": ["West Ham United"],
  "marseille": ["Olympique Marseille"],
  "lyon": ["Olympique Lyon"],
  "celtic": ["Celtic FC"],
  "galatasaray": ["Galatasaray"],
};

/* The only nation the squad table spells differently to the game's flag strip.
   'South Korea' matches as written here, unlike in player_market_values, where
   it is 'Korea, South'. Round 442 hit that one from the other direction. */
const NATION_STRINGS: Record<string, string> = { "usa": "United States" };

/* The same two nations again, spelt as player_market_values.nationality spells
   them, which is not how the squad table spells them. Round 442 measured both:
   nationality 'USA' returns nobody and 'United States' returns 349; 'South
   Korea' returns nobody and 'Korea, South' returns 175. */
const NATIONALITY_STRINGS: Record<string, string> = {
  "usa": "United States",
  "south korea": "Korea, South",
};

/* The slot roles each recorded position genuinely covers, which is the same
   adjacency the prompt below describes in words: LB with LWB, RB with RWB,
   the wide midfield and wing pairs, the CDM/CM/CAM family, ST with CF. A
   keeper is never an outfielder and an outfielder is never a keeper.
   Keys are FLATTENED, because flat() turns the hyphen the table writes in
   "Centre-Back" and a key spelt with one could never be found. */
const POSITION_ROLES: Record<string, string[]> = {
  "goalkeeper": ["GK"],
  "centre back": ["CB"],
  "right back": ["RB", "RWB"],
  "left back": ["LB", "LWB"],
  "defensive midfield": ["CDM", "CM"],
  "central midfield": ["CM", "CDM", "CAM"],
  "attacking midfield": ["CAM", "CM"],
  "right midfield": ["RM", "RW"],
  "left midfield": ["LM", "LW"],
  "right winger": ["RW", "RM"],
  "left winger": ["LW", "LM"],
  "second striker": ["ST", "CF", "CAM"],
  "centre forward": ["ST", "CF"],
};

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

  /* the fail-closed answer for every path where nothing was actually checked.
     Round 413: it says WHICH it was. A blip is worth a retry; the day's free
     allowance is not, and the game stops inviting one. Fail closed either way. */
  const unverified = (exhausted = false) => json({
    valid: false,
    unverified: true,
    exhausted,
    reason: exhausted
      ? "Answer checking has used up its allowance for today, so this answer was not counted. Please come back tomorrow."
      : "Couldn't verify that answer. Try again in a second.",
  });

  const cacheKey = `${flat(playerName)}|${flat(teamName)}|${pos ?? ""}|${isNation ? "n" : "c"}`;
  try {
    const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
      .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
    if (hit?.verdict) return json({ ...(hit.verdict as Record<string, unknown>), cached: true });
  } catch { /* cache down: carry on, it is an optimisation and not a gate */ }

  /* ---- the database, CONFIRM ONLY ---- */
  try {
    const folded = flat(playerName);
    const COLS = "player_name, club, position, nationality";
    let { data } = await sb.from("player_market_values")
      .select(COLS).eq("name_folded", dbFold(playerName)).limit(200);
    if (!data || data.length === 0) {
      ({ data } = await sb.from("player_market_values")
        .select(COLS).like("name_folded", likePattern(playerName)).limit(200));
    }
    const rows = (data ?? []) as { player_name: string; club: string | null; position: string | null; nationality: string | null }[];
    if (rows.length > 0) {
      const roleOf = (r: { position: string | null }) => POSITION_ROLES[flat(r.position ?? "")] ?? [];

      if (!isNation) {
        const want = CLUB_STRINGS[flat(teamName)] ?? [];
        if (want.length > 0) {
          /* THE CLUB AND THE POSITION MUST COME FROM THE SAME ROW, and this is
             the whole safety of the section rather than a detail of it.
             name_folded is not a person: seven different men are on file as
             "Paulinho" and two of them are Brazilian, between them recorded at
             seven positions from Left-Back to Centre-Forward. Satisfying the
             club from one man's row and the position from another's would
             confirm a lineup nobody ever played, which is the accept-on-error
             shape this function exists to refuse. One row is one man in one
             season, so reading both off the same row cannot mix two people.
             A man who moved along the line later simply is not confirmed here
             and goes to the model, which is the correct way to be unsure.
             A season split between two clubs is stored as "A / B". */
          const hit = rows.find(r =>
            String(r.club ?? "").split(" / ").map(s => s.trim()).some(part => want.includes(part)) &&
            (!pos || roleOf(r).includes(pos)));
          if (hit) {
            const properName = hit.player_name;
            const verdict = { valid: true, reason: `Verified from our own records: ${properName} is on file at ${teamName}.`, fullName: properName };
            try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
            return json({ ...verdict, source: "records" });
          }
        }
      } else {
        /* National teams. A squad list is proof of having played for the
           country, and it is the ONLY thing here that is: nationality is not,
           because plenty of men are eligible for a country they were never
           picked by, and confirming off nationality would accept an answer the
           question does not ask. The lists only run from 2018 and Italy has no
           list at all, so most of this falls through to the model, which is
           what confirm-only means and is not a fault to be tuned away.
           Only country and player_name are read: 2,724 of the table's 2,784
           rows are shifted a column, so its club holds a birth date and its
           position holds a shirt number. The names survived (86 percent of
           them resolve into the market values table, checked 2026-09-06 over
           six countries) and nothing else in it is touched. */
        const country = NATION_STRINGS[flat(teamName)] ?? teamName;
        const { data: squad } = await sb.from("national_team_squads")
          .select("player_name")
          .eq("country", country)
          .limit(400);
        /* The squad table marks the armband inside the name: "Lionel Messi ( captain )"
           is how Messi was stored in all three of his Argentina squads, and 102 rows
           carried it. Round 484 moved the captaincy into its own column, but the
           stripping stays: the cleaning lives in a migration and a re-import of this
           table would put the armband straight back into the names. */
        const squadName = (n: string) => flat(String(n ?? "").replace(/\([^)]*\)/g, " "));
        const capped = (squad ?? []).some((s: { player_name: string }) => squadName(s.player_name) === folded);
        /* The cap and the position come from two tables, so they cannot come
           from one row, and the Paulinho problem is back. Tying the position
           row to the same country is what stands in for it: a capped man is a
           national of that country in all but a handful of cases, and the two
           halves can no longer be satisfied by two different men from two
           different places. */
        const mine = rows.filter(r => flat(r.nationality ?? "") === flat(NATIONALITY_STRINGS[flat(teamName)] ?? teamName));
        const hit = capped ? mine.find(r => !pos || roleOf(r).includes(pos)) : undefined;
        if (hit) {
          const properName = hit.player_name;
          const verdict = { valid: true, reason: `Verified from our own records: ${properName} has been named in a ${teamName} squad.`, fullName: properName };
          try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
          return json({ ...verdict, source: "records" });
        }
      }
    }
  } catch { /* the records are unavailable: ask the model, never accept */ }

  if (!AI_KEY) return unverified();

  const teamType = isNation ? "national team" : "club";
  const positionRule = pos
    ? ` The player must ALSO genuinely fit the position ${pos}: valid only if they have played ${pos} or a directly adjacent role at senior level (LB/LWB and RB/RWB adjacent, LW/LM and RW/RM adjacent, CDM/CM/CAM adjacent within the midfield family, ST/CF adjacent). A goalkeeper is NEVER valid in an outfield slot and an outfield player is NEVER valid in goal; someone famous at another position who never played ${pos} is invalid.`
    : "";
  const prompt = `You are a soccer database (knowledge through 2026). Has "${playerName}" ever played senior competitive football for the ${teamType} "${teamName}" (including the 2025-26 season and loan spells)?${positionRule} Count a player as active if they still play club football anywhere. Be lenient with spelling; resolve nicknames (Messi=Lionel Messi, CR7=Cristiano Ronaldo). Reply with ONLY JSON: {"valid":true/false,"reason":"short","fullName":"First Last"}. fullName must always be the player's commonly known full name.`;

  /* Round 413: max_tokens was 200, the same starvation Round 407 measured in
     the two grid validators: the model spends its own reasoning tokens before
     the JSON, the body arrives cut off mid verdict, and the answer comes back
     as a blip. 800 leaves room for the thinking and the verdict. */
  try {
    const callAI = () => fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 800 }),
    });
    let resp = await callAI();
    if (resp.status === 429) {
      /* ROUND 485 CORRECTS ROUND 482 HERE. The free tier limits requests per
         MINUTE and per DAY and both answer 429, and this code assumed the day,
         so a player who hit a sixty second window was told to come back
         TOMORROW and the client took the search box away.
         The logs settle which it actually is: on 2026-09-06 the refusals
         arrive in bursts two seconds apart (17:49:01, :03, :05, :07, :09, :11
         and again at 18:12), which is the shape of a per-minute window and not
         of a spent day, and the 1200ms retry could never have cleared one.
         So the body is read and believed rather than guessed at, and it is
         logged, because nobody could see which limit was firing. */
      const body1 = await resp.text().catch(() => "");
      const looksDaily = (s: string) => /per\s*day|perday|requests_per_day/i.test(s);
      if (looksDaily(body1)) {
        console.log(`ai refused 429 DAY: ${body1.slice(0, 200)}`);
        return unverified(true);
      }
      /* Not the day, or not sure. One short retry, then hand it back as an
         ordinary retryable refusal: the player keeps the search box and can
         try again, which is true and is what the minute limit deserves. */
      await new Promise((r) => setTimeout(r, 3000));
      resp = await callAI();
      if (resp.status === 429) {
        const body2 = await resp.text().catch(() => "");
        const day = looksDaily(body2);
        console.log(`ai refused 429 ${day ? "DAY" : "MINUTE-or-unknown"}: ${(body2 || body1).slice(0, 200)}`);
        return unverified(day);
      }
    }
    if (!resp.ok) { console.log(`ai refused: status ${resp.status}`); return unverified(); }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) { console.log(`ai no verdict: status ${resp.status} body ${String(content).slice(0, 160)}`); return unverified(); }
    const parsed = JSON.parse(m[0]);
    const verdict = { valid: !!parsed.valid, reason: parsed.reason || null, fullName: parsed.fullName || playerName };
    /* Only a real verdict is remembered. An unverified answer is a state of
       the world, not a fact about the player, and caching one would freeze a
       spent allowance into a permanent no. */
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict);
  } catch (err) {
    console.log(`ai threw: ${String(err).slice(0, 160)}`);
    return unverified();
  }
});
