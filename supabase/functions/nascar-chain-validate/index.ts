import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * NASCAR Chain validator - deterministic rewrite (2026-07-15).
 *
 * The previous version asked an LLM to recall Cup championship results and had
 * THREE fail-open paths (!response.ok, JSON parse failure, and the catch), each
 * returning { valid: true }. When the Gemini free quota ran out every request
 * 429'd and the game accepted literally any input - "Lionel Messi" included.
 * The prompt also hardcoded "2025: Tyler Reddick", which is wrong: Kyle Larson
 * won the 2025 Cup Series title.
 *
 * Championship results are a closed, factual set that already live in this
 * database, so there is no reason to involve a model. This version answers
 * from public.nascar_champions + public.nascar_drivers and FAILS CLOSED: if we
 * cannot verify, the answer is rejected with an honest reason, never accepted.
 *
 * Round 316 note: this file was stale in the repo (it still showed the old
 * LLM fail-open version) while THIS deterministic version had been deployed
 * since July. Synced from the deployed v5 per the source-of-truth rule.
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
const RATE_LIMIT_MAX = 40;
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

/** lowercase, strip accents and punctuation, collapse whitespace */
function norm(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NICKNAMES: Record<string, string> = {
  "the intimidator": "dale earnhardt",
  "the king": "richard petty",
  "junior": "dale earnhardt jr",
  "dale jr": "dale earnhardt jr",
  "jj": "jimmie johnson",
  "smoke": "tony stewart",
  "rowdy": "kyle busch",
  "awesome bill": "bill elliott",
};

function resolve(name: string): string {
  const n = norm(name);
  return NICKNAMES[n] ?? n;
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

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (isRateLimited(clientIp)) {
    return json({ valid: false, reason: "Slow down a moment and try again." }, corsHeaders, 429);
  }

  try {
    const body = await req.json();
    const { currentDriver, guessedDriver } = body ?? {};

    if (
      !currentDriver || typeof currentDriver !== "string" || currentDriver.length > 100 ||
      !guessedDriver || typeof guessedDriver !== "string" || guessedDriver.length > 100
    ) {
      return json({ valid: false, reason: "Invalid input" }, corsHeaders, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      // Fail CLOSED: never hand out a free point because config is missing.
      return json(
        { valid: false, reason: "Validator unavailable right now, so this one cannot be counted." },
        corsHeaders,
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const [champRes, driverRes] = await Promise.all([
      supabase.from("nascar_champions").select("year, driver_name"),
      supabase.from("nascar_drivers").select("driver_name, first_year, last_year"),
    ]);

    if (champRes.error || !champRes.data) {
      return json(
        { valid: false, reason: "Could not reach the championship records, so this cannot be counted." },
        corsHeaders,
      );
    }

    const champs = champRes.data as { year: number; driver_name: string }[];
    const drivers = (driverRes.data ?? []) as {
      driver_name: string;
      first_year: number | null;
      last_year: number | null;
    }[];

    const g = resolve(guessedDriver);
    const c = resolve(currentDriver);

    if (g === c) {
      return json({ valid: false, reason: "That is the same driver." }, corsHeaders);
    }

    // Every season the guessed driver won the Cup title
    const titleYears = champs
      .filter((r) => resolve(r.driver_name) === g)
      .map((r) => r.year)
      .sort((a, b) => a - b);

    const properName =
      champs.find((r) => resolve(r.driver_name) === g)?.driver_name ??
      drivers.find((d) => resolve(d.driver_name) === g)?.driver_name ??
      guessedDriver;

    if (titleYears.length === 0) {
      return json(
        {
          valid: false,
          reason: `${properName} never won the NASCAR Cup Series championship.`,
          fullName: properName,
        },
        corsHeaders,
      );
    }

    /* ROUND 488: THE RACING SPAN IS DERIVED FROM RESULTS, because the column
       that was supposed to hold it is empty.
       nascar_drivers has 83 rows and every statistical column is null in all of
       them: 79 have no first_year or last_year at all, and the four that do hold
       19 and 20, a year truncated to its first two digits. So the old code fell
       back to the span of the driver's own TITLE years, which is not a career.
       Kevin Harvick's span was therefore 2014 to 2014, one season, against a
       real career of 2001 to 2023, so nearly every true link to him was refused.
       Martin Truex Jr. was 2017 to 2017. And a driver who never won a title had
       no span at all, so seven of the twenty five starting drivers (Carl
       Edwards, Dale Earnhardt Jr., Denny Hamlin, Jeff Burton, Kasey Kahne, Mark
       Martin, Ryan Newman) could not be answered at all and the run ended on the
       first guess.
       The seasons a driver is RECORDED in are real and are already here: race
       wins, pole positions and titles. Measured 2026-09-06, that gives all 25
       starters a span, and the spans are close to the true careers (Harvick 2001
       to 2022, Earnhardt Jr. 2000 to 2016, Hamlin 2006 to 2025).
       It is a LOWER BOUND and deliberately so: a career starts before the first
       win and ends after the last, so this can still refuse a true link at the
       very edges. Refusing what cannot be proven is the direction this validator
       is supposed to fail in. Nothing here is invented.
       The three queries are filtered by name rather than reading whole tables,
       which also keeps nascar_race_results (2,104 rows) clear of the 1,000 row
       cap that Round 487 found hiding Grand Slam champions. */
    const curRow = drivers.find((d) => resolve(d.driver_name) === c);
    const curProper =
      curRow?.driver_name ??
      champs.find((r) => resolve(r.driver_name) === c)?.driver_name ??
      currentDriver.trim();
    const nameCandidates = [...new Set([curProper, currentDriver.trim()])];

    const [winRes, cupWinRes, poleRes] = await Promise.all([
      supabase.from("nascar_race_results").select("year").in("winner", nameCandidates),
      supabase.from("nascar_cup_races").select("year").in("winning_driver", nameCandidates),
      supabase.from("nascar_cup_races").select("year").in("pole_winner", nameCandidates),
    ]);

    const seasons: number[] = [];
    for (const r of champs) if (resolve(r.driver_name) === c) seasons.push(r.year);
    for (const set of [winRes.data, cupWinRes.data, poleRes.data]) {
      for (const row of (set ?? []) as { year: number | null }[]) {
        if (typeof row.year === "number") seasons.push(row.year);
      }
    }
    /* the stored span is believed only when it is a real year, for the reason
       in the comment above. */
    const sane = (y: number | null | undefined) =>
      typeof y === "number" && y >= 1900 && y <= 2100 ? y : null;
    const storedFirst = sane(curRow?.first_year);
    const storedLast = sane(curRow?.last_year);
    if (storedFirst != null) seasons.push(storedFirst);
    if (storedLast != null) seasons.push(storedLast);

    if (seasons.length === 0) {
      return json(
        {
          valid: false,
          reason: `We have no recorded seasons for ${currentDriver}, so this link cannot be verified.`,
          fullName: properName,
        },
        corsHeaders,
      );
    }

    const firstYear = Math.min(...seasons);
    const lastYear = Math.max(...seasons);

    // Valid when the guessed driver took a title in a season the current driver raced.
    const beatYears = titleYears.filter((y) => y >= firstYear && y <= lastYear);

    if (beatYears.length === 0) {
      const span = titleYears.join(", ");
      return json(
        {
          valid: false,
          reason: `${properName} won the title in ${span}, none of them between ${firstYear} and ${lastYear}, the seasons we have ${currentDriver} on record for.`,
          fullName: properName,
        },
        corsHeaders,
      );
    }

    return json(
      {
        valid: true,
        connection: `Won ${beatYears[0]} Cup championship`,
        reason: `${properName} took the ${beatYears[0]} Cup title while ${currentDriver} was racing.`,
        fullName: properName,
      },
      corsHeaders,
    );
  } catch (err) {
    console.error("nascar-chain-validate error:", err);
    // Fail CLOSED.
    return json(
      { valid: false, reason: "Something went wrong verifying that one, so it cannot be counted." },
      corsHeaders,
    );
  }
});
