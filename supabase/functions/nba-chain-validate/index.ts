import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * NBA Chain validator - deterministic rewrite (2026-07-15).
 *
 * Was: an LLM with a hand-maintained career cheat-sheet in the prompt, and FOUR
 * fail-open paths (no key, !response.ok, parse failure, catch) each returning
 * {valid:true}. With the free Gemini quota exhausted the game accepted anything.
 *
 * "Were these two ever teammates" is an overlapping stint on the same team, so
 * it is answered from public.nba_player_team_stints (13,948 stints / 4,773
 * players / 1949-2024, built from bref_nba_player_seasons).
 *
 * KNOWN COVERAGE GAP: the source has no 2025 or 2026 seasons. A pair who only
 * became teammates in 2025-26 (e.g. a recent trade) cannot be proven here, so
 * when BOTH players are still active at the 2024 edge we defer rather than
 * wrongly reject. Everything else is decided from data.
 *
 * ROUND 486: THE LOOKUP WAS ACCENT BLIND, SO THE BIGGEST NAMES IN THE MODERN
 * GAME COULD NOT BE ANSWERED AT ALL.
 *
 * Measured against production on 2026-09-06: "Nikola Jokic", "Luka Doncic" and
 * "Nikola Vucevic" each came back "does not appear in our NBA records
 * (1949-2024)", while Durant and Curry resolved normally. The game had been
 * played that same day.
 *
 * TWO causes, and repairing either alone would have changed nothing.
 *  1. The names were double encoded in the table ("Nikola JokiÄ‡"), 393 rows
 *     across 144 people here and 902 across the same 144 in
 *     bref_nba_player_seasons. Repaired by migration in this round.
 *  2. THIS function folded accents in norm() and then fetched with
 *     .ilike("player_name", ...) against the RAW column, so "Jokic" would have
 *     missed "Jokić" even after the repair.
 *
 * The prefilter now reads the name_folded column, which is filled with exactly
 * this file's norm(): lowercase, unaccented, punctuation flattened, spaces
 * collapsed. It also searches the last word of the RESOLVED name rather than of
 * the typed text, which fixes the nicknames as a side effect: "wemby" used to
 * be looked up as the literal string "wemby" and matched nobody, although the
 * table below has mapped it to Victor Wembanyama all along.
 */

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
  return e.count > 40;
}

/* Letters with NO canonical decomposition, so stripping combining marks cannot
   reach them and the class below would turn each into a space. Found by the
   Round 486 fence, which compared this fold against the database's: "Ömer Aşık"
   folded to "omer as k" here and "omer asik" there, because the Turkish dotless
   i is a letter in its own right rather than an i with something added. Same for
   the German sharp s, the Polish barred l and the Scandinavian slashed o.
   Turkish ş and ğ and İ are NOT here: those do decompose, and NFD handles them. */
const TRANSLIT: Record<string, string> = {
  "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d",
};

