/**
 * Round 900: the US career board fixture, recorder and replayer in one file.
 *
 * The four My Career boards (NFL, NBA, MLB, NHL) became one board plus four
 * bindings in Round 900, and the whole acceptance test of that round is that
 * nothing a player sees, clicks or has saved moved. This file is the proof.
 * It drives the REAL boards in jsdom with a seeded Math.random and a pinned
 * clock, and after every click it takes the localStorage save and the whole
 * document's markup.
 *
 *   A) the click path: two careers per sport, start to finish, through the
 *      create screen, the hub and its boxes, the season curtain, the event
 *      card, the extension talk, the free agency window, the rival beat and
 *      the rival choice, both confirmations, retirement and the coach career,
 *      with the board unmounted and mounted again along the way.
 *   B) the screens: fixed saves per sport (taken from the path at record
 *      time and stored in the fixture), each one mounted cold, every hub box
 *      opened and every button in it pressed, then played on.
 *
 * It only runs when US_BOARD_FIXTURE is set, so an ordinary Vitest run skips
 * it: the fixture is a statement about the pre-extraction tree. Round 992
 * retains that recording and excludes only its new practice entry from the
 * old screen projection and click candidates. Save bytes and all existing
 * screens remain exact; the new practice interactions have their own tests.
 * Round 996 keeps the real appearance editor on its recorded soccer copy in
 * this historical projection. Its callbacks, saved IDs and random draws stay
 * live; sport-specific presentation is covered by appearanceSportCopy and
 * native career creation checks instead of changing the recorded fixture.
 * Round 1009 continues past only the new transient decision receipt using
 * the Board's real callback. Its original event application, random draws,
 * saves, feed and following screen still match the unchanged recording.
 * Round 1038 deals every offseason up to three cards (src/lib/usCareerSummer.ts)
 * and turns that on in the four bindings. The replay mounts the shared board
 * with each binding set to the one card knob (cards 1, cooldowns off), which
 * must be the old offseason draw for draw and write nothing new onto the
 * save. The fixture is not re-recorded: this replay is the proof that the
 * knob path is today's game. The summer itself has its own tests
 * (src/test/usCareerSummer.test.tsx, scripts/simUsCareerSummer.mjs).
 * Round 1048 leaves one element out of the old screen projection and the
 * click candidates: the hub's Season Center entry ([data-season-centre-entry],
 * "Week by week" beside the Play button). The replay mounts the bare board, so
 * the entry IS in the document on the NBA path (and the NFL's once bound) and
 * is proven inert for every other screen and every save byte. The fixture is
 * not re-recorded; the entry has its own tests (src/test/usSeasonCentreEntry.test.tsx).
 *
 *   US_BOARD_FIXTURE=record  writes the fixture to US_BOARD_FIXTURE_OUT
 *   US_BOARD_FIXTURE=replay  compares against scripts/data/usBoardFixture.json
 *                            (or US_BOARD_FIXTURE_IN) and writes what differed
 *                            to US_BOARD_FIXTURE_REPORT
 *
 * Run it through scripts/simUsBoardParity.mjs, which also carries the controls.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ComponentProps, ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
vi.mock('@/components/soccer-career/AppearanceBuilder', async importOriginal => {
  const original = await importOriginal<typeof import('@/components/soccer-career/AppearanceBuilder')>();
  const Builder = original.default;
  return { ...original, default: (props: ComponentProps<typeof Builder>) => <Builder {...props} sport="soccer" /> };
});
/* Keep the old read-only log in this historical screen projection. The real
   season picker and event roundtrips have their own mounted/native checks.
   The Board's open/back callbacks and every saved outcome remain live. */
vi.mock('@/components/us-career/CareerSeasonReview', async () => {
  const { HubPanelHeader } = await import('@/components/hub/HubTiles');
  return { default: ({ career, sport, onBack }: ComponentProps<typeof import('@/components/us-career/CareerSeasonReview').default>) => <div className="space-y-3">
    <HubPanelHeader title="📜 Career Log" onBack={onBack} />
    <div className="rounded-2xl border border-border bg-card p-3">
      {career.seasons.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No seasons on the books yet. Go play one.</p>
        : <div className="max-h-96 space-y-0.5 overflow-y-auto">{[...career.seasons].reverse().map((s, i) => <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-background">
          <span className="text-muted-foreground">{s.year} · {s.team}</span>
          <span className="text-foreground">{sport.statLine(s, career.pos)}{s.awards.length ? ' 🏆' : ''}</span>
        </div>)}</div>}
    </div>
  </div> };
});
/* The historical path recorded the hub immediately after an ordinary choice.
   Keep that projection through the real Continue callback, without replacing
   any engine, storage or RNG behavior. The receipt has its own focused suite. */
