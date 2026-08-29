import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Tennis Chain validator - deterministic rewrite (2026-07-15).
 *
 * The previous version asked an LLM and failed OPEN on any error, so with the
 * Gemini free quota exhausted it answered {valid:true} to everything -
 * "Tom Brady" was accepted as a Grand Slam champion.
 *
 * We do not hold head-to-head match results, so a literal "X beat Y in a slam"
 * check is impossible from this data. Rather than accept everything (lying) or
 * reject everything (unplayable), this verifies what the data CAN prove:
 *   1. the guessed player is a real Grand Slam singles champion, and
 *   2. they won a slam during the current player's slam-winning era.
 * Anything unverifiable is REJECTED, never allowed.
 *
 * Source of truth: public.tennis_grand_slam_winners (champion, year, category).
 *
 * Round 316 note: this file was stale in the repo (it still showed the old
 * LLM fail-open version) while THIS deterministic version had been deployed
 * since July. Synced from the deployed v7 per the source-of-truth rule.
 */

const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://ballpark-hero.lovable.app",
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
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  e.count++;
  return e.count > 40;
}

function norm(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function json(body: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return json({ valid: false, reason: "Slow down a moment and try again." }, corsHeaders, 429);
  }

  try {
    const body = await req.json();
    const currentPlayer = body?.currentPlayer ?? body?.currentDriver ?? body?.current;
    const guessedPlayer = body?.guessedPlayer ?? body?.guessedDriver ?? body?.guess;

    if (
      !currentPlayer || typeof currentPlayer !== "string" || currentPlayer.length > 100 ||
      !guessedPlayer || typeof guessedPlayer !== "string" || guessedPlayer.length > 100
    ) {
      return json({ valid: false, reason: "Invalid input" }, corsHeaders, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return json({ valid: false, reason: "Validator unavailable, so this cannot be counted." }, corsHeaders);
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("tennis_grand_slam_winners")
      .select("champion, year, tournament");

    if (error || !data) {
      return json({ valid: false, reason: "Could not reach the Grand Slam records, so this cannot be counted." }, corsHeaders);
    }

    const rows = data as { champion: string; year: number; tournament: string }[];
    const g = norm(guessedPlayer);
    const c = norm(currentPlayer);

    if (g === c) return json({ valid: false, reason: "That is the same player." }, corsHeaders);

    const gTitles = rows.filter((r) => norm(r.champion) === g);
    const cTitles = rows.filter((r) => norm(r.champion) === c);
    const properName = gTitles[0]?.champion ?? guessedPlayer;

    if (gTitles.length === 0) {
      return json(
        { valid: false, reason: `${guessedPlayer} has never won a Grand Slam singles title.`, fullName: guessedPlayer },
        corsHeaders,
      );
    }
    if (cTitles.length === 0) {
      return json(
        { valid: false, reason: `We have no Grand Slam record for ${currentPlayer}, so this link cannot be verified.`, fullName: properName },
        corsHeaders,
      );
    }

    // Era overlap: the guessed champion must have won a slam inside the current
    // player's slam-winning window (padded by 3 years either side to cover a
    // career that began before or ran past their first/last title).
    const cFirst = Math.min(...cTitles.map((r) => r.year)) - 3;
    const cLast = Math.max(...cTitles.map((r) => r.year)) + 3;
    const overlap = gTitles.filter((r) => r.year >= cFirst && r.year <= cLast).sort((a, b) => a.year - b.year);

    if (overlap.length === 0) {
      const yrs = gTitles.map((r) => r.year).sort((a, b) => a - b);
      return json(
        {
          valid: false,
          reason: `${properName} won slams in ${yrs.join(", ")}, which does not overlap ${currentPlayer}'s era.`,
          fullName: properName,
        },
        corsHeaders,
      );
    }

    const hit = overlap[0];
    return json(
      {
        valid: true,
        connection: `Won ${hit.tournament} ${hit.year}`,
        reason: `${properName} won ${hit.tournament} in ${hit.year}, inside ${currentPlayer}'s era.`,
        fullName: properName,
      },
      corsHeaders,
    );
  } catch (err) {
    console.error("tennis-chain-validate error:", err);
    return json({ valid: false, reason: "Something went wrong verifying that one, so it cannot be counted." }, corsHeaders);
  }
});
