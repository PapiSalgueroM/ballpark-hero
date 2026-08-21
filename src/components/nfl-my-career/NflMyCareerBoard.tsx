import { useCallback, useEffect, useRef, useState } from 'react';
import { Crown, Dumbbell, RotateCcw, Sparkles } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { NFL_ERAS,
  ARCHETYPES, NFL_TEAM_NAMES, startCareer, simSeason, progress, drawEvent,
  shouldRetire, legacyOf, careerTotals, rollTeamQuality, teamLabelOf, marketSalary,
  NFL_SPEND_ITEMS, buyNflItem, type NflSpendCategory,
  buildNflFaWindow, nflFaPushArgs, buildNflExtension, nflExtPushArgs,
  nflAssignRole, nflCampBattle,
  type CareerPos, type CareerState, type CareerEvent, type SeasonLine,
} from '@/lib/nflMyCareer';
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
import { nflHeatLabel } from '@/lib/nflCareerCorruption';
import { type PlayerAppearance, defaultAppearance } from '@/lib/soccerCareerAppearance';
import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { Confetti, CountUp } from '@/components/soccer-career/CareerFx';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { recordCompletion } from '@/lib/completions';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import CoachCareerPanel, { CoachStartCard } from '@/components/us-career/CoachCareerPanel';
import { startCoachCareer, ensureCoachCareer } from '@/lib/usCoachCareer';
import type { CoachCareerState } from '@/lib/usCoachCareer';
/* Round 208: the hub boxes, shared with the front offices and Club
   Manager, and the trophy case they now open onto. */
import { careerHubTiles } from '@/lib/careerHub';
import { HubTiles, HubPanelHeader } from '@/components/hub/HubTiles';
import TrophyCase from '@/components/us-career/TrophyCase';
import { cn } from '@/lib/utils';

/* Round 126: 'coach' is new. Retirement used to be the last screen in the
   game. Now it hands you to a job board and the save keeps going.
   Round 179: 'freeagency' is new. An expired deal now opens a real market
   window before the next season instead of a two-button card that the event
   deck might never draw. */
/* Round 207: 'extension' is new. The final year of a deal now opens a
   real fork: sign on, or play it out and reach free agency. */
type Phase = 'create' | 'season' | 'event' | 'extension' | 'freeagency' | 'retired' | 'coach';

const SAVE_KEY = 'nfl-my-career-save-v1';

interface SaveShape { c: CareerState; phase: Phase; teamQuality: number | null; coach?: CoachCareerState | null }

