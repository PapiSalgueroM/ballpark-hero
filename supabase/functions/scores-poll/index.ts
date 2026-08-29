/**
 * Round 311: the scores poller behind the ticker, moved to ESPN's open feeds.
 *
 * WHY IT CHANGED. The original Round 287 poller ran on API-Sports' free tier
 * and that account was suspended on 2026-08-26, which silently emptied the
 * strip (the run ledger recorded the reason on every call). On 2026-08-28 the
 * owner asked for ESPN directly. ESPN's public scoreboard JSON needs no
 * account, no key and has no daily allowance, so the whole failure mode of a
 * suspended key disappears. We store team names, scores, statuses and start
 * times, which are facts; no ESPN content, branding or assets are stored or
 * shown, and nothing in the browser ever calls the feed. This function is
 * still the only thing that does, on the same pg_cron schedule, writing into
 * public.live_scores for the ticker to read through the ordinary anon client.
 *
 * Every call is fail closed and quiet, exactly as before. A feed that errors
 * writes a run row saying so and leaves existing rows alone; the ticker shows
 * whatever is fresh. Nothing here is ever invented.
 *
 * The poll secret stays: without it anyone could hammer the function and by
 * extension ESPN from our address. It lives in private.app_secrets, read
 * through public.app_secret(), service role only, same as always.
 *
 * Request shapes:
 *   POST /scores-poll              (x-poll-secret header)  poll every feed
 *   POST /scores-poll?day=1        same, for tomorrow's slate (the second
 *                                  cron job; day may be any small offset)
 *   POST /scores-poll?date=YYYY-MM-DD  an explicit date
 *   GET  /scores-poll?probe=nba    (x-poll-secret header)  one feed's raw
 *                                  payload, for checking a shape by eye
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

/* The scoreboard/header endpoint is the one the site's own pages call and it
   answers plain requests; the older site.api scoreboard now refuses
   everything with a 403, measured 2026-08-28 from two different networks. */
const HOST = "https://site.web.api.espn.com/apis/v2/scoreboard/header";

/* One entry per scoreboard we pull. US sports are one call each; soccer is
   one call per league because the feed has no combined scoreboard. The
   league text is ours, not the feed's, so the strip's vocabulary stays the
   site's own. */
const FEEDS: { sport: string; league: string; query: string; idExtra?: string }[] = [
  { sport: "nfl", league: "NFL", query: "sport=football&league=nfl" },
  { sport: "nba", league: "NBA", query: "sport=basketball&league=nba" },
  { sport: "mlb", league: "MLB", query: "sport=baseball&league=mlb" },
  { sport: "nhl", league: "NHL", query: "sport=hockey&league=nhl" },
  { sport: "soccer", league: "Premier League", query: "sport=soccer&league=eng.1", idExtra: "eng.1" },
  { sport: "soccer", league: "La Liga", query: "sport=soccer&league=esp.1", idExtra: "esp.1" },
  { sport: "soccer", league: "Serie A", query: "sport=soccer&league=ita.1", idExtra: "ita.1" },
  { sport: "soccer", league: "Bundesliga", query: "sport=soccer&league=ger.1", idExtra: "ger.1" },
  { sport: "soccer", league: "Ligue 1", query: "sport=soccer&league=fra.1", idExtra: "fra.1" },
  { sport: "soccer", league: "Champions League", query: "sport=soccer&league=uefa.champions", idExtra: "uefa.champions" },
  { sport: "soccer", league: "MLS", query: "sport=soccer&league=usa.1", idExtra: "usa.1" },
];

/* The feed's status state is the honest tristate: pre, in, post. Everything
   else about a status is presentation. Shape measured 2026-08-28:
   sports[0].leagues[0].events[], each event carrying date, status, summary,
   fullStatus.type {state, completed, description, detail, shortDetail} and
   competitors[] with homeAway, displayName and a score string. */
