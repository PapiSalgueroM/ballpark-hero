/* Round 1018: the GM desk on the NBA Front Office hub, shaped on the NHL's
   (Round 987, components/nhl-front-office/NhlGmDesk.tsx). The panel list and
   the facts adapter; every rule and every word a box says lives in
   src/lib/nbaGmDesk.ts and the shared modules it binds (gmContracts, gmPicks,
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
import { nbaContractHost } from '@/lib/gmContractsHostNba';
import { pickKey, pickRefusal, picksHeldBy } from '@/lib/gmPicks';
import { assetKey, evaluatePackage, type TradeAsset, type TradePackage } from '@/lib/gmTradePackage';
import { NBA_STAFF_PACK } from '@/data/gmStaff/packs';
import { type NbaLeague, nbaTradeValue } from '@/lib/nbaFrontOffice';
import {
  NBA_DESK_KEYS, NBA_END_WEIGHT, deskCopy, nbaContractsOf, nbaContractsTile, nbaDealsTile, nbaGamePickRules,
  nbaPackageContext, nbaPicksOf, nbaPicksTile, nbaProposePackage, nbaStaffCtx, nbaStaffOf, nbaStaffTile, nbaStances,
  nbaTradeWindow,
} from '@/lib/nbaGmDesk';

/** The board's state, flattened for the desk, plus the actions a panel may take. */
export interface NbaDeskFacts extends GmFacts {
  league: NbaLeague;
  /** The regular season is over (the recap). Deals are shut, the re-sign desk is the business of the day. */
  seasonOver: boolean;
  /** The save carries the desk. Until it does (an old save), the deadline does not apply yet and the deal box says so. */
  deskOn: boolean;
  /** How the board prints a club. */
  clubName: (abbr: string) => string;
  /** A line for the board's feed. */
  say: (line: string) => void;
  /** A deal changed the league: the board saves the league and the desk together. */
  commit: (league: NbaLeague, desk: GmDesk, line: string) => void;
}