export default function NflMyCareerBoard() {
  const [phase, setPhase] = useState<Phase>('create');
  // Round 56: build your player's face before the draft
  const [appearance, setAppearance] = useState<PlayerAppearance>(() => defaultAppearance());
  // Round 85: the tile rule. The season hub is boxes; each opens its own screen.
  const [panel, setPanel] = useState<'none' | 'bank' | 'stats' | 'log' | 'trophies' | 'news'>('none');
  const [career, setCareer] = useState<CareerState | null>(null);
  const [teamQuality, setTeamQuality] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  /* Round 172: which league you are drafted into. */
  const [eraId, setEraId] = useState<'now' | 'y2005'>('now');
  const [pos, setPos] = useState<CareerPos>('QB');
  const [archetypeId, setArchetypeId] = useState(ARCHETYPES.QB[0].id);
  const [feed, setFeed] = useState<string[]>([]);
  const [pendingEvent, setPendingEvent] = useState<CareerEvent | null>(null);
  const [lastLine, setLastLine] = useState<SeasonLine | null>(null);
  /* Round 179: the open market. Not persisted on purpose: a reload lands on
     the season hub and the next Play click rebuilds a fresh window, the same
     way a pending event has always redrawn. */
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

  const done = phase === 'retired';
  useGameCompletion('nfl-my-career', done, career ? legacyOf(career).score : 0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s.c) return;
      /* Round 182, repair-on-load: a pre-182 career was a de facto starter. */
      if (!s.c.role) s.c.role = 'starter';
      setCareer(s.c);
      setTeamQuality(s.teamQuality);
      /* Round 126, house pattern from ensureContracts and ensureAcademy in
         clubManager.ts: repair whatever is on disk instead of trusting it. A
         save written before this round has no coaching career at all, comes
         back null, and opens on the retirement screen with one new button. */
      const co = ensureCoachCareer(s.coach, 'nfl');
      coachRef.current = co;
      setCoach(co);
      setPhase(!s.c.retired ? 'season' : s.phase === 'coach' && co ? 'coach' : 'retired');
    } catch { /* fresh */ }
  }, []);

  const persist = useCallback((c: CareerState, ph: Phase, tq: number | null) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ c, phase: ph, teamQuality: tq, coach: coachRef.current } satisfies SaveShape)); } catch { /* full */ }
  }, []);

  const create = () => {
    const arch = ARCHETYPES[pos].find(a => a.id === archetypeId) ?? ARCHETYPES[pos][0];
    const c = startCareer(nameInput.trim() || 'Ryder Blaze', pos, arch, Math.random, appearance, eraId);
    const tq = rollTeamQuality(null, Math.random);
    /* Round 182: the depth chart is set the day you arrive. */
    const roleNote = nflAssignRole(c, tq, Math.random);
    setCareer(c);
    setTeamQuality(tq);
    setFeed([
      `🎓 With pick ${c.draftPick}, the ${teamLabelOf(c.team)} select ${c.name}.`,
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
    recordCompletion('/nfl-my-career');
    const c: CareerState = JSON.parse(JSON.stringify(career));

    // Round 56: an indefinite suspension costs the whole season. It still
    // counts as a year of your life, so you age, decline and lose the money.
    if ((c.suspendedSeasons ?? 0) > 0) {
      c.suspendedSeasons = (c.suspendedSeasons ?? 0) - 1;
      const banned: SeasonLine = {
        year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
        awards: [], teamResult: 'SUSPENDED', salary: 0,
      };
      c.seasons.push(banned);
      const banNotes = progress(c, Math.random);
      setLastLine(banned);
      setCareer(c);
      setFeed([
        '🚫 Season served on the suspended list. No football, no money, no going back.',
        ...banNotes,
      ]);
      /* Round 186: even a banned year gets its card, muted on purpose. */
      setReveal(buildSeasonReveal({
        year: banned.year,
        subHeader: `${teamLabelOf(banned.team, c.eraId)} · age ${banned.age} · ${c.pos}`,
        teamResult: 'SUSPENDED', statLine: '', campNote: null, notes: [], progressNotes: banNotes,
      }));
      setPhase('season');
      persist(c, 'season', teamQuality);
      return;
    }

    /* Round 179: no deal, no kickoff. The window is guaranteed here, which
       also closes the old hole where the event deck could skip the contract
       card and let you play years on an expired contract. */
    /* Round 207: the last year of a deal is a decision, not just another
       season. Offered before the season is played, because that is when a
       club and a player actually have this conversation. */
    if (extensionDue(c) && !extDeclinedRef.current) {
      setExtTalk(buildNflExtension(c, Math.random));
      /* Persisted as 'season' on purpose: a reload puts you back on the hub
         with the season still unplayed, and Play opens a fresh talk. */
      setPhase('extension');
      persist(c, 'season', teamQuality);
      return;
    }
    extDeclinedRef.current = false;

    if (c.contractYears <= 0) {
      setFaWindow(buildNflFaWindow(c, teamQuality, Math.random));
      setTalkLine(null);
      setPhase('freeagency');
      persist(c, 'season', teamQuality);
      return;
    }

    /* Round 182: every season starts with a camp, and camps have losers. */
    const campNote = nflCampBattle(c, teamQuality, Math.random);
    const { line, notes } = simSeason(c, teamQuality, Math.random);
    const progressNotes = progress(c, Math.random);
    setLastLine(line);
    /* Round 186: the curtain. Every string in it is one the engine already
       wrote; the true stat line is on screen from frame one. */
    setReveal(buildSeasonReveal({
      year: line.year,
      subHeader: `${teamLabelOf(line.team, c.eraId)} · age ${line.age} · ${c.pos}`,
      teamResult: line.teamResult, statLine: statLine(line, c.pos),
      campNote, notes, progressNotes,
    }));
    const newFeed = [...(campNote ? [campNote] : []), ...notes, ...progressNotes];
    if (shouldRetire(c)) {
      c.retired = true;
      setCareer(c);
      setFeed(newFeed);
      setPhase('retired');
      persist(c, 'retired', teamQuality);
      return;
    }
    const ev = drawEvent(c, Math.random);
    setPendingEvent(ev);
    setCareer(c);
    setFeed(newFeed);
    setPhase('event');
    persist(c, 'event', teamQuality);
  };

  const chooseOption = (idx: number) => {
    if (!career || !pendingEvent) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const outcome = pendingEvent.options[idx].apply(c, Math.random);
    const tq = rollTeamQuality(teamQuality, Math.random);
    setTeamQuality(tq);
    setCareer(c);
    setFeed(f => [outcome, ...f].slice(0, 6));
    setPendingEvent(null);
    setPhase('season');
    persist(c, 'season', tq);
  };

  /* Round 179: the market handlers. Signing writes the offer onto the career
     and the offer's roster quality becomes the real teamQuality the sim runs
     on, so the choice is the consequence. */
  /* Round 207: the three answers to an extension. Signing writes the deal
     onto the career (the year being played plus the new years); pushing
     spends the one negotiation; turning it down plays the season out, which
     is what sends you to free agency next summer. */
  const signExt = () => {
    if (!career || !extTalk?.offer) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
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
    setExtTalk(pushExtension(extTalk, nflExtPushArgs(career, Math.random)));
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
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const line = applyFaSigning(c, offer);
    /* Round 182: the new locker room has its own depth chart. A star walks
       in as the starter; a 78 joining a 91 contender can find out the ring
       chase costs him the huddle. */
    const roleNote = nflCampBattle(c, offer.quality, Math.random);
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
    const res = pushFaOffer(faWindow, idx, nflFaPushArgs(career, Math.random));
    setFaWindow(res.window);
    setTalkLine(res.line);
  };

  const retireNow = () => {
    if (!career) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
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
    const co = startCoachCareer('nfl', career, career.year, Math.random);
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

  /* Round 126: a suspended season carries no stat fields at all, so this used
     to print "undefined yds, undefined TD, undefined INT" straight onto the
     retirement screen. Caught by the browser sweep for this round. It was
     already there before the coaching career was, in three of the four games. */
  const statLine = (s: SeasonLine, p: CareerPos) =>
    s.teamResult === 'SUSPENDED' ? 'Suspended, no season played'
      : p === 'QB' ? `${s.passYds} yds, ${s.passTd} TD, ${s.ints} INT`
      : p === 'RB' ? `${s.rushYds} rush yds, ${s.rushTd} TD, ${s.rec} rec`
      : `${s.rec} rec, ${s.recYds} yds, ${s.recTd} TD`;

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
            maxLength={24}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {/* Round 172: pick WHEN, before you pick what. Same pattern as Club
              Manager's era picker: the default is today, the throwback is a
              sealed 2005 league with 2005 franchises and 2005 money. */}
          <div className="grid grid-cols-2 gap-1.5">
            {NFL_ERAS.map(e => (
              <button
                key={e.id}
                onClick={() => setEraId(e.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-left',
                  eraId === e.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
                )}
              >
                <span className="block text-sm font-bold text-foreground">{e.id === 'now' ? '🏈 ' : '⏪ '}{e.label}</span>
                <span className="block text-[10px] text-muted-foreground">{e.blurb}</span>
              </button>
            ))}
          </div>
          {/* Round 56: eight positions, each with its own stat line and money curve */}
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1">
            {(['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] as CareerPos[]).map(p => (
              <button
                key={p}
                onClick={() => { setPos(p); setArchetypeId(ARCHETYPES[p][0].id); }}
                className={cn('rounded-xl px-2 py-1.5 text-sm font-bold transition-all', pos === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {p}
              </button>
            ))}
          </div>
          <AppearanceBuilder appearance={appearance} onChange={setAppearance} clubColor="#10B981" />

          <div className="grid gap-1.5">
            {ARCHETYPES[pos].map(a => (
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

  const totals = careerTotals(career);
  const legacy = legacyOf(career);

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
        <div className="relative rounded-2xl border border-gold/50 bg-card p-5 text-center">
          {legacy.hof && <Confetti pieces={60} gold />}
          {career.appearance && (
            <div className="mb-2 flex justify-center">
              <span className="overflow-hidden rounded-xl border-2 border-gold/50 bg-secondary">
                <PlayerAvatar appearance={career.appearance} clubColor="#D4AF37" size={88} />
              </span>
            </div>
          )}
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-2 font-display text-2xl font-black text-foreground">{career.name} retires</p>
          <p className="mt-1 text-sm font-semibold text-gold">{legacy.verdict}</p>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {legacy.bullets.map((b, i) => <p key={i}>{b}</p>)}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Legacy <b className="text-gold"><CountUp value={legacy.score} duration={1400} /></b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">{legacy.hof ? '🏛️ Hall of Fame' : 'No bust in Canton'}</span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground">
              <RotateCcw className="h-4 w-4" /> New career
            </button>
            <ShareButtons
              gameName="NFL My Career"
              gamePath="/nfl-my-career"
              score={`legacy ${legacy.score}`}
              customText={`NFL My Career 🏈 ${career.name}: ${career.seasons.length} seasons, ${career.rings} rings, ${career.mvps} MVPs. Verdict: ${legacy.verdict}. Legacy ${legacy.score}. douknowball.com/nfl-my-career`}
            />
          </div>
        </div>
        {/* Round 126: the save does not end here any more. */}
        <CoachStartCard sport="nfl" existing={coach} onStart={startCoaching} onResume={openCoaching} />
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

  /* ---------------- Round 85: tile drill-in screens (the tile rule) ----------------
     Round 179: freeagency joins event in the guard, so an open panel can
     never hide the market screen. */
  if (panel !== 'none' && phase !== 'event' && phase !== 'freeagency') {
    const meters: [string, number][] = [['Morale', career.morale], ['Fanbase', career.fanbase], ['Health', career.health]];
    return (
      <div className="space-y-3">
        <HubPanelHeader
          title={panel === 'bank' ? '\u{1F4B0} The Bank' : panel === 'stats' ? '\u{1F4CA} My Player' : panel === 'log' ? '\u{1F4DC} Career Log' : panel === 'trophies' ? '\u{1F3C6} Trophy Case' : '\u{1F4F0} News Feed'}
          onBack={() => setPanel('none')}
        />
        {panel === 'bank' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net worth</p>
              <p className="text-2xl font-black text-gold">${(career.netWorth ?? 0).toFixed(1)}M</p>
              <p className="text-[10px] text-muted-foreground">${career.salary}M a year, {Math.max(0, career.contractYears)} years left on the deal</p>
            </div>
            <NflShopPanel career={career} onBuy={id => { const res = buyNflItem(career, id); if (!res) return; setCareer(res.state); setFeed(f => [res.log, ...f].slice(0, 8)); }} />
          </div>
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
          <TrophyCase seasons={career.seasons} rings={career.rings} ringWord="ring" />
        )}
        {panel === 'news' && (
          <div className="rounded-2xl border border-border bg-card p-3">
            {feed.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Quiet week. Play a season and the headlines write themselves.</p>
            ) : (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {feed.map((n, i) => <p key={i} className="rounded-lg bg-background px-2 py-1.5">{n}</p>)}
              </div>
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
    netWorth: career.netWorth ?? 0,
    salary: career.salary,
    yearlyCosts: career.yearlyCosts ?? 0,
    contractYears: Math.max(0, career.contractYears),
    teamLabel: teamLabelOf(career.team),
    seasonsPlayed: career.seasons.length,
    /* Read off the SEASONS, not the transient lastLine state: that state
       is empty after a reload, and a box that forgets your career the
       moment you refresh is worse than no box. */
    lastLine: career.seasons.length
      ? statLine(career.seasons[career.seasons.length - 1], career.pos)
      : null,
    rings: career.rings,
    ringWord: 'ring',
    honours: [{ label: 'MVPs', n: career.mvps }, { label: 'All-Pros', n: career.allPros }],
    headlines: feed,
  });

  /* ------------------------------ season hub ------------------------------ */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {career.appearance && (
          <span className="overflow-hidden rounded-xl border border-border bg-card">
            <PlayerAvatar appearance={career.appearance} clubColor="#10B981" size={44} animate />
          </span>
        )}
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">{career.name} · {career.pos}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{teamLabelOf(career.team)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{career.year} · age {career.age}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">OVR <b className="text-primary">{career.ovr}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">${career.salary}M x{Math.max(0, career.contractYears)}</span>
        {/* Round 182: the depth chart, on the shirt. */}
        <span className={cn('rounded-full border px-3 py-1 font-bold', career.role === 'backup' ? 'border-border bg-card text-muted-foreground' : 'border-gold/40 bg-card text-gold')}>
          {career.role === 'backup' ? '🪑 Backup' : '⭐ Starter'}
        </span>
      </div>

      {/* Round 56: the heat meter, only once you have something to hide */}
      {((career.heat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0) && (() => {
        const h = career.heat ?? 0;
        const band = nflHeatLabel(h);
        return (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">🕶️ League security</span>
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
          <FreeAgencyPanel window={faWindow} sportNoun="franchise" talkLine={talkLine} onPush={pushFa} onSign={signFa} />
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
            Career so far: {career.rings} rings · {career.mvps} MVPs · {career.allPros} All-Pros ·{' '}
            {career.pos === 'QB' ? `${totals.passYds.toLocaleString()} pass yds` : career.pos === 'RB' ? `${totals.rushYds.toLocaleString()} rush yds` : `${totals.recYds.toLocaleString()} rec yds`}
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

/* ─── Round 56: the money panel ───
   Seven aisles of things to spend it on, plus a Shady aisle that only shows up
   once you actually have something to hide. Gates mirror buyNflItem exactly so
   a button never lies about what it will do. */
function NflShopPanel({ career, onBuy }: { career: CareerState; onBuy: (id: string) => void }) {
  const [tab, setTab] = useState<NflSpendCategory>('home');
  const cats: { key: NflSpendCategory; label: string; emoji: string }[] = [
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
  const items = NFL_SPEND_ITEMS.filter(i => i.category === tab);

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
