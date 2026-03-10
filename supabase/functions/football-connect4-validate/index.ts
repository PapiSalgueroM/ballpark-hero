import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
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
const RATE_LIMIT_MAX = 20;
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { playerName, columnAttribute, rowAttribute } = body;

    if (
      !playerName || typeof playerName !== "string" || playerName.length > 100 ||
      !columnAttribute || typeof columnAttribute !== "string" || columnAttribute.length > 200 ||
      !rowAttribute || typeof rowAttribute !== "string" || rowAttribute.length > 200
    ) {
      return new Response(JSON.stringify({ valid: false, reason: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `You are a soccer expert verifier with comprehensive, verified knowledge through March 2026.

RETIREMENT RULES (CRITICAL):
- A player is ONLY retired if they have fully retired from ALL club football (no club contract anywhere).
- International retirement does NOT count as full retirement. A player who retired from their national team but still plays club football is ACTIVE.
- Active players (2025-26): Lionel Messi (Inter Miami), Cristiano Ronaldo (Al Nassr), Neymar (Santos, returned 2025), Luis Suárez (Inter Miami), Antoine Griezmann (retired from France NT only, still active at club level).
- Fully retired: Toni Kroos (retired 2024), Gerard Piqué (retired), Andrés Iniesta (retired from top-level play).

TASK: Determine if a given soccer player matches BOTH of these two attributes:
1. Column attribute: "${columnAttribute}"
2. Row attribute: "${rowAttribute}"

The player MUST satisfy BOTH attributes to be valid.

IMPORTANT — INCLUSIVE PLAYER ACCEPTANCE POLICY:
- When an attribute says "Played for [Club]" or involves a national team, accept ANY player who has been part of that club's or national team's senior squad, including:
  • Backup players, rotation players, squad players
  • Players who made even a small number of appearances (5+ appearances is sufficient)
  • Players on loan at the club
  • Youth academy graduates who played for the senior team
- Do NOT limit answers to only starters or star players. Backup goalkeepers, reserve defenders, rotation midfielders — all count as long as they genuinely played for the team.
- For national teams, include players who were called up and played, even if they only earned a handful of caps.
- When in doubt about whether a lesser-known player played for a team, lean toward accepting them if it's plausible they were in the squad.

ACCURACY NOTE: While being inclusive, do not accept players who never played for a team at all. The threshold is: did this player make at least a few senior appearances for this club/country? If yes, accept them.

ATTRIBUTE DEFINITIONS:
- "Played for [Club]" = on that club's senior team roster and made appearances at any point (loans count). Includes backup/squad players.
- "World Cup Winner" = in the winning squad of a FIFA Men's World Cup.
- "Champions League Winner" / "Won the Champions League" = won the UEFA Champions League / European Cup.
- "Won the Ballon d'Or" = actually won the Ballon d'Or award (not just nominated).
- "Ballon d'Or Winner/Nominee" = won OR was officially nominated/shortlisted.
- Nationality attributes (e.g., "French", "Brazilian") = player's international team nationality.
- "African Nationality" = represents an African national team.
- "South American Nationality" = represents a South American national team.
- "Scored 30+ Goals in a Single Season (all comps)" = 30+ goals across all competitions in one club season.
- "Scored 20+ Goals in a European League Season" = 20+ goals in a single European domestic league season.
- "Scored 20+ Bundesliga Goals in a Season" = 20+ goals in a single Bundesliga season.
- "Scored 100+ Premier League Goals" = career total of 100+ in the English Premier League.
- "Scored 200+ Career Goals" / "Scored 300+ Career Goals" = career total across all clubs and competitions.
- "Scored in a World Cup" = scored at least one goal in a FIFA World Cup match.
- "Scored in a Champions League Final" = scored in a UCL/European Cup final.
- "Played in La Liga" / "Played in Serie A" / "Played in the Premier League" / "Played in MLS" = played senior soccer in that league.
- "Has/Had a 90+ Rated FIFA Card" = had a base gold card rated 90 or above in ANY edition of EA Sports FIFA / EA FC (not special/TOTS cards, only the standard gold base card).
- "Market Value Has Exceeded €100M" = peak Transfermarkt market value reached €100M or more at any point.
- "Cost €50M+ Transfer Fee" = was transferred for a fee of €50M or more at least once.
- "Played with Lionel Messi (same club)" = was on the same club squad as Messi at the same time (Barcelona, PSG, or Inter Miami).
- "Played with Cristiano Ronaldo (same club)" = was on the same club squad as CR7 at the same time (Sporting, Man United, Real Madrid, Juventus, Al Nassr).
- "Played with Neymar (same club)" = was on the same club squad as Neymar at the same time (Santos, Barcelona, PSG, Al Hilal).
- "Played in a World Cup Final" = appeared in a FIFA World Cup final match OR was in the squad for that final.
- "Won a Domestic League in 3+ Countries" = won top-flight league titles in 3 or more different countries.
- "Captained Their National Team" = served as captain of their senior national team in an official match.
- "Won the Golden Boot (League Top Scorer)" = finished as top scorer of a major European domestic league.
- "Won the Europa League" = won the UEFA Europa League / UEFA Cup.
- "Copa América Winner" = in the winning squad of a Copa América.
- "European Championship Winner" = in the winning squad of a UEFA European Championship (Euros).
- "Active Player (as of 2025-26)" = currently playing professional soccer in the 2025-26 season. Note: Neymar (Al Hilal), Aubameyang, and Griezmann are still active.
- "Goalkeeper" / "Centre-Back" / "Full-Back/Wing-Back" = player's primary position.
- "English Nationality" / "Polish Nationality" / "Italian Nationality" = represents that nation.
- "South Korean or Japanese" = represents South Korea or Japan.
- "Won 3+ Champions League Titles" = won the UCL/European Cup 3 or more times.

KEY VERIFIED FACTS (2025-26 season):
- Juan Musso is Atlético Madrid's backup goalkeeper and has played for Argentina
- Viktor Gyökeres plays for Arsenal (transferred 2025)
- Estêvão plays for Chelsea (transferred 2025)
- Alexander Isak plays for Liverpool (transferred Jan 2026)
- Kevin De Bruyne plays for Al-Ittihad (transferred 2025)
- Omar Marmoush plays for Manchester City (transferred Jan 2026)
- Florian Wirtz plays for Bayern Munich (transferred 2025)
- Alejandro Garnacho plays for Chelsea (transferred Jan 2026)
- Xavi Simons plays for Tottenham (transferred 2025)
- Jonathan David plays for Juventus (transferred 2025)
- Leroy Sané plays for Galatasaray
- Jonathan Tah plays for Bayern Munich
- Neymar is at Al Hilal (active, not retired)
- Griezmann is active (not retired)

Also resolve nicknames (e.g., "CR7" = Cristiano Ronaldo, "Pele" = Pelé, "R9" = Ronaldo Nazário).

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "valid": true or false,
  "reason": "Brief explanation for EACH attribute separately",
  "fullName": "Player's full proper name"
}`,
            },
            {
              role: "user",
              content: `Does the soccer player "${playerName}" match BOTH: "${columnAttribute}" AND "${rowAttribute}"? Think carefully about each attribute before answering.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: false, reason: "Could not verify. Please try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { valid: false, reason: "Could not parse response. Please try again." };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("football-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: false, reason: "Validation error. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