type Props = GmPanelProps<NbaDeskFacts>;

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}M`;

/* ------------------------------------------------------------------ staff */

function StaffPanel({ desk, facts, onDesk }: Props) {
  const { league, teamId } = facts;
  const state = nbaStaffOf(desk, league, teamId);
  return (
    <div className="space-y-2" data-nba-desk-staff>
      <p className="text-center text-[11px] text-muted-foreground">
        Ownership gives the staff desk {money(NBA_STAFF_PACK.money.seasonPurse)} each summer for fees and pay offs. Wages are paid outside the cap.
        One strength number covers both ends of the floor here, so a coach's point at either end counts {Math.round(NBA_END_WEIGHT * 100)} percent.
        The development coach works every summer on your men with room to grow who are 23 or under today, since everyone turns a year older before the summer's growth.
      </p>
      <GmStaffPanel
        pack={NBA_STAFF_PACK}
        block={state.block}
        ctx={nbaStaffCtx(league, teamId)}
        purse={state.purse}
        purseText={money}
        onChange={(next, purse, line) => {
          onDesk(withGmBlock(desk, NBA_DESK_KEYS.staff, { block: next, purse }));
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
  const ledger = nbaContractsOf(desk, league, teamId);
  const cases = deskCases(nbaContractHost, league, ledger);
  const decisions = Object.fromEntries(cases.map(c => [c.man.id, decisionFor(ledger, league.season, c.man.id)]));
  /* Every handler works on a copy of the ledger and hands the copy back: the
     stored block is never changed in place (gmDesk's rule). */
  const act = (fn: (l: typeof ledger) => Made) => {
    const copy = deskCopy(ledger);
    const made = fn(copy);
    if (made.ok === false) facts.say(`✍️ ${made.reason}`);
    else onDesk(withGmBlock(desk, NBA_DESK_KEYS.contracts, copy));
  };
  const push = (c: DeskCase, offer: GmTerms) => {
    const copy = deskCopy(ledger);
    const res = pushFor(copy, league, c, offer);
    if (!res) { facts.say('✍️ There is no push left to make on him this summer.'); return; }
    setPushes(p => ({ ...p, [c.man.id]: res }));
    onDesk(withGmBlock(desk, NBA_DESK_KEYS.contracts, copy));
  };
  return (
    <GmResignDesk
      sport="nba"
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
      footnote="Decide any time this season. Anyone you leave open is settled by your staff's own rule when the summer starts, never by a coin flip. The luxury tax still bills whatever payroll you keep. The money is this game's own figures, not real contracts."
    />
  );
}

/* ------------------------------------------------------------------ picks */

function PicksPanel({ desk, facts }: Props) {
  const { league, teamId } = facts;
  return (
    <GmPicksCard
      ledger={nbaPicksOf(desk, league)}
      club={teamId}
      season={league.season}
      rules={nbaGamePickRules()}
      clubName={facts.clubName}
      window={{ ...nbaTradeWindow(league), periodWord: 'round' }}
    />
  );
}

/* ------------------------------------------------------------------ deals */

const STANCE_WORD = { buyer: 'buying', seller: 'selling', holding: 'holding' } as const;

function DealsPanel({ desk, facts }: Props) {
  const { league, teamId } = facts;
  const others = useMemo(() => Object.keys(league.teams).filter(k => k !== teamId).sort(), [league, teamId]);
  const [partner, setPartner] = useState(others[0] ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const stances = nbaStances(league);
  const ledger = nbaPicksOf(desk, league);
  const rules = nbaGamePickRules();
  const win = nbaTradeWindow(league);
  const them = league.teams[partner];
  const me = league.teams[teamId];

  const playerTiles = (abbr: string): BuilderTile[] => league.teams[abbr].players
    .slice().sort((a, b) => nbaTradeValue(b) - nbaTradeValue(a))
    .map(p => ({ asset: { kind: 'player', id: p.id }, label: p.name, sub: `${p.pos} ${p.ovr}, age ${p.age}, $${p.salary}M x ${p.years}` }));
  const pickTiles = (abbr: string): BuilderTile[] => picksHeldBy(ledger, abbr).map(p => {
    const blocked = pickRefusal(ledger, rules, league.season, abbr, pickKey(p));
    return {
      asset: { kind: 'pick', key: pickKey(p) },
      label: `${p.year} round ${p.round}`,
      sub: p.orig === abbr ? 'their own' : `from ${p.orig}`,
      ...(blocked ? { blocked } : {}),
    };
  });
  const mine = me ? [...playerTiles(teamId), ...pickTiles(teamId)] : [];
  const theirs = them ? [...playerTiles(partner), ...pickTiles(partner)] : [];
  const inDeal = (tiles: BuilderTile[]): TradeAsset[] => tiles.filter(t => selected.has(assetKey(t.asset))).map(t => t.asset);
  const pkg: TradePackage = { from: teamId, to: partner, give: inDeal(mine), get: inDeal(theirs) };
  const verdict = pkg.give.length || pkg.get.length ? evaluatePackage(pkg, nbaPackageContext(league, desk, teamId, partner)) : null;

  const toggle = (a: TradeAsset) => setSelected(s => {
    const n = new Set(s);
    const k = assetKey(a);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });
  const propose = () => {
    const lg = deskCopy(league);
    const res = nbaProposePackage(lg, desk, teamId, pkg);
    if (res.verdict.verdict !== 'accepted') { facts.say(`❌ ${res.verdict.reason ?? 'No deal.'}`); return; }
    const names = res.arrived.map(p => p.name).join(' and ');
    setSelected(new Set());
    facts.commit(lg, res.desk, `🤝 Package deal with ${facts.clubName(partner)}${names ? `: ${names} arrive${res.arrived.length === 1 ? 's' : ''}` : ''}.`);
  };

  return (
    <div className="space-y-2" data-nba-desk-deals>
      <label className="flex items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground">Deal with</span>
        <select
          value={partner}
          onChange={e => { setPartner(e.target.value); setSelected(new Set()); }}
          className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
        >
          {others.map(k => <option key={k} value={k}>{facts.clubName(k)} ({STANCE_WORD[stances[k] ?? 'holding']})</option>)}
        </select>
      </label>
      <p className="text-center text-[11px] text-muted-foreground">
        Clubs in a playoff place buy: they rate every veteran higher and every pick and young player lower, theirs and yours alike, so a vet fetches more from them and a pick less. Clubs well out of it sell, the other way round. Salaries have to match under this game's own rule (what comes in fits your room, or is no more than one and a half times what goes out plus $5M), and over the first apron a club takes back no more than it sends.
      </p>
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

const STAFF: GmPanelDef<NbaDeskFacts> = {
  key: 'staff', title: 'Staff',
  tile: ({ desk, facts }) => nbaStaffTile(desk, facts.league, facts.teamId, facts.deskOn),
  Panel: StaffPanel,
};
const CONTRACTS: GmPanelDef<NbaDeskFacts> = {
  key: 'contracts', title: 'Re-sign desk',
  tile: ({ desk, facts }) => nbaContractsTile(desk, facts.league, facts.teamId, facts.seasonOver, facts.deskOn),
  Panel: ContractsPanel,
};
const PICKS: GmPanelDef<NbaDeskFacts> = {
  key: 'picks', title: 'Draft picks',
  tile: ({ desk, facts }) => nbaPicksTile(desk, facts.league, facts.teamId),
  Panel: PicksPanel,
};
const DEALS: GmPanelDef<NbaDeskFacts> = {
  key: 'deals', title: 'Trade desk',
  tile: ({ facts }) => nbaDealsTile(facts.league, facts.deskOn),
  Panel: DealsPanel,
};

/** The hub during the season. */
export const NBA_DESK_PANELS: readonly GmPanelDef<NbaDeskFacts>[] = [STAFF, CONTRACTS, PICKS, DEALS];
/** The recap, once the season is over: the re-sign desk before the draft. */
export const NBA_RECAP_PANELS: readonly GmPanelDef<NbaDeskFacts>[] = [CONTRACTS];