vi.mock('@/components/us-career/CareerDecisionOutcome', async () => {
  const { useEffect } = await import('react');
  return { default: function HistoricalDecisionOutcome({ onContinue }: ComponentProps<typeof import('@/components/us-career/CareerDecisionOutcome').default>) {
    useEffect(() => { onContinue(); }, [onContinue]);
    return null;
  } };
});

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';

/* Round 1038: each binding on the one card knob. Built once per binding (the
   board restores whenever its sport object changes), and lazily, so nothing
   imported is read while this module evaluates. */
const ONE_CARD_KNOB = { cards: 1, cooldowns: false, fallbackCooldown: 1 };
const knobbed = new Map<UsCareerSport, ComponentType>();
function oneCardBoard(sport: () => UsCareerSport): ComponentType {
  return function OneCardBoard() {
    const s = sport();
    let Board = knobbed.get(s);
    if (!Board) {
      /* Round 1039: and with no Hall bound, so no retirement talk is asked and
         the retirement screen is the old one. */
      const knob: UsCareerSport = { ...s, summer: ONE_CARD_KNOB, hall: undefined };
      Board = function KnobBoard() { return <UsCareerBoard sport={knob} />; };
      knobbed.set(s, Board);
    }
    return <Board />;
  };
}
const NflMyCareerBoard = oneCardBoard(() => NFL_CAREER_SPORT);
const NbaMyCareerBoard = oneCardBoard(() => NBA_CAREER_SPORT);
const MlbMyCareerBoard = oneCardBoard(() => MLB_CAREER_SPORT);
const NhlMyCareerBoard = oneCardBoard(() => NHL_CAREER_SPORT);

const MODE = process.env.US_BOARD_FIXTURE ?? '';
const FIXTURE_PATH = process.env.US_BOARD_FIXTURE_IN || path.resolve(process.cwd(), 'scripts/data/usBoardFixture.json');
/* The one clock the boards can reach (the share button's date and the
   restored-finish window). Pinned so a fixture recorded today replays tomorrow. */
const PINNED_NOW = '2026-10-02T12:00:00Z';

/* [slug, board, save key, seed]. The seeds were picked so every screen the
   brief names turns up in each sport; the recorder refuses a path that
   misses one, so a seed can never quietly stop covering a screen. */
