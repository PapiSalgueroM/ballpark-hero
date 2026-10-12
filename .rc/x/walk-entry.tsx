/* Round 1308 review (run lens): the NFL bracket card in the board's own week box, every face, from a real
   league played to the end of Week 17 by the engine and a bracket played by nflPlayTie. Never committed. */
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as E from '@/lib/frontOffice';
import { FO_TEAM_MAP } from '@/data/frontOfficePlayers';
import { openBracket, playBracketWeek, bracketChampion, bracketOutcomes, type GmBracketSave } from '@/lib/gmBracket';
import { NFL_POSTSEASON, nflPlayTie } from '@/lib/frontOfficePostseason';
import { GM_GAME_DAY_BOX } from '@/lib/gmGameLog';
import NflBracket from '@/components/front-office/NflBracket';
import type { GmLastGame } from '@/lib/gmGameScore';

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = Number((window as unknown as { __seed?: number }).__seed ?? 1308);
const rng = mulberry(SEED);
const real = Math.random;
Math.random = rng;
const lg = E.initLeague(Math.random, {});
for (let w = 1; w <= E.REGULAR_WEEKS; w += 1) {
  E.injuryPass(lg.teams, Math.random);
  E.aiWeeklyMoves(lg, 'BUF', Math.random);
  for (const g of lg.schedule[lg.week - 1]) E.simGame(g, lg.teams, Math.random);
  if (lg.week < E.REGULAR_WEEKS) lg.week += 1;
}
Math.random = real;

const format = NFL_POSTSEASON.formatFor(lg.season)!;
const seeds = NFL_POSTSEASON.seeds(lg);
const told: GmLastGame[] = [];
const play = nflPlayTie(lg.teams, rng, lg.season, undefined, told);
const s0 = openBracket(format, lg.season, seeds);
const s1 = playBracketWeek(format, s0, play);
const s2 = playBracketWeek(format, s1, play);
const s3 = playBracketWeek(format, s2, play);
const s4 = playBracketWeek(format, s3, play);
const name = (id: string) => FO_TEAM_MAP.get(id)?.name ?? id;
const d1 = bracketOutcomes(format, s1);
const d3 = bracketOutcomes(format, s3);
const champ = bracketChampion(format, s4)!;
const missed = Object.keys(lg.teams).sort().find(a => !seeds.includes(a))!;
/* the lowest AFC seed left after the Wild Card: the top seed's opponent (the NFL reseeds) */
const afcLeft = ['AFC-WC-1', 'AFC-WC-2', 'AFC-WC-3'].map(id => d1[id].winner);
const lowest = afcLeft.sort((a, b) => seeds.indexOf(b) - seeds.indexOf(a))[0];
const partial: GmBracketSave = { ...s1, played: s1.played.filter(p => p.id !== 'NFC-WC-3') };

const FACES: Record<string, { save: GmBracketSave; my: string; expect: string }> = {
  'open-next': { save: s0, my: seeds[3], expect: `Next: the AFC Wild Card, against ${name(seeds[4])}.` },
  'open-bye': { save: s0, my: seeds[0], expect: 'You have the bye.' },
  'open-nfc6th': { save: s0, my: seeds[10], expect: `Next: the NFC Wild Card, against ${name(seeds[11])}.` },
  missed: { save: s0, my: missed, expect: 'No playoffs this year.' },
  through: { save: partial, my: d1['AFC-WC-3'].winner, expect: 'Through. The rest of this round is still to play.' },
  out: { save: s1, my: d1['AFC-WC-1'].loser, expect: 'Out in the AFC Wild Card.' },
  'div-next': { save: s1, my: seeds[0], expect: `Next: the AFC Divisional, against ${name(lowest)}.` },
  'sb-next': { save: s3, my: d3['AFC-CC'].winner, expect: `Next: the Super Bowl, against ${name(d3['NFC-CC'].winner)}.` },
  champion: { save: s4, my: champ, expect: 'Champions.' },
};

const W = window as unknown as Record<string, unknown>;
W.__faces = Object.keys(FACES);
W.__expect = Object.fromEntries(Object.entries(FACES).map(([k, v]) => [k, v.expect]));
W.__seeds = seeds.map(s => `${s} ${name(s)}`);
W.__told = told.length;
W.__opened = [] as string[];
W.__season = lg.season;

const root = createRoot(document.getElementById('root')!);
function Harness({ face, host }: { face: string; host: boolean }) {
  const f = FACES[face];
  let hostEl: HTMLDivElement | null = null;
  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="relative" data-week-panel>
        <div className={`${GM_GAME_DAY_BOX} overflow-hidden rounded-xl border border-border bg-background p-2`} data-gameday-box>
          <NflBracket format={format} save={f.save} my={f.my} name={name} onOpenGame={id => (W.__opened as string[]).push(id)} helpHost={host ? (W.__hostEl as HTMLElement) : null} />
        </div>
        {host && <div ref={el => { hostEl = el; W.__hostEl = hostEl; }} style={{ margin: 0 }} data-help-host />}
      </div>
      <div className="mt-3 flex gap-2"><button type="button" className="h-11 rounded-full border px-6 text-sm font-bold">Board button row (stand in)</button></div>
    </div>
  );
}
W.__mount = (face: string, host = false) => {
  flushSync(() => root.render(<Harness key={`${face}:${host}`} face={face} host={host} />));
  if (host) flushSync(() => root.render(<Harness key={`${face}:${host}`} face={face} host={host} />));
};
