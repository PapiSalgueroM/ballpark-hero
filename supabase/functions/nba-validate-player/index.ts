import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// DB-BACKED, FREE. This validator answers "did <player> play for <team> (and
// optionally at <position>, and what's their <stat>)" purely from the
// nba_player_stats table (career totals with a comma-separated `teams` column
// of Basketball-Reference abbreviations). No external AI and no API key
// needed, so NBA Starting 5 / grid games work for free.
//
// TWO DIFFERENT KINDS OF "cannot verify", and Round 316 made the line hard:
//   - COVERAGE GAP: the request succeeded and the player is genuinely not in
//     the table. Rejecting would block legitimate obscure players the table
//     never held, so this is ACCEPTED, deliberately and visibly ("not in our
//     stat table to verify"). A deterministic data decision, not an error.
//   - ERROR: the lookup failed (network, REST error) or the handler threw.
//     The old version accepted these too ("never break the game"), which is
//     the exact fail-open shape the July 2026 P1 rule bans. Errors now return
//     {valid:false, unverified:true} so the client retries without penalty.

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
const RATE_LIMIT_MAX = 30;
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
  for (const [ip, entry] of rateLimitMap) if (now > entry.resetAt) rateLimitMap.delete(ip);
}, 300_000);

// Team name/nickname -> Basketball-Reference abbreviations (incl. relocations).
const NICK_TO_ABBRS: Record<string, string[]> = {
  hawks: ["ATL"],
  celtics: ["BOS"],
  nets: ["BRK", "NJN", "NYN"],
  hornets: ["CHO", "CHH", "CHA"],
  bobcats: ["CHA"],
  bulls: ["CHI"],
  cavaliers: ["CLE"],
  cavs: ["CLE"],
  mavericks: ["DAL"],
  mavs: ["DAL"],
  nuggets: ["DEN"],
  pistons: ["DET"],
  warriors: ["GSW", "SFW"],
  rockets: ["HOU", "SDR"],
  pacers: ["IND"],
  clippers: ["LAC", "SDC", "BUF"],
  lakers: ["LAL"],
  grizzlies: ["MEM", "VAN"],
  heat: ["MIA"],
  bucks: ["MIL"],
  timberwolves: ["MIN"],
  wolves: ["MIN"],
  pelicans: ["NOP", "NOH", "NOK"],
  knicks: ["NYK"],
  thunder: ["OKC"],
  supersonics: ["SEA"],
  sonics: ["SEA"],
  magic: ["ORL"],
  "76ers": ["PHI"],
  sixers: ["PHI"],
  suns: ["PHO"],
  blazers: ["POR"],
  trailblazers: ["POR"],
  kings: ["SAC", "KCK", "KCO", "CIN"],
  spurs: ["SAS"],
  raptors: ["TOR"],
  jazz: ["UTA", "NOJ"],
  wizards: ["WAS", "WSB", "CAP", "BAL"],
  bullets: ["WAS", "WSB", "CAP", "BAL"],
};

function abbrsForTeam(teamName: string): string[] | null {
  const words = teamName.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const joined = words.join("");
  for (const [nick, abbrs] of Object.entries(NICK_TO_ABBRS)) {
    if (words.includes(nick) || joined.includes(nick)) return abbrs;
  }
  return null;
}

function posFamilies(pos: string): Set<string> {
  const s = new Set<string>();
  const p = (pos || "").toUpperCase();
  if (p.includes("G")) s.add("G");
  if (p.includes("F")) s.add("F");
  if (p.includes("C")) s.add("C");
  return s;
}

function requestedFamily(position: string): string | null {
  const p = (position || "").toUpperCase();
  if (p.startsWith("PG") || p.startsWith("SG") || p === "G" || p.includes("GUARD")) return "G";
  if (p.startsWith("SF") || p.startsWith("PF") || p === "F" || p.includes("FORWARD")) return "F";
  if (p === "C" || p.includes("CENTER")) return "C";
  return null;
}

function adjacent(a: string, b: string): boolean {
  if (a === b) return true;
  const adj: Record<string, string[]> = { G: ["F"], F: ["G", "C"], C: ["F"] };
  return (adj[a] || []).includes(b);
}