const SPORTS: [string, ComponentType, string, number][] = [
  ['nfl', NflMyCareerBoard, 'nfl-my-career-save-v1', 9001],
  ['nba', NbaMyCareerBoard, 'nba-my-career-save-v1', 9002],
  ['mlb', MlbMyCareerBoard, 'mlb-my-career-save-v1', 9003],
  ['nhl', NhlMyCareerBoard, 'nhl-my-career-save-v1', 9004],
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
/* The whole document, dialogs included. React numbers its generated ids from
   one counter for the whole process, so the id a dialog trigger carries says
   how many dialogs every earlier test mounted and nothing about this screen:
   left in, one sport's path could turn another sport red. The number is
   taken out. Round 1031 also excludes only the two deliberate minimum-height
   additions from this established presentation adapter; the rest of each
   season button and every existing parent still changes the hash. */
const legacyScreen = () => {
  const copy = document.body.cloneNode(true) as HTMLElement;
  // The additive programme has separate live choice, save and outcome proofs.
  copy.querySelectorAll('section[data-career-practice], section[data-career-prospect-entry], [data-career-review-opener], [data-season-centre-entry], section[data-us-programme-panel]').forEach(el => el.remove());
  copy.querySelectorAll('[data-career-hub-buttons]').forEach(el => el.replaceWith(...el.childNodes));
  for (const attribute of ['data-career-event', 'data-career-decision-event', 'data-career-decision-option']) {
    copy.querySelectorAll(`[${attribute}]`).forEach(el => el.removeAttribute(attribute));
  }
  copy.querySelectorAll('button').forEach(button => {
    if (/^Play the \d+ season$/.test(squash(button.textContent ?? ''))
      || (button.closest('[data-season-reveal]') && squash(button.textContent ?? '') === 'Continue')) {
      button.classList.remove('min-h-11');
    }
  });
  return copy;
};
const markupNow = () => legacyScreen().innerHTML.replace(/radix-:r[0-9a-z]+:/g, 'radix-:r:');
/* What the screen reads, without the stylesheets the celebration kit mounts
   (their text is CSS, and it would fill the whole excerpt on a curtain). */
const textNow = () => {
  const copy = legacyScreen();
  copy.querySelectorAll('style').forEach(el => el.remove());
  return squash(copy.textContent ?? '');
};
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

interface Save { c?: Record<string, unknown>; phase?: string; teamQuality?: number | null; coach?: unknown }
interface Step {
  /** What was done: the text of the button pressed, or MOUNT / REMOUNT. */
  a: string;
  /** The phase on the save, and the seasons on it, so a red step can be placed. */
  p: string;
  n: number;
  /** Hash of the save's exact bytes, and of the whole document's markup. */
  s: string;
  m: string;
  /** Every save field whose bytes moved on this step, with its new hash. */
  d: Record<string, string>;
  /** The first of what the screen reads, to tell one step from another by eye. */
  t: string;
}

function readSave(key: string): { raw: string; save: Save | null } {
  const raw = localStorage.getItem(key) ?? '';
  if (!raw) return { raw, save: null };
  return { raw, save: JSON.parse(raw) as Save };
}

/* One hash per save field: every field of the career, then the three beside it. */
function fieldHashes(save: Save | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!save) return out;
  for (const [k, v] of Object.entries(save.c ?? {})) out[`c.${k}`] = hash(JSON.stringify(v));
  out.phase = hash(JSON.stringify(save.phase ?? null));
  out.teamQuality = hash(JSON.stringify(save.teamQuality ?? null));
  out.coach = hash(JSON.stringify(save.coach ?? null));
  return out;
}

/* ------------------------------ the walker ------------------------------ */

const enabledButtons = (root: ParentNode): HTMLButtonElement[] =>
  [...root.querySelectorAll('button')].filter(b => !b.disabled && !b.closest('section[data-career-practice], section[data-career-prospect-entry], [data-career-review-opener], [data-season-centre-entry], section[data-us-programme-panel]')) as HTMLButtonElement[];
const labelOf = (b: Element) => squash(b.textContent ?? '').slice(0, 60) || `(${b.getAttribute('aria-label') ?? 'button'})`;
const byText = (root: ParentNode, re: RegExp) => enabledButtons(root).find(b => re.test(squash(b.textContent ?? '')));

interface Coverage {
  seasons: number; event: number; extension: number; freeagency: number; rivalryBeat: number;
  rivalryChoice: number; retireCancel: number; retireConfirm: number; restartCancel: number;
  restartConfirm: number; retired: number; coach: number; coachSeasons: number; panels: number; remounts: number;
  /** Careers started in an older era (the second career of every path). */
  throwback: number;
}
const emptyCoverage = (): Coverage => ({
  seasons: 0, event: 0, extension: 0, freeagency: 0, rivalryBeat: 0, rivalryChoice: 0, retireCancel: 0,
  retireConfirm: 0, restartCancel: 0, restartConfirm: 0, retired: 0, coach: 0, coachSeasons: 0, panels: 0, remounts: 0,
  throwback: 0,
});

class Walker {
  steps: Step[] = [];
  cov = emptyCoverage();
  private prev: Record<string, string> = {};
  private pick: () => number;
  private unmount: () => void = () => undefined;
  private seenDialog = new Set<string>();
  private panelBudget = 0;
  private coachBudget = 0;
  private coachVisits = 0;
  private createBudget = 0;
  private lastSeasons = 0;
  private lastPhase = 'none';
  /** How many careers this path has finished, and how long the one in play runs. */
  careers = 0;

  constructor(private Board: ComponentType, private saveKey: string, seed: number, private onStep?: (w: Walker) => void) {
    this.pick = mulberry32(seed ^ 0x5bd1e995);
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  }

