/* Round 987: the GM desk on the NHL Front Office hub. The panel list and the
   facts adapter; every rule and every word a box says lives in
   src/lib/nhlGmDesk.ts and the shared modules it binds (gmContracts, gmPicks,
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
import { nhlContractHost } from '@/lib/gmContractsHostNhl';
import { pickKey, pickRefusal, picksHeldBy } from '@/lib/gmPicks';
import { assetKey, evaluatePackage, type TradeAsset, type TradePackage } from '@/lib/gmTradePackage';
import { NHL_STAFF_PACK } from '@/data/gmStaff/packs';
import { type NhlLeague, nhlTradeValue } from '@/lib/nhlFrontOffice';
import {
  NHL_DESK_KEYS, deskCopy, nhlContractsOf, nhlContractsTile, nhlDealsTile, nhlGamePickRules, nhlPackageContext,
  nhlPicksOf, nhlPicksTile, nhlProposePackage, nhlRetainedOf, nhlStaffCtx, nhlStaffOf, nhlStaffTile, nhlStances,
  nhlTradeWindow, NHL_SPECIAL_TEAMS_WEIGHT,
} from '@/lib/nhlGmDesk';

/** The board's state, flattened for the desk, plus the actions a panel may take. */
export interface NhlDeskFacts extends GmFacts {
  league: NhlLeague;
  /** The regular season is over (the recap). Deals are shut, the re-sign desk is the business of the day. */
  seasonOver: boolean;
  /** The save carries the desk. Until it does (an old save), the deadline does not apply yet and the deal box says so. */
  deskOn: boolean;
  /** How the board prints a club. */
  clubName: (abbr: string) => string;
  /** A line for the board's feed. */
  say: (line: string) => void;
  /** A deal changed the league: the board saves the league and the desk together. */
  commit: (league: NhlLeague, desk: GmDesk, line: string) => void;
}

