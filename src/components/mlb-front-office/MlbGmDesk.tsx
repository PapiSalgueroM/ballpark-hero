/* Round 1020: the GM desk on the MLB Front Office hub, the shape Round 987
   gave the NHL (components/nhl-front-office/NhlGmDesk.tsx). The panel list
   and the facts adapter; every rule and every word a box says lives in
   src/lib/mlbGmDesk.ts and the shared modules it binds (gmContracts, gmPicks,
   gmTradePackage, gmDeadline, gmStaff), never in here.

   The list is built once, at module level, as GmDeskMount asks: a panel made
   inside the board's render would be a new component every save and would
   lose a talk half way through. Each panel gets the board's facts, which
   carry the league and the few board actions a panel needs (a deal changes
   the league, so the board has to save both at once). */

import { useMemo, useState } from 'react';
import { GmStaffPanel } from '@/components/front-office-shared/GmStaffPanel';
import { GmResignDesk } from '@/components/front-office-shared/GmResignDesk';
import { GmPicksCard } from '@/components/front-office-shared/GmPicksCard';
import { GmTradeBuilder, type BuilderTile } from '@/components/front-office-shared/GmTradeBuilder';
import { type GmDesk, type GmFacts, type GmPanelDef, type GmPanelProps, withGmBlock } from '@/lib/gmDesk';
import {
  acceptFinal, deskCases, decisionFor, keepAtAsk, letGo, matchSheet, pushFor, qualify, takePicks, tenderHim, useOption,
  type DeskCase, type GmTerms, type Made, type PushResult,
} from '@/lib/gmContracts';
import { mlbContractHost } from '@/lib/gmContractsHostMlb';
import { pickKey, pickRefusal, picksHeldBy } from '@/lib/gmPicks';
import { assetKey, evaluatePackage, MLB_CASH_RETENTION, type TradeAsset, type TradePackage } from '@/lib/gmTradePackage';
import { MLB_STAFF_PACK } from '@/data/gmStaff/packs';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { gmEffectAt } from '@/lib/gmStaff';
import { type MlbLeague, mlbTradeValue } from '@/lib/mlbFrontOffice';
import {
  MLB_DESK_KEYS, deskCopy, mlbContractsOf, mlbContractsTile, mlbDealsTile, mlbGamePickRules, mlbPackageContext,
  mlbPicksOf, mlbPicksTile, mlbProposePackage, mlbRetainedOf, mlbStaffCtx, mlbStaffOf, mlbStaffTile, mlbStances,
  mlbTradeWindow,
} from '@/lib/mlbGmDesk';

/** The board's state, flattened for the desk, plus the actions a panel may take. */
export interface MlbDeskFacts extends GmFacts {
  league: MlbLeague;
  /** The regular season is over (the recap). Deals are shut, the re-sign desk is the business of the day. */
  seasonOver: boolean;
  /** The save carries the desk. Until it does (an old save), the deadline does not apply yet and the deal box says so. */
  deskOn: boolean;
  /** How the board prints a club. */
  clubName: (abbr: string) => string;
  /** A line for the board's feed. */
  say: (line: string) => void;
  /** A deal changed the league: the board saves the league and the desk together. */
  commit: (league: MlbLeague, desk: GmDesk, line: string) => void;
}

