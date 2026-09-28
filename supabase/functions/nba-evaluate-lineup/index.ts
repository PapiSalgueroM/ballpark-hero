import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* NBA Starting 5's verdict screen.
 *
 * ROUND 645 PART TWO: THIS FILE WAS NOT THE DEPLOYED FUNCTION.
 *
 * Until 2026-09-28 the repo copy was an older program that called the Lovable
 * gateway only and dressed an answer it could not parse as "Regular Season".
 * The deployed function (version 5, read back through the management API on
 * 2026-09-28) is a different program: a Gemini shim, and when no AI answers,
 * statFallback, a quick data read that rates the five by how many of the names
 * it finds in nba_player_stats, whatever the challenge asked. Five real names
 * read All-Star Starters, the second rung of eight. A live probe the same day
 * (Curry, Thompson, James, Durant and Jokic on a LOWEST points challenge) came
 * back from statFallback as Solid Rotation, so the AI referee was not
 * answering. simFreePoints had read the old repo copy and certified a stand-in
 * the live function never sends. That is the Round 485 trap again
 * (scripts/simEdgeSync.mjs), and it is why this function is still in that
 * harness's `unverified` list.
 *
 * This file is now the deployed source with three changes, none of them in
 * statFallback's logic:
 *   1. AI_MODEL reads gemini-2.5-flash, not gemini-2.0-flash: the one word
 *      Round 485 fixed in evaluate-lineup. 2.0-flash has no free quota on this
 *      key, so tryAI returns null on every request and statFallback answers
 *      every lineup.
 *   2. The two em dashes in player copy are periods and the en dash in the
 *      prompt's pick lines is a colon (house style).
 *   3. This comment.
 * It is NOT deployed yet. Deploy it, then move nba-evaluate-lineup from
 * `unverified` to `synced` in scripts/data/edgeDeployed.json with this file's
 * hash, in the same commit. Until then, and after it whenever the AI is out,
 * the page (src/hooks/useNbaLineup.ts) treats every statFallback body and the
 * exception placeholder as no verdict (fiveRefereeVerdict in
 * src/lib/lineupVerdictPoints.ts), so the offline judge answers and a five
 * nobody judged records 0. simFreePoints runs statFallback from this file.
 */

// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
// The Lovable gateway is out of credits, so it is only a last-ditch fallback.
// If no AI is reachable we compute a deterministic verdict from nba_player_stats
// so Build Your Starting 5 still works for free and NEVER returns 500.
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

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
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

interface Pick { label: string; playerName: string; assignedTeam: string; }

function sanitizeName(n: string): string {
  return String(n || "").replace(/[(),*%\n\r]/g, " ").replace(/\s+/g, " ").trim();
}

function resolveStat(stat: string, unit: string) {
  const s = (String(stat) + " " + String(unit || "")).toLowerCase();
  const perGame = /per game|per-game|\bpg\b|ppg|rpg|apg|bpg|spg|average|avg/.test(s);
  if (/rebound|\breb\b|trb|rpg/.test(s)) return { col: "trb", perGame, label: "rebounds" };
  if (/assist|\bast\b|apg/.test(s)) return { col: "ast", perGame, label: "assists" };
  if (/three|3p|3-p|3 point|triple/.test(s)) return { col: "three_p", perGame, label: "3-pointers" };
  if (/steal|\bstl\b|spg/.test(s)) return { col: "stl", perGame, label: "steals" };
  if (/block|\bblk\b|bpg/.test(s)) return { col: "blk", perGame, label: "blocks" };
  if (/\bgames?\b|\bgp\b/.test(s) && !/per game/.test(s)) return { col: "games", perGame: false, counting: true, label: "games played" };
  if (/point|\bpts\b|scor|ppg/.test(s)) return { col: "points", perGame, label: "points" };
  return null;
}

const SYSTEM_PROMPT = (dir: string, stat: string, unit: string) => `You are an NBA expert and statistician with knowledge of every NBA player up to February 2026.

The user built a Starting 5, each player picked from a random assigned team, trying to optimise for the ${dir} combined ${stat} (${unit}).

Look up each player's career ${stat} (career averages for per-game stats; career totals for counting stats). List each value, compute the team total/average, and rate how well they optimised.

Pick ONE verdict: "GOAT Squad 🐐", "All-Star Starters ⭐", "Playoff Contenders 🏆", "Solid Rotation 📈", "Regular Season 😐", "Bench Warmers 📉", "G-League Level 😰", "Picked From the Stands 😂" (last one only for made-up players).

Respond with ONLY a JSON object: {"rating": "...", "headline": "punchy, max 10 words", "analysis": "4-5 sentences citing each player's ${stat} and the team total"}`;

