import assert from 'node:assert/strict';
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import Board from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import * as E from '@/lib/nhlFrontOffice';
import { NHL_OPENING_RATINGS } from '@/data/nhlOpeningRatings';
import { leagueNames } from '@/lib/foNames';
import { deadCapUsed, deadMoneyFor } from '@/lib/frontOfficeCuts';
import { buildOwnerMandate, strengthRank } from '@/lib/foOwnerMandate';

const KEY = 'nhl-front-office-save-v1', SENTINEL = 'nhl970-unrelated';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const last = <T,>(items: T[]): T => items[items.length - 1];
function random(seed: number) {
  let calls = 0;
  const rng = () => { calls++; seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  rng.calls = () => calls;
  return rng;
}
const buttons = () => Array.from(document.querySelectorAll('button'));
function button(match: RegExp) {
  const result = buttons().find(item => match.test(item.textContent!.trim()));
  assert.ok(result, 'Actual button ' + match);
  return result;
}
const click = async (element: HTMLButtonElement) => { await act(async () => { fireEvent.click(element); }); };
const read = () => JSON.parse(localStorage.getItem(KEY)!);
const node = () => document.querySelector('[data-nhl-waiver-receipt]');
const quiet = () => assert.ok(node() === null, 'No waiver event without a local committed release');
const normalized = (value: unknown) => JSON.parse(JSON.stringify(value, (key, item) => key === 'id' ? undefined : item));
function handler(element: HTMLButtonElement): () => void {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  assert.ok(key, 'Actual rendered React callback');
  const callback = (element as any)[key].onClick;
  assert.equal(typeof callback, 'function');
  return callback;
}
function hubSave(league: E.NhlLeague, myTeam: string, seasonsPlayed: number) {
  const strengths = Object.fromEntries(Object.entries(league.teams).map(([id, team]) => [id, E.nhlStrength(team)]));
  const mandate = buildOwnerMandate(strengthRank(strengths, myTeam), Object.keys(league.teams).length, false,
    { title: 'the Stanley Cup', playoffs: 'the playoffs', round: 'a series', games: 80 }, league.season);
  return { league, myTeam, phase: 'hub', titles: 0, seasonsPlayed,
    draftClass: null, picksLeft: 0, draftBatchesLeft: 0, mandate, trust: 100, fired: false,
    pressTilt: 0 as -1 | 0 | 1, seasonTradeLine: null as string | null, postseason: null };
}
function overage() {
  const opening = E.initNhlLeague(random(1), NHL_OPENING_RATINGS), [sender, receiver] = Object.keys(opening.teams);
  let league: E.NhlLeague | undefined;
  outer: for (const a of opening.teams[sender].players) for (const b of opening.teams[receiver].players) {
    const candidate = clone(opening);
    if (E.nhlTrade(candidate.teams[sender], candidate.teams[receiver], a.id, b.id, true, candidate.cap) === 'accepted'
      && E.nhlExecuteTalksTrade(candidate.teams[sender], candidate.teams[receiver], b.id, a.id, true, candidate.cap) === 'done') {
      league = candidate; break outer;
    }
  }
  assert.ok(league, 'Two real accepted trade calls');
  assert.equal(league.teams[receiver].picks.length, 4);
  const rng = random(101);
  let prospects = E.nhlDraftClass(rng, 24, leagueNames(league));
  for (let i = 0; i < 4; i++) {
    const prospect = prospects.shift()!;
    assert.ok(E.nhlConsumeDraftPick(league.teams[receiver]));
    league.teams[receiver].players.push(E.nhlProspectToPlayer(prospect, rng, league.ratingModelVersion));
    if (i < 2) prospects = E.nhlAiDraftPicks(league, prospects,
      E.nhlFoStandings(league).map(team => team.abbr).reverse().filter(team => team !== receiver), rng).remaining;
  }
  E.nhlOffseason(league, rng, receiver);
  assert.equal(league.teams[receiver].players.length, 17, 'Actual draft/offseason human overage');
  // Non-default metadata are simulated save fixtures, independent of candidate writes.
  return { ...hubSave(league, receiver, 1), pressTilt: 1 as const, seasonTradeLine: 'simulated prior trade line' };
}
async function mount(state: unknown) {
  cleanup(); localStorage.clear();
  const raw = JSON.stringify(state);
  localStorage.setItem(KEY, raw); localStorage.setItem(SENTINEL, 'exact unrelated payload');
  const writes: string[] = [], previous = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    if (this === localStorage && key === KEY) writes.push(value);
    return previous.call(this, key, value);
  };
  let view: ReturnType<typeof render>;
  try { await act(async () => { view = render(<Board />); }); }
  catch (error) { Storage.prototype.setItem = previous; throw error; }
  assert.equal(localStorage.getItem(KEY), raw, 'Restore preserves exact raw save');
  return { view: view!, writes, restore: () => { Storage.prototype.setItem = previous; } };
}
async function roster() {
  const opener = buttons().find(item => item.textContent?.trim() === 'Open roster');
  await click(opener ?? button(/Roster/));
}
function arm(pid: string) {
  const row = document.querySelector(`[data-roster-row="${pid}"]`);
  assert.ok(row, 'Actual selected roster row');
  const element = Array.from(row.querySelectorAll('button')).find(item => item.textContent?.startsWith('Waive,'));
  assert.ok(element, 'Actual waiver arm control');
  return element;
}
async function waive(pid: string, expected: E.NhlLeague, saved: ReturnType<typeof hubSave>) {
  const team = saved.myTeam;
  const player = expected.teams[team].players.find(item => item.id === pid)!;
  assert.ok(player);
  const cost = deadMoneyFor(player), before = clone(expected);
  await click(arm(pid));
  assert.ok(document.querySelector('[data-cut-confirm]')?.textContent?.includes(`$${cost.now}M`), 'Real quote precedes confirmation');
  assert.equal(E.nhlRelease(expected.teams[team], expected.freeAgents, pid, expected.ratingModelVersion), true);
  await click(button(/^Waive him$/));
  assert.deepEqual(read(), { ...saved, league: expected }, 'Full committed save matches the independent fixture and real engine release');
  assert.equal(localStorage.getItem(SENTINEL), 'exact unrelated payload');
  return { player, before, after: clone(expected) };
}
function values(commit: { player: E.NhlGmPlayer; before: E.NhlLeague; after: E.NhlLeague }, team: string) {
  const receipt = node();
  assert.ok(receipt, 'Committed waiver has an event');
  const labels = Array.from(receipt.querySelectorAll('dt'));
  const value = (name: string) => labels.find(label => label.textContent === name)?.nextElementSibling?.textContent;
  const money = (amount: number) => `${amount < 0 ? '-' : ''}$${Math.abs(amount)}M`;
  assert.ok(receipt.textContent?.includes(`Waived ${commit.player.name}.`));
  assert.equal(value('Roster'), `${commit.before.teams[team].players.length} → ${commit.after.teams[team].players.length} players`);
  assert.equal(value('Cap space'), `${money(E.nhlCapRoom(commit.before.teams[team], commit.before.cap))} → ${money(E.nhlCapRoom(commit.after.teams[team], commit.after.cap))}`);
  assert.equal(value('Dead money this season'), money(deadCapUsed(commit.after.teams[team])));
  assert.equal(receipt.closest('[role="status"]')?.getAttribute('aria-live'), 'polite');
}

