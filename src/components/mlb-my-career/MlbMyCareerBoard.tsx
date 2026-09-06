import { useCallback, useEffect, useRef, useState } from 'react';
import { Crown, Dumbbell, RotateCcw, Sparkles } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import {
  MLB_ARCHETYPES, MLB_ERAS, startMlbCareer, simMlbSeason, mlbProgress, drawMlbEvent,
  MLB_SPEND_ITEMS, buyMlbItem, type MlbSpendCategory,
  mlbShouldRetire, mlbLegacyOf, mlbCareerTotals, mlbRollTeamQuality, mlbTeamLabelOf, mlbMarketSalary,
  buildMlbFaWindow, mlbFaPushArgs, buildMlbExtension, mlbExtPushArgs,
  mlbAssignRole, mlbCampBattle,
  type MlbCareerPos, type MlbCareerState, type MlbCareerEvent, type MlbSeasonLine,
  repairNetWorth,
  getMlbSpendItem
} from '@/lib/mlbMyCareer';
// Round 179: real free agency, shared engine and shared screen.
import { pushFaOffer, applyFaSigning } from '@/lib/usCareerFreeAgency';
import type { FaWindow } from '@/lib/usCareerFreeAgency';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
/* Round 207: the extension talk, shared engine and shared card. */
import { extensionDue, pushExtension, type ExtensionTalk } from '@/lib/usCareerExtension';
import ExtensionCard from '@/components/us-career/ExtensionCard';
// Round 186: the season curtain, shared engine and shared card.
import { buildSeasonReveal, type SeasonReveal } from '@/lib/usCareerReveal';
import { SeasonRevealCard } from '@/components/us-career/SeasonRevealCard';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { recordActivity } from '@/lib/completions';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { mlbHeatLabel } from '@/lib/mlbCareerCorruption';
import { type PlayerAppearance, defaultAppearance } from '@/lib/soccerCareerAppearance';
import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { Confetti, CountUp } from '@/components/soccer-career/CareerFx';
import CoachCareerPanel, { CoachStartCard } from '@/components/us-career/CoachCareerPanel';
import { startCoachCareer, ensureCoachCareer } from '@/lib/usCoachCareer';
import type { CoachCareerState } from '@/lib/usCoachCareer';
/* Round 208: the hub boxes, shared with the front offices and Club
   Manager, and the trophy case they now open onto. */
import { careerHubTiles } from '@/lib/careerHub';
import { HubTiles, HubPanelHeader } from '@/components/hub/HubTiles';
import TrophyCase from '@/components/us-career/TrophyCase';
/* Round 470: the money app, the gram, the rival card and the badges, on the
   same engines Soccer Career and the NFL career run (careerMoney,
   careerSocial, careerBadges), bound to baseball in mlbCareerMoney.ts and
   mlbCareerLoop.ts. */
import MoneyApp from '@/components/us-career/MoneyApp';
import { SocialGram, RivalCard, BadgeGrid } from '@/components/us-career/SocialPanel';
import type { MoneyAction } from '@/lib/careerMoney';
import { MLB_MONEY, mlbMoneyAct, mlbMoneyWealth } from '@/lib/mlbCareerMoney';
import { mlbEarnedBadges, mlbFanComments, mlbFollowers, mlbHeadlinesFor } from '@/lib/mlbCareerLoop';
import { MLB_BADGES } from '@/lib/careerBadges';
import { fmtFollowers, pushHeadlines } from '@/lib/careerSocial';
import { cn } from '@/lib/utils';

/* Round 126: 'coach' is new. Retirement used to be the last screen in the
   game. Now it hands you to a job board and the save keeps going.
   Round 179: 'freeagency' is new. An expired deal now opens a real market
   window before the next season. */
/* Round 207: 'extension' is new. The final year of a deal now opens a
   real fork: sign on, or play it out and reach free agency. */
type Phase = 'create' | 'season' | 'event' | 'extension' | 'freeagency' | 'retired' | 'coach';

const SAVE_KEY = 'mlb-my-career-save-v1';

interface SaveShape { c: MlbCareerState; phase: Phase; teamQuality: number | null; coach?: CoachCareerState | null }