  private choose<T>(arr: T[]): T { return arr[Math.floor(this.pick() * arr.length)]; }
  chance(p: number) { return this.pick() < p; }

  async mount(label: string) {
    this.unmount();
    cleanup();
    const view = render(<MemoryRouter><this.Board /></MemoryRouter>);
    this.unmount = view.unmount;
    await flush();
    this.record(label);
  }

  record(a: string) {
    const { raw, save } = readSave(this.saveKey);
    const now = fieldHashes(save);
    const d: Record<string, string> = {};
    for (const k of new Set([...Object.keys(now), ...Object.keys(this.prev)])) {
      if (now[k] !== this.prev[k]) d[k] = now[k] ?? 'gone';
    }
    this.prev = now;
    const seasons = (save?.c?.seasons as unknown[] | undefined)?.length ?? 0;
    if (seasons > this.lastSeasons) this.cov.seasons += seasons - this.lastSeasons;
    this.lastSeasons = seasons;
    const phase = save?.phase ?? 'none';
    if (phase === 'retired' && this.lastPhase !== 'retired' && this.lastPhase !== 'coach') this.cov.retired += 1;
    this.lastPhase = phase;
    this.steps.push({
      a, p: phase, n: seasons, s: hash(raw), m: hash(markupNow()), d,
      t: textNow().slice(0, 140),
    });
    this.onStep?.(this);
  }

  async click(b: HTMLElement, tag = '') {
    const label = `${tag}${labelOf(b)}`;
    fireEvent.click(b);
    await flush();
    this.record(label);
  }

  save(): Save | null { return readSave(this.saveKey).save; }
  rawSave(): string { return readSave(this.saveKey).raw; }
  setCreateBudget(n: number) { this.createBudget = n; }