export async function run() {
  const originalRandom = Math.random, originalSet = Storage.prototype.setItem, rows: any[] = [];
  const cases: [string, () => Promise<void>][] = [
    ['ordinary play preserves the original full engine outcome and RNG without a waiver event', async () => {
      const league = E.initNhlLeague(random(20), NHL_OPENING_RATINGS), myTeam = Object.keys(league.teams)[0];
      const state = hubSave(league, myTeam, 0);
      const mounted = await mount(state), expected = clone(league), rng = random(970), baseline = random(970);
      quiet(); Math.random = rng;
      E.simNhlRound(expected, myTeam, baseline); E.nhlAiMoves(expected, myTeam, baseline); expected.round++;
      await click(button(/Play/)); await click(button(/^Play Round 1$/));
      assert.deepEqual(normalized(read()), normalized({ ...state, league: expected })); assert.equal(rng.calls(), baseline.calls());
      assert.equal(mounted.writes.length, 1); quiet();
    }],
    ['two actual waivers show exact earned counts cap and dead money while preserving the full save', async () => {
      const state = overage(), mounted = await mount(state), expected = clone(state.league), rng = random(971);
      Math.random = rng; quiet(); await roster();
      const ids = expected.teams[state.myTeam].players.slice(-2).map(player => player.id);
      const first = await waive(ids[0], expected, state); values(first, state.myTeam);
      const firstNode = node(); assert.equal(mounted.writes.length, 1);
      const second = await waive(ids[1], expected, state); values(second, state.myTeam);
      assert.ok(node() !== firstNode, 'A second real event owns a new finite cue');
      assert.equal(expected.teams[state.myTeam].players.length, 15); assert.equal(mounted.writes.length, 2);
      assert.equal(rng.calls(), 0, 'Waivers and presentation add no randomness');
      assert.equal(Object.prototype.hasOwnProperty.call(read(), 'waiverReceipt'), false, 'Transient receipt never enters saved state');
    }],
    ['arming cancellation and an actual floor refusal stay quiet and preserve raw state', async () => {
      const state = overage();
      const cancelled = await mount(state), initialRaw = localStorage.getItem(KEY), rng = random(972); Math.random = rng;
      await roster(); await click(arm(last(state.league.teams[state.myTeam].players).id)); quiet();
      await click(button(/^Keep him$/)); quiet();
      assert.equal(localStorage.getItem(KEY), initialRaw); assert.equal(cancelled.writes.length, 0);
      cleanup(); cancelled.restore();
      while (state.league.teams[state.myTeam].players.length > E.NHL_ROSTER_MIN) {
        const player = last(state.league.teams[state.myTeam].players);
        assert.ok(E.nhlRelease(state.league.teams[state.myTeam], state.league.freeAgents, player.id, state.league.ratingModelVersion));
      }
      const mounted = await mount(state), raw = localStorage.getItem(KEY);
      await roster(); const control = arm(state.league.teams[state.myTeam].players[0].id);
      assert.equal(control.disabled, true, 'Real roster floor disables the arm');
      await act(async () => { handler(control)(); }); quiet();
      await click(button(/^Keep him$/)); quiet();
      await act(async () => { handler(control)(); });
      await act(async () => { handler(button(/^Waive him$/))(); }); quiet();
      assert.equal(localStorage.getItem(KEY), raw); assert.equal(mounted.writes.length, 0); assert.equal(rng.calls(), 0);
    }],
    ['same-frame repeated live confirmation commits one waiver one save and one earned receipt', async () => {
      const state = overage(), mounted = await mount(state), expected = clone(state.league), rng = random(973); Math.random = rng;
      await roster(); const player = last(expected.teams[state.myTeam].players);
      await click(arm(player.id)); quiet(); const confirm = handler(button(/^Waive him$/));
      assert.ok(E.nhlRelease(expected.teams[state.myTeam], expected.freeAgents, player.id, expected.ratingModelVersion));
      await act(async () => { confirm(); confirm(); confirm(); });
      assert.deepEqual(read(), { ...state, league: expected }); assert.equal(mounted.writes.length, 1, 'Guard owns one actual commit');
      assert.ok(node()?.textContent?.includes(`Waived ${player.name}.`)); assert.equal(rng.calls(), 0);
    }],
    ['passive rerender and tab return preserve the exact event node without replay or save writes', async () => {
      const state = overage(), mounted = await mount(state), expected = clone(state.league);
      await roster(); await waive(last(expected.teams[state.myTeam].players).id, expected, state);
      const receipt = node(); assert.ok(receipt); const status = receipt.closest('[data-nhl-waiver-status]'), raw = localStorage.getItem(KEY);
      await act(async () => { mounted.view.rerender(<Board />); });
      assert.ok(node() === receipt, 'Rerender preserves the receipt');
      assert.ok(node()?.closest('[data-nhl-waiver-status]') === status, 'Rerender preserves the status region');
      await click(button(/^Hub$/)); await click(button(/Free agency/));
      assert.ok(node() === receipt, 'Other panel keeps the same event DOM');
      await click(button(/^Hub$/)); await roster(); assert.ok(node() === receipt, 'Return never remounts the cue');
      assert.equal(localStorage.getItem(KEY), raw); assert.equal(mounted.writes.length, 1);
    }],
    ['reload and a deliberate reset keep recovered or fresh openings quiet with exact saved bytes', async () => {
      const state = overage(), mounted = await mount(state), expected = clone(state.league);
      await roster(); await waive(last(expected.teams[state.myTeam].players).id, expected, state); assert.ok(node());
      const raw = localStorage.getItem(KEY); cleanup(); await act(async () => { render(<Board />); });
      quiet(); assert.equal(localStorage.getItem(KEY), raw); assert.equal(mounted.writes.length, 1);
      await roster(); await waive(last(expected.teams[state.myTeam].players).id, expected, state); assert.ok(node());
      await click(button(/^Abandon franchise and restart$/)); quiet(); assert.equal(localStorage.getItem(KEY), null);
      const opener = buttons().find(item => /Eastern|Western/.test(item.textContent!)); assert.ok(opener);
      await click(opener); quiet(); assert.equal(read().league.round, 1); assert.equal(read().seasonsPlayed, 0);
      assert.equal(localStorage.getItem(SENTINEL), 'exact unrelated payload');
    }],
    ['the actual final round playoffs draft and offseason clear the prior waiver without another event', async () => {
      const state = overage(); state.league.round = E.NHL_FO_ROUNDS;
      await mount(state); const expected = clone(state.league); Math.random = random(974);
      await roster();
      for (const player of expected.teams[state.myTeam].players.slice(-2)) await waive(player.id, expected, state);
      assert.ok(node()); await click(button(/^Hub$/)); await click(button(/Play/)); await click(button(/^Final stretch \+ playoffs$/));
      assert.equal(read().phase, 'recap'); assert.equal(read().league.champions.length, state.league.champions.length + 1);
      await click(button(/Measured/));
      await click(button(/^Go to the draft$/));
      assert.equal(read().picksLeft, 2, 'This fixture uses the ordinary two-pick next draft');
      for (let i = 0; i < 2; i++) {
        const prospect = read().draftClass[0]; assert.ok(prospect);
        const selection = buttons().find(item => item.textContent?.includes(prospect.name)); assert.ok(selection);
        await click(selection);
      }
      assert.equal(read().league.season, state.league.season + 1); assert.equal(read().league.round, 1);
      await click(button(/^Continue to the hub$/)); quiet();
      assert.equal(localStorage.getItem(SENTINEL), 'exact unrelated payload');
    }],
    ['a declined later floor waiver retains the last committed receipt without claiming new success', async () => {
      const state = overage();
      while (state.league.teams[state.myTeam].players.length > E.NHL_ROSTER_MIN + 1) {
        const player = last(state.league.teams[state.myTeam].players);
        assert.ok(E.nhlRelease(state.league.teams[state.myTeam], state.league.freeAgents, player.id, state.league.ratingModelVersion));
      }
      const mounted = await mount(state), expected = clone(state.league); await roster();
      const commit = await waive(last(expected.teams[state.myTeam].players).id, expected, state); values(commit, state.myTeam);
      const receipt = node(), raw = localStorage.getItem(KEY), rng = random(975); Math.random = rng;
      const control = arm(expected.teams[state.myTeam].players[0].id); assert.equal(control.disabled, true);
      await act(async () => { handler(control)(); }); await act(async () => { handler(button(/^Waive him$/))(); });
      assert.ok(node() === receipt, 'Refusal preserves the prior receipt'); values(commit, state.myTeam); assert.ok(node()?.textContent?.startsWith('Last waiver'));
      assert.equal(localStorage.getItem(KEY), raw); assert.equal(mounted.writes.length, 1); assert.equal(rng.calls(), 0);
    }],
  ];
  try {
    for (let id = 0; id < cases.length; id++) {
      const [title, test] = cases[id];
      try { await test(); rows.push({ id, title, status: 'PASS' }); }
      catch (error: any) { rows.push({ id, title, status: 'FAIL', error: { name: error.name, message: error.message, stack: error.stack } }); }
      finally { cleanup(); localStorage.clear(); Storage.prototype.setItem = originalSet; Math.random = originalRandom; }
    }
    return { total: rows.length, rows, passed: rows.filter(row => row.status === 'PASS').length, failed: rows.filter(row => row.status === 'FAIL').length };
  } finally { cleanup(); Storage.prototype.setItem = originalSet; Math.random = originalRandom; localStorage.clear(); }
}
