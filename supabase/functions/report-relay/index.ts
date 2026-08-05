// Report relay: stores a player bug report AND forwards it to the owner's
// inbox (douknowball1@gmail.com). The email leg uses FormSubmit's AJAX API,
// which needs a ONE-TIME activation click from the destination inbox; until
// that click, reports still land safely in public.question_reports (and the
// /admin/reports screen). Deployed with the Supabase MCP; keep this file in
// sync with the deployed source per CLAUDE.md.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const REPORT_EMAIL = "douknowball1@gmail.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `DoUKnowBall report: ${gameType}`,
          game: gameType,
          report: desc,
          context: JSON.stringify(ctx).slice(0, 1500),
        }),
        signal: AbortSignal.timeout(6000),
      });
      emailed = resp.ok;
    } catch (_e) {
      /* best effort only */
    }

    return json({ ok: !dbError, emailed });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
