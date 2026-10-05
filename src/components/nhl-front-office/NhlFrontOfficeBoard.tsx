import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DraftNightCard } from '@/components/front-office-shared/DraftNightCard';
import { buildDraftNight } from '@/lib/draftNight';
import type { DraftNight } from '@/lib/draftNight';
import { Briefcase, Crown, RotateCcw, ShieldHalf } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { NHL_TEAMS, NHL_TEAM_MAP } from '@/data/conquestDataNhl';
import {
  initNhlLeague, simNhlRound, nhlFoStandings, runNhlFoPlayoffs, nhlOffseason,
  nhlDraftClass, nhlProspectToPlayer, nhlStrength, nhlCapUsed, nhlCapRoom,
  nhlRelease, nhlSign, nhlTrade, nhlTradeValue, nhlAiMoves, nhlPoints, EASTERN, WESTERN, NHL_FO_DIVISIONS,
  NHL_FO_ROUNDS, NHL_RATING_MODEL_VERSION, nhlSalaryFor, nhlAiDraftPicks, nhlDraftCapital, nhlConsumeDraftPick,
  type NhlLeague, type NhlProspect, type NhlSeriesResult, nhlExecuteTalksTrade,
  ensureNhlLeagueIds, NHL_ROSTER_MIN, NHL_ROSTER_MAX,
  nhlContributors, nhlSetContributors, nhlResetContributors, repairNhlContributors,
  type NhlContributors, type NhlGmTeam, type NhlGmPlayer,
} from '@/lib/nhlFrontOffice';
/* Round 631: waiving a man costs dead money and he cannot come back this season. */
import { deadMoneyFor, deadCapUsed, signRefusal, cutRefusal, rosterFullRefusal, tradeRefusal } from '@/lib/frontOfficeCuts';
/* Round 531: the cap on screen says which day its figure was read. */
import { capNote } from '@/lib/leagueCaps';
import { leagueNames } from '@/lib/foNames';
import { findTrades, type FinderOffer } from '@/lib/tradeFinder';
/* Round 190: true negotiations, shared engine and shared card. The direct
   propose is a phone call now, not a coin flip. */
import { openTalks, standFirm, type TalksState } from '@/lib/foTradeTalks';
import { TradeTalksCard } from '@/components/front-office-shared/TradeTalksCard';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { recordActivity } from '@/lib/completions';
import { cn } from '@/lib/utils';
// Round 180: the owner upstairs, shared engine and card.
import {
  buildOwnerMandate, strengthRank, mandatePace, gradeSeason, applyMandateResult,
  firedLine, seriesPostseason, FO_TRUST_START, type OwnerMandate, type FoSportWords,
} from '@/lib/foOwnerMandate';
import OwnerMandateCard from '@/components/front-office-shared/OwnerMandateCard';
/* Round 187: the verdict curtain. stageVerdict decides the presentation
   facts (confetti only for the champion GM, fired kills it outright) so
   the rule lives in the harnessed engine, not in this JSX. */
import { stageVerdict } from '@/lib/usCareerReveal';
/* Round 192: the GM faces the room. Shared engine and card; answers move
   trust and can tilt next season's mandate one tier. */
