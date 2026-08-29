// Report relay: stores a player bug report AND forwards it to the owner's
// inbox (douknowball1@gmail.com). The email leg uses FormSubmit's AJAX API,
// which needs a ONE-TIME activation click from the destination inbox; until
// that click, reports still land safely in public.question_reports (and the
// /admin/reports screen). Deployed with the Supabase MCP; keep this file in
// sync with the deployed source per CLAUDE.md.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const REPORT_EMAIL = "douknowball1@gmail.com";

/* Round 304, audit finding 10: this was the ONE function answering any
   origin while every AI function kept an allowlist, and it is the one that
   pumps content into a human inbox. Same list the AI functions use. */
const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://ballpark-hero.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { game_type, game_context, description } = await req.json();

    if (!description || typeof description !== "string" || !description.trim()) {
      return json({ ok: false, error: "missing description" }, 400);
    }

    const gameType = String(game_type ?? "unknown").slice(0, 100);
    const desc = description.slice(0, 2000);
    const ctx = game_context && typeof game_context === "object" ? game_context : {};

    // 1) Durable copy in the DB (service role: report inserts never fail RLS).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: dbError } = await supabase.from("question_reports").insert({
      game_type: gameType,
      game_context: ctx,
      description: desc,
    });

    // 2) Email to the owner, best effort. Never fail the request over email.
    let emailed = false;
    try {
      const resp = await fetch(`https://formsubmit.co/ajax/${REPORT_EMAIL}`, {
        method: "POST",
        /* Round 316: FormSubmit refuses AJAX calls that carry no web Origin
           ("open this page through a web server"), which server side fetches
           do not send by default, so every mail this relay ever sent was
           being refused. The site's own origin satisfies it, measured
           2026-08-29: without it success:"false" with the web server
           message, with it the request proceeds to the activation check. */
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: "https://douknowball.com",
          Referer: "https://douknowball.com/",
        },
        body: JSON.stringify({
          _subject: `DoUKnowBall report: ${gameType}`,
          game: gameType,
          report: desc,
          context: JSON.stringify(ctx).slice(0, 1500),
        }),
        signal: AbortSignal.timeout(6000),
      });
      /* Round 316: FormSubmit answers 200 even when the destination inbox has
         not clicked its one-time activation yet, so resp.ok alone claimed
         delivery that never happened. Its AJAX body carries success as the
         string "true" when the mail actually went; anything else is not
         delivered, and the caller's response says so honestly. */
      const body = await resp.json().catch(() => null) as { success?: unknown } | null;
      emailed = resp.ok && String(body?.success) === "true";
    } catch (_e) {
      /* best effort only */
    }

    return json({ ok: !dbError, emailed });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