function parseEvents(feed: { sport: string; league: string; idExtra?: string }, payload: unknown): Row[] {
  const events = (payload as any)?.sports?.[0]?.leagues?.[0]?.events;
  if (!Array.isArray(events)) return [];
  const rows: Row[] = [];
  for (const ev of events) {
    const competitors = Array.isArray(ev?.competitors) ? ev.competitors : [];
    const homeC = competitors.find((c: any) => c?.homeAway === "home");
    const awayC = competitors.find((c: any) => c?.homeAway === "away");
    const st = ev?.fullStatus?.type ?? {};
    const state = str(st?.state || ev?.status).toLowerCase();
    const live = state === "in";
    const finished = state === "post" && st?.completed !== false;
    const started = new Date(str(ev?.date));
    if (Number.isNaN(started.getTime())) continue;
    const home = str(homeC?.displayName || homeC?.name);
    const away = str(awayC?.displayName || awayC?.name);
    if (!home || !away) continue;
    rows.push({
      id: `${feed.sport}:${feed.idExtra ? feed.idExtra + ":" : ""}${str(ev?.id)}`,
      sport: feed.sport,
      league: feed.league,
      home,
      away,
      /* a game that has not started has no score, whatever the feed's zero
         strings say */
      home_score: state === "pre" ? null : num(homeC?.score),
      away_score: state === "pre" ? null : num(awayC?.score),
      status_short: str(ev?.summary || st?.shortDetail).slice(0, 40),
      status_long: str(st?.description || st?.detail).slice(0, 80),
      start_at: started.toISOString(),
      live,
      finished,
    });
  }
  return rows;
}

/* private.app_secrets is not exposed through PostgREST, so it is read through
   public.app_secret(), a SECURITY DEFINER function that only the service role
   may execute. */
async function secret(name: string): Promise<string | null> {
  const { data, error } = await sb.rpc("app_secret", { p_name: name });
  if (error) return null;
  return typeof data === "string" && data ? data : null;
}

async function fetchFeed(query: string, date: string): Promise<{ status: number; payload: unknown; error?: string }> {
  try {
    const res = await fetch(`${HOST}?${query}&dates=${date.replaceAll("-", "")}`, {
      headers: {
        "accept": "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      },
    });
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
  /* date=YYYY-MM-DD wins; else day=N offsets today; else today. The old
     poller ignored day entirely, so the tomorrow cron had been re-polling
     today since Round 287. */
  const dayOffset = Number(url.searchParams.get("day"));
  const date = url.searchParams.get("date") || nyDate(Number.isFinite(dayOffset) ? dayOffset : 0);

  const probe = url.searchParams.get("probe");
  if (probe) {
    const feed = FEEDS.find(f => f.sport === probe || f.idExtra === probe);
    if (!feed) return new Response(JSON.stringify({ error: `no feed ${probe}` }), { status: 404 });
    const r = await fetchFeed(feed.query, date);
    let parsed: unknown = null, parseError = "";
    try { parsed = parseEvents(feed, r.payload); } catch (e) { parseError = String(e); }
    return new Response(JSON.stringify({ probe, date, status: r.status, error: r.error ?? parseError, parsed }, null, 1), {
      headers: { "content-type": "application/json" },
    });
  }

  const only = url.searchParams.get("only");
  const feeds = only ? FEEDS.filter(f => only.split(",").includes(f.sport)) : FEEDS;
  const bySport: Record<string, { rows: number; notes: string[] }> = {};
  for (const feed of feeds) {
    const r = await fetchFeed(feed.query, date);
    let rows: Row[] = [];
    let note = r.error ?? "";
    if (r.status === 200 && !note) {
      try { rows = parseEvents(feed, r.payload).filter(x => x.home && x.away && x.start_at); } catch (e) { note = `parse: ${String(e).slice(0, 200)}`; }
      /* a quiet day omits the events key, which is normal; a missing league
         envelope means the feed itself changed shape and must be said */
      if (!note && !(r.payload as any)?.sports?.[0]?.leagues?.[0]) note = "no league envelope";
    } else if (!note) {
      note = `http ${r.status}`;
    }
    if (rows.length) {
      const { error } = await sb.from("live_scores").upsert(rows.map(x => ({ ...x, updated_at: new Date().toISOString() })), { onConflict: "id" });
      if (error) note = `upsert: ${error.message}`;
    }
    const s = (bySport[feed.sport] ??= { rows: 0, notes: [] });
    s.rows += rows.length;
    if (note) s.notes.push(`${feed.idExtra ?? feed.sport}: ${note}`);
  }
  const summary: Record<string, unknown>[] = [];
  for (const [sport, s] of Object.entries(bySport)) {
    const note = s.notes.join("; ").slice(0, 300) || null;
    await sb.from("live_scores_runs").insert({ sport, date, http_status: 200, rows: s.rows, note });
    summary.push({ sport, rows: s.rows, note: note ?? undefined });
  }
  /* rows older than two days are nobody's business any more; future rows
     (tomorrow's slate) are exactly the business and are kept */
  await sb.from("live_scores").delete().lt("start_at", new Date(Date.now() - 2 * 86400000).toISOString());
  return new Response(JSON.stringify({ date, summary }), { headers: { "content-type": "application/json" } });
});