function resolveStatValue(row: any, challengeStat: string): number | null {
  const s = (challengeStat || "").toLowerCase();
  const g = Number(row.games) || 0;
  const perGame = /per game|per-game|\bpg\b|ppg|rpg|apg|bpg|spg|average|avg/.test(s);
  const val = (col: string) => {
    const raw = Number(row[col]) || 0;
    return perGame && g ? Math.round((raw / g) * 10) / 10 : raw;
  };
  if (/rebound|\breb\b|trb|rpg/.test(s)) return val("trb");
  if (/assist|\bast\b|apg/.test(s)) return val("ast");
  if (/three|3p|3-p|3 point|triple/.test(s)) return val("three_p");
  if (/steal|\bstl\b|spg/.test(s)) return val("stl");
  if (/block|\bblk\b|bpg/.test(s)) return val("blk");
  if (/\bgames?\b|\bgp\b/.test(s) && !/per game/.test(s)) return Number(row.games) || 0;
  if (/point|\bpts\b|scor|ppg/.test(s)) return val("points");
  return null;
}

/** ok:false means the LOOKUP failed (an error, never a coverage verdict). */
async function lookupPlayer(name: string): Promise<{ ok: boolean; row: any | null }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ok: false, row: null };
  try {
    const url = `${SUPABASE_URL}/rest/v1/nba_player_stats?player_name=ilike.${encodeURIComponent(name)}&select=player_name,teams,position,points,games,trb,ast,three_p,stl,blk&limit=2`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    if (!r.ok) return { ok: false, row: null };
    const rows = await r.json();
    return { ok: true, row: rows && rows.length ? rows[0] : null };
  } catch (_e) {
    return { ok: false, row: null };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  if (isRateLimited(ip)) return json({ valid: false, error: "Rate limit exceeded" }, 429);

  try {
    const body = await req.json();
    const { playerName, teamName, position, challengeStat } = body;

    if (!playerName || typeof playerName !== "string" || playerName.length > 100) {
      return json({ valid: false, error: "Invalid playerName" }, 400);
    }
    if (!teamName || typeof teamName !== "string" || teamName.length > 100) {
      return json({ valid: false, error: "Invalid teamName" }, 400);
    }

    // Require a full name (first + last), matching the old UX rule.
    if (!playerName.trim().includes(" ")) {
      return json({ valid: false, reason: "Please enter the player's full first and last name (e.g. 'LeBron James').", fullName: null });
    }

    const lookup = await lookupPlayer(playerName.trim());

    // The lookup ERRORED: fail closed, no penalty, retry.
    if (!lookup.ok) {
      return json({ valid: false, unverified: true, reason: "Couldn't verify that answer. Try again in a second." });
    }

    // Genuinely not in our table -> we can't disprove it; allow (lenient,
    // deliberate, and said out loud) so obscure real players still work.
    if (!lookup.row) {
      return json({ valid: true, reason: "Accepted (not in our stat table to verify).", fullName: playerName.trim() });
    }

    const row = lookup.row;
    const fullName = row.player_name as string;
    const playerAbbrs = String(row.teams || "").split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);

    // Team check
    const wantAbbrs = abbrsForTeam(teamName);
    if (wantAbbrs) {
      const played = wantAbbrs.some((a) => playerAbbrs.includes(a));
      if (!played) {
        return json({ valid: false, reason: `${fullName} never played for the ${teamName}.`, fullName });
      }
    }

    // Position check (lenient: only reject clearly-disjoint families)
    if (position && typeof position === "string") {
      const req2 = requestedFamily(position);
      const fams = posFamilies(row.position);
      if (req2 && fams.size && ![...fams].some((f) => adjacent(req2, f))) {
        return json({ valid: false, validPosition: false, reason: `${fullName} did not play ${position}.`, fullName });
      }
    }

    const statValue = challengeStat && typeof challengeStat === "string" ? resolveStatValue(row, challengeStat) : null;

    return json({ valid: true, reason: null, fullName, validPosition: true, statValue });
  } catch (_e) {
    // Round 316: FAIL CLOSED. This used to accept on any unexpected error,
    // the exact July P1 shape the standing rule bans.
    return json({ valid: false, unverified: true, reason: "Couldn't verify that answer. Try again in a second." }, 200);
  }
});