  /* One move. Reads the screen the way a player would (what is on it), never
     the board's own state, so it drives any board that draws the same screens.
     `hangUpAt` is the season count at which this career retires by hand.
     Returns false when the path is back on an empty create screen. */
  async next(hangUpAt: number): Promise<boolean> {
    const body = document.body;
    const dialog = body.querySelector('[role="alertdialog"]');
    if (dialog) {
      const title = squash(dialog.querySelector('h2')?.textContent ?? '');
      const retiring = title.startsWith('Retire');
      const buttons = enabledButtons(dialog);
      /* The first time each question is asked the answer is no, so the cancel
         path and the confirm path are both on the record. */
      if (!this.seenDialog.has(title)) {
        this.seenDialog.add(title);
        if (retiring) this.cov.retireCancel += 1; else this.cov.restartCancel += 1;
        await this.click(buttons[0], 'dialog cancel: ');
      } else {
        this.seenDialog.delete(title);
        if (retiring) this.cov.retireConfirm += 1; else { this.cov.restartConfirm += 1; this.careers += 1; }
        await this.click(buttons[buttons.length - 1], 'dialog confirm: ');
      }
      return true;
    }
    const reveal = body.querySelector('[data-season-reveal]');
    if (reveal) { const b = enabledButtons(reveal); await this.click(b[b.length - 1], 'curtain: '); return true; }
    const beat = body.querySelector('[data-rivalry-event]');
    if (beat) { this.cov.rivalryBeat += 1; const b = enabledButtons(beat); await this.click(b[b.length - 1], 'rival beat: '); return true; }
    const choice = body.querySelector('[data-rivalry-choice]');
    if (choice) {
      const b = enabledButtons(choice);
      if (choice.querySelector('[data-rivalry-outcome]')) { await this.click(b[b.length - 1], 'rival outcome: '); return true; }
      this.cov.rivalryChoice += 1;
      await this.click(this.choose(b), 'rival choice: ');
      return true;
    }
    const ext = body.querySelector('[data-extension-talk]');
    if (ext) { this.cov.extension += 1; await this.click(this.choose(enabledButtons(ext)), 'extension: '); return true; }
    const fa = body.querySelector('[data-fa-window]');
    if (fa) { this.cov.freeagency += 1; await this.click(this.choose(enabledButtons(fa)), 'free agency: '); return true; }

    const all = enabledButtons(body);
    if (byText(body, /^Enter the draft$/)) {
      if (this.careers >= 2) return false;
      if (this.createBudget > 0) {
        this.createBudget -= 1;
        await this.click(this.choose(all.filter(b => !/^Enter the draft$/.test(squash(b.textContent ?? '')))), 'create: ');
        return true;
      }
      /* The second career is always an older-era one (the era buttons that
         are not today's carry the rewind mark), so every sport's binding has
         to hand the era to its engine for the path to replay. Left to the
         random clicks above, only two sports happened to get one. */
      const throwback = all.find(b => squash(b.textContent ?? '').startsWith('⏪'));
      if (this.careers === 1 && throwback && !throwback.className.includes('border-gold')) {
        await this.click(throwback, 'create: ');
        return true;
      }
      await this.click(byText(body, /^Enter the draft$/)!, 'create: ');
      if (((this.save()?.c?.eraId as string | undefined) ?? 'now') !== 'now') this.cov.throwback += 1;
      return true;
    }
    const save = this.save();
    const hubBack = all.find(b => squash(b.textContent ?? '') === 'Hub');
    if (hubBack) {
      const inside = all.filter(b => b !== hubBack);
      if (this.panelBudget > 0 && inside.length) { this.panelBudget -= 1; await this.click(this.choose(inside), 'box: '); return true; }
      await this.click(hubBack, 'box: ');
      return true;
    }
    const backToPlaying = byText(body, /^Back to the playing career$/);
    const coachBack = byText(body, /^‹ Back$/);
    if (backToPlaying || coachBack || byText(body, /^Coach the \d+ season$/)) {
      if (this.coachBudget > 0) {
        this.coachBudget -= 1;
        const options = all.filter(b => b !== backToPlaying);
        const b = this.choose(options.length ? options : all);
        if (/^Coach the \d+ season$/.test(squash(b.textContent ?? ''))) this.cov.coachSeasons += 1;
        await this.click(b, 'coach: ');
        return true;
      }
      await this.click(backToPlaying ?? coachBack!, 'coach: ');
      return true;
    }
    if (save?.c?.retired) {
      const start = byText(body, /^Go after a coaching job$/) ?? byText(body, /^Back to the sideline$/);
      if (start && this.coachVisits < 2) {
        this.coachVisits += 1;
        this.cov.coach += 1;
        this.coachBudget = this.coachVisits === 1 ? 45 : 6;
        await this.click(start, 'retired: ');
        return true;
      }
      this.coachVisits = 0;
      await this.click(byText(body, /^New career$/)!, 'retired: ');
      return true;
    }
    const play = byText(body, /^Play the \d+ season$/);
    if (!play) {
      /* No Play button and nothing above matched: the crossroads card. */
      const options = all.filter(b => b.className.includes('bg-background px-3 py-2 text-left'));
      if (!options.length) throw new Error(`walker is lost: "${squash(body.textContent ?? '').slice(0, 200)}"`);
      /* Now and then the page is reloaded on the card, which drops it (the
         known weakness the brief says to keep, so it is on the record). */
      if (this.chance(0.12)) { this.cov.remounts += 1; await this.mount('REMOUNT on the event card'); return true; }
      this.cov.event += 1;
      await this.click(this.choose(options), 'event: ');
      return true;
    }
    const seasons = (save?.c?.seasons as unknown[] | undefined)?.length ?? 0;
    const hangUp = byText(body, /^Hang them up now$/);
    if (hangUp && seasons >= hangUpAt) { await this.click(hangUp, 'hub: '); return true; }
    const tiles = all.filter(b => b.className.includes('hover:-translate-y-0.5'));
    if (tiles.length && this.chance(0.4)) {
      this.cov.panels += 1;
      this.panelBudget = 1 + Math.floor(this.pick() * 6);
      await this.click(this.choose(tiles), 'hub: ');
      return true;
    }
    if (this.chance(0.06)) { this.cov.remounts += 1; await this.mount('REMOUNT'); return true; }
    await this.click(play, 'hub: ');
    return true;
  }
}

/* ------------------------------ the fixture ------------------------------ */

interface SportFixture {
  coverage: Coverage;
  ssrCreate: { m: string; len: number };
  /** The fixed saves, as the exact bytes the board wrote (or a named edit of them). */
  saves: Record<string, string>;
  path: Step[];
  screens: Record<string, Step[]>;
}
interface Fixture { header: Record<string, string>; sports: Record<string, SportFixture> }