export default function MlbMyCareerBoard() {
  const [phase, setPhase] = useState<Phase>('create');
  // Round 58: build your player's face before the draft
  const [appearance, setAppearance] = useState<PlayerAppearance>(() => defaultAppearance());
  // Round 85: the tile rule. The season hub is boxes; each opens its own screen.
  const [panel, setPanel] = useState<'none' | 'bank' | 'stats' | 'log' | 'trophies' | 'news'>('none');
  /* Round 470: the News box opens on three screens, the paper, the gram and
     the rival, so the hub keeps its five boxes (simCareerHub holds that). */
  const [newsTab, setNewsTab] = useState<'headlines' | 'fans' | 'rival'>('headlines');
  const [career, setCareer] = useState<MlbCareerState | null>(null);
  const [teamQuality, setTeamQuality] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [pos, setPos] = useState<MlbCareerPos>('CF');
  const [archetypeId, setArchetypeId] = useState(MLB_ARCHETYPES.CF[0].id);
  const [eraId, setEraId] = useState<'now' | 'y2004'>('now');
  const [feed, setFeed] = useState<string[]>([]);
  const [pendingEvent, setPendingEvent] = useState<MlbCareerEvent | null>(null);
  const [lastLine, setLastLine] = useState<MlbSeasonLine | null>(null);
  /* Round 179: the open market. Not persisted on purpose: a reload lands on
     the season hub and the next Play click rebuilds a fresh window. */
  const [faWindow, setFaWindow] = useState<FaWindow | null>(null);
  /* Round 207: the extension on the table. Transient like the trade
     talks it borrows its single-push rule from: a reload ends the
     conversation and pressing Play opens a fresh one. */
  const [extTalk, setExtTalk] = useState<ExtensionTalk | null>(null);
  /* Set when you have turned an extension down, so the same season
     does not ask twice. Cleared the moment a season is actually played. */
  const extDeclinedRef = useRef(false);
  const [talkLine, setTalkLine] = useState<string | null>(null);
  /* Round 186: the season curtain. Transient like the market window: never
     persisted, so a reload mid-reveal opens on the save's real screen. */
  const [reveal, setReveal] = useState<SeasonReveal | null>(null);
  /* Round 126: the coaching career. It lives in a ref as well as in state so
     persist can always write the current one without every existing call site
     having to learn about it. */
  const [coach, setCoach] = useState<CoachCareerState | null>(null);
  const [coachFeed, setCoachFeed] = useState<string[]>([]);
  const coachRef = useRef<CoachCareerState | null>(null);
  // Round 61: the owner's no scroll rule. When a new crossroads or a new
  // season result lands, it pulls itself into view instead of rendering
  // below the fold where a phone player never sees it.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${pendingEvent?.id ?? ''}:${career?.seasons.length ?? 0}`,
  );

  /* Round 470: opening a hub box is a new screen, so it obeys the owner's no
     scroll rule like every other one. Measured on a 390 by 844 phone before
     this line existed: tapping News from the bottom of the hub left the page
     at scrollY 443 with the panel's own back button 246px above the fold, so
     the player landed underneath the screen he had just opened. The hook does
     nothing when the top of the panel is already readable. */
  const panelRef = useRevealScroll<HTMLDivElement>(`${panel}:${newsTab}`);

  const done = phase === 'retired';
  useGameCompletion('mlb-my-career', done, career ? mlbLegacyOf(career).score : 0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s.c) return;
      /* Round 183, repair-on-load: a pre-183 career was everyday. */
      if (!s.c.role) s.c.role = 'starter';
      /* Round 422: rebuild a balance the pre 422 bug drove below zero. Costs
         were charged every year against income that was never banked, so a
         negative number here is the defect and never a debt the player chose.
         A healthy save is returned untouched. */
      setCareer(repairNetWorth(s.c, id => getMlbSpendItem(id)?.cost ?? 0));
      setTeamQuality(s.teamQuality);
      /* Round 126, house pattern from ensureContracts and ensureAcademy in
         clubManager.ts: repair whatever is on disk instead of trusting it. A
         save written before this round has no coaching career at all, comes
         back null, and opens on the retirement screen with one new button. */
      const co = ensureCoachCareer(s.coach, 'mlb');
      coachRef.current = co;
      setCoach(co);
      setPhase(!s.c.retired ? 'season' : s.phase === 'coach' && co ? 'coach' : 'retired');
    } catch { /* fresh */ }
  }, []);

  const persist = useCallback((c: MlbCareerState, ph: Phase, tq: number | null) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ c, phase: ph, teamQuality: tq, coach: coachRef.current } satisfies SaveShape)); } catch { /* full */ }
  }, []);

  const create = () => {
    const arch = MLB_ARCHETYPES[pos].find(a => a.id === archetypeId) ?? MLB_ARCHETYPES[pos][0];
    const c = startMlbCareer(nameInput.trim() || 'Ace Diamond', pos, arch, Math.random, appearance, eraId);
    const tq = mlbRollTeamQuality(null, Math.random);
    /* Round 183: the lineup card is set the day you arrive. */
    const roleNote = mlbAssignRole(c, tq, Math.random);
    setCareer(c);
    setTeamQuality(tq);
    setFeed([
      `🎓 With pick ${c.draftPick}, the ${mlbTeamLabelOf(c.team)} select ${c.name}.`,
      c.draftPick <= 10 ? 'The city expects a savior.' : c.draftPick <= 32 ? 'First round money, first round pressure.' : 'Late pick. Everything must be earned.',
      roleNote,
    ]);
    setPhase('season');
    persist(c, 'season', tq);
  };

  const playSeason = () => {
    if (!career || teamQuality == null) return;
    /* Round 195: a played season counts as playing TODAY, the Round 159
       soccer rule reaching the American careers. Unscored on purpose: the
       scored completion stays the retirement legacy. */
    recordActivity('/mlb-my-career');
    const c: MlbCareerState = JSON.parse(JSON.stringify(career));

    // Round 58: a suspension costs the whole season. You still age and decline.
    if ((c.suspendedSeasons ?? 0) > 0) {
      c.suspendedSeasons = (c.suspendedSeasons ?? 0) - 1;
      const banned: MlbSeasonLine = {
        year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
        awards: [], teamResult: 'SUSPENDED', salary: 0,
      };
      c.seasons.push(banned);
      c.headlines = pushHeadlines(c.headlines, mlbHeadlinesFor(c, banned));
      const banNotes = mlbProgress(c, Math.random);
      setLastLine(banned);
      setCareer(c);
      setFeed(['🚫 Season served on the suspended list. No baseball, no money, no going back.', ...banNotes]);
      /* Round 186: even a banned year gets its card, muted on purpose. */
      setReveal(buildSeasonReveal({
        year: banned.year,
        subHeader: `${mlbTeamLabelOf(banned.team, c.eraId)} · age ${banned.age} · ${c.pos}`,
        teamResult: 'SUSPENDED', statLine: '', campNote: null, notes: [], progressNotes: banNotes,
      }));
      setPhase('season');
      persist(c, 'season', teamQuality);
      return;
    }

    /* Round 179: no deal, no first pitch. The window is guaranteed here,
       which also closes the old hole where the event deck could skip the
       contract card and let you play years on an expired contract. */
    /* Round 207: the last year of a deal is a decision, not just another
       season. Offered before the season is played, because that is when a
       club and a player actually have this conversation. */
    if (extensionDue(c) && !extDeclinedRef.current) {
      setExtTalk(buildMlbExtension(c, Math.random));
      /* Persisted as 'season' on purpose: a reload puts you back on the hub
         with the season still unplayed, and Play opens a fresh talk. */
      setPhase('extension');
      persist(c, 'season', teamQuality);
      return;
    }
    extDeclinedRef.current = false;

    if (c.contractYears <= 0) {
      setFaWindow(buildMlbFaWindow(c, teamQuality, Math.random));
      setTalkLine(null);
      setPhase('freeagency');
      persist(c, 'season', teamQuality);
      return;
    }

    /* Round 183: every season starts with a spring, and springs have losers. */
    const campNote = mlbCampBattle(c, teamQuality, Math.random);
    const { line, notes } = simMlbSeason(c, teamQuality, Math.random);
    const progressNotes = mlbProgress(c, Math.random);
    /* Round 470: the paper writes the season up, position aware, and the
       lines stay on the save so the News screen survives a reload. */
    c.headlines = pushHeadlines(c.headlines, mlbHeadlinesFor(c, line));
    setLastLine(line);
    /* Round 186: the curtain. Every string in it is one the engine already
       wrote; the true stat line is on screen from frame one. */
    setReveal(buildSeasonReveal({
      year: line.year,
      subHeader: `${mlbTeamLabelOf(line.team, c.eraId)} · age ${line.age} · ${c.pos}`,
      teamResult: line.teamResult, statLine: statLine(line, c.pos),
      campNote, notes, progressNotes,
    }));
    const newFeed = [...(campNote ? [campNote] : []), ...notes, ...progressNotes];
    if (mlbShouldRetire(c)) {
      c.retired = true;
      setCareer(c);
      setFeed(newFeed);
      setPhase('retired');
      persist(c, 'retired', teamQuality);
      return;
    }
    const ev = drawMlbEvent(c, Math.random);
    setPendingEvent(ev);
    setCareer(c);
    setFeed(newFeed);
    setPhase('event');
    persist(c, 'event', teamQuality);
  };

  const chooseOption = (idx: number) => {
    if (!career || !pendingEvent) return;
    const c: MlbCareerState = JSON.parse(JSON.stringify(career));
    const outcome = pendingEvent.options[idx].apply(c, Math.random);
    const tq = mlbRollTeamQuality(teamQuality, Math.random);
    setTeamQuality(tq);
    setCareer(c);
    setFeed(f => [outcome, ...f].slice(0, 6));
    setPendingEvent(null);
    setPhase('season');
    persist(c, 'season', tq);
  };

  /* Round 179: the market handlers. Signing writes the offer onto the career
     and the offer's roster quality becomes the real teamQuality. */
  /* Round 207: the three answers to an extension. Signing writes the deal
     onto the career (the year being played plus the new years); pushing
     spends the one negotiation; turning it down plays the season out, which
     is what sends you to free agency next summer. */
  const signExt = () => {
    if (!career || !extTalk?.offer) return;
    const c: MlbCareerState = JSON.parse(JSON.stringify(career));
    const o = extTalk.offer;
    c.contractYears = 1 + o.years;
    c.salary = o.salary;
    setCareer(c);
    setFeed(f => [`\u{1F58A}\uFE0F Extension signed: ${o.years} more year${o.years === 1 ? '' : 's'} at $${o.salary}M a year.`, ...f].slice(0, 6));
    setExtTalk(null);
    setPhase('season');
    persist(c, 'season', teamQuality);
  };

  const pushExt = () => {
    if (!career || !extTalk) return;
    setExtTalk(pushExtension(extTalk, mlbExtPushArgs(career, Math.random)));
  };

  const declineExt = () => {
    extDeclinedRef.current = true;
    setExtTalk(null);
    setPhase('season');
    playSeason();
  };

  const signFa = (idx: number) => {
    if (!career || !faWindow) return;
    const offer = faWindow.offers[idx];
    if (!offer || offer.gone) return;
    const c: MlbCareerState = JSON.parse(JSON.stringify(career));
    const line = applyFaSigning(c, offer);
    /* Round 183: the new clubhouse has its own lineup card. Chasing a ring
       on a stacked roster can cost a mid player the everyday job. */
    const roleNote = mlbCampBattle(c, offer.quality, Math.random);
    setCareer(c);
    setTeamQuality(offer.quality);
    setFeed(f => [line, ...(roleNote ? [roleNote] : []), ...f].slice(0, 6));
    setFaWindow(null);
    setTalkLine(null);
    setPhase('season');
    persist(c, 'season', offer.quality);
  };
  const pushFa = (idx: number) => {
    if (!career || !faWindow) return;
    const res = pushFaOffer(faWindow, idx, mlbFaPushArgs(career, Math.random));
    setFaWindow(res.window);
    setTalkLine(res.line);
  };

  /* Round 470: every money tap rides on one handler, the way the soccer
     phone's and the NFL board's do. The engine refuses rather than throws when
     the numbers do not work, so a refused tap changes nothing and writes
     nothing. Persisted as 'season' because the money app only opens from the
     hub. */
  const handleMoney = (action: MoneyAction) => {
    if (!career) return;
    const c: MlbCareerState = JSON.parse(JSON.stringify(career));
    const res = mlbMoneyAct(c, action);
    if (!res.ok) return;
    setCareer(c);
    const line = res.event ?? (res.toast ? `💰 ${res.toast}.` : null);
    if (line) setFeed(f => [line, ...f].slice(0, 8));
    persist(c, 'season', teamQuality);
  };

  const retireNow = () => {
    if (!career) return;
    const c: MlbCareerState = JSON.parse(JSON.stringify(career));
    c.retired = true;
    setCareer(c);
    setPhase('retired');
    persist(c, 'retired', teamQuality);
  };

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setCareer(null);
    setPhase('create');
    setFeed([]);
    setLastLine(null);
    setPendingEvent(null);
    setFaWindow(null);
    setTalkLine(null);
    setPanel('none');
    coachRef.current = null;
    setCoach(null);
    setCoachFeed([]);
  };

  /* Round 126: the second life. */
  const startCoaching = () => {
    if (!career) return;
    const co = startCoachCareer('mlb', career, career.year, Math.random);
    coachRef.current = co;
    setCoach(co);
    setCoachFeed([co.offerNote]);
    setPhase('coach');
    persist(career, 'coach', teamQuality);
  };
  const openCoaching = () => {
    if (!career) return;
    setPhase('coach');
    persist(career, 'coach', teamQuality);
  };
  const onCoachChange = (next: CoachCareerState, notes: string[]) => {
    if (!career) return;
    coachRef.current = next;
    setCoach(next);
    setCoachFeed(f => [...notes, ...f].slice(0, 6));
    persist(career, 'coach', teamQuality);
  };
  const leaveCoaching = () => {
    if (!career) return;
    setPhase('retired');
    persist(career, 'retired', teamQuality);
  };

  /* Round 126: see the note in NflMyCareerBoard. A suspended season has no
     stat fields, so this printed "undefined HR, undefined RBI" on the
     retirement screen. */
  const statLine = (s: MlbSeasonLine, p: MlbCareerPos) =>
    s.teamResult === 'SUSPENDED' ? 'Suspended, no season played'
      : p === 'SP' ? `${s.wins}-${s.lossesP}, ${s.era?.toFixed(2)} ERA, ${s.so} K`
      : `.${String(Math.round((s.avg ?? 0) * 1000)).padStart(3, '0')}, ${s.hr} HR, ${s.rbi} RBI`;

  /* ------------------------------ create ------------------------------ */
  if (phase === 'create' || !career) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Create your player</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You are a fictional prospect entering the real league. Position and archetype shape your
            whole career: growth, injuries, money, legacy. Saves automatically.
          </p>
        </div>
        <div className="mx-auto max-w-md space-y-3">
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Your player's name"
            aria-label="Your player name"
            maxLength={24}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {/* Round 173: pick WHEN, before you pick what. Same pattern as Club
              Manager's era picker: the default is today, the throwback is a
              sealed 2004 league with its franchises and its money. */}
          <div className="grid grid-cols-2 gap-1.5">
            {MLB_ERAS.map(e => (
              <button
                key={e.id}
                onClick={() => setEraId(e.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-left',
                  eraId === e.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
                )}
              >
                <span className="block text-sm font-bold text-foreground">{e.id === 'now' ? '⚾ ' : '⏪ '}{e.label}</span>
                <span className="block text-[10px] text-muted-foreground">{e.blurb}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1 rounded-2xl bg-secondary p-1">
            {(['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as MlbCareerPos[]).map(p => (
              <button
                key={p}
                onClick={() => { setPos(p); setArchetypeId(MLB_ARCHETYPES[p][0].id); }}
                className={cn('rounded-xl px-1 py-1.5 text-xs font-bold transition-all', pos === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {p}
              </button>
            ))}
          </div>
          <AppearanceBuilder appearance={appearance} onChange={setAppearance} clubColor="#DC2626" />

          <div className="grid gap-1.5">
            {MLB_ARCHETYPES[pos].map(a => (
              <button
                key={a.id}
                onClick={() => setArchetypeId(a.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-left',
                  archetypeId === a.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
                )}
              >
                <span className="block text-sm font-bold text-foreground">{a.label}</span>
                <span className="block text-[11px] text-muted-foreground">{a.desc}</span>
              </button>
            ))}
          </div>
          <button
            onClick={create}
            className="w-full rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Enter the draft
          </button>
        </div>
      </div>
    );
  }

  const totals = mlbCareerTotals(career);
  const legacy = mlbLegacyOf(career);

  /* ------------------- Round 186: the season curtain -------------------
     Rendered ahead of every other screen so the season's story lands
     before the crossroads, the market or the retirement card. Transient:
     a reload skips straight to whichever of those the save is really on. */
  if (reveal) {
    return (
      <div ref={revealRef}>
        <SeasonRevealCard reveal={reveal} onContinue={() => setReveal(null)} />
      </div>
    );
  }

  /* ------------------- Round 126: the coaching career ------------------- */
  if (phase === 'coach' && coach) {
    return (
      <CoachCareerPanel
        state={coach}
        playerName={career.name}
        feed={coachFeed}
        onChange={onCoachChange}
        onBack={leaveCoaching}
      />
    );
  }

  /* ------------------------------ retired ------------------------------ */
  if (phase === 'retired') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-2 font-display text-2xl font-black text-foreground">{career.name} retires</p>
          <p className="mt-1 text-sm font-semibold text-gold">{legacy.verdict}</p>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {legacy.bullets.map((b, i) => <p key={i}>{b}</p>)}
            {/* Round 470: the badges the career earned, on the retirement card. */}
            {(() => {
              const earned = mlbEarnedBadges(career);
              return earned.length > 0
                ? <p className="pt-1 text-gold">{earned.map(b => `${b.emoji} ${b.label}`).join(' · ')}</p>
                : null;
            })()}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Legacy <b className="text-gold">{legacy.score}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">{legacy.hof ? '🏛️ Cooperstown' : 'No plaque in Cooperstown'}</span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground">
              <RotateCcw className="h-4 w-4" /> New career
            </button>
            <ShareButtons
              gameName="MLB My Career"
              gamePath="/mlb-my-career"
              score={`legacy ${legacy.score}`}
              customText={`MLB My Career ⚾ ${career.name}: ${career.seasons.length} seasons, ${career.rings} rings, ${career.mvpCys} MVPs. Verdict: ${legacy.verdict}. Legacy ${legacy.score}. douknowball.com/mlb-my-career`}
            />
          </div>
        </div>
        {/* Round 126: the save does not end here any more. */}
        <CoachStartCard sport="mlb" existing={coach} onStart={startCoaching} onResume={openCoaching} />
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Season by season</p>
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {career.seasons.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-background">
                <span className="text-muted-foreground">{s.year} · {s.team} · age {s.age}</span>
                <span className="text-foreground">{statLine(s, career.pos)}{s.awards.length ? ` · ${s.awards.join(', ')}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Round 85: tile drill-in screens (the tile rule) ---------------- */
  /* Round 179: freeagency joins event in the guard, so an open panel can
     never hide the market screen. */
  if (panel !== 'none' && phase !== 'event' && phase !== 'freeagency') {
    const meters: [string, number][] = [['Morale', career.morale], ['Fanbase', career.fanbase], ['Health', career.health]];
    return (
      <div ref={panelRef} className="space-y-3">
        <HubPanelHeader
          title={panel === 'bank' ? '\u{1F4B0} The Bank' : panel === 'stats' ? '\u{1F4CA} My Player' : panel === 'log' ? '\u{1F4DC} Career Log' : panel === 'trophies' ? '\u{1F3C6} Trophy Case' : '\u{1F4F0} News Feed'}
          onBack={() => setPanel('none')}
        />
        {panel === 'bank' && (
          /* Round 470: the money app. Savings, the market, the statement and
             the card school on the engine the flagship's phone runs, with the
             Round 58 shop as its fourth tab. */
          <MoneyApp
            host={career}
            sport={MLB_MONEY}
            incomeLine={`$${career.salary}M a year, ${Math.max(0, career.contractYears)} year${Math.max(0, career.contractYears) === 1 ? '' : 's'} left on the deal`}
            onMoney={handleMoney}
            shop={<MlbShopPanel career={career} onBuy={id => { const res = buyMlbItem(career, id); if (!res) return; setCareer(res.state); setFeed(f => [res.log, ...f].slice(0, 8)); persist(res.state, 'season', teamQuality); }} />}
          />
        )}
        {panel === 'stats' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-4xl font-black text-primary">{career.ovr}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">overall</p>
              <p className="mt-1 text-xs text-muted-foreground">{career.name} · {career.pos} · age {career.age}</p>
            </div>
            <div className="space-y-2">
              {meters.map(([lbl, v]) => (
                <div key={lbl} className="rounded-xl border border-border bg-card px-3 py-2">
                  <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">{lbl}</span><b className="text-foreground">{v}</b></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className={cn('h-full rounded-full', v > 60 ? 'bg-primary' : v > 35 ? 'bg-gold' : 'bg-destructive')} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="rounded-xl border border-border bg-card px-2 py-2"><p className="text-lg font-black text-foreground">{career.seasons.length}</p><p className="text-muted-foreground">seasons</p></div>
              <div className="rounded-xl border border-border bg-card px-2 py-2"><p className="text-lg font-black text-foreground">{career.rings}</p><p className="text-muted-foreground">rings</p></div>
            </div>
          </div>
        )}
        {panel === 'log' && (
          <div className="rounded-2xl border border-border bg-card p-3">
            {career.seasons.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No seasons on the books yet. Go play one.</p>
            ) : (
              <div className="max-h-96 space-y-0.5 overflow-y-auto">
                {[...career.seasons].reverse().map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-background">
                    <span className="text-muted-foreground">{s.year} · {s.team}</span>
                    <span className="text-foreground">{statLine(s, career.pos)}{s.awards.length ? ' 🏆' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {panel === 'trophies' && (
          <div className="space-y-3">
            <TrophyCase seasons={career.seasons} rings={career.rings} ringWord="ring" />
            {/* Round 470: the peaks between the trophies. Evaluated on every
                render off the save, so a badge can never be stale. */}
            <BadgeGrid defs={MLB_BADGES} earned={mlbEarnedBadges(career)} />
          </div>
        )}
        {panel === 'news' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1">
              {([['headlines', '📰 Paper'], ['fans', '📸 SocialGram'], ['rival', '🪞 Rival']] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setNewsTab(k)}
                  /* Round 470: py-2, not py-1.5. Measured at 390 by 844
                     these three came out 117 by 29px, a shade under the 30px
                     floor every tap target on this site is held to, and they
                     are the only way between the News box's three screens. */
                  className={cn('rounded-lg px-1 py-2 text-[11px] font-bold transition-all', newsTab === k ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground')}
                >
                  {label}
                </button>
              ))}
            </div>
            {newsTab === 'headlines' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">This week</p>
                  {feed.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Quiet week. Play a season and the headlines write themselves.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {feed.map((n, i) => <p key={i} className="rounded-lg bg-background px-2 py-1.5">{n}</p>)}
                    </div>
                  )}
                </div>
                {(career.headlines ?? []).length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Back pages</p>
                    <div className="space-y-1.5 text-xs text-foreground">
                      {(career.headlines ?? []).map((n, i) => <p key={i} className="rounded-lg bg-background px-2 py-1.5">📰 {n}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {newsTab === 'fans' && (
              <SocialGram
                followers={fmtFollowers(mlbFollowers(career))}
                standing={career.fanbase}
                standingLabel="Fanbase"
                comments={mlbFanComments(career)}
                headlines={(career.headlines ?? []).slice(0, 3)}
              />
            )}
            {newsTab === 'rival' && (
              <RivalCard rival={career.rival} myName={career.name} teamLabel={mlbTeamLabelOf(career.rival?.team ?? '', career.eraId)} ringWord="ring" />
            )}
          </div>
        )}
      </div>
    );
  }

  /* Round 208: what the boxes say. Decided in src/lib/careerHub.ts so the
     wording is harnessed rather than eyeballed, and shared by four games. */
  const hubTiles = careerHubTiles({
    ovr: career.ovr,
    age: career.age,
    pos: career.pos,
    morale: career.morale,
    health: career.health,
    fanbase: career.fanbase,
    /* Round 470: everything you have, cash plus savings plus holdings, the
       number the money app's headline prints. */
    netWorth: Math.round(((career.netWorth ?? 0) + mlbMoneyWealth(career)) * 10) / 10,
    salary: career.salary,
    yearlyCosts: career.yearlyCosts ?? 0,
    contractYears: Math.max(0, career.contractYears),
    teamLabel: mlbTeamLabelOf(career.team),
    seasonsPlayed: career.seasons.length,
    /* Read off the SEASONS, not the transient lastLine state: that state
       is empty after a reload, and a box that forgets your career the
       moment you refresh is worse than no box. */
    lastLine: career.seasons.length
      ? statLine(career.seasons[career.seasons.length - 1], career.pos)
      : null,
    rings: career.rings,
    ringWord: 'ring',
    honours: [{ label: 'MVP or Cy Young awards', n: career.mvpCys }, { label: 'All-Star nods', n: career.allStars }],
    /* The week's feed while there is one; after a reload, the paper kept on
       the save, so the box does not forget the career. */
    headlines: feed.length ? feed : (career.headlines ?? []),
  });

  /* ------------------------------ season hub ------------------------------ */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {career.appearance && (
          <span className="overflow-hidden rounded-xl border border-border bg-card">
            <PlayerAvatar appearance={career.appearance} clubColor="#DC2626" size={44} animate />
          </span>
        )}
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">{career.name} · {career.pos}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{mlbTeamLabelOf(career.team)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{career.year} · age {career.age}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">OVR <b className="text-primary">{career.ovr}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">${career.salary}M x{Math.max(0, career.contractYears)}</span>
        {/* Round 183: the lineup card, on the shirt. Relievers show their
            bullpen identity; the ladder there is the archetype's. */}
        <span className={cn('rounded-full border px-3 py-1 font-bold', career.role === 'backup' ? 'border-border bg-card text-muted-foreground' : 'border-gold/40 bg-card text-gold')}>
          {career.pos === 'RP' ? '⭐ Bullpen arm'
            : career.role === 'backup' ? (career.pos === 'SP' ? '🪑 Spot starter' : '🪑 Bench bat')
            : (career.pos === 'SP' ? '⭐ In the rotation' : '⭐ Everyday')}
        </span>
      </div>

      {/* Round 58: the heat meter, only once you have something to hide */}
      {((career.heat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0) && (() => {
        const h = career.heat ?? 0;
        const band = mlbHeatLabel(h);
        return (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">🕶️ Commissioner's office</span>
              <span className={cn('font-black', band.tone)}>{band.label}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full transition-all duration-700', h >= 65 ? 'bg-destructive' : h >= 40 ? 'bg-orange-500' : 'bg-gold')} style={{ width: `${h}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{band.blurb}</p>
            {(career.dirtyMoney ?? 0) > 0 && (
              <p className="mt-1 text-[11px] font-bold text-destructive">
                💼 ${(career.dirtyMoney ?? 0).toFixed(1)}M unexplained. Wash it in the Shady aisle or it keeps burning.
              </p>
            )}
          </div>
        );
      })()}




      {phase === 'extension' && extTalk ? (
        <div ref={revealRef}>
          <ExtensionCard talk={extTalk} seasonWord="season" onPush={pushExt} onSign={signExt} onDecline={declineExt} />
        </div>
      ) : phase === 'freeagency' && faWindow ? (
        <div ref={revealRef}>
          <FreeAgencyPanel window={faWindow} sportNoun="club" talkLine={talkLine} onPush={pushFa} onSign={signFa} />
        </div>
      ) : phase === 'event' && pendingEvent ? (
        <div ref={revealRef} className="rounded-2xl border border-gold/40 bg-card p-4">
          <p className="text-center text-sm font-bold text-foreground"><Sparkles className="mr-1 inline h-4 w-4 text-gold" />{pendingEvent.title}</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">{pendingEvent.body}</p>
          <div className="mt-3 grid gap-1.5">
            {pendingEvent.options.map((o, i) => (
              <button
                key={i}
                onClick={() => chooseOption(i)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-left hover:border-primary/60"
              >
                <span className="block text-sm font-bold text-foreground">{o.label}</span>
                <span className="block text-[10px] text-muted-foreground">{o.effect}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
          {lastLine && (
            <p className="mb-2 text-xs text-muted-foreground">
              Last season: {statLine(lastLine, career.pos)} · {lastLine.teamResult}
            </p>
          )}
          <button
            onClick={playSeason}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <Dumbbell className="h-4 w-4" /> Play the {career.year} season
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Career so far: {career.rings} rings · {career.mvpCys} majors · {career.allStars} All-Star ·{' '}
            {career.pos === 'SP' ? `${totals.wins} career wins` : `${totals.hr} career home runs`}
          </p>
          {career.seasons.length >= 6 && (
            <button onClick={retireNow} className="mt-2 text-[11px] text-muted-foreground hover:text-destructive">Hang them up now</button>
          )}
        </div>
      )}

      {/* Round 208: the same boxes the rest of the site opens on, and every
          one of them now carries the fact you used to have to tap for. */}
      <HubTiles tiles={hubTiles} onOpen={k => setPanel(k as typeof panel)} />

    </div>
  );
}

/* ─── Round 58: the money panel ───
   Seven aisles of things to spend it on, plus a Shady aisle that only shows up
   once you actually have something to hide. Gates mirror buyMlbItem exactly so
   a button never lies about what it will do. */
function MlbShopPanel({ career, onBuy }: { career: MlbCareerState; onBuy: (id: string) => void }) {
  const [tab, setTab] = useState<MlbSpendCategory>('home');
  const cats: { key: MlbSpendCategory; label: string; emoji: string }[] = [
    { key: 'home', label: 'Home', emoji: '🏡' },
    { key: 'ride', label: 'Rides', emoji: '🏎️' },
    { key: 'invest', label: 'Invest', emoji: '📈' },
    { key: 'body', label: 'Body', emoji: '💪' },
    { key: 'flex', label: 'Flex', emoji: '💎' },
    { key: 'family', label: 'Family', emoji: '❤️' },
    { key: 'shady', label: 'Shady', emoji: '🕶️' },
  ];
  const hasDirt = (career.heat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0;
  const visible = cats.filter(c => c.key !== 'shady' || hasDirt);
  const owned = career.purchased ?? [];
  const net = career.netWorth ?? 0;
  const items = MLB_SPEND_ITEMS.filter(i => i.category === tab);

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">💰 Your money</span>
        <span className="text-muted-foreground">
          Banked <b className="text-primary">${net.toFixed(1)}M</b>
          {(career.yearlyCosts ?? 0) > 0 && <> · Upkeep <b className="text-destructive">${(career.yearlyCosts ?? 0).toFixed(2)}M/yr</b></>}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {visible.map(c => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={cn(
              'rounded-lg px-1 py-1.5 text-[11px] font-bold transition-all',
              tab === c.key
                ? c.key === 'shady' ? 'bg-destructive/20 text-destructive' : 'bg-primary/15 text-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {items.map(item => {
          const isOwned = item.oneTime && owned.includes(item.id);
          const needsNet = item.minNetWorth && net < item.minNetWorth;
          const needsFame = item.minFanbase && career.fanbase < item.minFanbase;
          const needsDirty = item.requiresDirty && (career.dirtyMoney ?? 0) <= 0;
          const tooPoor = item.cost > net;
          const disabled = !!(isOwned || needsNet || needsFame || needsDirty || tooPoor);
          const lock = needsFame ? `Needs ${item.minFanbase} fanbase`
            : needsDirty ? 'Needs untraceable money to move'
            : needsNet ? `Needs $${item.minNetWorth}M banked`
            : tooPoor ? 'Cannot afford it yet' : null;
          return (
            <div key={item.id} className={cn('rounded-lg border p-2', isOwned ? 'border-primary/30 bg-primary/5' : disabled ? 'border-border/50 bg-secondary/40 opacity-60' : 'border-border bg-secondary/60')}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span>{item.emoji}</span>
                    <span className="truncate">{item.name}</span>
                    {isOwned && <span className="rounded bg-primary/20 px-1 py-0.5 text-[9px] font-bold text-primary">OWNED</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.desc}</p>
                  {item.effect && <p className="mt-0.5 text-[11px] text-gold">⚡ {item.effect}</p>}
                  {!isOwned && lock && <p className="mt-0.5 text-[11px] text-destructive/80">🔒 {lock}</p>}
                  {item.yearly ? <p className="mt-0.5 text-[10px] text-muted-foreground">+ ${item.yearly.toFixed(2)}M a year upkeep</p> : null}
                </div>
                {!isOwned && (
                  <button
                    onClick={() => onBuy(item.id)}
                    disabled={disabled}
                    className={cn(
                      'shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all',
                      disabled ? 'cursor-not-allowed bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95',
                    )}
                  >
                    {item.cost > 0 ? `$${item.cost}M` : 'Hire'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
