/* ─── Round 835: who you are and who speaks for you, one rule for every career ─

   Round 49 gave Soccer Career two identity beats: a personality you pick at
   18 that colours how fast the followers come and what the sponsors pay, and
   an agent you sign the season after who takes a cut of everything and
   squeezes the clubs for a better wage. The four American careers have
   neither. The owner's words: "my careers are nothing like the soccer ones",
   and his standing rule is one engine, many sports, so the rules moved here
   and soccer binds them, the way careerMoney.ts and careerSocial.ts work.

   WHAT A SPORT HANDS IN (IdentitySport). Data only:
     personalities  who you can be, each with the two multipliers it carries
     agents         who can represent you: wage multiplier, yearly income cut,
                    transfer cut
     noAgentTransferCut  what a save that never signed anyone pays on a move
                    (soccer: the flat 10 percent every pre Round 49 save paid)
     beats          the ages the two identity beats come due

   THE RULES THIS FILE OWNS
     1. A personality shifts two odds, followers and sponsor money, and never
        past PERSONALITY_BOUND. The bound is applied where the multiplier is
        read, so a sport's data cannot push past it, and identityProblems
        names any row that tries.
     2. An unknown or missing personality is neutral (1 on both).
     3. An agent you do not have pays no cut and gets no wage bump, except the
        transfer cut, which falls back to noAgentTransferCut.
     4. The beats are staggered: the personality first, from its age, and the
        agent only once there is a personality, from the agent age, so the two
        never land in the same season. Nothing is due once you have retired.

   Nothing here draws a random number. scripts/simCareerSocialBrands.mjs
   holds it against a synthetic sport and holds soccer to its pre lift output.
*/

export interface PersonalityDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** shown as a chip in the UI */
  perk: string;
  /** Multiplies a season's follower growth. */
  followerMult: number;
  /** Multiplies a season's sponsor money. */
  sponsorMult: number;
}

export interface AgentDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** multiplier applied to negotiated wages */
  wageMult: number;
  /** yearly cut of wage + sponsorship income */
  incomeCut: number;
  /** cut of any transfer fee when you move */
  transferCut: number;
}

export interface IdentitySport {
  personalities: PersonalityDef[];
  agents: AgentDef[];
  /** The transfer cut a save with no agent id at all pays. */
  noAgentTransferCut: number;
  beats: {
    /** The personality beat is due from this age. */
    personalityAge: number;
    /** The agent beat is due from this age, once a personality exists. */
    agentAge: number;
  };
}

/** The furthest a personality may move either of its odds. Showman, the
 *  loudest of soccer's five, sits at 1.6; the quietest at 0.85. */
export const PERSONALITY_BOUND = { min: 0.75, max: 1.75 } as const;

const bound = (v: number) => Math.max(PERSONALITY_BOUND.min, Math.min(PERSONALITY_BOUND.max, v));

export function personalityOf(id: string | null | undefined, sport: IdentitySport): PersonalityDef | undefined {
  return sport.personalities.find(p => p.id === id);
}

export function agentOf(id: string | null | undefined, sport: IdentitySport): AgentDef | undefined {
  return sport.agents.find(a => a.id === id);
}

/** How much a personality multiplies follower growth or sponsor money,
 *  inside PERSONALITY_BOUND, 1 for nobody. */
export function personalityMult(id: string | null | undefined, kind: "followers" | "sponsors", sport: IdentitySport): number {
  const p = personalityOf(id, sport);
  if (!p) return 1;
  return bound(kind === "followers" ? p.followerMult : p.sponsorMult);
}

export function agentWage(id: string | null | undefined, sport: IdentitySport): number {
  return agentOf(id, sport)?.wageMult ?? 1;
}

export function agentIncomeCut(id: string | null | undefined, sport: IdentitySport): number {
  return agentOf(id, sport)?.incomeCut ?? 0;
}

/** A save with no agent id pays the sport's old flat rate; an id the sport
 *  does not know pays the same. */
export function agentTransferCut(id: string | null | undefined, sport: IdentitySport): number {
  if (!id) return sport.noAgentTransferCut;
  return agentOf(id, sport)?.transferCut ?? sport.noAgentTransferCut;
}

/** What a beat reads off a save. */
export interface IdentityFacts {
  personality?: string | null;
  agentId?: string | null;
  age: number;
  retired?: boolean;
}

/** The identity beat due this season, if any. Staggered: personality first,
 *  agent the season after at the earliest. */
export function identityBeatDue(f: IdentityFacts, sport: IdentitySport): "personality" | "agent" | null {
  if (f.retired) return null;
  if (!f.personality) return f.age >= sport.beats.personalityAge ? "personality" : null;
  if (!f.agentId && f.age >= sport.beats.agentAge) return "agent";
  return null;
}

/** Every rule a sport's data breaks, in words. Empty means the data is sound. */
export function identityProblems(sport: IdentitySport): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of sport.personalities) {
    if (seen.has(p.id)) out.push(`personality ${p.id} is listed twice`);
    seen.add(p.id);
    for (const [k, v] of [["followerMult", p.followerMult], ["sponsorMult", p.sponsorMult]] as const) {
      if (!(v >= PERSONALITY_BOUND.min && v <= PERSONALITY_BOUND.max)) out.push(`personality ${p.id} ${k} ${v} is outside ${PERSONALITY_BOUND.min} to ${PERSONALITY_BOUND.max}`);
    }
  }
  seen.clear();
  for (const a of sport.agents) {
    if (seen.has(a.id)) out.push(`agent ${a.id} is listed twice`);
    seen.add(a.id);
    if (!(a.wageMult > 0)) out.push(`agent ${a.id} wage multiplier ${a.wageMult} is not positive`);
    for (const [k, v] of [["incomeCut", a.incomeCut], ["transferCut", a.transferCut]] as const) {
      if (!(v >= 0 && v < 0.5)) out.push(`agent ${a.id} ${k} ${v} is outside 0 to 0.5`);
    }
  }
  if (!(sport.noAgentTransferCut >= 0 && sport.noAgentTransferCut < 0.5)) out.push(`no agent transfer cut ${sport.noAgentTransferCut} is outside 0 to 0.5`);
  if (!(sport.beats.agentAge > sport.beats.personalityAge)) out.push("the agent beat must come after the personality beat");
  return out;
}
