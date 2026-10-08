/* Round 1107: the record made BEFORE the career moment kit was lifted out of
   the soccer folder.

   The kit (src/components/career-moments) takes the once per key rule and the
   confetti from two soccer files, which become re-exporters, and then binds
   two cards: the signing slip and the head of a WON tournament card. This
   suite is the proof of what that did NOT change. Seventeen markups, each
   held twice: the markup itself in
   src/test/fixtures/careerMomentKitLift.recorded.json (so a drift shows as a
   readable diff) and its sha256 typed into DIGESTS below (so nobody can
   re-record the file alone and call it green).

     1. TournamentCard for every path that is NOT a win, fresh and settled:
        a group exit, a beaten finalist, Did Not Qualify, Not Selected.
        Eight. These never change in Round 1107.
     2. Confetti through the CareerFx path, 12 pieces plain and gold. Two.
        These do not change at the lift.
     3. VictoryMoment, default and compact. Two. Never change.
     4. SignedSlip for its three kinds. Three. RE-RECORDED ON PURPOSE at
        step 5 of the round: the slip became the signing scene, so these
        three hold the scene's markup now, not the old slip's.
     5. The winner TournamentCard, fresh and settled. Two. Replaced ON
        PURPOSE at step 6 (the cup replaces the emoji in the head).

   "Settled" is settled the way a save sitting ON the card is settled
   (phase world_cup), which means the same thing before and after step 6
   changes the settle rule.

   Who may re-record, and why: only a round that MEANS to change one of
   these markups (FlagImg, ResultPill, a Button class, the confetti's
   scatter, VictoryMoment's art, the slip or the card's head). It says so in
   its commit message, runs
     RECORD_CAREER_MOMENT_LIFT=1 vitest run src/test/careerMomentKitLift.test.tsx
   reads the diff of the JSON, and types the digests the run prints into
   DIGESTS. A missing record is a failure, never a fresh recording. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TournamentCard } from '@/components/soccer-career/InternationalPanel';
import { Confetti } from '@/components/soccer-career/CareerFx';
import { SignedSlip, type SignedNote } from '@/components/soccer-career/SignedSlip';
import { resetCareerMomentsForTest, settleLoadedMoments } from '@/components/soccer-career/careerMoments';
import VictoryMoment from '@/components/game/VictoryMoment';
import type { CareerState, IntlTournament } from '@/lib/soccerCareerEngine';
import {
  didNotQualifyTournament, finalistTournament, groupExitTournament, notSelectedTournament, winnerTournament,
} from './fixtures/careerMomentFixtures';

const RECORD = resolve(process.cwd(), 'src/test/fixtures/careerMomentKitLift.recorded.json');
const recording = process.env.RECORD_CAREER_MOMENT_LIFT === '1';
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/* sha256 of each recorded markup. Typed in by hand from a recording run. */
const DIGESTS: Record<string, string> = {
  'card:didNotQualify:fresh': 'e0400002377d383cf1d9c4a53873621e7d1ef49b8df0b9302024c298f9c164c1',
  'card:didNotQualify:settled': '4166b3bc81af1a195701efc4c9ad54485993508f23b34d6beff95919e887205d',
  'card:finalist:fresh': '66c7588427a4173b4e5330bf739e034c04100f2baf934e21fe2684aef1289230',
  'card:finalist:settled': 'e41e5025bd6fd72fe58910857c95f2663d59dc5a10a359105f2545f5caaaf5f9',
  'card:groupExit:fresh': '70d42dbdce19f8455691a229bba5ba729fd1367901d311d73ea8ab5383ce1588',
  'card:groupExit:settled': 'bd5630e186c8182a4c108d8aa8947936bf26ff5b470794881f9f6db3218a1f0c',
  'card:notSelected:fresh': '5b1e42a97c963e2507cf63c23339a827d0ef9a10e6a274891ac07b731a41bbab',
  'card:notSelected:settled': '99828ee9bc86e5cfaffffccdfcb4a5c7e4d55e1deed85cf3cf544bd0c3eac501',
  'card:winner:fresh': 'acba1e84a8ce95881b0bb5c01d15b9780d6c7a74169acc86d15b3ff9894a0a04',
  'card:winner:settled': '2db2f72ded75a693eee799829f0ccbe406ffcd9839fd745aeb2dae9a5a34baf5',
  'confetti:gold': 'd3403833fee8df9af309e8ab1060386858a276f8b5fb0d1ce259678f1e6bbee7',
  'confetti:plain': '468f02f1cd47a8022d9d0d85d640a763b15c2d2a1b29d84efe6093577c3274de',
  'slip:extension': '49ec79f9c2db0b308e81358c39faed46900a4fa0a7759e63af8a5d3755d27fa2',
  'slip:loan': '1318e03714f3c9a91802c2142cea8becbd4146852f363301dace887a23d29a8a',
  'slip:transfer': '95be5ba8652255ba5b1162d78ff060a0cac171efb2510e92bfedabc02c81ab4e',
  'victory:compact': 'd7813d8b227d6562844677b36ed82a8d1a514bac488784142674a3db05a57324',
  'victory:default': 'b2d8105cd9aa741f528df90f3995ffa5bacf39affefdbea0fe1d11600531d55c',
};