type Props = GmPanelProps<MlbDeskFacts>;

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}M`;

/* ------------------------------------------------------------------ staff */

function StaffPanel({ desk, facts, onDesk }: Props) {
  const { league, teamId } = facts;
  const state = mlbStaffOf(desk, league, teamId);
  return (
    <div className="space-y-2" data-mlb-desk-staff>
      <p className="text-center text-[11px] text-muted-foreground">
        Ownership gives the staff desk {money(MLB_STAFF_PACK.money.seasonPurse)} each winter for fees and pay offs. Wages are paid outside the payroll the tax line reads.
        The pitching coach works the three starters and two relievers the sim plays, the hitting coach the eight bats, and the farm director your young men over the winter.
      </p>
      <GmStaffPanel
        pack={MLB_STAFF_PACK}
        block={state.block}
        ctx={mlbStaffCtx(league, teamId)}
        purse={state.purse}
        purseText={money}
        onChange={(next, purse, line) => {
          onDesk(withGmBlock(desk, MLB_DESK_KEYS.staff, { block: next, purse }));
          facts.say(line);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ contracts */

function ContractsPanel({ desk, facts, onDesk }: Props) {
  const { league, teamId } = facts;
  const [pushes, setPushes] = useState<Record<string, PushResult | undefined>>({});
  const ledger = mlbContractsOf(desk, league, teamId);
  const cases = deskCases(mlbContractHost, league, ledger);
  const decisions = Object.fromEntries(cases.map(c => [c.man.id, decisionFor(ledger, league.season, c.man.id)]));
  /* Every handler works on a copy of the ledger and hands the copy back: the
     stored block is never changed in place (gmDesk's rule). */
  const act = (fn: (l: typeof ledger) => Made) => {
    const copy = deskCopy(ledger);
    const made = fn(copy);
    if (made.ok === false) facts.say(`✍️ ${made.reason}`);
    else onDesk(withGmBlock(desk, MLB_DESK_KEYS.contracts, copy));
  };
  const push = (c: DeskCase, offer: GmTerms) => {
    const copy = deskCopy(ledger);
    const res = pushFor(copy, league, c, offer);
    if (!res) { facts.say('✍️ There is no push left to make on him this winter.'); return; }
    setPushes(p => ({ ...p, [c.man.id]: res }));
    onDesk(withGmBlock(desk, MLB_DESK_KEYS.contracts, copy));
  };
  return (
    <GmResignDesk
      sport="mlb"
      cases={cases}
      decisions={decisions}
      pushes={pushes}
      onKeep={c => act(l => keepAtAsk(l, league, c))}
      onPush={push}
      onAcceptFinal={c => act(l => acceptFinal(l, league, c))}
      onLetGo={c => act(l => letGo(l, league, c))}
      onOption={c => act(l => useOption(l, league, c))}
      onTender={c => act(l => tenderHim(l, league, c))}
      onQualify={c => act(l => qualify(l, league, c))}
      onMatch={c => act(l => matchSheet(l, league, c))}
      onTakePicks={c => act(l => takePicks(l, league, c))}
      footnote="Decide any time this season. Anyone you leave open is settled by your staff's own rule when the winter starts, never by a coin flip. The money is this game's own figures, not real contracts."
    />
  );
}

/* ------------------------------------------------------------------ picks */

function PicksPanel({ desk, facts }: Props) {
  const { league, teamId } = facts;
  return (
    <GmPicksCard
      ledger={mlbPicksOf(desk, league)}
      club={teamId}
      season={league.season}
      rules={mlbGamePickRules()}
      clubName={facts.clubName}
      window={{ ...mlbTradeWindow(league), periodWord: 'round' }}
    />
  );
}

/* ------------------------------------------------------------------ deals */

const STANCE_WORD = { buyer: 'buying', seller: 'selling', holding: 'holding' } as const;
const CASH_STEPS = [0, 0.25, 0.5];

function DealsPanel({ desk, facts }: Props) {
  const { league, teamId } = facts;
  const others = useMemo(() => Object.keys(league.teams).filter(k => k !== teamId).sort(), [league, teamId]);
  const [partner, setPartner] = useState(others[0] ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [retain, setRetain] = useState<Record<string, number>>({});
  const stances = mlbStances(league);
  const ledger = mlbPicksOf(desk, league);
  const rules = mlbGamePickRules();
  const retainedRows = mlbRetainedOf(desk);
  const win = mlbTradeWindow(league);
  const them = league.teams[partner];
  const me = league.teams[teamId];

  const playerTiles = (abbr: string): BuilderTile[] => league.teams[abbr].players
    .slice().sort((a, b) => mlbTradeValue(b) - mlbTradeValue(a))
    .map(p => ({ asset: { kind: 'player', id: p.id }, label: p.name, sub: `${p.pos} ${p.ovr}, age ${p.age}, $${p.salary}M x ${p.years}` }));
  /* The picks are on the board so the rule is in plain sight: each one says why it cannot move. */
  const pickTiles = (abbr: string): BuilderTile[] => picksHeldBy(ledger, abbr).map(p => {
    const blocked = pickRefusal(ledger, rules, league.season, abbr, pickKey(p));
    return {
      asset: { kind: 'pick', key: pickKey(p) },
      label: `${p.year} round ${p.round}${p.kind === 'comp' ? ' (extra)' : ''}`,
      sub: p.orig === abbr ? 'their own' : `from ${p.orig}`,
      ...(blocked ? { blocked } : {}),
    };
  });
  const mine = me ? [...playerTiles(teamId), ...pickTiles(teamId)] : [];
  const theirs = them ? [...playerTiles(partner), ...pickTiles(partner)] : [];
  const inDeal = (tiles: BuilderTile[]): TradeAsset[] => tiles.filter(t => selected.has(assetKey(t.asset))).map(t => (
    t.asset.kind === 'player' && retain[t.asset.id] ? { ...t.asset, retain: retain[t.asset.id] } : t.asset
  ));
  const pkg: TradePackage = { from: teamId, to: partner, give: inDeal(mine), get: inDeal(theirs) };
  const verdict = pkg.give.length || pkg.get.length ? evaluatePackage(pkg, mlbPackageContext(league, desk, teamId, partner)) : null;
  const myPlayersIn = pkg.give.flatMap(a => (a.kind === 'player' ? [a.id] : []));

  const toggle = (a: TradeAsset) => setSelected(s => {
    const n = new Set(s);
    const k = assetKey(a);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });
  const propose = () => {
    const lg = deskCopy(league);
    const res = mlbProposePackage(lg, desk, teamId, pkg);
    if (res.verdict.verdict !== 'accepted') { facts.say(`❌ ${res.verdict.reason ?? 'No deal.'}`); return; }
    const names = res.arrived.map(p => p.name).join(' and ');
    const kept = pkg.give.some(a => a.kind === 'player' && a.retain) ? ', and you send cash to keep paying part of a salary' : '';
    setSelected(new Set()); setRetain({});
    facts.commit(lg, res.desk, `🤝 Package deal with ${facts.clubName(partner)}${names ? `: ${names} arrive${res.arrived.length === 1 ? 's' : ''}` : ''}${kept}.`);
  };

  return (
    <div className="space-y-2" data-mlb-desk-deals>
      <label className="flex items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground">Deal with</span>
        <select
          value={partner}
          onChange={e => { setPartner(e.target.value); setSelected(new Set()); setRetain({}); }}
          className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
        >
          {others.map(k => <option key={k} value={k}>{facts.clubName(k)} ({STANCE_WORD[stances[k] ?? 'holding']})</option>)}
        </select>
      </label>
      <p className="text-center text-[11px] text-muted-foreground">
        Clubs in an October place buy: they rate every veteran higher and every young player lower, theirs and yours alike, so a vet fetches more from them. Clubs well out of it sell, the other way round.
        MLB clubs cannot trade draft picks, so a deal is players, plus cash if you want it.
        Cash: keep paying up to {Math.round(MLB_CASH_RETENTION.maxShare * 100)} percent of a man&apos;s salary, {MLB_CASH_RETENTION.maxDealsPerClub} deals at a time. The league sets no such limit; this game does.
      </p>
      {myPlayersIn.length > 0 && (
        <div className="space-y-1 rounded-lg border border-border p-2" data-mlb-cash>
          {myPlayersIn.map(id => {
            const p = me.players.find(x => x.id === id);
            if (!p) return null;
            return (
              <div key={id} className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="mr-1 font-semibold">Cash toward {p.name}:</span>
                {CASH_STEPS.map(s => (
                  <button key={s} type="button" onClick={() => setRetain(r => ({ ...r, [id]: s }))}
                    className={`min-h-9 rounded-full border px-2 ${(retain[id] ?? 0) === s ? 'border-primary bg-primary/10 font-bold' : 'border-border'}`}>
                    {s === 0 ? 'none' : `${s * 100}%`}
                  </button>
                ))}
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground">You carry {retainedRows.filter(r => r.club === teamId).length} of {MLB_CASH_RETENTION.maxDealsPerClub} cash deals.</p>
        </div>
      )}
      <GmTradeBuilder
        partnerName={facts.clubName(partner)}
        mine={mine}
        theirs={theirs}
        selected={selected}
        onToggle={toggle}
        maxPerSide={5}
        verdict={verdict}
        window={win}
        onPropose={propose}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ the list */

const STAFF: GmPanelDef<MlbDeskFacts> = {
  key: 'staff', title: 'Staff',
  tile: ({ desk, facts }) => mlbStaffTile(desk, facts.league, facts.teamId),
  Panel: StaffPanel,
};
const CONTRACTS: GmPanelDef<MlbDeskFacts> = {
  key: 'contracts', title: 'Re-sign desk',
  tile: ({ desk, facts }) => mlbContractsTile(desk, facts.league, facts.teamId, facts.seasonOver),
  Panel: ContractsPanel,
};
const PICKS: GmPanelDef<MlbDeskFacts> = {
  key: 'picks', title: 'Draft picks',
  tile: ({ desk, facts }) => mlbPicksTile(desk, facts.league, facts.teamId),
  Panel: PicksPanel,
};
const DEALS: GmPanelDef<MlbDeskFacts> = {
  key: 'deals', title: 'Trade desk',
  tile: ({ facts }) => mlbDealsTile(facts.league, facts.deskOn),
  Panel: DealsPanel,
};

/** The hub during the season. */
export const MLB_DESK_PANELS: readonly GmPanelDef<MlbDeskFacts>[] = [STAFF, CONTRACTS, PICKS, DEALS];
/** The recap, once the season is over: the re-sign desk before the draft. */
export const MLB_RECAP_PANELS: readonly GmPanelDef<MlbDeskFacts>[] = [CONTRACTS];

/* ------------------------------------------------------------------ the help */

/* Round 1020: the desk's rules and a worked example, before play and again
   from the "?" beside the desk boxes. Every number here is read off the
   same data the desk applies, so the help cannot promise what the code does
   not do. Read inside the render, never at module scope. */
export function MlbDeskHelp({ league }: { league: MlbLeague }) {
  const shutAfter = mlbTradeWindow(league).deadlineAfter + 1;
  const pitching = MLB_STAFF_PACK.posts.find(p => p.id === 'pitching')?.effects.find(e => e.key === 'pitchEdge');
  const level5Points = pitching ? Math.round(gmEffectAt(pitching, 5, MLB_STAFF_PACK.rules.maxLevel) * 100) / 100 : 0;
  return (
    <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground" data-mlb-desk-help>
      <span>How the GM desk works</span>
      <HowToPlayPopover title="How the GM desk works" floatingTrigger={false} triggerLabel="How the GM desk works">
        <div className="space-y-2 text-sm">
          <p>Four boxes sit under the hub: your staff, the re-sign desk, your draft picks and the trade desk.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Staff.</b> Hire a manager, a pitching coach, a hitting coach, a scouting director, a farm director and a trainer. The pitching coach adds rating points to the three starters and two relievers the sim plays, the hitting coach to the eight bats, the scout&apos;s draft grades miss by less, young men grow a little faster over the winter and IL stints get shorter. Other clubs come for your best coaches during the season: match the offer or let him go.</li>
            <li><b>Re-sign desk.</b> Every man whose deal runs out is your call, never a coin flip. A man you drafted is under club control: from three seasons he is arbitration eligible and you can tender him one season he cannot walk away from, and from six he is a free agent. A free agent you had all season can get the qualifying offer, one season at the average of the 125 best salaries in this save. If he turns it down and signs somewhere else, you get an extra round 2 pick.</li>
            <li><b>Draft picks.</b> MLB clubs cannot trade draft picks, so yours stay yours.</li>
            <li><b>Trade desk.</b> Up to five players a side, and cash toward a salary you send: up to {Math.round(MLB_CASH_RETENTION.maxShare * 100)} percent, {MLB_CASH_RETENTION.maxDealsPerClub} deals at a time (the league sets no limit, this game does). Deals shut once round {shutAfter} is played and open again after the season. Clubs in an October place buy veterans, clubs well out of it sell.</li>
          </ul>
          <p><b>Worked example.</b> In spring you hire a level 5 pitching coach: every arm the sim plays is {level5Points} rating points better from the next round. Three seasons after you drafted your shortstop, his deal runs out and the re-sign box says he is arbitration eligible, so you tender him one season and he stays. With two rounds to the deadline a selling club wants youth, so you send a 31 year old reliever with half his salary in cash for their young outfielder. Once round {shutAfter} is played the trade desk says Deadline passed until October is over.</p>
          <p className="text-muted-foreground">The money is this game&apos;s own figures, not real contracts.</p>
        </div>
      </HowToPlayPopover>
    </div>
  );
}