type Props = GmPanelProps<NhlDeskFacts>;

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}M`;

/* ------------------------------------------------------------------ staff */

function StaffPanel({ desk, facts, onDesk }: Props) {
  const { league, teamId } = facts;
  const state = nhlStaffOf(desk, league, teamId);
  return (
    <div className="space-y-2" data-nhl-desk-staff>
      <p className="text-center text-[11px] text-muted-foreground">
        Ownership gives the staff desk {money(NHL_STAFF_PACK.money.seasonPurse)} each summer for fees and pay offs. Wages are paid outside the cap.
        The special teams assistant counts at {Math.round(NHL_SPECIAL_TEAMS_WEIGHT * 100)} percent, because this game has no power play of its own.
      </p>
      <GmStaffPanel
        pack={NHL_STAFF_PACK}
        block={state.block}
        ctx={nhlStaffCtx(league, teamId)}
        purse={state.purse}
        purseText={money}
        onChange={(next, purse, line) => {
          onDesk(withGmBlock(desk, NHL_DESK_KEYS.staff, { block: next, purse }));
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
  const ledger = nhlContractsOf(desk, league, teamId);
  const cases = deskCases(nhlContractHost, league, ledger);
  const decisions = Object.fromEntries(cases.map(c => [c.man.id, decisionFor(ledger, league.season, c.man.id)]));
  /* Every handler works on a copy of the ledger and hands the copy back: the
     stored block is never changed in place (gmDesk's rule). */
  const act = (fn: (l: typeof ledger) => Made) => {
    const copy = deskCopy(ledger);
    const made = fn(copy);
    if (made.ok === false) facts.say(`✍️ ${made.reason}`);
    else onDesk(withGmBlock(desk, NHL_DESK_KEYS.contracts, copy));
  };
  const push = (c: DeskCase, offer: GmTerms) => {
    const copy = deskCopy(ledger);
    const res = pushFor(copy, league, c, offer);
    if (!res) { facts.say('✍️ There is no push left to make on him this summer.'); return; }
    setPushes(p => ({ ...p, [c.man.id]: res }));
    onDesk(withGmBlock(desk, NHL_DESK_KEYS.contracts, copy));
  };
  return (
    <GmResignDesk
      sport="nhl"
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
      footnote="Decide any time this season. Anyone you leave open is settled by your staff's own rule when the summer starts, never by a coin flip. The money is this game's own figures, not real contracts."
    />
  );
}

/* ------------------------------------------------------------------ picks */

function PicksPanel({ desk, facts }: Props) {
  const { league, teamId } = facts;
  return (
    <GmPicksCard
      ledger={nhlPicksOf(desk, league)}
      club={teamId}
      season={league.season}
      rules={nhlGamePickRules()}
      clubName={facts.clubName}
      window={{ ...nhlTradeWindow(league), periodWord: 'round' }}
    />
  );
}

/* ------------------------------------------------------------------ deals */

const STANCE_WORD = { buyer: 'buying', seller: 'selling', holding: 'holding' } as const;
const RETAIN_STEPS = [0, 0.25, 0.5];

function DealsPanel({ desk, facts }: Props) {
  const { league, teamId } = facts;
  const others = useMemo(() => Object.keys(league.teams).filter(k => k !== teamId).sort(), [league, teamId]);
  const [partner, setPartner] = useState(others[0] ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [retain, setRetain] = useState<Record<string, number>>({});
  const stances = nhlStances(league);
  const ledger = nhlPicksOf(desk, league);
  const rules = nhlGamePickRules();
  const retainedRows = nhlRetainedOf(desk);
  const win = nhlTradeWindow(league);
  const them = league.teams[partner];
  const me = league.teams[teamId];

  const playerTiles = (abbr: string): BuilderTile[] => league.teams[abbr].players
    .slice().sort((a, b) => nhlTradeValue(b) - nhlTradeValue(a))
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
  const inDeal = (tiles: BuilderTile[]): TradeAsset[] => tiles.filter(t => selected.has(assetKey(t.asset))).map(t => (
    t.asset.kind === 'player' && retain[t.asset.id] ? { ...t.asset, retain: retain[t.asset.id] } : t.asset
  ));
  const pkg: TradePackage = { from: teamId, to: partner, give: inDeal(mine), get: inDeal(theirs) };
  const verdict = pkg.give.length || pkg.get.length ? evaluatePackage(pkg, nhlPackageContext(league, desk, teamId, partner)) : null;
  const myPlayersIn = pkg.give.flatMap(a => (a.kind === 'player' ? [a.id] : []));

  const toggle = (a: TradeAsset) => setSelected(s => {
    const n = new Set(s);
    const k = assetKey(a);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });
  const propose = () => {
    const lg = deskCopy(league);
    const res = nhlProposePackage(lg, desk, teamId, pkg);
    if (res.verdict.verdict !== 'accepted') { facts.say(`❌ ${res.verdict.reason ?? 'No deal.'}`); return; }
    const names = res.arrived.map(p => p.name).join(' and ');
    const kept = pkg.give.some(a => a.kind === 'player' && a.retain) ? ', and you keep paying part of a salary' : '';
    setSelected(new Set()); setRetain({});
    facts.commit(lg, res.desk, `🤝 Package deal with ${facts.clubName(partner)}${names ? `: ${names} arrive${res.arrived.length === 1 ? 's' : ''}` : ''}${kept}.`);
  };

  return (
    <div className="space-y-2" data-nhl-desk-deals>
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
        Clubs in a playoff place buy: they rate every veteran higher and every pick and young player lower, theirs and yours alike, so a vet fetches more from them and a pick less. Clubs well out of it sell, the other way round. Retained salary: up to half, three deals a club at a time.
      </p>
      {myPlayersIn.length > 0 && (
        <div className="space-y-1 rounded-lg border border-border p-2" data-nhl-retain>
          {myPlayersIn.map(id => {
            const p = me.players.find(x => x.id === id);
            if (!p) return null;
            return (
              <div key={id} className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="mr-1 font-semibold">Keep paying for {p.name}:</span>
                {RETAIN_STEPS.map(s => (
                  <button key={s} type="button" onClick={() => setRetain(r => ({ ...r, [id]: s }))}
                    className={`min-h-9 rounded-full border px-2 ${(retain[id] ?? 0) === s ? 'border-primary bg-primary/10 font-bold' : 'border-border'}`}>
                    {s === 0 ? 'none' : `${s * 100}%`}
                  </button>
                ))}
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground">You carry {retainedRows.filter(r => r.club === teamId).length} of 3 retained deals.</p>
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

const STAFF: GmPanelDef<NhlDeskFacts> = {
  key: 'staff', title: 'Staff',
  tile: ({ desk, facts }) => nhlStaffTile(desk, facts.league, facts.teamId),
  Panel: StaffPanel,
};
const CONTRACTS: GmPanelDef<NhlDeskFacts> = {
  key: 'contracts', title: 'Re-sign desk',
  tile: ({ desk, facts }) => nhlContractsTile(desk, facts.league, facts.teamId, facts.seasonOver),
  Panel: ContractsPanel,
};
const PICKS: GmPanelDef<NhlDeskFacts> = {
  key: 'picks', title: 'Draft picks',
  tile: ({ desk, facts }) => nhlPicksTile(desk, facts.league, facts.teamId),
  Panel: PicksPanel,
};
const DEALS: GmPanelDef<NhlDeskFacts> = {
  key: 'deals', title: 'Trade desk',
  tile: ({ facts }) => nhlDealsTile(facts.league, facts.deskOn),
  Panel: DealsPanel,
};

/** The hub during the season. */
export const NHL_DESK_PANELS: readonly GmPanelDef<NhlDeskFacts>[] = [STAFF, CONTRACTS, PICKS, DEALS];
/** The recap, once the season is over: the re-sign desk before the draft. */
export const NHL_RECAP_PANELS: readonly GmPanelDef<NhlDeskFacts>[] = [CONTRACTS];