async function tryAI(dir: string, stat: string, unit: string, playerList: string) {
  if (!AI_KEY) return null;
  try {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT(dir, stat, unit) },
          { role: "user", content: `Challenge: find the ${dir} ${stat} (${unit}).\n\nMy Starting 5:\n${playerList}\n\nEvaluate this lineup. Respond with ONLY valid JSON.` },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    let jsonStr = content;
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    else { const obj = content.match(/\{[\s\S]*\}/); if (obj) jsonStr = obj[0]; }
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.rating && parsed.analysis) {
      return { rating: String(parsed.rating), headline: String(parsed.headline || ""), analysis: String(parsed.analysis) };
    }
    return null;
  } catch (_e) { return null; }
}

async function fetchStats(names: string[]) {
  const m = new Map<string, any>();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !names.length) return m;
  try {
    const orExpr = names.map((n) => `player_name.ilike.${encodeURIComponent(n)}`).join(",");
    const url = `${SUPABASE_URL}/rest/v1/nba_player_stats?select=player_name,points,games,trb,ast,three_p,stl,blk&or=(${orExpr})`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    if (r.ok) { for (const row of await r.json()) m.set(String(row.player_name).toLowerCase(), row); }
  } catch (_e) { /* ignore */ }
  return m;
}

async function statFallback(players: Pick[], challenge: any) {
  const names = players.map((p) => sanitizeName(p.playerName)).filter(Boolean);
  const stats = await fetchStats(names);
  const resolved = resolveStat(challenge.stat, challenge.unit);
  const dir = challenge.direction === "lowest" ? "lowest" : "highest";
  const parts: string[] = [];
  const vals: number[] = [];
  let matched = 0;
  for (const p of players) {
    const row = stats.get(sanitizeName(p.playerName).toLowerCase());
    if (!row) { parts.push(`${p.playerName} (unlisted)`); continue; }
    matched++;
    if (resolved) {
      const raw = Number(row[resolved.col]) || 0;
      const g = Number(row.games) || 0;
      const v = resolved.perGame && g ? raw / g : raw;
      vals.push(v);
      parts.push(`${row.player_name} ${resolved.perGame ? v.toFixed(1) : Math.round(v).toLocaleString()}${resolved.perGame ? "/g" : ""}`);
    } else {
      parts.push(`${row.player_name}`);
    }
  }
  let rating: string;
  if (matched === 0) rating = "Picked From the Stands 😂";
  else if (matched === 5) rating = "All-Star Starters ⭐";
  else if (matched >= 3) rating = "Solid Rotation 📈";
  else rating = "Regular Season 😐";
  let teamLine = "";
  if (resolved && vals.length) {
    if (resolved.counting || !resolved.perGame) {
      teamLine = ` Combined ${resolved.label}: ${Math.round(vals.reduce((a, b) => a + b, 0)).toLocaleString()}.`;
    } else {
      teamLine = ` Average ${resolved.label}: ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}/g across ${vals.length}.`;
    }
  }
  const headline = matched === 0 ? "Couldn't find those names" : `A real, ${matched}/5-verified five`;
  const analysis = matched === 0
    ? `Our AI analyst is offline and none of these names matched our NBA career-stats table. Check the spelling (full first and last name) and try again shortly for the full verdict.`
    : `Quick data read while our AI analyst is offline (goal: ${dir} ${challenge.stat}). ${parts.join("; ")}.${teamLine} ${matched}/5 picks are verified NBA players in our records. Play again soon for the full AI breakdown.`;
  return { rating, headline, analysis };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  if (isRateLimited(clientIp)) return json({ error: "Rate limit exceeded" }, 429);

  try {
    const body = await req.json();
    const { players, challenge } = body;
    if (!challenge || typeof challenge !== "object" || !challenge.stat || !challenge.direction) {
      return json({ error: "Invalid challenge" }, 400);
    }
    if (!Array.isArray(players) || players.length !== 5) return json({ error: "Invalid players" }, 400);
    for (const p of players) {
      if (typeof p !== "object" || !p || typeof p.label !== "string" || p.label.length > 10 ||
        typeof p.playerName !== "string" || p.playerName.length > 100 ||
        typeof p.assignedTeam !== "string" || p.assignedTeam.length > 100) {
        return json({ error: "Invalid player data" }, 400);
      }
    }

    const dir = challenge.direction === "lowest" ? "LOWEST" : "HIGHEST";
    const playerList = players
      .map((p: Pick, i: number) => `${i + 1}. ${p.label}: ${p.playerName} (from ${p.assignedTeam})`)
      .join("\n");

    const ai = await tryAI(dir, challenge.stat, challenge.unit || "", playerList);
    if (ai) return json(ai);

    const fb = await statFallback(players as Pick[], challenge);
    return json(fb);
  } catch (_e) {
    return json({
      rating: "Solid Rotation 📈",
      headline: "Starting 5 locked in",
      analysis: "Your lineup is saved. Our analyst is taking a quick break. Try again in a moment for the full verdict.",
    }, 200);
  }
});