/* The last five are old-shape saves: what a save written before a repair
   existed looks like on disk, so the restore effect's repairs are on the
   record. Every other save is one the current code just wrote, and a repair
   dropped from the restore would leave all of those green. */
const LEGACY_SAVES = ['noRole', 'negNet', 'noCoachKey', 'coachPhaseNoCoach', 'retiredNoCoachKey'];
const SAVE_NAMES = ['rookie', 'mid', 'ext', 'fa', 'retired', 'coach', 'beat', 'choice', 'suspended', 'dirty', ...LEGACY_SAVES];
/* The six the brief asks for must exist in every sport, and so must the old
   shapes, which are named edits of two of them. The other four are kept when
   the path happened to produce them (a rival beat, a rival choice) or can be
   made from the mid save by a named edit. */
const REQUIRED_SAVES = ['rookie', 'mid', 'ext', 'fa', 'retired', 'coach', ...LEGACY_SAVES];

function editSave(raw: string, edit: (c: Record<string, unknown>) => void): string {
  const s = JSON.parse(raw) as Save;
  edit(s.c as Record<string, unknown>);
  return JSON.stringify(s);
}
/* The same for the fields beside the career: the phase and the coach. */
function editWhole(raw: string, edit: (s: Record<string, unknown>) => void): string {
  const s = JSON.parse(raw) as Record<string, unknown>;
  edit(s);
  return JSON.stringify(s);
}

async function walkPath(Board: ComponentType, key: string, seed: number, saves: Record<string, string> | null): Promise<Walker> {
  localStorage.clear();
  const capture = (w: Walker) => {
    if (!saves) return;
    const raw = w.rawSave();
    if (!raw) return;
    const s = JSON.parse(raw) as Save;
    const c = (s.c ?? {}) as Record<string, unknown>;
    const seasons = (c.seasons as unknown[] | undefined)?.length ?? 0;
    const quiet = !c.pendingRivalryEvent && !c.pendingRivalryChoice;
    if (!saves.rookie && s.phase === 'season' && seasons === 0) saves.rookie = raw;
    if (!saves.mid && s.phase === 'season' && seasons >= 5 && !c.retired && quiet && (c.contractYears as number) >= 2) saves.mid = raw;
    if (!saves.retired && s.phase === 'retired' && !s.coach) saves.retired = raw;
    if (w.careers === 0 && s.phase === 'coach') saves.coach = raw;
    if (!saves.beat && c.pendingRivalryEvent && !c.retired) saves.beat = raw;
    if (!saves.choice && c.pendingRivalryChoice && !c.retired) saves.choice = raw;
  };
  const w = new Walker(Board, key, seed, capture);
  w.setCreateBudget(8);
  await w.mount('MOUNT');
  let careers = 0;
  for (let guard = 0; ; guard += 1) {
    if (guard > 2500) throw new Error('the path never came back to the create screen');
    if (w.careers !== careers) { careers = w.careers; w.setCreateBudget(5); }
    /* The first career runs long, the second is cut short by hand at seven
       seasons, so a path always asks the retire question. */
    if (!(await w.next(w.careers === 0 ? 17 : 7))) break;
  }
  if (saves?.mid) {
    saves.ext = editSave(saves.mid, c => { c.contractYears = 1; });
    saves.fa = editSave(saves.mid, c => { c.contractYears = 0; });
    saves.suspended = editSave(saves.mid, c => { c.suspendedSeasons = 1; });
    saves.dirty = editSave(saves.mid, c => { c.heat = 55; c.dirtyMoney = 2.5; });
    /* The restore's repairs, one old shape each: a career from before Round
       182 has no role, the pre 422 money bug left a balance below zero, and a
       save from before Round 126 has no coach key at all. */
    saves.noRole = editSave(saves.mid, c => { delete c.role; });
    saves.negNet = editSave(saves.mid, c => { c.netWorth = -40; });
    saves.noCoachKey = editWhole(saves.mid, s => { delete s.coach; });
  }
  if (saves?.retired) {
    /* A retired save that says coach but holds no coaching career opens on
       the retirement screen, and one with no coach key at all does the same. */
    saves.coachPhaseNoCoach = editWhole(saves.retired, s => { s.phase = 'coach'; s.coach = null; });
    saves.retiredNoCoachKey = editWhole(saves.retired, s => { delete s.coach; });
  }
  return w;
}