import { buildGmPresser, applyGmPressChoice, type GmPresser } from '@/lib/foGmPress';
import { GmPressCard } from '@/components/front-office-shared/GmPressCard';
import { ConfettiBurst, CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
/* Round 204: the hub is boxes now, the same boxes Club Manager has had
   since Round 74. What each box says lives in the engine, not here. */
import { foHubTiles, type FoPanelKey } from '@/lib/foHub';
import { FoHubTiles, FoPanelHeader } from '@/components/front-office-shared/FoHubTiles';
import contributorsStyles from './NhlContributors.module.css';
import { NhlWaiverReceipt, type NhlWaiverReceiptEvent } from './NhlWaiverReceipt';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
/* Round 987: the GM desk (staff, the re-sign desk, the pick ledger, packages
   and the deadline). One optional `gm` field on the save; absent, the board
   plays exactly as before. */
import { GmDeskMount } from '@/components/front-office-shared/GmDeskMount';
import { type GmDesk, gmPanelFor, readGmDesk, withGmBlock } from '@/lib/gmDesk';
import { gmStaffLevel } from '@/lib/gmStaff';
import {
  deskCopy, nhlDeadlineRefusal, nhlDeskAfterRound, nhlDeskEdges, nhlDeskOffseason, nhlDeskRoundOptions, nhlMirrorPickMove,
  nhlNoteArrivals, nhlPicksOf, nhlScoutRead, nhlSignDraftee, nhlStaffOf, nhlTradeWindow, openNhlDesk, syncNhlPicks, NHL_DESK_KEYS,
} from '@/lib/nhlGmDesk';
/* By its full path, not './': the waiver, roster limit and draft capital harnesses bundle a copy of this board from a temp folder. */
import { NHL_DESK_PANELS, NHL_RECAP_PANELS, type NhlDeskFacts } from '@/components/nhl-front-office/NhlGmDesk';

/* Round 180: 'fired' is new. Zero trust upstairs ends the save. */
type Phase = 'pick' | 'hub' | 'draft' | 'recap' | 'fired';
type Tab = 'team' | 'market' | 'trade' | 'round' | 'standings';

const SAVE_KEY = 'nhl-front-office-save-v1';
/* Round 631: what the market and the trade screen say about a man you let go this season. */
const CUT_SAID = 'You waived him this season.';

function openingEvidence(p: NhlGmPlayer) {
  const e = p.openingRatingEvidence;
  const basis = p.pos === 'G' ? 'save-rate-proxy' : p.pos === 'D' ? 'offense-usage-proxy' : 'offensive-production';
  return e && e.modelVersion === NHL_RATING_MODEL_VERSION && typeof e.originKey === 'string' && e.originKey.length > 0
    && Number.isInteger(e.openingOvr) && e.openingOvr >= 0 && e.openingOvr <= 99 && typeof e.partial === 'boolean'
    && (e.basis === basis || e.basis === 'unmeasured-prior')
    && (e.basis === 'offensive-production' || e.partial) ? e : null;
}
function ratingNote(p: NhlGmPlayer) {
  if (!p.openingRatingEvidence) return null;
  const e = openingEvidence(p);
  const basis = e?.basis === 'offensive-production' ? 'offensive production'
    : e?.basis === 'offense-usage-proxy' ? 'offense and usage proxy'
    : e?.basis === 'save-rate-proxy' ? 'save-rate proxy, shot quality unavailable' : 'unmeasured game prior';
  return <span data-rating-evidence className="block text-[10px] text-muted-foreground">
    {e ? `Opening estimate ${e.openingOvr}: ${basis}.${e.partial ? ' Limited opening evidence.' : ' Defense and other skills are not measured.'}` : 'Opening rating evidence unavailable.'}
  </span>;
}
function ratingMarker(p: NhlGmPlayer) {
  return openingEvidence(p)?.partial ? <span data-rating-partial title="Limited opening evidence" className="ml-0.5 text-[9px] text-muted-foreground">e</span> : null;
}

const NHL_WORDS: FoSportWords = { title: 'the Stanley Cup', playoffs: 'the playoffs', round: 'a series', games: 80 };

type Postseason = { series: NhlSeriesResult[]; champion: string; gradeLine: string | null };

interface SaveShape {
  league: NhlLeague; myTeam: string; phase: Phase; titles: number; seasonsPlayed: number;
  draftClass: NhlProspect[] | null; picksLeft: number;
  draftBatchesLeft?: number;
  /* Round 180. Optional so pre-180 saves keep loading; repaired on load. */
  mandate?: OwnerMandate | null; trust?: number; fired?: boolean;
  /* Round 192. The presser itself is transient (a reload ends the scrum,
     same rule as trade talks), but an ANSWERED tilt and the season's
     headline deal survive, so the next mandate honors what was said. */
  pressTilt?: -1 | 0 | 1; seasonTradeLine?: string | null;
  /* Round 431. Present on a save written from the recap screen, so the recap
     can be drawn again after a reload. Absent on older saves. */
  postseason?: Postseason | null;
  /* Round 987: the GM desk (src/lib/gmDesk.ts). Absent on every save written
     before it, and on those the board plays exactly as it did until the GM
     opens a desk box. Each block inside is validated alone. */
  gm?: unknown;
}

function ContributorPicker({ team, onApply, onAuto, onBack }: {
  team: NhlGmTeam; onApply: (value: NhlContributors) => boolean; onAuto: () => boolean; onBack: () => void;
}) {
  const effective = nhlContributors(team);
  const [draft, setDraft] = useState<NhlContributors>(() => nhlContributors(team));
  const [receipt, setReceipt] = useState<{ id: number; text: string } | null>(null);
  const sequence = useRef(0), back = useRef<HTMLButtonElement>(null), notice = useRef<HTMLDivElement>(null);
  const rosterKey = JSON.stringify(team.players.map(p => [p.id, p.pos, p.out, p.ovr]));
  const savedKey = JSON.stringify(effective);
  useEffect(() => { setDraft(nhlContributors(team)); }, [rosterKey, savedKey]);
  useLayoutEffect(() => { back.current?.focus({ preventScroll: true }); }, []);
  useLayoutEffect(() => { if (receipt) notice.current?.focus({ preventScroll: true }); }, [receipt]);
  useEffect(() => {
    if (!receipt) return;
    const timer = setTimeout(() => setReceipt(null), 500);
    return () => clearTimeout(timer);
  }, [receipt]);
  const healthy = team.players.filter(p => p.out === 0);
  const groups = [
    { key: 'forwards' as const, label: 'Forwards', weight: '50%', players: healthy.filter(p => p.pos === 'C' || p.pos === 'W'), cap: 6 },
    { key: 'defense' as const, label: 'Defense', weight: '30%', players: healthy.filter(p => p.pos === 'D'), cap: 4 },
    { key: 'goalie' as const, label: 'Goalie', weight: '20%', players: healthy.filter(p => p.pos === 'G'), cap: 1 },
  ];
  const ids = (value: NhlContributors, key: typeof groups[number]['key']) => key === 'goalie' ? value.goalie === null ? [] : [value.goalie] : value[key];
  const complete = groups.every(group => {
    const chosen = ids(draft, group.key);
    return chosen.length === Math.min(group.cap, group.players.length) && new Set(chosen).size === chosen.length && chosen.every(id => group.players.some(p => p.id === id));
  });
  const changed = groups.some(group => {
    const selected = ids(draft, group.key), current = ids(effective, group.key);
    return selected.length !== current.length || selected.some(id => !current.includes(id));
  });
  const preview = complete ? nhlStrength({ ...team, contributors: draft }) : null;
  const toggle = (key: typeof groups[number]['key'], id: string, cap: number) => {
    setDraft(previous => {
      const selected = ids(previous, key);
      if (key === 'goalie') return { ...previous, goalie: id };
      if (selected.includes(id)) return { ...previous, [key]: selected.filter(value => value !== id) };
      if (selected.length >= cap) return previous;
      return { ...previous, [key]: [...selected, id] };
    });
  };
  const commit = (automatic: boolean) => {
    if (!(automatic ? onAuto() : complete && changed && onApply(draft))) return;
    setReceipt({ id: ++sequence.current, text: automatic ? 'Automatic contributors restored.' : 'Simulation contributors applied.' });
  };
  return (
    <section className={contributorsStyles.panel} data-nhl-contributors aria-label="Simulation contributors">
      <button ref={back} type="button" onClick={onBack} className={cn(contributorsStyles.action, 'rounded-lg border border-border px-3 text-xs font-semibold')}>Back to roster</button>
      <h3 className="mt-3 font-bold text-foreground">Simulation contributors</h3>
      <p className="mt-1 text-xs text-muted-foreground">Choose whose ratings feed the simulation. This does not set lines or ice time. Only healthy players can contribute.</p>
      <p className="mt-2 text-xs text-muted-foreground">Select six forwards, four defensemen and one goalie, or every healthy player when a group is thin. Uncheck a selected forward or defenseman before choosing a replacement. An empty group uses rating 62.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {groups.map(group => {
          const selected = ids(draft, group.key), required = Math.min(group.cap, group.players.length);
          return <fieldset key={group.key} className="min-w-0 rounded-lg border border-border p-2" data-nhl-group={group.key}>
            <legend className="px-1 text-xs font-bold">{group.label} {selected.length}/{required} · {group.weight}</legend>
            <div className={contributorsStyles.choices}>
              {[...group.players].sort((a, b) => b.ovr - a.ovr).map(player => {
                const checked = selected.includes(player.id);
                return <label key={player.id} className={contributorsStyles.choice}>
                  <input type={group.key === 'goalie' ? 'radio' : 'checkbox'} name={group.key === 'goalie' ? 'nhl-contributor-goalie' : undefined} checked={checked} disabled={group.key !== 'goalie' && !checked && selected.length >= required} onChange={() => toggle(group.key, player.id, required)} data-nhl-contributor={player.id} />
                  <span className={contributorsStyles.name}>{player.name}<span className="block text-[10px] text-muted-foreground">{player.pos} · rating {player.ovr}</span></span>
                </label>;
              })}
              {group.players.length === 0 && <p className="py-2 text-xs text-muted-foreground">No healthy {group.label.toLowerCase()}.</p>}
            </div>
          </fieldset>;
        })}
      </div>
      <p className="mt-3 text-sm font-semibold" data-nhl-strength-preview>{preview === null ? 'Finish your selection to see its strength.' : `Strength preview ${preview.toFixed(1)} · forwards 50%, defense 30%, goalie 20%`}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" data-nhl-apply onClick={() => commit(false)} disabled={!complete || !changed} className={cn(contributorsStyles.action, 'rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-40')}>Apply contributors</button>
        <button type="button" data-nhl-auto onClick={() => commit(true)} disabled={team.contributors === undefined} className={cn(contributorsStyles.action, 'rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-40')}>Use automatic</button>
      </div>
      <div ref={notice} tabIndex={-1} role="status" className={contributorsStyles.receipt} data-nhl-contributor-feedback>
        {receipt && <span key={receipt.id} className={contributorsStyles.committed}>{receipt.text}</span>}
      </div>
    </section>
  );
}

export default function NhlFrontOfficeBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [saveError, setSaveError] = useState(false);
  /* Round 204: the hub is tiles now, so null means the hub itself and a
     tab key means you have opened that box. Club Manager's Round 74 rule,
     brought to the four GM games. */
  const [tab, setTab] = useState<Tab | null>(null);
  const [myTeam, setMyTeam] = useState('');
  const [league, setLeague] = useState<NhlLeague | null>(null);
  const [starting, setStarting] = useState(false), [startError, setStartError] = useState('');
  const startPending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [contributorsOpen, setContributorsOpen] = useState(false);
  const contributorsOpener = useRef<HTMLButtonElement>(null), contributorReturn = useRef(false), contributorCommit = useRef<NhlLeague | null>(null);
  useLayoutEffect(() => {
    if (!contributorsOpen && contributorReturn.current) { contributorReturn.current = false; contributorsOpener.current?.focus({ preventScroll: true }); }
  }, [contributorsOpen]);
  const [feed, setFeed] = useState<string[]>([]);
  /* Round 530: a done deal or a signing slams in at the top of the feed the
     moment it happens. Matched on the line's text, never its index, so the
     moment anything else is prepended it reads as an ordinary row. Transient
     like the reveal, never persisted. */
  const [feedSlam, setFeedSlam] = useState<{ text: string; n: number } | null>(null);
  const [series, setSeries] = useState<NhlSeriesResult[]>([]);
  const [champion, setChampion] = useState('');
  const [draftClass, setDraftClass] = useState<NhlProspect[] | null>(null);
  /* Round 515: draft night. Transient on the board and never persisted,
     the Round 186 rule for reveals. */
  const [draftNight, setDraftNight] = useState<DraftNight | null>(null);
  const [picksLeft, setPicksLeft] = useState(0);
  const [draftBatchesLeft, setDraftBatchesLeft] = useState<number | null>(null);
  const draftAction = useRef(false);
  useEffect(() => { draftAction.current = false; }, [league, draftClass, picksLeft, draftBatchesLeft]);
  const [tradePartner, setTradePartner] = useState('');
  // Round 82: trade finder
  const [shopOffers, setShopOffers] = useState<FinderOffer[]>([]);
  const [shopTried, setShopTried] = useState(false);
  const [myTradePiece, setMyTradePiece] = useState('');
  /* Round 631: the man whose Waive button has been tapped once. The second
     tap is only offered once the dead money is on screen. Transient. */
  const [cutArmed, setCutArmed] = useState<string | null>(null);
  const [waiverReceipt, setWaiverReceipt] = useState<NhlWaiverReceiptEvent | null>(null);
  const waiverSequence = useRef(0), waiverCommit = useRef<NhlLeague | null>(null);
  const waiverBoard = useRef<HTMLDivElement>(null);
  const rosterRows = useRef<HTMLDivElement>(null);
  const waiverFocus = useRef<{ opener: Element | null; index: number } | null>(null);
  useLayoutEffect(() => {
    const request = waiverFocus.current;
    if (!request) return;
    waiverFocus.current = null;
    const active = document.activeElement;
    if (active !== request.opener && active !== document.body && active?.isConnected) return;
    const rows = rosterRows.current?.children;
    const row = rows?.[Math.min(request.index, rows.length - 1)];
    (row?.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? rosterRows.current)?.focus({ preventScroll: true });
  }, [waiverReceipt]);
  /* Round 190: the live phone call. Transient like the market window:
     never persisted, a reload simply ends the call. */
  const [talks, setTalks] = useState<{ state: TalksState; partner: string; myPieceId: string; wantId: string } | null>(null);
  const [titles, setTitles] = useState(0);
  const [seasonsPlayed, setSeasonsPlayed] = useState(0);
  const [wonNow, setWonNow] = useState(false);
  /* Round 180: the owner upstairs. */
  const [mandate, setMandate] = useState<OwnerMandate | null>(null);
  const [trust, setTrust] = useState(FO_TRUST_START);
  const [fired, setFired] = useState(false);
  const [gradeLine, setGradeLine] = useState<string | null>(null);
  /* Round 192: the room. Presser transient; tilt and trade line persist. */
  const [presser, setPresser] = useState<GmPresser | null>(null);
  const [pressTilt, setPressTilt] = useState<-1 | 0 | 1>(0);
  const [seasonTradeLine, setSeasonTradeLine] = useState<string | null>(null);
  /* Round 987: the GM desk. null is a save the desk has never been opened on. */
  const [gm, setGmState] = useState<GmDesk | null>(null);
  /* Every save reads the desk from here, so a handler that has just changed
     it saves the new one without touching any of the board's persist calls. */
  const gmLive = useRef<GmDesk | null>(null);
  const setGm = (d: GmDesk | null) => { gmLive.current = d; setGmState(d); };
  const [gmOpen, setGmOpen] = useState<string | null>(null);

  useGameCompletion('nhl-front-office', wonNow, titles * 100 + seasonsPlayed * 5);

  /* Round 180: rank my roster against the league and let ownership set the ask. */
  const mandateFor = (lg: NhlLeague, team: string, defendingChamp: boolean, tilt: -1 | 0 | 1 = 0): OwnerMandate => {
    const strengths = Object.fromEntries(Object.entries(lg.teams).map(([a, tm]) => [a, nhlStrength(tm)]));
    return buildOwnerMandate(strengthRank(strengths, team), Object.keys(lg.teams).length, defendingChamp, NHL_WORDS, lg.season, tilt);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isFrontOfficeSave(parsed, 'NHL', NHL_FO_ROUNDS)) { setSaveError(true); return; }
      const s = parsed as SaveShape;
      const capital = nhlDraftCapital(s.league.teams[s.myTeam]);
      const legacyFinished = s.draftBatchesLeft === undefined && s.phase === 'draft' && s.picksLeft === 0
        && s.league.round === 1 && s.league.champions.some(c => c.season === s.league.season - 1);
      if (capital == null || (s.picksLeft ?? 0) > NHL_TEAMS.length * 2
        || (s.phase === 'draft' && !Number.isInteger(s.picksLeft))
        || (s.phase === 'draft' && s.league.round !== NHL_FO_ROUNDS && !legacyFinished)
        || (s.draftBatchesLeft !== undefined && (!Number.isInteger(s.draftBatchesLeft) || s.draftBatchesLeft < 0 || s.draftBatchesLeft > 2
          || (s.phase === 'draft' && s.picksLeft === 0 && s.draftBatchesLeft === 0)))) { setSaveError(true); return; }
      /* Round 568: FIRST, above every setState below, because everything
         past this line reads the league by id and a save written before the
         id fix can hold two men under one. The draft class is passed too: it
         is minted from the same counter, so it shares the id space. */
      ensureNhlLeagueIds(s.league, s.draftClass);
      if (s.league.teams[s.myTeam]) repairNhlContributors(s.league.teams[s.myTeam]);
      setLeague(s.league); setMyTeam(s.myTeam);
      setTitles(s.titles ?? 0); setSeasonsPlayed(s.seasonsPlayed ?? 0);
      setDraftClass(s.draftClass ?? null); setPicksLeft(s.picksLeft ?? 0);
      setDraftBatchesLeft(s.draftBatchesLeft ?? null);
      /* Round 180, repair-on-load: a pre-180 save gets an owner today. */
      setMandate(s.mandate ?? mandateFor(s.league, s.myTeam, false));
      setTrust(s.trust ?? FO_TRUST_START);
      setFired(s.fired ?? false);
      setPressTilt(s.pressTilt ?? 0);
      setSeasonTradeLine(s.seasonTradeLine ?? null);
      /* Round 987: no `gm` on the save means the desk stays off until it is opened. */
      setGm(s.gm === undefined ? null : readGmDesk(s.gm));
      /* Round 431: a reload on the recap screen used to replay the season.
         The save carried phase 'recap' with the league still at the final
         round and no postseason, this effect mapped it back to 'hub', the
         play box offered the final stretch again, and one click ran it and
         the whole postseason a second time on a season that was already
         closed: seasonsPlayed and titles advanced twice, every team played
         an extra round of games, and the mandate was graded twice. The save
         now carries the postseason, so the recap is simply drawn again. A
         save from before this round has nothing to draw, so it opens on the
         draft, which is where the recap's only button leads. */
      if (s.postseason) { setSeries(s.postseason.series); setChampion(s.postseason.champion); setGradeLine(s.postseason.gradeLine ?? null); }
      if (s.fired) setPhase('fired');
      else if (s.phase !== 'recap') setPhase(s.phase);
      else if (s.postseason) setPhase('recap');
      else openDraft(s.league, s.myTeam, s);
    } catch { setSaveError(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((patch: Partial<SaveShape>, lg: NhlLeague | null, team: string) => {
    try {
      if (!lg) return;
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        league: lg, myTeam: team, phase, titles, seasonsPlayed, draftClass, picksLeft,
        ...(draftBatchesLeft !== null ? { draftBatchesLeft } : {}),
        mandate, trust, fired, pressTilt, seasonTradeLine,
        postseason: champion ? { series, champion, gradeLine } : null,
        ...(gmLive.current ? { gm: gmLive.current } : {}), ...patch,
      } satisfies SaveShape));
    } catch { /* full */ }
  }, [phase, titles, seasonsPlayed, draftClass, picksLeft, draftBatchesLeft, mandate, trust, fired, pressTilt, seasonTradeLine, champion, series, gradeLine]);

  const label = (abbr: string) => {
    const t = NHL_TEAM_MAP.get(abbr);
    return t ? `${t.city} ${t.name}` : abbr;
  };

  const start = async (abbr: string) => {
    if (startPending.current) return;
    startPending.current = true; setStarting(true); setStartError('');
    try {
    const { NHL_OPENING_RATINGS } = await import('@/data/nhlOpeningRatings');
    if (!alive.current) return;
    const lg = initNhlLeague(Math.random, NHL_OPENING_RATINGS);
    setSaveError(false);
    const m = mandateFor(lg, abbr, false);
    setLeague(lg); setMyTeam(abbr); setPhase('hub'); setTab(null);
    setWaiverReceipt(null);
    setFeed([
      `Welcome to the ${label(abbr)} front office. The ${lg.season}-${(lg.season + 1) % 100} season drops the puck now.`,
      `🏛️ The ownership mandate: ${m.text}`,
    ]);
    setChampion(''); setSeries([]); setTitles(0); setSeasonsPlayed(0);
    setMandate(m); setTrust(FO_TRUST_START); setFired(false); setGradeLine(null);
    /* Round 192: the introduction presser. First day, full room. */
    setPresser(buildGmPresser(NHL_WORDS, {
      justHired: true, teamLabel: label(abbr), fired: false, wonTitle: false,
      gradeResult: null, tradeLine: null, seasonsPlayed: 0,
    }));
    setPressTilt(0); setSeasonTradeLine(null);
    /* Round 987: a new front office opens with the desk on. Only a save from
       before it waits for the GM to open a desk box. */
    const desk = openNhlDesk(lg, abbr);
    setGm(desk); setGmOpen(null);
    persist({ phase: 'hub', titles: 0, seasonsPlayed: 0, mandate: m, trust: FO_TRUST_START, fired: false, pressTilt: 0, seasonTradeLine: null }, lg, abbr);
    } catch {
      if (alive.current) setStartError('We could not load the opening ratings. Try your team again. Your existing save is unchanged.');
    } finally {
      startPending.current = false;
      if (alive.current) setStarting(false);
    }
  };

  /* Round 192: one answer, three registers. Trust moves now, the tilt
     waits for the next mandate build. */
  const answerPress = (i: 0 | 1 | 2) => {
    if (!presser || !league) return;
    const res = applyGmPressChoice(trust, presser.options[i], Math.random);
    setTrust(res.trust);
    setPressTilt(res.tilt);
    setFeed(f => [res.line, ...f].slice(0, 6));
    setPresser(null);
    persist({ trust: res.trust, pressTilt: res.tilt }, league, myTeam);
  };

  /* Round 530: the feed ticks in a row at a time. Rows are keyed on the
     period stamp plus their index, so a new round remounts them and they
     re-animate, while a re-render for anything else leaves them still. The
     slam row carries its own key, so a deal landing remounts that one row
     and nothing under it moves. The rows land on the kit's stagger from
     0.2s, so the feed reads before the tiles under it settle. */
  const feedRows = (lines: string[], stamp: string) => lines.map((n, i) => {
    const slamKey = feedSlam && i === 0 && feedSlam.text === n ? `slam:${feedSlam.n}` : null;
    return (
      <p
        key={slamKey ?? `${stamp}:${i}`}
        className={slamKey ? 'cm-slam font-semibold text-foreground' : 'cm-tick-in'}
        style={{ animationDelay: slamKey ? '0s' : revealDelay(i, 0.2) }}
      >
        {n}
      </p>
    );
  });
  const slamFeed = (line: string) => {
    setFeed(f => [line, ...f].slice(0, 6));
    setFeedSlam(s => ({ text: line, n: (s?.n ?? 0) + 1 }));
  };

  const my = league?.teams[myTeam];
  /* Round 987: with the desk on, the grade the draft board shows is your
     scouting director's read (his level sets the miss); the CPU clubs keep
     the engine's own. */
  const scoutLevel = gm && league ? gmStaffLevel(nhlStaffOf(gm, league, myTeam).block, 'scouting') : null;
  const gradeOf = (pr: NhlProspect): number => scoutLevel !== null && league
    ? nhlScoutRead(pr, myTeam, league.season, scoutLevel)
    : pr.grade;

  const playRound = () => {
    if (!league || !my || my.players.length > NHL_ROSTER_MAX) return;
    /* Round 195: a played round counts as playing TODAY, the same per-session mark
       Club Manager has had since Round 157. Unscored on purpose: the
       scored completion stays the title. */
    recordActivity('/nhl-front-office');
    /* Round 431: a season's postseason runs once. The record carries an entry
       for this season the moment its playoffs are played, so a league that
       already has one is a closed season being clicked again, and the answer
       is to do nothing rather than play an extra round. */
    if (league.champions.some(c => c.season === league.season)) return;
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    /* Round 987: with the desk on, the staff's edge and the trainer ride on
       the round; with it off the round is called exactly as before. */
    const report = simNhlRound(lg, myTeam, Math.random, gm ? nhlDeskRoundOptions(gm, lg, myTeam) : undefined);
    nhlAiMoves(lg, myTeam, Math.random);
    let nextGm = gm;
    const deskLines: string[] = [];
    if (gm) {
      const tick = nhlDeskAfterRound(gm, lg, myTeam);
      nextGm = tick.desk;
      if (tick.line) deskLines.push(tick.line);
    }
    const newFeed = [
      `Round ${lg.round}: you went ${report.myWins}-${report.myLosses}-${report.myOtLosses}.`,
      ...deskLines,
      ...report.notes,
    ];
    if (nextGm !== gm) setGm(nextGm);
    if (lg.round >= NHL_FO_ROUNDS) {
      const { series: sr, champion: champ } = runNhlFoPlayoffs(lg, Math.random, nextGm ? nhlDeskEdges(nextGm, lg, myTeam) : undefined);
      lg.champions.push({ season: lg.season, team: champ });
      setSeries(sr);
      setChampion(champ);
      const won = champ === myTeam;
      setWonNow(won);
      const nt = titles + (won ? 1 : 0);
      const ns = seasonsPlayed + 1;
      setTitles(nt); setSeasonsPlayed(ns);
      /* Round 180: ownership grades the season against the mandate. */
      let newTrust = trust, nowFired = fired;
      let gradeResult: ReturnType<typeof gradeSeason>['result'] | null = null;
      let gradeVerdict: string | null = null;
      if (mandate) {
        const post = seriesPostseason(sr, myTeam);
        const grade = gradeSeason(mandate, { wins: lg.teams[myTeam].wins, ...post, wonTitle: won });
        const applied = applyMandateResult(trust, grade);
        newTrust = applied.trust; nowFired = applied.fired;
        gradeResult = grade.result;
        setTrust(applied.trust); setFired(applied.fired); setGradeLine(grade.verdict);
        gradeVerdict = grade.verdict;
      }
      /* Round 192: the room reacts to the season that actually happened.
         A fired GM gets no presser, and a quiet, mandate-met, no-news
         summer gets provably nothing. */
      setPresser(buildGmPresser(NHL_WORDS, {
        justHired: false, teamLabel: label(myTeam), fired: nowFired, wonTitle: won,
        gradeResult, tradeLine: seasonTradeLine, seasonsPlayed: ns,
      }));
      setPhase('recap');
      setLeague(lg);
      setFeed(newFeed); setFeedSlam(null);
      persist({ phase: nowFired ? 'fired' : 'recap', titles: nt, seasonsPlayed: ns, trust: newTrust, fired: nowFired, postseason: { series: sr, champion: champ, gradeLine: gradeVerdict } }, lg, myTeam);
      return;
    }
    lg.round += 1;
    /* Round 987: the round the deadline shuts says so in the feed. */
    if (nextGm && nhlTradeWindow(league).open && !nhlTradeWindow(lg).open) newFeed.splice(1, 0, '🔒 The trade deadline has passed. Deals open again once the season is over.');
    setLeague(lg);
    setFeed(newFeed); setFeedSlam(null);
    persist({}, lg, myTeam);
  };

  /* Round 431: the step after the recap, a draft class for the season just
     closed. Shared by the recap's button and by the restore of an older save
     written on the recap screen, which has no postseason to draw. That restore
     passes the save's own fields as the patch, because persist's closure still
     holds the first render's defaults while the load effect runs. */
  const openDraft = (lg: NhlLeague, team: string, patch: Partial<SaveShape> = {}) => {
    if (draftAction.current) return;
    const count = nhlDraftCapital(lg.teams[team]);
    if (count == null) { setSaveError(true); return; }
    draftAction.current = true;
    const cls = /* Round 211: the class is drawn against every name already in the
       league, so a prospect cannot arrive sharing a name with a man on a
       roster or in the market. */
    nhlDraftClass(Math.random, Math.max(24, count + 10), leagueNames(lg));
    setDraftClass(cls); setPicksLeft(count); setDraftBatchesLeft(2); setDraftNight(null); setPhase('draft');
    persist({ ...patch, phase: 'draft', draftClass: cls, picksLeft: count, draftBatchesLeft: 2 }, lg, team);
  };

  const startDraft = () => {
    if (!league) return;
    openDraft(league, myTeam);
  };

  const draftPick = (id: string) => {
    if (!league || !draftClass || picksLeft <= 0 || draftAction.current) return;
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    const pr = draftClass.find(p => p.id === id);
    if (!pr) return;
    const mine = lg.teams[myTeam];
    if (draftBatchesLeft === null && mine.picks.length > picksLeft) mine.picks = mine.picks.slice(-picksLeft);
    const pickRound = mine.picks[0];
    if (!nhlConsumeDraftPick(mine)) return;
    draftAction.current = true;
    const drafted = nhlProspectToPlayer(pr, Math.random, lg.ratingModelVersion);
    /* Round 987: with the desk on he signs the rules' entry level deal. */
    if (gm) nhlSignDraftee(drafted);
    mine.players.push(drafted);
    /* Round 987: the re-sign desk learns he is a draft pick on an entry level
       deal, so he comes up restricted when it runs out. */
    const deskNow = gm ? nhlNoteArrivals(gm, lg, myTeam, [drafted.id], 'draft', pickRound) : null;
    if (deskNow) setGm(deskNow);
    const remaining = draftClass.filter(p => p.id !== id);
    /* Round 515: the rival picks were applied and thrown away, so real
       decisions the engine made happened where nobody could see them.
       Captured here for the reveal, from the same objects the engine used. */
    const rivalPicks: { team: string; playerName: string; pos: string; grade: number }[] = [];
    const beforeBatches = draftBatchesLeft ?? Math.min(2, picksLeft);
    const nextPicks = Math.min(picksLeft - 1, mine.picks.length);
    const batchCount = nextPicks === 0 ? beforeBatches : Math.min(1, beforeBatches);
    let aiRemaining = remaining;
    for (let batch = 0; batch < batchCount; batch++) {
      const order = nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);
      const aiDraft = nhlAiDraftPicks(lg, aiRemaining, order, Math.random);
      aiRemaining = aiDraft.remaining;
      for (const { team, prospect } of aiDraft.picks) {
        rivalPicks.push({ team, playerName: prospect.name, pos: String(prospect.pos), grade: gradeOf(prospect) });
      }
    }
    const nextClass = aiRemaining;
    /* Round 530: every pick builds its reveal, the last one included. Round
       519 had named the final pick as not narrated: it left for the hub in
       this same handler, so its card never reached a render. The screen now
       stays on the draft after the last pick (no setPhase below) and leaves
       when the player presses Continue under the card. The offseason still
       runs right here, in the same order, drawing the same randomness. */
    setDraftNight(buildDraftNight(
      { team: myTeam, playerName: pr.name, pos: String(pr.pos), grade: gradeOf(pr) },
      rivalPicks,
    ));
    setDraftClass(nextClass); setPicksLeft(nextPicks); setDraftBatchesLeft(beforeBatches - batchCount);
    setFeed(f => [`📥 Drafted ${pr.name} (${pr.pos}), true rating ${pr.trueOvr} vs scouted ${gradeOf(pr)}.`, ...f].slice(0, 6));
    if (nextPicks <= 0) {
      finishDraft(lg, deskNow);
      return;
    }
    setLeague(lg);
    persist({ draftClass: nextClass, picksLeft: nextPicks, draftBatchesLeft: beforeBatches - batchCount }, lg, myTeam);
  };

  const finishDraft = (lg: NhlLeague, deskNow: GmDesk | null = gm) => {
      /* Round 987: with the desk on, the summer runs through the re-sign
         desk: nobody of yours leaves on the engine's coin flip. */
      let notes: string[];
      let deskAfter = deskNow;
      if (deskNow) {
        const summer = nhlDeskOffseason(lg, deskNow, myTeam, Math.random);
        if (!summer.ok) { setFeed(f => [...summer.lines, ...f].slice(0, 6)); return; }
        deskAfter = summer.desk;
        notes = [...summer.lines, ...summer.notes];
        setGm(deskAfter);
      } else notes = nhlOffseason(lg, Math.random, myTeam);
      setWaiverReceipt(null);
      /* Round 180: ownership re-reads the roster and sets next season's ask. */
      /* Round 192: what you said at the podium tilts the ask, then the
         tilt is spent. */
      const m = mandateFor(lg, myTeam, champion === myTeam, pressTilt);
      setMandate(m);
      setFeed([
        `🏛️ The new mandate: ${m.text}`,
        ...(pressTilt === 1 ? ['🎙️ Your season-end answer raised the bar upstairs.']
          : pressTilt === -1 ? ['🎙️ Your ask for patience was heard. The bar sits softer.'] : []),
        ...notes,
      ].slice(0, 6));
      setPressTilt(0); setSeasonTradeLine(null);
      setSeries([]); setChampion(''); setWonNow(false);
      /* Round 530: the phase stays 'draft' so the last pick's card is seen;
         leaveDraft moves it on. The save says 'hub' as it always did, so a
         reload skips the reveal and opens where it opened before. */
      setFeedSlam(null); setTab(null);
      setLeague(lg);
      setPicksLeft(0); setDraftBatchesLeft(0);
      persist({ phase: 'hub', draftClass: null, picksLeft: 0, draftBatchesLeft: 0, mandate: m, pressTilt: 0, seasonTradeLine: null, postseason: null }, lg, myTeam);
  };

  const draftWithoutPicks = () => {
    if (!league || !draftClass || (picksLeft > 0 && league.teams[myTeam].picks.length > 0) || draftAction.current) return;
    draftAction.current = true;
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    if (draftBatchesLeft === null && picksLeft === 0 && lg.round === 1 && lg.champions.some(c => c.season === lg.season - 1)) {
      setDraftBatchesLeft(0);
      persist({ phase: 'hub', draftClass: null, picksLeft: 0, draftBatchesLeft: 0 }, lg, myTeam);
      leaveDraft();
      return;
    }
    if (draftBatchesLeft === null && picksLeft === 0) lg.teams[myTeam].picks = [];
    const batches = draftBatchesLeft ?? Math.min(2, picksLeft);
    let remaining = draftClass;
    const rivalPicks: { team: string; playerName: string; pos: string; grade: number }[] = [];
    for (let batch = 0; batch < batches; batch++) {
      const order = nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== myTeam);
      const resolved = nhlAiDraftPicks(lg, remaining, order, Math.random);
      remaining = resolved.remaining;
      rivalPicks.push(...resolved.picks.map(({ team, prospect }) => ({ team, playerName: prospect.name, pos: String(prospect.pos), grade: gradeOf(prospect) })));
    }
    setDraftClass(remaining); setDraftNight(buildDraftNight(null, rivalPicks));
    finishDraft(lg);
  };

  const replaceDraftBoard = () => {
    if (!league || !draftClass || draftClass.length > 0 || picksLeft <= 0 || draftAction.current) return;
    draftAction.current = true;
    const cls = nhlDraftClass(Math.random, Math.max(24, picksLeft + 10), leagueNames(league));
    setDraftClass(cls); persist({ draftClass: cls }, league, myTeam);
  };

  /* Round 530: the Continue button under the final pick's card. Nothing to
     persist: the last pick already wrote the hub. */
  const leaveDraft = () => {
    if (draftBatchesLeft === null && picksLeft === 0 && league?.round === 1) {
      if (draftAction.current) return;
      draftAction.current = true;
      persist({ phase: 'hub', draftClass: null, picksLeft: 0, draftBatchesLeft: 0 }, league, myTeam);
    }
    setPhase('hub');
    setTab(null);
  };

  const doRelease = (pid: string) => {
    if (!league || waiverCommit.current === league) return;
    setCutArmed(null);
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    const team = lg.teams[myTeam], player = team.players.find(p => p.id === pid);
    if (!player) return;
    const rosterBefore = team.players.length, capBefore = nhlCapRoom(team, lg.cap);
    if (nhlRelease(team, lg.freeAgents, pid, lg.ratingModelVersion)) {
      waiverCommit.current = league;
      const rows = Array.from(rosterRows.current?.children ?? []);
      waiverFocus.current = { opener: document.activeElement, index: Math.max(0, rows.findIndex(row => (row as HTMLElement).dataset.rosterRow === pid)) };
      setLeague(lg); persist({}, lg, myTeam);
      setWaiverReceipt({ id: ++waiverSequence.current, playerName: player.name,
        rosterBefore, rosterAfter: team.players.length, capBefore, capAfter: nhlCapRoom(team, lg.cap),
        deadMoneyAfter: deadCapUsed(team) });
    }
  };
  const changeContributors = (value: NhlContributors | null): boolean => {
    if (!league || contributorCommit.current === league) return false;
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    const changed = value === null ? nhlResetContributors(lg.teams[myTeam]) : nhlSetContributors(lg.teams[myTeam], value);
    if (!changed) return false;
    contributorCommit.current = league;
    setLeague(lg); persist({}, lg, myTeam);
    return true;
  };
  const doSign = (pid: string) => {
    if (!league) return;
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    if (nhlSign(lg.teams[myTeam], lg.freeAgents, pid, lg.cap, lg.ratingModelVersion)) {
      /* Round 530: the signing lands in the feed as a slam. The man and the
         number are read off the roster he just joined, so the line can only
         say what the engine did. */
      const signed = lg.teams[myTeam].players.find(p => p.id === pid);
      if (signed) slamFeed(`✍️ ${signed.name} (${signed.pos}) signs, $${signed.salary}M a year.`);
      const deskNow = gm ? nhlNoteArrivals(gm, lg, myTeam, [pid], 'signing') : null;
      if (deskNow) setGm(deskNow);
      setLeague(lg); persist({}, lg, myTeam);
    }
  };
  /* Round 190: the direct deal is a phone call now. The instant verdict
     that lived here is exactly the three-button haggle the owner banned
     from Club Manager, so the same negotiation engine answers instead. */
  const talksArgsFor = (partner: string, myPieceId: string, wantId: string) => {
    if (!league) return null;
    const mySide = league.teams[myTeam];
    const their = league.teams[partner];
    const mine = mySide.players.find(p => p.id === myPieceId);
    const want = their.players.find(p => p.id === wantId);
    if (!mine || !want) return null;
    return {
      mine, want, theirRoster: their.players,
      myPickCount: mySide.picks.length, pickValue: 12, value: nhlTradeValue,
      theirCoverAtMyPos: their.players.filter(p => p.pos === mine.pos && p.ovr >= mine.ovr - 2).length,
      openPremium: 1.07,
    };
  };
  /* Round 987: with the desk on, every trade path asks the deadline first. */
  const deadlineBlock = (): boolean => {
    const why = gm && league ? nhlDeadlineRefusal(league) : null;
    if (why) setFeed(f => [`🔒 ${why}`, ...f].slice(0, 6));
    return !!why;
  };
  /* Round 987: an old trade path with the desk on. The pick it moved (the
     last on the list) moves in the ledger too, and the man who came in is
     written down as a trade. */
  const deskAfterTrade = (lg: NhlLeague, partner: string, arrivedId: string, pickRound: number | null): GmDesk | null => {
    if (!gm) return null;
    let d = gm;
    if (pickRound !== null) {
      const ledger = nhlMirrorPickMove(nhlPicksOf(d, lg), myTeam, partner, pickRound, lg.season);
      d = withGmBlock(d, NHL_DESK_KEYS.picks, ledger);
      syncNhlPicks(lg, ledger);
    }
    return nhlNoteArrivals(d, lg, myTeam, [arrivedId], 'trade');
  };
  const lastPickRound = (lg: NhlLeague, moving: boolean): number | null => {
    const list = lg.teams[myTeam].picks;
    return moving && list.length ? list[list.length - 1] : null;
  };
  const openTradeTalks = (theirPid: string) => {
    if (!tradePartner || !myTradePiece || deadlineBlock()) return;
    const args = talksArgsFor(tradePartner, myTradePiece, theirPid);
    if (!args) return;
    setTalks({ state: openTalks(args), partner: tradePartner, myPieceId: myTradePiece, wantId: theirPid });
  };
  const standFirmTalks = () => {
    if (!talks) return;
    const args = talksArgsFor(talks.partner, talks.myPieceId, talks.wantId);
    if (!args) return;
    setTalks({ ...talks, state: standFirm(talks.state, args, Math.random) });
  };
  const acceptTalks = () => {
    if (!league || !talks || !talks.state.pkg) return;
    if (deadlineBlock()) { setTalks(null); return; }
    const pkg = talks.state.pkg;
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    const pickRound = lastPickRound(lg, pkg.addPick);
    const res = nhlExecuteTalksTrade(lg.teams[myTeam], lg.teams[talks.partner], talks.myPieceId, pkg.theirPlayerId, pkg.addPick, lg.cap);
    if (res === 'done') {
      slamFeed(`🤝 Deal done with ${label(talks.partner)}: ${pkg.theirPlayerName} arrives${pkg.addPick ? ', and a pick goes the other way' : ''}.`);
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      /* Round 192: the room remembers the season's headline deal. */
      const line = `the deal that brought ${pkg.theirPlayerName} in`;
      setSeasonTradeLine(line);
      const deskNow = deskAfterTrade(lg, talks.partner, pkg.theirPlayerId, pickRound);
      if (deskNow) setGm(deskNow);
      setLeague(lg); persist({ seasonTradeLine: line }, lg, myTeam);
    } else {
      setFeed(f => ['❌ The agreed deal no longer fits (cap or roster rules).', ...f].slice(0, 6));
    }
    setTalks(null);
  };

  // Round 82: shop a player league-wide with the real trade rules
  const doShop = () => {
    if (!league || !myTradePiece || deadlineBlock()) return;
    const offers = findTrades(league.teams, myTeam, myTradePiece, league.cap, nhlTrade, nhlTradeValue);
    setShopOffers(offers); setShopTried(true);
  };
  const acceptShopOffer = (o: FinderOffer) => {
    if (!league || !myTradePiece || deadlineBlock()) return;
    const lg: NhlLeague = JSON.parse(JSON.stringify(league));
    const pickRound = lastPickRound(lg, o.sweeten);
    const res = nhlTrade(lg.teams[myTeam], lg.teams[o.teamId], myTradePiece, o.playerId, o.sweeten, lg.cap);
    if (res === 'accepted') {
      slamFeed(`🤝 Trade finder deal done with ${label(o.teamId)}: ${o.playerName} arrives.`);
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      /* Round 192: the room remembers the season's headline deal. */
      const line = `the deal that brought ${o.playerName} in`;
      setSeasonTradeLine(line);
      const deskNow = deskAfterTrade(lg, o.teamId, o.playerId, pickRound);
      if (deskNow) setGm(deskNow);
      setLeague(lg); persist({ seasonTradeLine: line }, lg, myTeam);
    } else {
      setFeed(f => ['❌ That offer went stale, shop him again.', ...f].slice(0, 6));
      setShopOffers([]); setShopTried(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setWaiverReceipt(null);
    setPhase('pick'); setLeague(null); setMyTeam('');
    setMandate(null); setTrust(FO_TRUST_START); setFired(false); setGradeLine(null);
    setPresser(null); setPressTilt(0); setSeasonTradeLine(null);
    setGm(null); setGmOpen(null);
  };

  /* Round 987: the desk boxes. The first tap on one, on a save from before
     the desk, switches it on: the ledgers are opened from the league as it
     stands (every pick on the old lists kept) and saved with it. */
  const openDesk = (key: string | null) => {
    if (key !== null && !gm && league) {
      const desk = openNhlDesk(league, myTeam);
      const lg: NhlLeague = JSON.parse(JSON.stringify(league));
      syncNhlPicks(lg, nhlPicksOf(desk, lg));
      setGm(desk); setLeague(lg);
      persist({}, lg, myTeam);
    }
    setGmOpen(key);
  };
  const changeDesk = (next: GmDesk) => {
    setGm(next);
    persist({}, league, myTeam);
  };
  const deskFacts = (hub: NhlDeskFacts['hub']): NhlDeskFacts | null => league ? {
    teamId: myTeam, teamLabel: label(myTeam), seasonsPlayed, phase, hub, league,
    seasonOver: phase === 'recap', deskOn: gm !== null, clubName: label,
    say: line => setFeed(f => [line, ...f].slice(0, 6)),
    commit: (lg, desk, line) => {
      setGm(desk); setLeague(lg); slamFeed(line);
      persist({}, lg, myTeam);
    },
  } : null;

  if (phase === 'pick' || !league || !my) {
    return (
      <div className="space-y-4">
        {saveError && (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-4 text-sm">
            <p>We couldn&apos;t open this save. Pick a team to start a new franchise. Your old save stays here until you pick a team or delete it.</p>
            <button onClick={() => { localStorage.removeItem(SAVE_KEY); setSaveError(false); }} className="mt-3 rounded-lg border border-border px-3 py-2 font-semibold hover:border-primary">Delete unusable save</button>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Take over an NHL front office</p>
          <p className="mt-1 text-xs text-muted-foreground">
            A curated roster snapshot with original simulation ratings. Work
            under the hard cap, chase points over an 80 game season, then the divisional
            bracket: sixteen teams, four best-of-7 rounds, one Cup. Saves automatically.
          </p>
        </div>
        {starting && <p role="status" className="text-center text-xs text-muted-foreground">Loading opening ratings...</p>}
        {startError && <p role="alert" className="text-center text-xs text-destructive">{startError}</p>}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {NHL_TEAMS.map(t => (
            <button key={t.id} disabled={starting} onClick={() => void start(t.id)} className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60 disabled:opacity-40">
              <span className="block h-1.5 w-full rounded-full" style={{ background: t.color }} />
              <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{t.city} {t.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{EASTERN.includes(t.id) ? 'Eastern' : 'Western'}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const room = nhlCapRoom(my, league.cap);
  const strength = Math.round(nhlStrength(my));

  /* Round 204: the facts each box carries, decided in src/lib/foHub.ts so
     the wording is harnessed rather than eyeballed. Eight of each
     conference make the playoffs, which is the real format and the cut the
     table box warns about. Round 987: built here, above the recap, because
     the recap mounts the re-sign desk too. */
  const myConfName = EASTERN.includes(myTeam) ? 'East' : 'West';
  const confTable = nhlFoStandings(league, EASTERN.includes(myTeam) ? EASTERN : WESTERN);
  const hubFacts: NhlDeskFacts['hub'] = {
    roster: my.players.map(p => ({ name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
    freeAgents: league.freeAgents.map(p => ({ id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
    capRoom: room,
    /* Round 631: the box offers only men the sign path would take. */
    ledger: my,
    rosterMax: NHL_ROSTER_MAX,
    wins: my.wins,
    losses: my.losses,
    period: league.round,
    periods: NHL_FO_ROUNDS,
    playWord: 'Play',
    periodWord: 'round',
    /* A round here is a stretch of the whole league, not one fixture. */
    hasFixtures: false,
    nextOpponent: null,
    lastResult: null,
    place: confTable.findIndex(x => x.abbr === myTeam) + 1,
    cut: 8,
    tableName: myConfName,
    tradeLine: seasonTradeLine,
    titles,
  };

  /* ---------------- Round 180: the reload path after a firing ---------------- */
  if (phase === 'fired') {
    return (
      <div className="space-y-4">
        {/* Round 187: the door shuts with one honest shake, nothing more. */}
        <div className="cm-loss-shake rounded-2xl border border-destructive/50 bg-card p-5 text-center">
          <CelebrationStyles />
          <p className="text-3xl">🪑</p>
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.1s' }}>Fired by {label(myTeam)}</p>
          <p className="cm-rise mt-2 text-sm text-muted-foreground" style={{ animationDelay: '0.35s' }}>{firedLine(seasonsPlayed, titles)}</p>
          <button onClick={reset} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
            <RotateCcw className="h-4 w-4" /> Take another front office
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'recap') {
    const cup = series.find(s => s.name === 'Stanley Cup Final');
    const myConf = EASTERN.includes(myTeam) ? 'East' : 'West';
    const myRank = nhlFoStandings(league, EASTERN.includes(myTeam) ? EASTERN : undefined)
      .filter(x => EASTERN.includes(myTeam) ? true : !EASTERN.includes(x.abbr))
      .findIndex(x => x.abbr === myTeam) + 1;
    /* Round 187: the verdict curtain. Every string below is exactly what
       Round 180 wrote; stageVerdict only decides confetti and tone. */
    const staging = stageVerdict({ iAmChampion: champion === myTeam, fired });
    /* Round 987: the season is over and the summer runs after the draft, so
       the re-sign desk is a box here, under the verdict. Open, it takes the
       screen, with a back button to the recap. */
    const recapDesk = gm && !fired ? deskFacts(hubFacts) : null;
    if (gm && recapDesk && gmPanelFor(NHL_RECAP_PANELS, gmOpen)) {
      return (
        <div className="space-y-4">
          <GmDeskMount sport="nhl" desk={gm} facts={recapDesk} panels={NHL_RECAP_PANELS} open={gmOpen} onOpen={openDesk} onDesk={changeDesk} />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div
          data-verdict-reveal
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-card p-5 text-center',
            staging.cardTone === 'fired' ? 'border-destructive/50' : 'border-gold/50',
            staging.cardTone === 'title' && 'cm-win-pulse',
          )}
        >
          <CelebrationStyles />
          {staging.confetti && <ConfettiBurst seed={13} count={34} />}
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.05s' }}>{label(champion)} lift the {league.season + 1} Stanley Cup</p>
          <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '0.3s' }}>
            {champion === myTeam
              ? 'Your roster. Your Cup. Start the parade.'
              : `Your ${label(myTeam)} finished ${my.wins}-${my.losses}-${my.otLosses} (${nhlPoints(my)} pts), No. ${myRank} in the ${myConf}.`}
          </p>
          {/* Round 180: ownership's verdict on the mandate. */}
          {gradeLine && (
            <p className={cn('cm-slam mt-2 text-sm font-bold', fired ? 'text-destructive' : 'text-gold')} style={{ animationDelay: '0.5s' }}>{gradeLine}</p>
          )}
          {mandate && !fired && (
            <p className="cm-rise mt-1 text-[11px] text-muted-foreground" style={{ animationDelay: '0.7s' }}>Trust upstairs: {trust} of 100{trust <= 25 ? '. The seat is hot.' : '.'}</p>
          )}
          {cup && (
            <p className="cm-tick-in mt-2 text-xs text-muted-foreground" style={{ animationDelay: '0.8s' }}>
              Cup Final: {label(cup.winner)} beat {label(cup.winner === cup.home ? cup.away : cup.home)} {Math.max(cup.homeWins, cup.awayWins)}-{Math.min(cup.homeWins, cup.awayWins)}
            </p>
          )}
          <div className="cm-rise mt-2 max-h-40 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground" style={{ animationDelay: '0.95s' }}>
            {series.filter(s => s.name !== 'Stanley Cup Final').map((s, i) => (
              <p key={i}>{s.name}: {label(s.winner)} {s.winner === s.home ? s.homeWins : s.awayWins}-{s.winner === s.home ? s.awayWins : s.homeWins}</p>
            ))}
          </div>
          <div className="cm-rise mt-3 flex items-center justify-center gap-3 text-sm" style={{ animationDelay: '1.2s' }}>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Cups <b className="text-gold">{titles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{seasonsPlayed}</b></span>
          </div>
          {/* Round 180: zero trust ends the save here instead of a draft. */}
          {fired ? (
            <div className="cm-loss-shake mt-4 rounded-2xl border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm font-bold text-destructive">🪑 {firedLine(seasonsPlayed, titles)}</p>
              <button onClick={reset} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <RotateCcw className="h-4 w-4" /> Take another front office
              </button>
            </div>
          ) : presser ? (
            /* Round 192: the room stands between the season and the draft.
               Answer it (or reload, which ends the scrum) to move on. */
            <div className="cm-rise mt-4 text-left" style={{ animationDelay: '1.35s' }}>
              {/* Round 530: the wrapper lands first and the card's own rise runs
                  from the same mark, so the box and its content arrive together. */}
              <GmPressCard presser={presser} onAnswer={answerPress} delay={1.35} />
            </div>
          ) : (
            <div className="cm-rise mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: '1.35s' }}>
              <button onClick={startDraft} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Briefcase className="h-4 w-4" /> Go to the draft
              </button>
              <ShareButtons
                gameName="NHL Front Office"
                gamePath="/nhl-front-office"
                score={`${titles} Cups in ${seasonsPlayed} seasons`}
                customText={`NHL Front Office 🏒 ${champion === myTeam ? `My ${label(myTeam)} just won the Cup!` : `${label(champion)} lifted the Cup.`} ${titles} Cups in ${seasonsPlayed} seasons. douknowball.com/nhl-front-office`}
              />
            </div>
          )}
        </div>
        {gm && recapDesk && (
          <GmDeskMount sport="nhl" desk={gm} facts={recapDesk} panels={NHL_RECAP_PANELS} open={gmOpen} onOpen={openDesk} onDesk={changeDesk} />
        )}
      </div>
    );
  }

  if (phase === 'draft' && draftClass) {
    /* Round 530: after the last pick the offseason has run and the season
       has rolled, so the heading reads the season as it stands rather than
       one on from it, and the board is put away: no picks, no grid, just the
       card and its Continue button. */
    const draftDone = picksLeft <= 0 && (draftBatchesLeft === 0 || (draftBatchesLeft === null && league.round === 1));
    const availablePicks = Math.min(picksLeft, my.picks.length);
    const noCapital = availablePicks <= 0;
    return (
      <div className="space-y-4">
        <CelebrationStyles />
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">The {draftDone ? league.season : league.season + 1} Draft</p>
          {draftDone ? (
            <p className="mt-1 text-xs text-muted-foreground">
              That is your draft done. The offseason has run and the new season is set up on the hub.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              You hold <b className="text-gold">{availablePicks}</b> pick{availablePicks === 1 ? '' : 's'}. {gm ? "Grades are your scouting director's read, and a better one misses by less." : 'Scout grades carry error.'}
            </p>
          )}
        </div>
        {draftNight && <DraftNightCard night={draftNight} onContinue={draftDone ? leaveDraft : undefined} />}
        {draftDone && !draftNight?.picks.length && <button onClick={leaveDraft} className="min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Continue to the hub</button>}
        {!draftDone && noCapital && <button onClick={draftWithoutPicks} className="min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Finish the draft and offseason</button>}
        {!draftDone && !noCapital && draftClass.length === 0 && <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground"><p>No prospects remain on this saved board. Generate another board to use your remaining picks.</p><button onClick={replaceDraftBoard} className="mt-2 min-h-11 w-full rounded-full bg-primary px-4 py-2.5 font-bold text-primary-foreground">Generate remaining prospects</button></div>}
        {!draftDone && !noCapital && <div className="grid max-h-96 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {/* Round 987: with the desk on, the board is your scout's, in his order. */}
          {(gm ? [...draftClass].sort((a, b) => gradeOf(b) - gradeOf(a) || a.id.localeCompare(b.id)) : draftClass).slice(0, 14).map(pr => (
            <button key={pr.id} onClick={() => draftPick(pr.id)} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/60">
              <span>
                <span className="block text-sm font-bold text-foreground">{pr.name}</span>
                <span className="block text-[10px] text-muted-foreground">{pr.pos} · age {pr.age}</span>
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-sm font-black text-primary">{gradeOf(pr)}</span>
            </button>
          ))}
        </div>}
        {feed.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {/* Keyed on the pick count so each pick's news ticks in, and on the
                season so the offseason lines after the last pick do too. */}
            {feedRows(feed.slice(0, 4), `${league.season}:d${picksLeft}`)}
          </div>
        )}
      </div>
    );
  }

  const t = NHL_TEAM_MAP.get(myTeam)!;

  const tiles = foHubTiles(hubFacts);
  /* Round 987: the desk's boxes sit under the board's own; a desk panel open hides the board's boxes. */
  const hubDesk = deskFacts(hubFacts);
  const deskPanelOpen = gmPanelFor(NHL_DESK_PANELS, gmOpen) !== null;
  const openPanel = (key: FoPanelKey) => { setCutArmed(null); setContributorsOpen(false); setGmOpen(null); setTab(key === 'play' ? 'round' : key); };
  /* Round 631: dead money on the cap line, only when there is any. */
  const dead = deadCapUsed(my);
  /* Round 631: at the engine's floor every Waive waits, at its ceiling every Sign does, and both say why. */
  const cutBlock = cutRefusal(my, NHL_ROSTER_MIN);
  const fullBlock = rosterFullRefusal(my, NHL_ROSTER_MAX);
  const overLimit = Math.max(0, my.players.length - NHL_ROSTER_MAX);
  const panelTitle = tiles.find(x => (x.key === 'play' ? 'round' : x.key) === tab)?.title ?? '';

  return (
    <div ref={waiverBoard} className="space-y-4">
      <CelebrationStyles />
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full px-3 py-1 font-bold text-white" style={{ background: t.color }}>{label(myTeam)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{league.season}-{(league.season + 1) % 100} · Round {league.round}/{NHL_FO_ROUNDS}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}-{my.otLosses}</b> · <b className="text-primary">{nhlPoints(my)} pts</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
        <span className={cn('rounded-full border border-border bg-card px-3 py-1', room < 3 ? 'text-destructive' : 'text-muted-foreground')}>Cap space <b>${room}M</b></span>
      </div>

      {overLimit > 0 && <div data-roster-limit role="status" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs space-y-2">
        <p>Your roster has {my.players.length} players, {overLimit} over this simulation's limit of {NHL_ROSTER_MAX}. Waive {overLimit === 1 ? 'one player' : `${overLimit} players`} before you play. Waivers keep the usual dead money costs.</p>
        {tab !== 'team' && <button onClick={() => openPanel('team')} className="min-h-11 rounded-full border border-border bg-card px-4 py-2 font-bold">Open roster</button>}
      </div>}

      <NhlWaiverReceipt event={waiverReceipt} fallbackFocus={() => waiverBoard.current?.querySelector<HTMLButtonElement>('button:not(:disabled):not([data-nhl-waiver-dismiss])') ?? null} />

      {/* Round 180: the owner card, always visible on the hub. The cut is the
          top 8 of my conference by points, the same read the bracket uses. */}
      {mandate && (
        <OwnerMandateCard
          mandate={mandate}
          trust={trust}
          pace={league.round > 1 && league.round <= NHL_FO_ROUNDS
            ? mandatePace(mandate, my.wins, (league.round - 1) / NHL_FO_ROUNDS,
                nhlFoStandings(league, EASTERN.includes(myTeam) ? EASTERN : WESTERN).slice(0, 8).some(x => x.abbr === myTeam))
            : null}
        />
      )}

      {/* Round 192: the introduction presser waits on the hub until answered. */}
      {presser && <GmPressCard presser={presser} onAnswer={answerPress} />}

      {/* Round 204: boxes, not pills. Each one already tells you the thing
          you used to have to tap to find out. */}
      {tab === null
        ? !deskPanelOpen && <FoHubTiles tiles={tiles} onOpen={openPanel} />
        : <FoPanelHeader title={panelTitle} onBack={() => setTab(null)} />}
      {tab === null && hubDesk && (
        <GmDeskMount sport="nhl" desk={gm ?? readGmDesk(undefined)} facts={hubDesk} panels={NHL_DESK_PANELS}
          open={gmOpen} onOpen={openDesk} onDesk={changeDesk} />
      )}

      {feed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {feedRows(feed.slice(0, 5), `${league.season}:r${league.round}`)}
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          {contributorsOpen ? <ContributorPicker team={my} onApply={value => changeContributors(value)} onAuto={() => changeContributors(null)} onBack={() => { contributorReturn.current = true; setContributorsOpen(false); }} /> : <>
          <button ref={contributorsOpener} type="button" data-nhl-open-contributors onClick={() => setContributorsOpen(true)} className={cn(contributorsStyles.action, 'mb-3 w-full rounded-lg border border-border px-3 text-xs font-semibold')}>Choose simulation contributors</button>
          <p className="mb-2 text-center text-xs text-muted-foreground">
            Cap hit ${nhlCapUsed(my)}M of the ${league.cap}M ceiling
            {dead > 0 && <> · dead money <b className="text-destructive">${dead}M</b></>}
          </p>
          <p className="mb-2 text-center text-[10px] text-muted-foreground">{capNote()}</p>
          <p data-rating-legend className="mb-3 text-[10px] text-muted-foreground">
            OVR, potential and contracts are simulation values. The player list stays at its roster snapshot.
            {league.ratingModelVersion === NHL_RATING_MODEL_VERSION
              ? ' Opening estimates use 2024-25 and 2025-26 regular-season inputs: forwards measure offensive production, defensemen use offense and usage proxies, and goalies use save-rate proxies. The e marker means limited evidence. These do not measure every skill. Later ratings come from this saved simulation.'
              : ' This franchise keeps its saved grades, contracts and development.'}
          </p>
          {cutBlock && <p data-cut-block className="mb-2 text-center text-[10px] text-destructive">{cutBlock}</p>}
          <div ref={rosterRows} tabIndex={-1} role="group" aria-label="Roster players" className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => {
              /* Round 631: the cost is on screen before the second tap. */
              const cost = deadMoneyFor(p);
              const arming = cutArmed === p.id;
              return (
              <div key={p.id} data-roster-row={p.id} className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between">
                <span className="min-w-0">
                  <span className={cn('block truncate font-bold', p.out > 0 ? 'text-destructive' : 'text-foreground')}>{p.name} {p.out > 0 ? `(out ${p.out}r)` : ''}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · ${p.salary}M x{p.years}</span>
                  {ratingNote(p)}
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <b className="text-primary">{p.ovr}{ratingMarker(p)}</b>
                  <button
                    onClick={() => setCutArmed(arming ? null : p.id)}
                    disabled={!!cutBlock}
                    title={cutBlock ?? `Waive him and $${cost.now}M stays on this season's cap`}
                    className={cn('min-h-11 rounded-full border border-border px-2 py-0.5 text-[10px] disabled:opacity-40',
                      arming ? 'text-foreground' : 'text-muted-foreground hover:border-destructive hover:text-destructive')}
                  >
                    {arming ? 'Keep' : `Waive, $${cost.now}M dead`}
                  </button>
                </span>
                </div>
                {arming && (
                  <div className="mt-1.5 rounded-lg border border-destructive/50 bg-destructive/10 p-2 space-y-1.5" data-cut-confirm>
                    <p className="text-[10px] text-foreground">
                      Waive {p.name}? ${cost.now}M of his ${p.salary}M stays on this season's cap as dead money
                      {cost.next > 0 ? `, and $${cost.next}M lands on next season's` : ''}. He goes to the pool and you cannot sign him back until the offseason.
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => doRelease(p.id)}
                        className="min-h-11 flex-1 rounded-lg bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground hover:opacity-90"
                      >
                        Waive him
                      </button>
                      <button
                        onClick={() => setCutArmed(null)}
                        className="min-h-11 flex-1 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-foreground hover:opacity-90"
                      >
                        Keep him
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
          </>}
        </div>
      )}

      {tab === 'market' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">Free agents (cap space ${room}M). A man you waived waits until next season.</p>
          {fullBlock && <p data-sign-block className="mb-2 text-center text-[10px] text-destructive">{fullBlock}</p>}
          <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 20).map(p => {
              /* Round 631: the engine's own refusal, so the button is never
                 live when pressing it would do nothing. */
              const refusal = signRefusal(my, p.id, CUT_SAID);
              const ask = league.ratingModelVersion === NHL_RATING_MODEL_VERSION ? nhlSalaryFor(p.ovr, league.ratingModelVersion) : p.salary;
              return (
              <div key={p.id} data-fa-row={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · wants ${ask}M</span>
                  {ratingNote(p)}
                  {refusal && <span className="block text-[10px] text-destructive">{refusal}</span>}
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <b className="text-primary">{p.ovr}{ratingMarker(p)}</b>
                  <button onClick={() => doSign(p.id)} disabled={ask > room || !!refusal || !!fullBlock} title={refusal ?? fullBlock ?? undefined} className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-40">Sign</button>
                </span>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'trade' && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          {/* Round 987: with the desk on, the deadline shuts this screen too. */}
          {gm && nhlDeadlineRefusal(league) && <p data-nhl-deadline className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-center text-xs font-semibold">🔒 {nhlDeadlineRefusal(league)}</p>}
          {gm && !nhlDeadlineRefusal(league) && <p data-nhl-deadline className="text-center text-[11px] text-muted-foreground">Trade deadline: the break after round {nhlTradeWindow(league).deadlineAfter} is the last chance, and deals shut once round {nhlTradeWindow(league).deadlineAfter + 1} is played. Packages with picks and retained salary are on the Trade desk box.</p>}
          {/* Round 82: Trade Finder, shop a player and let the league bid */}
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-2.5 space-y-2">
            <p className="text-center text-[11px] font-bold text-foreground">🔍 Trade Finder</p>
            <p className="text-center text-[10px] text-muted-foreground">Pick one of your players and shop him. Only deals the AI genuinely accepts show up, cap checked.</p>
            {/* Round 897: every man, not the top 8 (a club's goalies sat outside the
                cut), in a list that scrolls inside the card, as on the NBA board. */}
            <div data-trade-shop-list className="grid max-h-60 grid-cols-2 gap-1 overflow-y-auto">
              {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => (
                <button key={p.id} onClick={() => { setMyTradePiece(p.id); setShopOffers([]); setShopTried(false); }} className={cn('flex items-center justify-between rounded-lg border px-2 py-1 text-[11px]', myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background')}>
                  <span className="min-w-0 text-left"><span className="block truncate text-foreground">{p.name} ({p.pos})</span>{ratingNote(p)}</span><b className="shrink-0 text-primary">{p.ovr}{ratingMarker(p)}</b>
                </button>
              ))}
            </div>
            <button onClick={doShop} disabled={!myTradePiece} className="w-full rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40">
              Shop him around the league
            </button>
            {shopTried && shopOffers.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground">📵 Nobody bit. Shop a better player or build a deal yourself below.</p>
            )}
            {shopOffers.map(o => (
              <div key={o.teamId + o.playerId} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-[11px]">
                <span className="min-w-0">
                  <span className="block truncate text-foreground"><b>{o.teamId}</b> offer: {o.playerName} ({o.playerPos}) <b className="text-primary">{o.playerOvr}</b></span>
                  <span className="block text-[9px] text-muted-foreground">age {o.playerAge} · ${o.playerSalary}M{o.sweeten ? ' · costs one of your picks' : ''}</span>
                </span>
                <button onClick={() => acceptShopOffer(o)} className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold text-primary-foreground">Accept</button>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] font-bold uppercase text-muted-foreground pt-1">Or build your own deal</p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {NHL_TEAMS.filter(x => x.id !== myTeam).map(x => (
              <button key={x.id} onClick={() => setTradePartner(x.id)} className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', tradePartner === x.id ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
                {x.id}
              </button>
            ))}
          </div>
          {/* Round 190: an open call takes over the desk until it ends. */}
          {talks && (() => {
            const minePiece = my.players.find(p => p.id === talks.myPieceId);
            return minePiece ? (
              <TradeTalksCard
                talks={talks.state}
                partnerLabel={label(talks.partner)}
                mine={minePiece}
                onAccept={acceptTalks}
                onStandFirm={standFirmTalks}
                onWalkAway={() => setTalks(null)}
              />
            ) : null;
          })()}
          {tradePartner && !talks && (
            <>
              <p className="text-center text-[10px] text-muted-foreground">1. Pick who YOU send. 2. Tap who you want back and open talks. The other GM counters like a person: a pick to close the gap, a lesser man instead, or the dial tone.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-center text-[10px] font-bold uppercase text-muted-foreground">You send</p>
                  <div data-trade-send-list className="max-h-80 space-y-1 overflow-y-auto">
                  {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => (
                    <button key={p.id} onClick={() => setMyTradePiece(p.id)} className={cn('flex w-full items-center justify-between rounded-lg border px-2 py-1 text-[11px]', myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background')}>
                      <span className="min-w-0 text-left"><span className="block truncate text-foreground">{p.name} ({p.pos})</span>{ratingNote(p)}</span><b className="shrink-0 text-primary">{p.ovr}{ratingMarker(p)}</b>
                    </button>
                  ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-center text-[10px] font-bold uppercase text-muted-foreground">You get ({tradePartner})</p>
                  <div data-trade-get-list className="max-h-80 space-y-1 overflow-y-auto">
                  {[...league.teams[tradePartner].players].sort((a, b) => b.ovr - a.ovr).map(p => {
                    /* Round 631: the trade paths refuse a man you let go this season, so the screen says so. */
                    const back = tradeRefusal(my, p.id, CUT_SAID);
                    return (
                    <div key={p.id} data-trade-row={p.id} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px]">
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{p.name} ({p.pos}) <b className="text-primary">{p.ovr}{ratingMarker(p)}</b></span>
                        {ratingNote(p)}
                        {back && <span className="block text-[9px] text-destructive">{back}</span>}
                      </span>
                      <button onClick={() => openTradeTalks(p.id)} disabled={!myTradePiece || !!back} title={back ?? undefined} className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold text-primary-foreground disabled:opacity-40">Open talks</button>
                    </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'round' && (
        <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
          <p className="mb-2 text-sm text-foreground">Each round simulates a stretch of games across the league. OT losses still earn a point.</p>
          <button onClick={playRound} disabled={overLimit > 0} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40">
            <ShieldHalf className="h-4 w-4" /> {league.round >= NHL_FO_ROUNDS ? 'Final stretch + playoffs' : `Play Round ${league.round}`}
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">Top three per division plus two wild cards per conference make the divisional bracket. Every round is best-of-7.</p>
        </div>
      )}

      {tab === 'standings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {NHL_FO_DIVISIONS.map(div => (
              <div key={div.name}>
                <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{div.name}</p>
                {nhlFoStandings(league, div.teams).map((x, i) => (
                  <div key={x.abbr} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', x.abbr === myTeam ? 'bg-gold/10' : '')}>
                    <span className={cn(i < 3 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {i + 1}. {label(x.abbr)}
                    </span>
                    <span className="text-muted-foreground">{x.wins}-{x.losses}-{x.otLosses} · {nhlPoints(x)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Top three per division are in; the next two by points in each conference grab the wild cards.</p>
        </div>
      )}

      <div className="text-center">
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive">
          <RotateCcw className="h-3 w-3" /> Abandon franchise and restart
        </button>
      </div>
    </div>
  );
}