const seen: Record<string, string> = {};

function cardMarkup(t: IntlTournament, settled: boolean): string {
  resetCareerMomentsForTest();
  if (settled) settleLoadedMoments({ phase: 'world_cup', pendingTournament: t } as CareerState);
  return renderToStaticMarkup(
    <MemoryRouter>
      <TournamentCard t={t} onDismiss={() => undefined} onSpeech={() => undefined} />
    </MemoryRouter>,
  );
}

const slip = (kind: SignedNote['kind']): SignedNote => ({
  kind, club: 'Rivertown FC', years: 3, wage: 45000,
  ...(kind === 'loan' ? { from: 'Harbour City' } : {}),
  forCareer: {} as CareerState,
});

beforeEach(() => { window.sessionStorage.clear(); window.localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); });

describe('Round 1107: the markup on record before the lift', () => {
  it('1. every tournament card that is not a win, fresh and settled', () => {
    const paths: [string, IntlTournament][] = [
      ['groupExit', groupExitTournament()], ['finalist', finalistTournament()],
      ['didNotQualify', didNotQualifyTournament()], ['notSelected', notSelectedTournament()],
    ];
    for (const [name, t] of paths) {
      seen[`card:${name}:fresh`] = cardMarkup(t, false);
      seen[`card:${name}:settled`] = cardMarkup(t, true);
      /* The pair is a real pair: the fresh card carries the quiet rise and
         the settled one does not, so "settled" settled something. */
      expect(seen[`card:${name}:fresh`], name).toContain('data-intl-moment="quiet"');
      expect(seen[`card:${name}:settled`], name).toContain('data-intl-moment="none"');
    }
  });

  it('2. the confetti through the CareerFx path, plain and gold', () => {
    const plain = render(<div className="relative"><Confetti pieces={12} /></div>);
    seen['confetti:plain'] = plain.container.innerHTML;
    expect(plain.container.querySelectorAll('.animate-confetti-fall').length).toBe(12);
    cleanup();
    const gold = render(<div className="relative"><Confetti pieces={12} gold /></div>);
    seen['confetti:gold'] = gold.container.innerHTML;
    expect(seen['confetti:gold']).not.toBe(seen['confetti:plain']);
  });

  it('3. the victory cup, default and compact', () => {
    seen['victory:default'] = renderToStaticMarkup(<VictoryMoment><b>Champions</b></VictoryMoment>);
    seen['victory:compact'] = renderToStaticMarkup(<VictoryMoment compact><b>Champions</b></VictoryMoment>);
    expect(seen['victory:compact']).toContain('victory-compact');
  });

  it('4. the signing slip, its three kinds', () => {
    for (const kind of ['transfer', 'loan', 'extension'] as const) {
      seen[`slip:${kind}`] = renderToStaticMarkup(<SignedSlip note={slip(kind)} />);
      expect(seen[`slip:${kind}`], kind).toContain('data-signed-slip');
    }
  });

  it('5. the won tournament card, fresh and settled', () => {
    seen['card:winner:fresh'] = cardMarkup(winnerTournament(), false);
    seen['card:winner:settled'] = cardMarkup(winnerTournament(), true);
    expect(seen['card:winner:fresh']).toContain('data-intl-moment="won"');
    expect(seen['card:winner:settled']).toContain('data-intl-moment="none"');
  });

  it('all seventeen match the record and its digests', () => {
    const keys = Object.keys(seen).sort();
    expect(keys.length).toBe(17);
    for (const k of keys) expect(seen[k].length, k).toBeGreaterThan(100);
    if (recording) {
      writeFileSync(RECORD, `${JSON.stringify(seen, keys, 1)}\n`);
      console.log(keys.map(k => `  '${k}': '${sha(seen[k])}',`).join('\n'));
      return;
    }
    expect(existsSync(RECORD), 'the recorded markup is missing: restore it from git, never re-record').toBe(true);
    const want = JSON.parse(readFileSync(RECORD, 'utf8')) as Record<string, string>;
    expect(Object.keys(want).sort()).toEqual(keys);
    expect(Object.keys(DIGESTS).sort()).toEqual(keys);
    for (const k of keys) {
      expect(seen[k], k).toBe(want[k]);
      expect(sha(seen[k]), `${k} (digest)`).toBe(DIGESTS[k]);
    }
  });
});
