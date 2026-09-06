import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * College Football 3x3 grid validator (colleges are CONFIRM-ONLY).
 * FAIL CLOSED (2026-07-22): when the model can't verify, do NOT accept -
 * return an explicit unverified verdict instead of accept-unverified.
 */

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "college-grid";
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

const COLLEGE_ALIASES: Record<string, string[]> = {
  "lsu": ["louisiana state"],
  "usc": ["southern california", "usc"],
  "miami fl": ["miami", "miami fla"],
  "miami florida": ["miami", "miami fla"],
  "ole miss": ["mississippi"],
  "pitt": ["pittsburgh"],
  "ucf": ["central florida"],
  "smu": ["southern methodist"],
  "tcu": ["texas christian"],
  "byu": ["brigham young"],
  "texas a m": ["texas a m"],
  "ohio state": ["ohio state"],
  "penn state": ["penn state"],
  "florida state": ["florida state"],
  "notre dame": ["notre dame"],
  "michigan": ["michigan"],
  "alabama": ["alabama"],
  "georgia": ["georgia"],
  "clemson": ["clemson"],
  "oklahoma": ["oklahoma"],
  "texas": ["texas"],
  "florida": ["florida"],
  "oregon": ["oregon"],
  "stanford": ["stanford"],
  "wisconsin": ["wisconsin"],
  "auburn": ["auburn"],
};

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
};

type Verdict = true | false | "unknown";

