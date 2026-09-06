import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* Build Your XI's verdict screen.
 *
 * ROUND 485: THIS FUNCTION HAS BEEN SERVING ITS OFFLINE FALLBACK TO EVERY
 * PLAYER, AND THE REPO FILE HID IT.
 *
 * The deployed version 4 read `AI_MODEL = GEMINI_KEY ? "gemini-2.0-flash" : ...`
 * and 2.0-flash has NO FREE QUOTA on this key. tryAI therefore returned null on
 * every request and the market-value fallback answered instead, which is why an
 * all-time XI of Buffon, Maldini, van Dijk, Ramos, Alves, Xavi, Pirlo, De
 * Bruyne, Ronaldo, Haaland and Messi came back on 2026-09-06 with "Quick
 * market-value read while our pundit's offline ... Play again for a full AI
 * verdict once it's back." The copy promises a verdict that could never arrive.
 * Every validator that demonstrably works today uses gemini-2.5-flash, and
 * validate-player's own header has said since Round 315 that 2.0-flash has no
 * free quota on this key. One word, on one line, in one function nobody
 * redeployed.
 *
 * WHY NOBODY SAW IT. The repo copy of this file was 237 lines and had ALREADY
 * been corrected to 2.5-flash, so anyone reading the repo saw working code. The
 * deployed copy was different and richer: it carries the whole market-value
 * fallback, sanitizeName and SYSTEM_PROMPT, none of which existed in the repo
 * file. So the repo was simultaneously AHEAD on the model line and BEHIND on
 * everything else, and redeploying it would have deleted the fallback while
 * fixing the model. This file is now the deployed source with the model line
 * corrected, which is the only behavioural change.
 *
 * That is the trap CLAUDE.md names: the deployed version is the source of
 * truth, and a repo file that disagrees is not evidence of anything. Round 316
 * already found three stale files hiding fixed deployed versions. What was
 * missing was a check, and scripts/simEdgeSync.mjs is now it: it records the
 * hash of each function's repo file at the moment it was last deployed, so a
 * file edited and never redeployed goes red instead of looking correct.
 */

// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
// The old Lovable gateway is out of credits, so it is only a last-ditch fallback.
// If no AI is reachable, we compute a deterministic verdict from the player
// market-value table so Build Your XI still works for free and NEVER 500s.
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

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
const RATE_LIMIT_MAX = 10;
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
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

interface PlayerPick {
  label: string;
  playerName: string;
  assignedTeam: string;
  isNation?: boolean;
}

function sanitizeName(n: string): string {
  return String(n || "").replace(/[(),*%\n\r]/g, " ").replace(/\s+/g, " ").trim();
}

const SYSTEM_PROMPT = (formation: string) => `You are a soccer expert and pundit. The user has built a starting XI using a ${formation} formation. Each player was assigned a random club or national team they had to pick a player from.

CRITICAL RULE: Every player in this lineup should be evaluated AS IF THEY ARE IN THEIR PRIME, regardless of whether they are retired or currently active. Do NOT penalise or comment on players being retired, old, or inactive. Treat Buffon, Maradona, Pele, etc. the same as current stars.

Your job: Evaluate how good this team would realistically perform if every player was at their peak. Consider player quality at prime, positional fit, team balance, and chemistry.

Give ONE of these verdicts (pick the most fitting):
- "Treble Winners 🏆🏆🏆"
- "Champions League Winners 🏆"
- "League Champions 🥇"
- "Top 4 Finish 📈"
- "Europa League Level 🌍"
- "Mid-Table 😐"
- "Relegation Battle 😰"
- "Relegated ⬇️"
- "Sunday League 😂" (only for made-up or non-existent players)

If any player names seem completely made up, be harsh. But do NOT penalise retired legends.

Respond with ONLY a JSON object with these fields:
- "rating": The verdict from the list above
- "headline": A punchy one-liner about the team (max 10 words)
- "analysis": A 3-4 sentence detailed analysis explaining your verdict`;