/* One fixed save, mounted cold: every hub box opened and every button in it
   pressed in order, then played on for a while. */
async function walkScreens(Board: ComponentType, key: string, seed: number, raw: string): Promise<Step[]> {
  localStorage.clear();
  localStorage.setItem(key, raw);
  const w = new Walker(Board, key, seed);
  await w.mount('MOUNT');
  const tilesNow = () => enabledButtons(document.body).filter(b => b.className.includes('hover:-translate-y-0.5'));
  const hubNow = () => enabledButtons(document.body).find(b => squash(b.textContent ?? '') === 'Hub');
  const tileCount = hubNow() ? 0 : tilesNow().length;
  for (let ti = 0; ti < tileCount; ti += 1) {
    const tile = tilesNow()[ti];
    if (!tile) break;
    await w.click(tile, 'open: ');
    const inside = () => enabledButtons(document.body).filter(b => b !== hubNow());
    const n = Math.min(inside().length, 36);
    for (let i = 0; i < n; i += 1) {
      const b = inside()[i];
      if (!b || !hubNow()) break;
      await w.click(b, 'press: ');
    }
    const back = hubNow();
    if (back) await w.click(back, 'close: ');
  }
  for (let i = 0; i < 30; i += 1) {
    if (!(await w.next(99))) break;
  }
  return w.steps;
}

async function buildSport(Board: ComponentType, key: string, seed: number, fixed: Record<string, string> | null): Promise<SportFixture> {
  const saves: Record<string, string> = {};
  const w = await walkPath(Board, key, seed, fixed ? null : saves);
  const use = fixed ?? saves;
  const screens: Record<string, Step[]> = {};
  let i = 0;
  for (const name of SAVE_NAMES) {
    i += 1;
    if (!use[name]) continue;
    screens[name] = await walkScreens(Board, key, seed + i * 101, use[name]);
  }
  cleanup();
  vi.restoreAllMocks();
  /* The router's layout effect warning is about the server render itself and
     says nothing about the board, so it is kept out of the log. */
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const html = renderToStaticMarkup(<MemoryRouter><Board /></MemoryRouter>)
    .replace(/<section data-career-prospect-entry="[^"]*"[^>]*>[\s\S]*?<\/section>/g, '');
  quiet.mockRestore();
  const ordered: Record<string, string> = {};
  for (const name of SAVE_NAMES) if (use[name]) ordered[name] = use[name];
  return { coverage: w.cov, ssrCreate: { m: hash(html), len: html.length }, saves: ordered, path: w.steps, screens };
}

/* One step per line, so a fixture diff reads as the steps that moved. */
function serialize(fx: Fixture): string {
  const out: string[] = ['{', ` "header": ${JSON.stringify(fx.header)},`, ' "sports": {'];
  const sports = Object.keys(fx.sports);
  sports.forEach((slug, si) => {
    const s = fx.sports[slug];
    out.push(`  ${JSON.stringify(slug)}: {`);
    out.push(`   "coverage": ${JSON.stringify(s.coverage)},`);
    out.push(`   "ssrCreate": ${JSON.stringify(s.ssrCreate)},`);
    out.push('   "saves": {');
    const names = Object.keys(s.saves);
    names.forEach((n, ni) => out.push(`    ${JSON.stringify(n)}: ${JSON.stringify(s.saves[n])}${ni < names.length - 1 ? ',' : ''}`));
    out.push('   },');
    out.push('   "path": [');
    s.path.forEach((st, i) => out.push(`    ${JSON.stringify(st)}${i < s.path.length - 1 ? ',' : ''}`));
    out.push('   ],');
    out.push('   "screens": {');
    const sc = Object.keys(s.screens);
    sc.forEach((n, ni) => {
      out.push(`    ${JSON.stringify(n)}: [`);
      s.screens[n].forEach((st, i) => out.push(`     ${JSON.stringify(st)}${i < s.screens[n].length - 1 ? ',' : ''}`));
      out.push(`    ]${ni < sc.length - 1 ? ',' : ''}`);
    });
    out.push('   }');
    out.push(`  }${si < sports.length - 1 ? ',' : ''}`);
  });
  out.push(' }', '}', '');
  return out.join('\n');
}

