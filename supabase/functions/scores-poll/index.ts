/**
 * Round 287: the scores poller behind the ticker.
 *
 * WHY IT IS SHAPED LIKE THIS. The owner wants real scores on the ticker and
 * chose the free path: API-Sports' free tier, 100 requests a day per sport.
 * The ticker runs in every visitor's browser, so nothing in the browser may
 * ever call the feed; this function is the only thing that does, on a
 * schedule (pg_cron, every 20 minutes, 72 calls a day per sport), and it
 * writes what it gets into public.live_scores, which the ticker reads through
 * the ordinary anon client. The API key never leaves the database: it sits in
 * private.app_secrets, readable by the service role only.
 *
 * Every call is fail closed and quiet. A feed that errors writes a run row
 * saying so and leaves yesterday's rows alone; the ticker shows whatever is
 * fresh and says nothing about the rest. Nothing here is ever invented.
 *
 * Request shapes:
 *   POST /scores-poll            (x-poll-secret header)  poll every feed
 *   GET  /scores-poll?probe=nba  (x-poll-secret header)  return one feed's
 *                                raw payload, for checking a shape by eye
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

type Row = {
  id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  home_score: number | null;
  away_score: number | null;
  status_short: string;
  status_long: string;
  start_at: string;
  live: boolean;
  finished: boolean;
};

/** The date a US sports day belongs to, in New York, as YYYY-MM-DD. */
function nyDate(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null));
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

interface Feed {
  sport: string;
  host: string;
  path: (date: string) => string;
  parse: (payload: unknown) => Row[];
}

/* Status codes across the API-Sports family are short strings. The sets
   below are the documented finished and live codes; anything else is
   "not started" for the ticker's purposes, which is the safe reading. */
const FINISHED = new Set(["FT", "AET", "PEN", "AOT", "AP", "FINAL", "Finished", "3"]);
const LIVE_PREFIX = /^(1H|2H|HT|ET|BT|P|LIVE|Q[1-4]|OT|IN|[1-9]|H[12]|1st|2nd|3rd|4th|In Play|Halftime|Overtime|2)$/i;

function classify(short: string, long: string): { live: boolean; finished: boolean } {
  const s = short.trim();
  const l = long.trim();
  const finished = FINISHED.has(s) || /finish|final|ended|after/i.test(l);
  const live = !finished && (LIVE_PREFIX.test(s) || /in play|quarter|half|inning|period|overtime|live/i.test(l));
  return { live, finished };
}

const FEEDS: Feed[] = [
  {
    sport: "nfl",
    host: "https://v1.american-football.api-sports.io",
    path: d => `/games?date=${d}&timezone=America/New_York`,
    parse: p => ((p as any)?.response ?? []).filter((g: any) => /^NFL$/i.test(str(g?.league?.name))).map((g: any) => {
      const short = str(g?.game?.status?.short), long = str(g?.game?.status?.long);
      const { live, finished } = classify(short, long);
      return {
        id: `nfl:${str(g?.game?.id)}`, sport: "nfl", league: str(g?.league?.name),
        home: str(g?.teams?.home?.name), away: str(g?.teams?.away?.name),
        home_score: num(g?.scores?.home?.total), away_score: num(g?.scores?.away?.total),
        status_short: short, status_long: long,
        start_at: new Date(num(g?.game?.date?.timestamp) ? num(g?.game?.date?.timestamp)! * 1000 : str(g?.game?.date?.date)).toISOString(),
        live, finished,
      };
    }),
  },
  {
    sport: "nba",
    host: "https://v2.nba.api-sports.io",
    path: d => `/games?date=${d}`,
    parse: p => ((p as any)?.response ?? []).map((g: any) => {
      const short = str(g?.status?.short), long = str(g?.status?.long);
      const { live, finished } = classify(short, long);
      return {
        id: `nba:${str(g?.id)}`, sport: "nba", league: "NBA",
        home: str(g?.teams?.home?.name), away: str(g?.teams?.visitors?.name),
        home_score: num(g?.scores?.home?.points), away_score: num(g?.scores?.visitors?.points),
        status_short: short, status_long: long,
        start_at: new Date(str(g?.date?.start)).toISOString(),
        live, finished,
      };
    }),
  },
  {
    sport: "mlb",
    host: "https://v1.baseball.api-sports.io",
    /* by date only: the free plan refuses a season parameter ("try from 2022
       to 2024") but answers today's date, so the league is filtered here */
    path: d => `/games?date=${d}&timezone=America/New_York`,
    parse: p => ((p as any)?.response ?? []).filter((g: any) => /^MLB$/i.test(str(g?.league?.name))).map((g: any) => {
      const short = str(g?.status?.short), long = str(g?.status?.long);
      const { live, finished } = classify(short, long);
      return {
        id: `mlb:${str(g?.id)}`, sport: "mlb", league: "MLB",
        home: str(g?.teams?.home?.name), away: str(g?.teams?.away?.name),
        home_score: num(g?.scores?.home?.total), away_score: num(g?.scores?.away?.total),
        status_short: short, status_long: long,
        start_at: new Date(num(g?.timestamp) ? num(g?.timestamp)! * 1000 : str(g?.date)).toISOString(),
        live, finished,
      };
    }),
  },
  {
    sport: "nhl",
    host: "https://v1.hockey.api-sports.io",
    path: d => `/games?date=${d}&timezone=America/New_York`,
    parse: p => ((p as any)?.response ?? []).filter((g: any) => /^NHL$/i.test(str(g?.league?.name))).map((g: any) => {
      const short = str(g?.status?.short), long = str(g?.status?.long);
      const { live, finished } = classify(short, long);
      return {
        id: `nhl:${str(g?.id)}`, sport: "nhl", league: "NHL",
        home: str(g?.teams?.home?.name), away: str(g?.teams?.away?.name),
        home_score: num(g?.scores?.home), away_score: num(g?.scores?.away),
        status_short: short, status_long: long,
        start_at: new Date(num(g?.timestamp) ? num(g?.timestamp)! * 1000 : str(g?.date)).toISOString(),
        live, finished,
      };
    }),
  },
  {
    sport: "soccer",
    host: "https://v3.football.api-sports.io",
    /* one request covers every league on the date; the ticker keeps the big
       ones (Premier League 39, La Liga 140, Serie A 135, Bundesliga 78,
       Ligue 1 61, Champions League 2, MLS 253) and drops the rest */
    path: d => `/fixtures?date=${d}&timezone=America/New_York`,
    parse: p => ((p as any)?.response ?? [])
      .filter((f: any) => [39, 140, 135, 78, 61, 2, 253].includes(Number(f?.league?.id)))
      .map((f: any) => {
        const short = str(f?.fixture?.status?.short), long = str(f?.fixture?.status?.long);
        const { live, finished } = classify(short, long);
        return {
          id: `soccer:${str(f?.fixture?.id)}`, sport: "soccer", league: str(f?.league?.name),
          home: str(f?.teams?.home?.name), away: str(f?.teams?.away?.name),
          home_score: num(f?.goals?.home), away_score: num(f?.goals?.away),
          status_short: short, status_long: long,
          start_at: new Date(str(f?.fixture?.date)).toISOString(),
          live, finished,
        };
      }),
  },
];

