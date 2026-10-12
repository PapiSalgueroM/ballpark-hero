/* Round 1309 adversarial review (runs lens), a runner side probe, never committed. THE DEFAULT PATH OVER A FLEET.
   The same file runs on the base (bb051ee0) and on the head. Each case is a save on the morning of some week (both
   league kinds, the desk off and on), pressed once or twice with the regular buttons ("Play Week N", and on Week 17 the
   old button "Play the final week + playoffs"), from the same seeded stream. It writes the save after every press
   (a hash and the length) and the draws, to FLEET_OUT, so the two trees can be compared press for press.
   Each case runs in a FRESH module graph with Math.random seeded before the first import (the entity id prefix is
   drawn at module load: the first run of this file compared two random prefixes, r1309-run-p2). */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';
import fs from 'node:fs';
import crypto from 'node:crypto';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.setConfig({ testTimeout: 900_000 });

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY = 'front-office-save-v1';
const N = Number(process.env.FLEET_N || 40);
const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

describe('the default path over a fleet', () => {
  it(`${N} saves, one or two regular presses each`, async () => {
    const out: any[] = [];
    for (let i = 0; i < N; i += 1) {
      cleanup();
      localStorage.clear();
      vi.resetModules();
      Math.random = lehmer(1305);
      await import('@/lib/entityIds');
      const E: any = await import('@/lib/frontOffice');
      const { FO_DEPTH } = await import('@/data/frontOfficeDepth');
      const { openNflDesk } = await import('@/lib/nflGmDesk');
      const { default: Board } = (await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };
      const kind = i % 2 ? 'deep' : 'fifteen';
      const desk = Math.floor(i / 2) % 2 === 1;
      const w = i % 5 === 4 ? E.REGULAR_WEEKS : 1 + ((i * 5) % E.REGULAR_WEEKS);
      const rng = lehmer(1000 + i);
      Math.random = rng;
      const league: any = kind === 'deep' ? E.initLeague(rng, { depth: FO_DEPTH }) : E.initLeague(rng);
      const ids = Object.keys(league.teams);
      const team = ids[(i * 3) % ids.length];
      for (let wk = 1; wk < w; wk += 1) { league.schedule[wk - 1].forEach((g: any) => E.simGame(g, league.teams, rng)); league.week += 1; }
      const s: any = { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
      if (desk) s.gm = openNflDesk(league, team);
      const initRaw = JSON.stringify(s);
      localStorage.setItem(KEY, initRaw);
      if (process.env.FLEET_RAW && i === 0) fs.writeFileSync(`${process.env.FLEET_RAW}-init.json`, initRaw);
      const r = lehmer(2000 + i);
      let draws = 0;
      Math.random = () => { draws += 1; return r(); };
      const view = render(<Board />);
      const steps: any[] = [];
      try {
        fireEvent.click(screen.getByText('This week'));
        for (let p = 0; p < 2; p += 1) {
          const now = JSON.parse(localStorage.getItem(KEY)!);
          if (now.phase !== 'hub' || now.league.week > E.REGULAR_WEEKS) break;
          const label = now.league.week >= E.REGULAR_WEEKS ? 'Play the final week + playoffs' : `Play Week ${now.league.week}`;
          fireEvent.click(screen.getByText(label));
          const raw = localStorage.getItem(KEY)!;
          if (process.env.FLEET_RAW && i === 0 && p === 0) fs.writeFileSync(`${process.env.FLEET_RAW}-press.json`, raw);
          steps.push({ label, sha: sha(raw), len: raw.length, draws, week: JSON.parse(raw).league.week, phase: JSON.parse(raw).phase });
        }
      } catch (e: any) {
        steps.push({ error: String(e && e.message ? e.message.split('\n')[0] : e) });
      }
      view.unmount();
      out.push({ i, kind, desk, w, team, init: sha(initRaw), steps });
      console.log(`FLEET ${i} ${kind} desk ${desk ? 'on' : 'off'} week ${w} init ${sha(initRaw)}: ${steps.map(x => x.error ? `ERROR ${x.error}` : `${x.label} -> ${x.sha} (${x.draws} draws, week ${x.week} ${x.phase})`).join(' | ')}`);
    }
    fs.writeFileSync(process.env.FLEET_OUT || '/tmp/fleet.json', JSON.stringify(out));
    expect(out.length).toBe(N);
  });
});