const norm = (s: string) =>
  (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const NICKNAMES: Record<string, string> = {
  kd: "kevin durant", bron: "lebron james", lebron: "lebron james", wemby: "victor wembanyama",
  shaq: "shaquille o neal", ai: "allen iverson", "the answer": "allen iverson",
  cp3: "chris paul", dbook: "devin booker", steph: "stephen curry", giannis: "giannis antetokounmpo",
  luka: "luka doncic", jokic: "nikola jokic", melo: "carmelo anthony", dwade: "dwyane wade",
};
const resolve = (n: string) => NICKNAMES[norm(n)] ?? norm(n);

const DATA_LAST_SEASON = 2024; // bref_nba_player_seasons ends here

interface Stint { player_name: string; team: string; first_season: number; last_season: number; }

function json(body: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function lookup(sb: any, name: string): Promise<Stint[]> {
  const target = resolve(name);
  const COLS = "player_name, team, first_season, last_season";
  /* The last word of the RESOLVED name, against the folded column. Resolved so
     a nickname is searched as the man it names; folded so an accent cannot hide
     him. */
  const token = target.split(" ").slice(-1)[0] || target;
  let { data, error } = await sb
    .from("nba_player_team_stints")
    .select(COLS)
    .ilike("name_folded", `%${token}%`)
    .limit(400);
  if (error) {
    /* The folded column is filled by migration. If it is ever missing, fall
       back to the old raw search rather than answering "no such player" for
       everybody, which is the one failure this round exists to end. */
    console.log(`nba-chain-validate: name_folded unavailable (${error.message}), falling back to the raw column`);
    ({ data } = await sb
      .from("nba_player_team_stints")
      .select(COLS)
      .ilike("player_name", `%${name.trim().split(/\s+/).slice(-1)[0]}%`)
      .limit(400));
  }
  const rows = (data ?? []) as Stint[];
  const exact = rows.filter((r) => resolve(r.player_name) === target);
  if (exact.length > 0) return exact;
  // unique-surname fallback
  const bySurname = rows.filter((r) => {
    const parts = resolve(r.player_name).split(" ");
    return parts[parts.length - 1] === target;
  });
  const names = new Set(bySurname.map((r) => resolve(r.player_name)));
  return names.size === 1 ? bySurname : [];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ valid: false, reason: "Slow down a moment and try again." }, corsHeaders, 429);

  try {
    const { previousPlayer, newPlayer } = await req.json();
    if (
      !previousPlayer || typeof previousPlayer !== "string" || previousPlayer.length > 100 ||
      !newPlayer || typeof newPlayer !== "string" || newPlayer.length > 100
    ) {
      return json({ valid: false, reason: "Invalid input" }, corsHeaders, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ valid: false, reason: "Validator unavailable, so this cannot be counted." }, corsHeaders);
    const sb = createClient(url, key);

    if (resolve(previousPlayer) === resolve(newPlayer)) {
      return json({ valid: false, reason: "That is the same player." }, corsHeaders);
    }

    const [prevStints, newStints] = await Promise.all([lookup(sb, previousPlayer), lookup(sb, newPlayer)]);
    const properNew = newStints[0]?.player_name ?? newPlayer;

    if (newStints.length === 0) {
      return json(
        { valid: false, reason: `${newPlayer} does not appear in our NBA records (1949-${DATA_LAST_SEASON}).`, fullName: newPlayer },
        corsHeaders,
      );
    }
    if (prevStints.length === 0) {
      return json(
        { valid: false, reason: `We have no NBA record for ${previousPlayer}, so this link cannot be verified.`, fullName: properNew },
        corsHeaders,
      );
    }

    // Teammates: same team code with overlapping seasons.
    for (const a of prevStints) {
      for (const b of newStints) {
        if (a.team !== b.team) continue;
        const from = Math.max(a.first_season, b.first_season);
        const to = Math.min(a.last_season, b.last_season);
        if (from <= to) {
          const { data: tc } = await sb.from("nba_team_codes").select("team_name").eq("team_code", a.team).maybeSingle();
          const teamName = tc?.team_name ?? a.team;
          const span = from === to ? `${from}-${String(from + 1).slice(2)}` : `${from}-${to}`;
          return json(
            {
              valid: true,
              connection: `${teamName} (${span})`,
              reason: `${properNew} and ${previousPlayer} were teammates on the ${teamName} in ${span}.`,
              fullName: properNew,
            },
            corsHeaders,
          );
        }
      }
    }

    // No overlap found. Only defer if BOTH are still active at the data edge,
    // because a 2025-26 pairing genuinely cannot be proven from this source.
    const prevActive = Math.max(...prevStints.map((s) => s.last_season)) >= DATA_LAST_SEASON;
    const newActive = Math.max(...newStints.map((s) => s.last_season)) >= DATA_LAST_SEASON;

    if (prevActive && newActive) {
      return json(
        {
          valid: false,
          reason: `We cannot confirm ${properNew} and ${previousPlayer} shared a roster. Our NBA records currently run through ${DATA_LAST_SEASON}, so a 2025-26 pairing may be missing.`,
          fullName: properNew,
          coverageGap: true,
        },
        corsHeaders,
      );
    }

    return json(
      { valid: false, reason: `${properNew} and ${previousPlayer} were never teammates.`, fullName: properNew },
      corsHeaders,
    );
  } catch (err) {
    console.error("nba-chain-validate error:", err);
    return json({ valid: false, reason: "Something went wrong verifying that one, so it cannot be counted." }, corsHeaders);
  }
});