async function tryAI(formation: string, players: PlayerPick[]) {
  if (!AI_KEY) return null;
  try {
    const playerList = players
      .map((p, i) => `${i + 1}. ${p.label} – ${p.playerName} (from ${p.assignedTeam}, ${p.isNation ? "national team" : "club"})`)
      .join("\n");
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT(formation) },
          { role: "user", content: `Here is my ${formation} starting XI:\n\n${playerList}\n\nEvaluate this team. Respond with ONLY valid JSON, no markdown fences.` },
        ],
      }),
    });
    if (!resp.ok) { console.log(`evaluate-lineup: ai refused status ${resp.status}`); return null; }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    let jsonStr = content;
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    else {
      const obj = content.match(/\{[\s\S]*\}/);
      if (obj) jsonStr = obj[0];
    }
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.rating && parsed.analysis) {
      return {
        rating: String(parsed.rating),
        headline: String(parsed.headline || ""),
        analysis: String(parsed.analysis),
      };
    }
    console.log("evaluate-lineup: ai gave no usable verdict");
    return null;
  } catch (_e) {
    console.log(`evaluate-lineup: ai threw ${String(_e).slice(0, 120)}`);
    return null;
  }
}

async function marketValueFallback(players: PlayerPick[]) {
  const names = players.map((p) => sanitizeName(p.playerName)).filter(Boolean);
  const values: number[] = [];
  let topName = "";
  let topVal = 0;
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && names.length) {
      const orExpr = names.map((n) => `player_name.ilike.${encodeURIComponent(n)}`).join(",");
      const url = `${SUPABASE_URL}/rest/v1/player_market_values?select=player_name,market_value_usd&or=(${orExpr})`;
      const r = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (r.ok) {
        const rows = await r.json();
        const best = new Map<string, number>();
        for (const row of rows) {
          const nm = String(row.player_name || "").toLowerCase();
          const v = Number(row.market_value_usd) || 0;
          if (!best.has(nm) || v > (best.get(nm) as number)) best.set(nm, v);
        }
        for (const [nm, v] of best) {
          values.push(v);
          if (v > topVal) {
            topVal = v;
            topName = nm;
          }
        }
      }
    }
  } catch (_e) {
    // fall through to low-coverage handling
  }

  const matched = values.length;
  const total = names.length || 11;
  const M = 1_000_000;
  const avg = matched ? values.reduce((a, b) => a + b, 0) / matched : 0;
  const fmt = (v: number) => `$${Math.round(v / M)}M`;
  const pretty = topName ? topName.replace(/\b\w/g, (c) => c.toUpperCase()) : "your XI";

  let rating: string;
  if (matched < 4) rating = "Top 4 Finish 📈";
  else if (avg >= 80 * M) rating = "Champions League Winners 🏆";
  else if (avg >= 50 * M) rating = "League Champions 🥇";
  else if (avg >= 28 * M) rating = "Top 4 Finish 📈";
  else if (avg >= 12 * M) rating = "Europa League Level 🌍";
  else if (avg >= 4 * M) rating = "Mid-Table 😐";
  else rating = "Relegation Battle 😰";

  const headline = matched >= 4 ? `Squad value reads like a ${rating.replace(/\s*[^A-Za-z0-9 ].*$/, "").trim()} side` : "A squad stacked with legends";
  const analysis = matched >= 4
    ? `Quick market-value read while our pundit's offline: this XI averages about ${fmt(avg)} per priced player across ${matched}/${total} names, with ${pretty} the standout. On today's valuations that lands around "${rating}". Play again for a full AI verdict once it's back.`
    : `Our AI pundit is taking a short break, so here's a quick take: several of your picks look like all-time names our current-season valuation table doesn't price, so you get the benefit of the doubt. Your XI is locked in — try again shortly for the full verdict.`;

  return { rating, headline, analysis };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
  if (isRateLimited(clientIp)) {
    return json({ error: "Rate limit exceeded" }, 429);
  }

  try {
    const body = await req.json();
    const { formation, players } = body;

    if (!formation || typeof formation !== "string" || formation.length > 20) {
      return json({ error: "Invalid formation" }, 400);
    }
    if (!Array.isArray(players) || players.length === 0 || players.length > 15) {
      return json({ error: "Invalid players" }, 400);
    }
    for (const p of players) {
      if (
        typeof p !== "object" || !p ||
        typeof p.label !== "string" || p.label.length > 50 ||
        typeof p.playerName !== "string" || p.playerName.length > 100 ||
        typeof p.assignedTeam !== "string" || p.assignedTeam.length > 100
      ) {
        return json({ error: "Invalid player data" }, 400);
      }
    }

    const ai = await tryAI(formation, players as PlayerPick[]);
    if (ai) return json(ai);

    const fb = await marketValueFallback(players as PlayerPick[]);
    return json(fb);
  } catch (_e) {
    return json({
      rating: "Top 4 Finish 📈",
      headline: "Squad locked in",
      analysis: "Your XI is saved. Our pundit is taking a quick break — try again in a moment for a full verdict.",
    }, 200);
  }
});