/* private.app_secrets is not exposed through PostgREST, so it is read through
   public.app_secret(), a SECURITY DEFINER function that only the service role
   may execute. */
async function secret(name: string): Promise<string | null> {
  const { data, error } = await sb.rpc("app_secret", { p_name: name });
  if (error) return null;
  return typeof data === "string" && data ? data : null;
}

async function fetchFeed(feed: Feed, key: string, date: string): Promise<{ status: number; payload: unknown; error?: string }> {
  try {
    const res = await fetch(feed.host + feed.path(date), { headers: { "x-apisports-key": key } });
    const payload = await res.json().catch(() => null);
    return { status: res.status, payload };
  } catch (e) {
    return { status: 0, payload: null, error: String(e).slice(0, 200) };
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const provided = req.headers.get("x-poll-secret") ?? url.searchParams.get("secret") ?? "";
  const expected = await secret("poll_secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "not authorised" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  const key = await secret("api_sports_key");
  if (!key) {
    return new Response(JSON.stringify({ error: "no api key on file" }), { status: 500, headers: { "content-type": "application/json" } });
  }
  const date = url.searchParams.get("date") || nyDate();

  const probe = url.searchParams.get("probe");
  if (probe) {
    const feed = FEEDS.find(f => f.sport === probe);
    if (!feed) return new Response(JSON.stringify({ error: `no feed ${probe}` }), { status: 404 });
    const r = await fetchFeed(feed, key, date);
    let parsed: unknown = null, parseError = "";
    try { parsed = feed.parse(r.payload); } catch (e) { parseError = String(e); }
    return new Response(JSON.stringify({ sport: probe, date, status: r.status, error: r.error ?? parseError, parsed, raw: r.payload }, null, 1), {
      headers: { "content-type": "application/json" },
    });
  }

  const only = url.searchParams.get("only");
  const feeds = only ? FEEDS.filter(f => only.split(",").includes(f.sport)) : FEEDS;
  const summary: Record<string, unknown>[] = [];
  for (const feed of feeds) {
    const r = await fetchFeed(feed, key, date);
    let rows: Row[] = [];
    let note = r.error ?? "";
    /* API-Sports answers 200 with an errors object when the plan does not
       cover the request; that is a failure and it must say so */
    const apiErrors = (r.payload as any)?.errors;
    if (apiErrors && (Array.isArray(apiErrors) ? apiErrors.length : Object.keys(apiErrors).length)) note = JSON.stringify(apiErrors).slice(0, 300);
    if (r.status === 200 && !note) {
      try { rows = feed.parse(r.payload).filter(x => x.home && x.away && x.start_at); } catch (e) { note = `parse: ${String(e).slice(0, 200)}`; }
    }
    if (rows.length) {
      const { error } = await sb.from("live_scores").upsert(rows.map(x => ({ ...x, updated_at: new Date().toISOString() })), { onConflict: "id" });
      if (error) note = `upsert: ${error.message}`;
    }
    await sb.from("live_scores_runs").insert({ sport: feed.sport, date, http_status: r.status, rows: rows.length, note: note || null });
    summary.push({ sport: feed.sport, status: r.status, rows: rows.length, note: note || undefined });
  }
  /* rows older than two days are nobody's business any more */
  await sb.from("live_scores").delete().lt("start_at", new Date(Date.now() - 2 * 86400000).toISOString());
  return new Response(JSON.stringify({ date, summary }), { headers: { "content-type": "application/json" } });
});
