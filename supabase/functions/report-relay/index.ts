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

// Keep provider response bodies and report details out of runtime logs.
function logEmailFailure(reason: string, httpStatus?: number) {
  console.warn(JSON.stringify({ event: "report_relay_email_failure", reason, http_status: httpStatus }));
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
    /* Round 446: the row is written FIRST and its id kept, so the delivery
       answer can be written back onto it below. The order matters: the durable
       copy must never wait on the mail provider, because the mail leg is best
       effort and the row is the thing that must not be lost. */
    const { data: inserted, error: dbError } = await supabase
      .from("question_reports")
      .insert({
        game_type: gameType,
        game_context: ctx,
        description: desc,
      })
      .select("id")
      .single();

    if (dbError || !inserted?.id) return json({ ok: false, emailed: false });

    // The stored report can be acknowledged while the provider is still working.
    EdgeRuntime.waitUntil((async () => {
      let emailed = false;
      let providerStatus: number | undefined;
      try {
        const resp = await fetch("https://formsubmit.co/ajax/" + REPORT_EMAIL, {
          method: "POST",
          /* FormSubmit rejects server-side posts without a web Origin. */
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Origin: "https://douknowball.com",
            Referer: "https://douknowball.com/",
          },
          body: JSON.stringify({
            _subject: "DoUKnowBall report: " + gameType,
            game: gameType,
            report: desc,
            context: JSON.stringify(ctx).slice(0, 1500),
          }),
          signal: AbortSignal.timeout(12_000),
        });
        providerStatus = resp.status;
        if (!resp.ok) {
          logEmailFailure("http_rejected", providerStatus);
        } else {
          // FormSubmit can decline a message even when it returns HTTP 200.
          const body = await resp.json() as { success?: unknown } | null;
          const success = String(body?.success);
          emailed = success === "true";
          if (!emailed) {
            logEmailFailure(success === "false" ? "provider_declined" : "malformed_response", providerStatus);
          }
        }
      } catch (error) {
        const timedOut = error instanceof DOMException
          && (error.name === "TimeoutError" || error.name === "AbortError");
        const reason = timedOut ? "timeout" : error instanceof SyntaxError ? "malformed_response" : "network_error";
        logEmailFailure(reason, providerStatus);
      }

      let writeStatus: number | undefined;
      try {
        const { error, status } = await supabase.from("question_reports").update({ emailed }).eq("id", inserted.id);
        if (!error) return;
        writeStatus = status || undefined;
      } catch {
        /* The report is already stored. */
      }
      console.warn(JSON.stringify({ event: "report_relay_email_status_write_failure", http_status: writeStatus }));
    })());

    return json({ ok: true, emailed: null });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