/* Where two runs of the same steps part ways, in words. */
function diffSteps(where: string, want: Step[], got: Step[]): string[] {
  const out: string[] = [];
  const n = Math.max(want.length, got.length);
  for (let i = 0; i < n && out.length < 4; i += 1) {
    const a = want[i];
    const b = got[i];
    if (!a || !b) { out.push(`${where} step ${i}: ${a ? `the fixture has "${a.a}" here and the replay stopped` : `the replay went on with "${b.a}" past the fixture's end`}`); break; }
    const bits: string[] = [];
    if (a.a !== b.a) bits.push(`pressed "${b.a}", fixture pressed "${a.a}"`);
    if (a.s !== b.s || JSON.stringify(a.d) !== JSON.stringify(b.d)) {
      const fields = [...new Set([...Object.keys(a.d), ...Object.keys(b.d)])].filter(k => a.d[k] !== b.d[k]);
      bits.push(`the save differs${fields.length ? ` first in ${fields.slice(0, 6).join(', ')}` : ''}`);
    }
    if (a.p !== b.p) bits.push(`phase ${b.p}, fixture ${a.p}`);
    if (a.n !== b.n) bits.push(`${b.n} seasons, fixture ${a.n}`);
    if (a.t !== b.t) bits.push(`the screen reads "${b.t}", fixture "${a.t}"`);
    else if (a.m !== b.m) bits.push(`the markup differs under the same words ("${b.t.slice(0, 60)}")`);
    if (bits.length) out.push(`${where} step ${i} (after "${a.a}"): ${bits.join('; ')}`);
  }
  return out;
}

const built: Record<string, SportFixture> = {};

describe.skipIf(!MODE)('the four US career boards against the recorded fixture', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(PINNED_NOW));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(SPORTS)('%s', async (slug, Board, key, seed) => {
    const want = MODE === 'replay' ? (JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as Fixture).sports[slug] : null;
    const got = await buildSport(Board, key, seed, want ? want.saves : null);
    built[slug] = got;
    if (!want) {
      /* Recording: a path that misses a screen the brief names is refused. */
      const c = got.coverage;
      const missing = (Object.keys(c) as (keyof Coverage)[]).filter(k => c[k] === 0);
      expect(missing, `${slug}: the path never reached ${missing.join(', ')}; pick another seed`).toEqual([]);
      expect(c.seasons).toBeGreaterThanOrEqual(12);
      expect(REQUIRED_SAVES.filter(n => !got.saves[n])).toEqual([]);
      return;
    }
    const problems = [
      ...diffSteps(`${slug} click path`, want.path, got.path),
      ...Object.keys(want.screens).flatMap(n => diffSteps(`${slug} save "${n}"`, want.screens[n], got.screens[n] ?? [])),
    ];
    if (want.ssrCreate.m !== got.ssrCreate.m) problems.push(`${slug} server rendered create screen: markup differs (${got.ssrCreate.len} chars, fixture ${want.ssrCreate.len})`);
    if (JSON.stringify(want.coverage) !== JSON.stringify(got.coverage)) problems.push(`${slug} coverage: ${JSON.stringify(got.coverage)}, fixture ${JSON.stringify(want.coverage)}`);
    if (process.env.US_BOARD_FIXTURE_REPORT) fs.appendFileSync(process.env.US_BOARD_FIXTURE_REPORT, problems.map(p => p + '\n').join(''));
    expect(problems).toEqual([]);
  }, 600_000);

  afterAll(() => {
    if (MODE !== 'record' || !process.env.US_BOARD_FIXTURE_OUT) return;
    if (Object.keys(built).length !== SPORTS.length) return;
    const header = {
      what: 'Round 900: the four US career boards, every click and every save. First recorded before they became one board; re-recorded on purpose since (Round 988, the career content packs), so recordedFrom names the tree and scripts/simUsBoardParity.mjs says what moved',
      recordedFrom: process.env.US_BOARD_FIXTURE_SHA ?? 'unknown',
      clock: PINNED_NOW,
      rerecord: 'node scripts/recordUsBoardFixture.mjs',
    };
    fs.writeFileSync(process.env.US_BOARD_FIXTURE_OUT, serialize({ header, sports: built }));
  });
});