function json(obj: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function schoolsOf(raw: string | null): string[] {
  return (raw ?? "").split(";").map((s) => norm(s)).filter(Boolean);
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

  // FAIL CLOSED: when the model can't verify, do NOT accept.
  /* Round 407: a refusal says which it was. A blip is worth a retry; the
     day's allowance (a 429 twice) is not, and the page stops inviting one.
     Still fail closed either way: nothing unverified is ever accepted. */
  const unverified = (exhausted = false) =>
    json({ valid: false, unverified: true, exhausted, reason: exhausted ? "Answer checking has used up its allowance for today, so this guess was not counted. Please come back tomorrow." : "Couldn't verify your answer right now, please try again.", fullName: null }, corsHeaders);

  const cacheKey = cacheKeyOf(sanitized.player, sanitized.row, sanitized.col);
  try {
    const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
      .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
    if (hit?.verdict) return json({ ...(hit.verdict as Record<string, unknown>), cached: true }, corsHeaders);
  } catch { /* cache down */ }

  try {
    const { data } = await sb.from("nfl_player_team_stints")
      .select("player_name, position, college")
      .ilike("player_name", sanitized.player).limit(40);
    const stints = (data ?? []) as { player_name: string; position: string | null; college: string | null }[];

    /* The three tables the harness has always used and this function never did.
       All three are CONFIRM ONLY, like the colleges: a hit says yes, a miss says
       nothing and falls through to the model. */
    const [draftRes, heisRes, aaRes] = await Promise.all([
      sb.from("nfl_draft_picks").select("year, round, pick").ilike("player_name", sanitized.player).limit(5),
      sb.from("cfb_heisman_winners").select("year").ilike("winner", sanitized.player).limit(3),
      sb.from("cfb_all_americans").select("year").ilike("player_name", sanitized.player).limit(5),
    ]);
    let roundOneEnds: number | null = null;
    const draftYear = (draftRes.data ?? [])[0]?.year;
    if (draftYear != null) {
      const { data: r2 } = await sb.from("nfl_draft_picks")
        .select("pick").eq("year", draftYear).eq("round", 2)
        .order("pick", { ascending: true }).limit(1);
      const firstOfRoundTwo = (r2 ?? [])[0]?.pick;
      if (typeof firstOfRoundTwo === "number" && firstOfRoundTwo > 1) roundOneEnds = firstOfRoundTwo - 1;
    }

    if (stints.length > 0) {
      const properName = stints[0].player_name;
      const schools = [...new Set(stints.flatMap((s) => schoolsOf(s.college)))];
      const positions = stints.map((s) => norm(s.position ?? "")).filter(Boolean);

      /* ROUND 490: THE HARNESS ALREADY KNEW WHAT THIS FUNCTION DID NOT.
         College Grid recorded its last completion on 2026-07-31 and nothing for
         the 37 days after. scripts/simCollegeGrid.mjs proves every square of
         every board has a real answer, and it proves it from four tables this
         validator never opened: nfl_draft_picks, cfb_heisman_winners,
         cfb_all_americans and cfb_national_champions. So the answers existed and
         the checker could not see them, and every one of those cells fell
         through to a free AI allowance that is spent most of the day.
         Measured over the 450 criteria on the 75 boards: 275 (61 percent) were
         answerable from data, and a cell needs BOTH of its criteria, so only
         about a third of the board could ever be settled without the model.
         Draft (44), Heisman (12) and All-American (19) bring that to 350 of 450,
         which is about three fifths of cells. */
      const draft = (draftRes.data ?? [])[0] as { year: number | null; round: number | null; pick: number | null } | undefined;
      const heisman = (heisRes.data ?? []).length > 0;
      const allAmerican = (aaRes.data ?? []).length > 0;

      const evaluate = (label: string): Verdict => {
        const l = norm(label);
        if (POSITIONS[l]) {
          if (positions.length === 0) return "unknown";
          return positions.some((p) => POSITIONS[l].includes(p)) ? true : "unknown";
        }
        if (/heisman/.test(l)) return heisman ? true : "unknown";
        if (/all american/.test(l)) return allAmerican ? true : "unknown";
        if (/top 10 pick|top ten pick/.test(l)) {
          /* The overall pick number is trustworthy and needs no interpretation. */
          return draft?.pick != null && draft.pick <= 10 ? true : "unknown";
        }
        if (/first round pick/.test(l)) {
          /* THE ROUND COLUMN IS NOT USABLE and this is not a style choice.
             Measured 2026-09-06: 8,767 of the 11,417 rows marked round 1 carry
             an impossible pick number, up to 487, because the scrape defaults an
             unparsed round to 1. The 1982 draft alone has 83 of them, picks 252
             to 257 filed as first rounders. Rounds 2 to 8 are internally
             consistent, so the boundary is DERIVED from them: round one is every
             pick before round two begins, and that number is in the data itself
             (33 in 2025, 32 in 2000, 26 in 1990, 27 in 1970). Nothing is typed. */
          if (draft?.pick == null || roundOneEnds == null) return "unknown";
          return draft.pick <= roundOneEnds ? true : "unknown";
        }
        if (/national champion|undrafted|conference/.test(l)) return "unknown";
        if (schools.length === 0) return "unknown";
        const wanted = COLLEGE_ALIASES[l] ?? [l];
        return schools.some((s) => wanted.includes(s)) ? true : "unknown";
      };

      const rowV = evaluate(sanitized.row);
      const colV = evaluate(sanitized.col);

      if (rowV === true && colV === true) {
        const verdict = { valid: true, reason: "Verified from college and NFL records.", fullName: properName };
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
        return json(verdict, corsHeaders);
      }
    }
  } catch { /* deterministic pass unavailable -> AI */ }

  if (!AI_KEY) return unverified();

  const prompt = `You are a college football (NCAA/FBS) trivia expert (2000-2026). Does "${sanitized.player}" satisfy BOTH criteria?\n1. "${sanitized.row}"\n2. "${sanitized.col}"\nConsider the player's college career: school(s) attended, conference, position, Heisman/All-American/National Champion honours, and NFL draft status (round/pick/undrafted). Be lenient with spelling and accept an unambiguous surname.\nReply with ONLY JSON: {"valid":true,"fullName":"First Last"} or {"valid":false,"reason":"brief"}`;

  /* Round 407: max_tokens was 150, and the logs showed the model answering
     200 with a body of {"valid": and nothing more: its own reasoning tokens
     spend the budget before the verdict, so every AI judged guess was refused
     as a blip. 800 leaves room for the thinking and the JSON. */
  try {
    const callAI = () => fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 800 }),
    });
    let resp = await callAI();
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 1200));
      resp = await callAI();
    }
    if (resp.status === 429) return unverified(true);
    if (!resp.ok) return unverified();
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return unverified();
    const result = JSON.parse(m[0]);
    /* Round 407: the prompt asks the model to be lenient with spelling, and
       a probe with a nonsense name came back valid with a real player's
       name attached. A verdict only counts when the name the model settled
       on shares a token with the name the player typed; otherwise the guess
       is a miss, never a match handed to a stranger. */
    const guessTokens = norm(sanitized.player).split(" ").filter((t) => t.length > 2);
    const nameTokens = norm(String(result.fullName || "")).split(" ").filter((t) => t.length > 2);
    const sameName = nameTokens.length === 0 || nameTokens.some((t) => guessTokens.includes(t));
    const verdict = result.valid && !sameName
      ? { valid: false, reason: "That name did not match a player we could verify.", fullName: null }
      : { valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null };
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict, corsHeaders);
  } catch {
    return unverified();
  }
});
