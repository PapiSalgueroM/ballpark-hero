/**
 * Stadium Tycoon (Round 146): the idle game, animation first. The owner's
 * ask: an idle sports tycoon of our own, "add more animation especially to
 * the idle game. Suprise me." The surprises are all motion: a live toy match
 * with player dots that actually chase the ball, a crowd that fills the
 * stands seat by seat as the real attendance number grows, money that
 * physically floats off everything, confetti on goals, pulse rings on every
 * purchase, and a streak flame that grows with the run. The balance itself
 * never counts up: it is the engine's number, always (Round 147).
 *
 * No scroll on the core loop (pitch + upgrades fit a phone screen), tiles
 * per the house style, "?" rules modal, everything original.
 *
 * Round 580: two tabs, one tycoon. The page holds the h1 and a Stadium and
 * Academy tab strip; the ground itself is StadiumRoom below, moved here
 * unchanged, and the Academy tab is Wonderkid Factory's academy panel on its
 * own save (docs/design/round-580-tycoon-merge.md). The stadium hook lives on
 * the PAGE, not in the room, so the match clock never stops while you are in
 * the Academy, and the academy panel stays mounted once opened so its clock
 * never stops while you are at the ground. scripts/simTycoonRooms.mjs holds
 * both to it, and its controls rewrite the exact lines marked below.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { cn } from '@/lib/utils';
import { HelpCircle, Star, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  TRACKS, levelOf, costOf, canBuy, capacity, attendance, incomePerSec,
  tapValue, repMult, streakMult, prestigeThreshold, canPrestige, fmtMoney,
  boostReady, boostActive, boostChargeSecOf, MILESTONES, opponentName,
  DIVISIONS, divisionOf, divisionIndex, leagueShape, leagueStandings, leaguePosition,
  clubNameOptions, ordinal, SINGLE_LEG_BELOW, YOUR_CLUB,
  newTycoon, newLeague, goalBonus, winBonus, BOOST_CHARGE_SEC, BOOST_DURATION_SEC, WINDFALL_SEC,
  GOLDEN_CATCH_SEC, offlineRateOf, offlineCapHoursOf, TYCOON_SAVE_KEY, swayMult,
  STAFF, staffLevelOf, staffCostOf, canHire, totalStaffLevels,
  ACHIEVEMENTS, ACH_BONUS, achMult, goldenActive, GOLDEN_INFO,
  LEGACY_PERKS, perkLevelOf, perkCostOf, canBuyPerk, legacyPointsOf,
  totalPerkLevels, pointsForSale, HYPE_MULT, AWAY_MATCHDAY_SEC, SET_PIECE_WINDOW_SEC,
} from '@/lib/stadiumTycoon';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { ConfettiBurst, CelebrationStyles } from '@/components/club-manager/Celebration';
import VictoryMoment from '@/components/game/VictoryMoment';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';
import TycoonPitch from '@/components/tycoon/TycoonPitch';
import { useTycoonRewards } from '@/hooks/useTycoonRewards';
import { balance, GEM_PAY, loadLedger } from '@/lib/tycoonRewards';
import type { TapFx } from '@/components/tycoon/TycoonPitch';
import type { AcademyStatus, Room } from '@/lib/tycoonRooms';
import { deserialize as deserializeAcademy, applyOffline as applyAcademyOffline, SAVE_KEY as ACADEMY_SAVE_KEY, squadEdge } from '@/lib/wonderkidFactory';
import type { FactoryState } from '@/lib/wonderkidFactory';

const AcademyPanel = lazy(() => import('@/components/tycoon/AcademyPanel'));
const SetPieceBoard = lazy(() => import('@/components/tycoon/SetPieceBoard').then(module => ({ default: module.WatchedSetPieceBoard })));

/* ---------- tiny animation helpers ---------- */

/* Round 530 review: the balance used to ease toward s.money by 18 percent a
   frame, so the printed number walked through amounts the club never held,
   most visibly after a purchase and after an away settle. Round 147's rule is
   that emphasis animates and a number never does. The balance is the engine's
   own now, and the arrival still has all its theatre: the money floats off
   the pitch, the pulse rings fire and the confetti lands. */

/** Deterministic pseudo-random for stable crowd seat positions. */
function seatRand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Round 583: a rate under ten dollars a second keeps its cents, so a new club
 *  reads $4.50 a second as the rules say, and a Turnstile Steward $0.60, not $0. */
function fmtRate(n: number): string {
  return n < 10 ? `$${n.toFixed(2)}` : fmtMoney(n);
}

const CONFETTI_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#a855f7', '#f97316'];

/** Round 583: the Stadium tab's office panels, one open at a time. */
type OfficePanel = 'upgrades' | 'payroll' | 'ach' | 'legacy' | 'stats';

export default function StadiumTycoon() {
  const [savedAcademy] = useState(() => {
    try {
      const now = Date.now();
      const snapshot = deserializeAcademy(localStorage.getItem(ACADEMY_SAVE_KEY), now, loadLedger().gearLevel);
      if (snapshot) applyAcademyOffline(snapshot, now);
      return snapshot;
    }
    catch { return null; }
  });
  const academyRef = useRef(savedAcademy);
  const getEdge = useCallback(() => academyRef.current ? squadEdge(academyRef.current, loadLedger().gearLevel) : 0, []);
  const onAcademySnapshot = useCallback((snapshot: FactoryState) => { academyRef.current = snapshot; }, []);
  const g = useStadiumTycoon(getEdge);
  const [room, setRoom] = useState<Room>('stadium');
  /* A returning first team keeps its clock even before the Academy tab opens. */
  const [academyOpened, setAcademyOpened] = useState(() => Boolean(savedAcademy?.firstTeam?.length));
  const [academyStatus, setAcademyStatus] = useState<AcademyStatus | null>(null);
  const [stadiumNeedsYou, setStadiumNeedsYou] = useState(false);

  const openRoom = (next: Room) => {
    if (next === 'academy') setAcademyOpened(true);
    setRoom(next);
  };
  /* A tab lights when the room behind it needs you. Never the room you are in. */
  const academyAccent = room !== 'academy' && academyStatus !== null
    && (academyStatus.deadline || academyStatus.bedsFull || academyStatus.moveUp || academyStatus.leavingSoon);
  const stadiumAccent = room !== 'stadium' && stadiumNeedsYou;
  const tabs: { id: Room; label: string; emoji: string; accent: boolean }[] = [
    { id: 'stadium', label: 'Stadium', emoji: '🏟️', accent: stadiumAccent },
    { id: 'academy', label: 'Academy', emoji: '🎓', accent: academyAccent },
    { id: 'league', label: 'League', emoji: '🏆', accent: false },
  ];

  return (
    <div id="dukb-main" tabIndex={-1} className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Stadium Tycoon: Free Idle Soccer Club Game | DoUKnowBall"
        description="Grow a tiny football club into an empire. Live toy matches, ten divisions, a staff payroll, golden whistles, 47 badges, reputation stars and a legacy boardroom of permanent perks. Free idle game, no sign-up."
        path="/stadium-tycoon"
      />
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <CelebrationStyles />
        <header className="text-center mb-2">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display">STADIUM TYCOON</h1>
        </header>

        {/* Round 580: the rooms. Each keeps its own clock whichever one is on screen. */}
        <div className="grid grid-cols-3 gap-2 mb-2" role="group" aria-label="Tycoon rooms">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              data-room={t.id}
              data-accent={t.accent ? 'true' : 'false'}
              aria-pressed={room === t.id}
              onClick={() => openRoom(t.id)}
              className={cn(
                'relative min-h-[40px] rounded-xl border text-sm font-bold transition-all',
                room === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary',
              )}
            >
              {t.emoji} {t.label}
              {t.accent && (
                <>
                  <span aria-hidden="true" className="absolute top-1.5 right-2 h-2.5 w-2.5 rounded-full bg-yellow-400 motion-safe:animate-pulse" />
                  <span className="sr-only"> (needs you)</span>
                </>
              )}
            </button>
          ))}
        </div>

        {g.gearSaveBlocked && <p role="alert" data-no-prerender className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">Title equipment could not be saved, so no new equipment was added. Your existing pairs are safe. Allow device storage before earning another title.</p>}
        <StadiumRoom g={g} visible={room === 'stadium'} onNeedsYou={setStadiumNeedsYou} />
        <LeagueRoom g={g} visible={room === 'league'} />
        {academyOpened && (
          <Suspense fallback={<div className="h-40" />}>
            <AcademyPanel visible={room === 'academy'} onStatus={setAcademyStatus} onSnapshot={onAcademySnapshot} />
          </Suspense>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Stadium Tycoon"
          description="Grow a tiny football club into an empire: live toy matches, ten divisions to climb, a staff payroll, golden whistles, 47 badges, reputation stars and a legacy boardroom of permanent perks."
        />
      </div>

      {/* local animation keyframes */}
      <style>{`
        @keyframes stFloat { 0% { opacity: 0; transform: translateY(6px) scale(0.9); } 12% { opacity: 1; transform: translateY(0) scale(1.06); } 100% { opacity: 0; transform: translateY(-46px) scale(1); } }
        .st-float { animation: stFloat 1.8s ease-out forwards; }
        @keyframes stConfetti { 0% { opacity: 1; transform: translateY(-8px) rotate(0deg); } 100% { opacity: 0; transform: translateY(190px) rotate(540deg); } }
        .st-confetti { animation-name: stConfetti; animation-timing-function: ease-in; animation-fill-mode: forwards; }
        @keyframes stGlow { 0%, 100% { box-shadow: 0 0 6px rgba(234,179,8,0.5); } 50% { box-shadow: 0 0 22px rgba(234,179,8,0.9); } }
        .st-glow { animation: stGlow 1.6s ease-in-out infinite; }
        @keyframes stGoldwob { 0%, 100% { transform: rotate(-14deg) scale(1); filter: brightness(1); } 25% { transform: rotate(10deg) scale(1.22); filter: brightness(1.35); } 50% { transform: rotate(-8deg) scale(1.05); filter: brightness(1.1); } 75% { transform: rotate(12deg) scale(1.18); filter: brightness(1.3); } }
        .st-goldwob { animation: stGoldwob 0.9s ease-in-out infinite; }
        /* Round 530: the setting the visitor already made. The two loops stop
           looping, the floaters land as plain text until they are cleared, and
           the confetti (decoration, nothing to read) does not run at all. */
        @media (prefers-reduced-motion: reduce) {
          .st-glow, .st-goldwob { animation: none; }
          .st-float { animation: none; opacity: 1; transform: none; }
          .st-confetti { display: none; }
        }
      `}</style>
    </div>
  );
}

/** Round 583: every number the rules modal states, read off the engine when the
 *  modal opens. Called at render, never at module scope (the import cycle rule). */
function helpFacts() {
  const fresh = newTycoon(0);
  const full = { ...fresh, fanbase: 400, levels: { ...fresh.levels, stands: 7 } };
  const maxed = { ...fresh, legacyPerks: Object.fromEntries(LEGACY_PERKS.map(p => [p.id, p.costs.length])) };
  const byId = (id: string) => MILESTONES.find(m => m.id === id)?.label.toLowerCase() ?? '';
  const perk = (id: string) => LEGACY_PERKS.find(p => p.id === id);
  return {
    chargeMin: BOOST_CHARGE_SEC / 60,
    voltage1: boostChargeSecOf({ ...fresh, legacyPerks: { voltage: 1 } }) / 60,
    voltage2: boostChargeSecOf({ ...fresh, legacyPerks: { voltage: 2 } }) / 60,
    hypeSec: BOOST_DURATION_SEC,
    divisions: DIVISIONS.length,
    firstDivision: DIVISIONS[0].name,
    lastDivision: DIVISIONS[DIVISIONS.length - 1].name,
    topMult: DIVISIONS[DIVISIONS.length - 1].incomeMult,
    staff: STAFF.length,
    firstStaff: STAFF[0].name,
    lastStaff: STAFF[STAFF.length - 1].name,
    catchSec: GOLDEN_CATCH_SEC,
    prizes: Object.keys(GOLDEN_INFO).length,
    windfallMin: WINDFALL_SEC / 60,
    milestoneExamples: `${byId('win1')}, ${byId('full')}, ${byId('fans10k')} and ${byId('streak5')}`,
    milestones: MILESTONES.length,
    badges: ACHIEVEMENTS.length,
    firstBadge: ACHIEVEMENTS[0].label,
    lastBadge: ACHIEVEMENTS[ACHIEVEMENTS.length - 1].label,
    badgePct: Math.round(ACH_BONUS * 100),
    starPct: Math.round((repMult({ ...fresh, rep: 1 }) - 1) * 100),
    saleBase: pointsForSale(fresh),
    summitPoints: pointsForSale({ ...fresh, league: newLeague(0, DIVISIONS.length - 1, 0) }),
    perks: LEGACY_PERKS.length,
    firstPerk: perk('sway')?.name ?? '',
    swayPct: Math.round((swayMult({ ...fresh, legacyPerks: { sway: 1 } }) - 1) * 100),
    perDivision: pointsForSale({ ...fresh, league: newLeague(0, 1, 0) }) - pointsForSale(fresh),
    shieldPerk: perk('shield')?.name ?? '',
    boardCost: LEGACY_PERKS.reduce((a, p) => a + p.costs.reduce((x, y) => x + y, 0), 0),
    awayPct: Math.round(offlineRateOf(fresh) * 100),
    awayHours: offlineCapHoursOf(fresh),
    awayPerk: perk('away')?.name ?? '',
    awayMaxPct: Math.round(offlineRateOf(maxed) * 100),
    awayMaxHours: offlineCapHoursOf(maxed),
    awayMatchMin: AWAY_MATCHDAY_SEC / 60,
    freshFans: fresh.fanbase,
    perFan: (incomePerSec(fresh) / attendance(fresh)).toFixed(2),
    freshRate: incomePerSec(fresh).toFixed(2),
    standsCost: costOf(fresh, 'stands'),
    seatsPerStand: capacity({ ...fresh, levels: { ...fresh.levels, stands: 1 } }) - capacity(fresh),
    exampleFans: attendance(full),
    rate400: incomePerSec(full),
    goal400: goalBonus(full),
    win400: winBonus(full),
  };
}

/* Round 582: the league. The table through Club Manager's own card, today's
   fixture, and the club name picked from the generated banks. Never the
   default tab, so none of it reaches a snapshot. */
function LeagueRoom({ g, visible }: { g: ReturnType<typeof useStadiumTycoon>; visible: boolean }) {
  if (!visible) return null;
  const s = g.state;
  const lg = s.league;
  if (!lg) return null;
  const shape = leagueShape(lg.division);
  const div = DIVISIONS[lg.division];
  const rows = leagueStandings(lg).map(c => ({ club: c.name, w: c.w, d: c.d, l: c.l, gf: c.gf, ga: c.ga, pts: c.pts }));
  const preseason = lg.matchday === 0;
  const options = s.clubName ? [] : clubNameOptions(s);
  const atSummit = lg.division >= DIVISIONS.length - 1;
  const last = g.lastSeason;
  return (
    <div data-league-room className="space-y-3 mb-3">
      <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <div className="font-bold text-foreground">{div.emoji} {div.name}</div>
        <div className="mt-0.5">
          {lg.carryover
            ? `Finishing a friendly against ${opponentName(s)}, then matchday 1 of ${shape.matchdays}.`
            : `Matchday ${lg.matchday + 1} of ${shape.matchdays}: ${opponentName(s)} at your ground.`}
          {' '}{atSummit ? 'This is the top: win the title and it pays the bonus again.' : 'Only the champion goes up.'}
        </div>
        {(s.leagueTitles ?? 0) > 0 && <div className="mt-0.5 text-gold font-bold">🏆 {s.leagueTitles} league title{s.leagueTitles === 1 ? '' : 's'} in your career</div>}
      </div>
      <LeagueTableCard rows={rows} myClub={lg.clubs[0].name} title={`Season ${lg.season + 1} at this ground`} preseason={preseason} zoneTop={1} />
      {last && (
        <div data-last-season>
          <LeagueTableCard
            rows={leagueStandings({ ...lg, clubs: last.table }).map(c => ({ club: c.name, w: c.w, d: c.d, l: c.l, gf: c.gf, ga: c.ga, pts: c.pts }))}
            myClub={last.table[0].name}
            title={`Last season: ${ordinal(last.position)}`}
            zoneTop={1}
            compact
          />
        </div>
      )}
      {options.length > 0 && (
        <div data-club-name-pick className="rounded-xl border border-border bg-card p-3">
          <div className="text-xs font-bold text-foreground mb-2">Name your club</div>
          <div className="grid grid-cols-1 gap-2">
            {options.map(name => (
              <button key={name} type="button" onClick={() => g.doSetClubName(name)} className="min-h-[40px] rounded-lg border border-border bg-background/40 text-sm font-bold text-foreground hover:border-primary">
                {name}
              </button>
            ))}
            <button type="button" onClick={() => g.doSetClubName(YOUR_CLUB)} className="min-h-[40px] rounded-lg text-xs text-muted-foreground hover:text-foreground">
              Keep "{YOUR_CLUB}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* The ground. Everything the page used to render, unchanged, except that it
   renders nothing while the Academy tab is showing and holds its two cards'
   timers until you are looking again. Its hooks keep running either way. */
function StadiumRoom({ g, visible, onNeedsYou }: { g: ReturnType<typeof useStadiumTycoon>; visible: boolean; onNeedsYou: (v: boolean) => void }) {
  const s = g.state;
  const kickClosed = !g.activeSetPiece || s.rep !== g.activeSetPiece.rep || (s.totalMatches ?? 0) !== g.activeSetPiece.match || s.minute >= 90;
  /* Round 585: the gems this club's results have earned. */
  const gems = balance(useTycoonRewards());
  const [showHelp, setShowHelp] = useState(false);
  /* Round 583: the rules open themselves once, before first play, the way the
     academy's always have. A save on this device means somebody has played. */
  useEffect(() => {
    try { if (!localStorage.getItem(TYCOON_SAVE_KEY)) setShowHelp(true); } catch { /* storage blocked: leave it closed */ }
  }, []);
  /* Round 162: the drawers (Round 196 added the boardroom). Round 583: all five
     rooms of the office are tiles now, one panel open at a time, Upgrades first
     because buying is the loop. */
  const [panel, setPanel] = useState<OfficePanel>('upgrades');
  const [burst, setBurst] = useState<{ id: number; pieces: { x: number; d: number; c: string; r: number }[] } | null>(null);
  const pitchRef = useRef<HTMLDivElement | null>(null);
  /* Round 583: floaters are positioned inside the pitch, so the tap is measured
     on the pitch too. It was measured on the stand-plus-pitch wrapper, which put
     every tap floater below where the finger landed. */
  const pitchAreaRef = useRef<HTMLDivElement | null>(null);
  /* Round 583: a tap's pop and sparks, and the taps chip. Display only: the tap
     is the hook's, and the chip counts taps, it never multiplies them. */
  const [tapFx, setTapFx] = useState<TapFx | null>(null);
  const [tapRun, setTapRun] = useState(0);
  const tapRunTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tapRunTimer.current), []);
  const tapAt = (x: number, y: number) => {
    g.doTap(x, y);
    setTapFx(f => ({ seq: (f?.seq ?? 0) + 1, x, y }));
    setTapRun(r => r + 1);
    window.clearTimeout(tapRunTimer.current);
    tapRunTimer.current = window.setTimeout(() => setTapRun(0), 1500);
  };
  /* Round 583: goals are replayed only while the pitch is on screen. */
  const { watchReplays } = g;
  useEffect(() => { watchReplays(visible); }, [visible, watchReplays]);

  const fans = attendance(s);
  const cap = capacity(s);
  const rate = incomePerSec(s);
  const div = divisionOf(s);
  /* Round 582: where this ground stands in its league. */
  const lg = s.league;
  const lgShape = lg ? leagueShape(lg.division) : null;
  const lgPos = lg ? leaguePosition(lg) : 0;
  /* Round 584: where the table stood when you came back, from the hook's snapshot. */
  const standing = g.awayTrip?.standing ?? null;
  const awayTableLine = !standing ? '' : standing.left <= 1
    ? `You are ${ordinal(standing.position)} of ${standing.clubs}, and the final matchday is waiting for you.`
    : `You are ${ordinal(standing.position)} of ${standing.clubs} with ${standing.left} matchdays to go.`;
  const atSummit = divisionIndex(s) >= DIVISIONS.length - 1;
  const achCount = (s.ach ?? []).length;
  const pts = legacyPointsOf(s);
  const affordable = TRACKS.filter(t => canBuy(s, t.id)).length;
  const officeTiles: { key: OfficePanel; icon: string; title: string; value: string; accent: boolean }[] = [
    { key: 'upgrades', icon: '🏗️', title: 'Upgrades', value: affordable > 0 ? `${affordable} ready` : 'saving up', accent: false },
    { key: 'payroll', icon: '🧑‍🤝‍🧑', title: 'Payroll', value: `${totalStaffLevels(s)} hired`, accent: false },
    { key: 'ach', icon: '🏅', title: 'Badges', value: `${achCount}/${ACHIEVEMENTS.length}`, accent: false },
    { key: 'legacy', icon: '🏛️', title: 'Legacy', value: pts > 0 ? `${pts} pts` : 'boardroom', accent: pts > 0 },
    { key: 'stats', icon: '📊', title: 'Records', value: `${s.totalWins.toLocaleString()} wins`, accent: false },
  ];
  /* What a sale pays once this league is won: the engine's answer one division up. */
  const saleAfterTitle = lg ? pointsForSale({ ...s, league: { ...lg, division: Math.min(lg.division + 1, DIVISIONS.length - 1) } }) : pointsForSale(s);

  // Goal confetti: a fresh burst every time the hook's counter moves.
  useEffect(() => {
    if (g.confetti === 0) return;
    const pieces = Array.from({ length: 26 }, (_, i) => ({
      x: 8 + seatRand(i + g.confetti * 31) * 84,
      d: 0.5 + seatRand(i * 7 + g.confetti) * 0.9,
      c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      r: Math.floor(seatRand(i * 13 + g.confetti * 3) * 360),
    }));
    setBurst({ id: g.confetti, pieces });
    const t = setTimeout(() => setBurst(null), 1700);
    return () => clearTimeout(t);
  }, [g.confetti]);

  /* Round 583: the toy match used to reshuffle ten dots and a ball on a 1900ms
     timer that knew nothing about the goals. The pitch is TycoonPitch now, and
     everything on it moves with the engine's match. */

  /* The crowd: one dot per ~14 fans, placed deterministically so the stand
     fills seat by seat as attendance really grows. Capped for perf. */
  const crowdDots = useMemo(() => {
    const n = Math.min(220, Math.floor(fans / 14));
    return Array.from({ length: n }, (_, i) => ({
      x: 2 + seatRand(i * 11) * 96,
      y: seatRand(i * 23) * 78,
      c: seatRand(i * 5) < 0.5 ? 'bg-primary/70' : 'bg-yellow-500/70',
    }));
  }, [fans]);

  /* Round 530: the promotion card sits on the pitch for four seconds or until
     Continue, and a badge line above the drawers for four seconds. Both are
     the hook's own event fields; the timers only take them down. */
  useEffect(() => {
    if (!g.promotion || !visible) return;
    const t = window.setTimeout(g.dismissPromotion, 4000);
    return () => window.clearTimeout(t);
  }, [g.promotion, g.dismissPromotion, visible]);
  useEffect(() => {
    if (!g.badge || !visible) return;
    const t = window.setTimeout(g.dismissBadge, 4000);
    return () => window.clearTimeout(t);
  }, [g.badge, g.dismissBadge, visible]);

  /* Round 580: the Stadium tab lights while a card or the away total is waiting. */
  useEffect(() => {
    onNeedsYou(Boolean(g.promotion || g.badge || g.awayPay !== null));
  }, [g.promotion, g.badge, g.awayPay, onNeedsYou]);

  const onPitchClick = (e: React.MouseEvent) => {
    const el = pitchAreaRef.current ?? pitchRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = (v: number) => (Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50);
    tapAt(pct(((e.clientX - r.left) / r.width) * 100), pct(((e.clientY - r.top) / r.height) * 100));
  };

  if (!visible) return null;

  return (
    <>
        <div className="text-center mb-3">
          {/* Round 162: the ladder this ground is climbing, front and center.
              Round 582: where the club sits in this division's league. */}
          <div className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-foreground bg-secondary rounded-full px-3 py-0.5">
            {div.emoji} {div.name}
            <span className="text-[10px] text-muted-foreground font-normal">
              {lg && lgShape
                ? lg.carryover
                  ? `· a friendly first, then matchday 1 of ${lgShape.matchdays}`
                  : lg.matchday === 0
                    /* Level on nothing, the table sorts by name, so a place would be a lie. */
                    ? `· matchday 1 of ${lgShape.matchdays}`
                    : `· ${ordinal(lgPos)} of ${lg.clubs.length} · matchday ${Math.min(lg.matchday + 1, lgShape.matchdays)} of ${lgShape.matchdays}`
                : ''}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">{Array.from({ length: Math.min(s.rep, 6) }, (_, i) => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}{s.rep > 6 && <span className="font-bold text-yellow-500">x{s.rep}</span>}{s.rep > 0 && <span className="text-yellow-500 font-bold">rep {Math.round((repMult(s) - 1) * 100)}%</span>}</span>
            {achCount > 0 && <span className="text-emerald-400 font-bold">badges +{Math.round(achCount * ACH_BONUS * 100)}%</span>}
            <span data-gem-chip className="font-bold text-sky-300">💎 {gems} gem{gems === 1 ? '' : 's'}</span>
            <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 px-2 py-2 transition-colors hover:text-foreground"><HelpCircle className="w-3.5 h-3.5" /> How it works</button>
          </div>
        </div>

        {/* Money header */}
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <div className="text-3xl md:text-4xl font-bold font-display text-gold tabular-nums">{fmtMoney(s.money)}</div>
            <div className="text-[11px] text-muted-foreground">
              +{fmtRate(rate)}/s
              {boostActive(s) && <span className="text-yellow-400 font-bold"> · HYPE x{HYPE_MULT} ({Math.ceil(s.boostLeftSec)}s)</span>}
              {goldenActive(s) && s.goldenKind && (
                <span className="text-amber-300 font-bold"> · {GOLDEN_INFO[s.goldenKind].label} ({Math.ceil(s.goldenLeftSec ?? 0)}s)</span>
              )}
              {s.streak >= 2 && <span className="text-orange-400 font-bold"> · streak x{streakMult(s).toFixed(2)}</span>}
              {divisionIndex(s) > 0 && <span className="text-sky-400 font-bold"> · stage x{div.incomeMult.toFixed(2)}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground tabular-nums">{fans.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">/ {cap.toLocaleString()} seats</span></div>
            <div className="text-[11px] text-muted-foreground">{Math.floor(s.fanbase).toLocaleString()} fans follow you</div>
          </div>
        </div>

        {/* Round 150: Matchday Hype. Charges over eight minutes of play,
            one press pays double for a minute. The button is the genre's
            heartbeat and his reference screenshots had it front and center. */}
        <button
          onClick={g.doBoost}
          disabled={!boostReady(s)}
          className={cn(
            'relative w-full mb-2 py-2 rounded-xl font-bold text-sm overflow-hidden border transition-all',
            boostActive(s) ? 'border-yellow-500 bg-yellow-500/15 text-yellow-400'
              : boostReady(s) ? 'border-yellow-500 bg-yellow-500 text-black st-glow'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          {!boostActive(s) && !boostReady(s) && (
            <span className="absolute inset-y-0 left-0 bg-yellow-500/15 transition-all duration-700" style={{ width: `${Math.min(100, ((s.boostChargeSec ?? 0) / boostChargeSecOf(s)) * 100)}%` }} />
          )}
          <span className="relative">
            {boostActive(s) ? `🔥 HYPE IS LIVE: income pays x${HYPE_MULT} (${Math.ceil(s.boostLeftSec)}s)`
              : boostReady(s) ? `📣 MATCHDAY HYPE READY: press for x${HYPE_MULT}`
              : `📣 Matchday Hype charging: ${Math.floor(((s.boostChargeSec ?? 0) / boostChargeSecOf(s)) * 100)}%`}
          </span>
        </button>

        {/* The stadium: stand + pitch + all the motion */}
        {/* Round 583: a real button for keyboard players. It sits beside the
            pitch rather than making the pitch a button, because the pitch holds
            buttons of its own (the golden whistle, the promotion card's Continue)
            and a button inside a button is not a control anyone can use. */}
        <button type="button" data-tap-key onClick={() => tapAt(50, 50)} className="sr-only focus:not-sr-only focus:mb-2 focus:block focus:w-full focus:rounded-xl focus:border focus:border-primary focus:py-2 focus:text-sm focus:font-bold">
          Tap the stadium for {fmtMoney(tapValue(s))}
        </button>
        <div ref={pitchRef} onClick={onPitchClick} className="relative rounded-2xl overflow-hidden border border-border cursor-pointer select-none mb-3 group">
          {/* Stand (crowd) */}
          <div className="relative h-16 md:h-20 bg-gradient-to-b from-secondary to-secondary/40 border-b border-border overflow-hidden">
            {crowdDots.map((d, i) => (
              <span key={i} className={cn('absolute w-1.5 h-1.5 rounded-full transition-opacity duration-700', d.c)} style={{ left: `${d.x}%`, top: `${d.y}%` }} />
            ))}
            {fans < 30 && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">the stand is nearly empty. build something worth watching</span>}
          </div>
          {/* Pitch */}
          <TycoonPitch
            areaRef={pitchAreaRef}
            goalsFor={s.goalsFor}
            goalsAgainst={s.goalsAgainst}
            minute={s.minute}
            totalMatches={s.totalMatches ?? 0}
            streak={s.streak}
            opponent={opponentName(s)}
            replays={g.replays}
            onReplayEnd={g.endReplay}
            tapFx={tapFx}
            tapRun={tapRun}
          >
            {/* tap hint */}
            <div className="absolute bottom-1.5 right-2 text-[10px] text-white/90 group-hover:text-white transition-colors">tap anywhere: +{fmtMoney(tapValue(s))}</div>
            {/* floaters */}
            {g.floaters.map(f => (
              <span
                key={f.id}
                className={cn(
                  'absolute pointer-events-none font-bold st-float whitespace-nowrap',
                  f.kind === 'goal' && 'text-yellow-300 text-lg',
                  f.kind === 'win' && 'text-emerald-300 text-lg',
                  f.kind === 'tap' && 'text-white text-sm',
                  f.kind === 'money' && 'text-emerald-200 text-sm',
                  f.kind === 'bad' && 'text-red-300 text-xs',
                )}
                style={{ left: `${f.x}%`, top: `${f.y}%` }}
              >
                {f.text}
              </span>
            ))}
            {/* confetti */}
            {burst && burst.pieces.map((p, i) => (
              <span key={`${burst.id}-${i}`} className="absolute top-0 w-1.5 h-2.5 st-confetti" style={{ left: `${p.x}%`, backgroundColor: p.c, animationDuration: `${p.d + 0.7}s`, transform: `rotate(${p.r}deg)` }} />
            ))}
            {/* Round 162: the golden whistle, drifting until caught or gone. */}
            {g.golden && (
              <button
                onClick={e => { e.stopPropagation(); g.doCatchGolden(); }}
                aria-label="Catch the golden whistle"
                className="absolute z-10 text-2xl st-goldwob drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]"
                style={{ left: `${g.golden.x}%`, top: `${g.golden.y}%` }}
              >
                🪙
              </button>
            )}
            {g.setPiece && <button type="button" data-set-piece-offer
              className="absolute right-3 top-3 z-20 min-h-11 rounded-xl border border-amber-200/60 bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950"
              onClick={event => { event.stopPropagation(); g.doBeginSetPiece(g.setPiece!); }}>
              ⚽ {g.setPiece.kind === 'penalty' ? 'Penalty' : 'Free kick'} · {Math.ceil(g.setPiece.remainingSec)}s
            </button>}
            {g.setPieceError && <p role="alert" className="pointer-events-none absolute inset-x-3 top-16 z-20 rounded-xl bg-card p-2 text-xs text-foreground">{g.setPieceError}</p>}
            {/* Round 530 review: the badge line lies over the pitch for its
                few seconds, the same reason the promotion card below does. In
                the flow above the drawer buttons it pushed them, an open
                drawer and everything under it down about 36px on arrival and
                snapped them back when the timer cleared it, with the player
                mid tap. It takes no clicks, so the ground underneath still
                pays. The bonus is the lib's own ACH_BONUS, never a typed 2. */}
            {g.badge && (
              <p
                key={g.badge.seq}
                className="cm-slam pointer-events-none absolute inset-x-2 bottom-7 z-10 rounded-xl border border-emerald-500/40 bg-card px-3 py-2 text-center text-xs font-bold text-emerald-400"
              >
                🏅 Badge earned: {g.badge.label}, +{Math.round(ACH_BONUS * 100)}% income forever
              </p>
            )}
            {/* Round 530: promotion. The card covers the pitch so the page
                never grows for it, and it swallows the click so a tap on it
                is not a tap on the ground. */}
            {g.promotion && (
              <div
                key={g.promotion.seq}
                data-promotion-card
                onClick={e => e.stopPropagation()}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-3 cursor-default"
              >
                <ConfettiBurst seed={g.promotion.seq} count={30} />
                <div className="relative max-w-full rounded-2xl border border-yellow-500/70 bg-card px-3 py-2 text-center text-yellow-400 shadow-lg">
                  <VictoryMoment compact>
                    <p className="font-display text-base font-black leading-tight text-yellow-400">
                      {g.promotion.label}
                    </p>
                  </VictoryMoment>
                  <p className="cm-rise mt-1 text-xs text-muted-foreground" style={{ animationDelay: '0.45s' }}>
                    +{fmtMoney(g.promotion.amount)} promotion bonus, every payout scaled up from here
                  </p>
                  <button
                    onClick={g.dismissPromotion}
                    className="mt-1 inline-flex min-h-[36px] items-center rounded-full bg-primary px-5 py-1.5 text-sm font-bold text-primary-foreground hover:brightness-110"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </TycoonPitch>
        </div>

        {/* Prestige bar */}
        <div className="mb-3">
          {canPrestige(s) ? (
            <button onClick={g.doPrestige} data-sell-up className="w-full py-2.5 rounded-xl font-bold bg-yellow-500 text-black hover:opacity-90 transition-opacity st-glow">
              ⭐ Sell up: permanent +{Math.round((repMult({ ...s, rep: s.rep + 1 }) - repMult(s)) * 100)}% income, +{pointsForSale(s)} legacy point{pointsForSale(s) === 1 ? '' : 's'}
            </button>
          ) : (
            <div className="relative h-2 rounded-full bg-secondary overflow-hidden" title="Progress to your next reputation star">
              <div className="absolute inset-y-0 left-0 bg-yellow-500/80 transition-all duration-700" style={{ width: `${Math.min(100, (s.lifetime / prestigeThreshold(s)) * 100)}%` }} />
            </div>
          )}
          <div className="text-[10px] text-muted-foreground text-center mt-1">
            {canPrestige(s)
              ? `the club has outgrown this ground${!atSummit ? `. Win this league first and the sale pays ${saleAfterTitle} legacy points instead` : ''}`
              : `next star at ${fmtMoney(prestigeThreshold(s))} lifetime earnings (${fmtMoney(s.lifetime)} so far)`}
          </div>
        </div>

        {/* Round 583: the office. Each tile's title is contract: the browser walks
            open a panel by it. */}
        <div className="grid grid-cols-5 gap-1.5 mb-2" role="group" aria-label="The club office">
          {officeTiles.map(t => (
            <button
              key={t.key}
              type="button"
              data-tile={t.key}
              {...(t.key === 'legacy' ? { 'data-legacy-drawer': '' } : {})}
              aria-pressed={panel === t.key}
              onClick={() => setPanel(t.key)}
              className={cn(
                'min-h-[52px] min-w-0 rounded-xl border px-1 py-1.5 text-center transition-all',
                panel === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary',
                t.accent && panel !== t.key && 'border-gold text-gold',
              )}
            >
              <span className="block text-sm leading-none" aria-hidden="true">{t.icon}</span>
              <span className="mt-1 block text-[10px] font-bold leading-tight">{t.title}</span>
              <span className={cn('block truncate text-[9px] leading-tight tabular-nums', panel === t.key ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{t.value}</span>
            </button>
          ))}
        </div>

        {panel === 'upgrades' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
          {TRACKS.map(t => {
            const lvl = levelOf(s, t.id);
            const cost = costOf(s, t.id);
            const ok = canBuy(s, t.id);
            return (
              <button
                key={t.id}
                onClick={() => g.doBuy(t.id)}
                disabled={!ok}
                className={cn(
                  'relative rounded-xl border p-2.5 text-left transition-all active:scale-[0.97]',
                  ok ? 'bg-card border-border hover:border-primary' : 'bg-card/50 border-border/50 opacity-70',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                  <span className="ml-auto text-[9px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5">Lv {lvl}</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 leading-snug min-h-[22px]">{t.blurb}</div>
                <div className={cn('text-[11px] font-bold mt-1 tabular-nums', ok ? 'text-gold' : 'text-muted-foreground')}>{fmtMoney(cost)}</div>
              </button>
            );
          })}
        </div>
        )}

        {/* Round 162: the payroll. Staff earn every second, forever, and the
            tiers escalate the way an idle game should: each one about five
            times the price and four and a half times the pay of the last. */}
        {panel === 'payroll' && (<>
        <div className="mb-1 flex items-center justify-between px-1">
          <div className="text-xs font-bold text-foreground">🧑‍🤝‍🧑 The payroll</div>
          <div className="text-[10px] text-muted-foreground">{totalStaffLevels(s)} hired · earning {fmtRate(STAFF.reduce((sum, t) => sum + staffLevelOf(s, t.id) * t.rate, 0))}/s base</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4">
          {STAFF.map(t => {
            const lvl = staffLevelOf(s, t.id);
            const cost = staffCostOf(s, t.id);
            const ok = canHire(s, t.id);
            return (
              <button
                key={t.id}
                onClick={() => g.doHire(t.id)}
                disabled={!ok}
                className={cn(
                  'relative rounded-xl border p-2.5 text-left transition-all active:scale-[0.97]',
                  ok ? 'bg-card border-border hover:border-primary' : 'bg-card/50 border-border/50 opacity-70',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-[11px] font-bold text-foreground truncate">{t.name}</span>
                  <span className="ml-auto text-[9px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5">{lvl}</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 leading-snug min-h-[22px]">{t.blurb}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn('text-[11px] font-bold tabular-nums', ok ? 'text-gold' : 'text-muted-foreground')}>{fmtMoney(cost)}</span>
                  <span className="text-[9px] text-emerald-400 tabular-nums">+{fmtRate(t.rate)}/s</span>
                </div>
              </button>
            );
          })}
        </div>
        </>)}

        {panel === 'ach' && (
          <div className="bg-card border border-border rounded-xl p-3 mb-3">
            <div className="text-[10px] text-muted-foreground mb-2">Every badge is a permanent +{Math.round(ACH_BONUS * 100)}% income, on every ground, forever. {achCount} of {ACHIEVEMENTS.length} earned.</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {ACHIEVEMENTS.map(a => {
                const got = (s.ach ?? []).includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={cn('rounded-lg border px-2 py-1.5 text-[10px] flex items-center gap-1.5',
                      got ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground' : 'border-border/60 bg-background/40 text-muted-foreground')}
                  >
                    <span className="text-sm leading-none">{got ? a.emoji : '🔒'}</span>
                    <span className="truncate">{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Round 196: the boardroom. Legacy points buy permanent perks. */}
        {panel === 'legacy' && (() => {
          const hf = helpFacts();
          return (
          <div data-legacy-board className="bg-card border border-border rounded-xl p-3 mb-3">
            <div className="text-[10px] text-muted-foreground mb-2">
              Selling up pays legacy points: {hf.saleBase} for the sale plus {hf.perDivision} per division that ground climbed, so a sale from {hf.lastDivision} pays {hf.summitPoints}.
              Every perk bought here is permanent, on every future ground, forever.
              You have <b className="text-gold">{legacyPointsOf(s)} point{legacyPointsOf(s) === 1 ? '' : 's'}</b> to spend.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {LEGACY_PERKS.map(p => {
                const lvl = perkLevelOf(s, p.id);
                const cost = perkCostOf(s, p.id);
                const ok = canBuyPerk(s, p.id);
                return (
                  <div key={p.id} data-perk={p.id} className={cn('rounded-lg border px-2 py-1.5 text-[10px] flex items-center gap-2',
                    lvl > 0 ? 'border-gold/40 bg-gold/5' : 'border-border/60 bg-background/40')}>
                    <span className="text-base leading-none shrink-0">{p.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-bold text-foreground">{p.name}</span>
                      <span className="ml-1 text-muted-foreground">Lv {lvl}/{p.costs.length}</span>
                      <span className="block text-muted-foreground leading-snug">{p.blurb}</span>
                    </span>
                    {cost === null ? (
                      <span className="shrink-0 text-[9px] font-bold text-gold">MAXED</span>
                    ) : (
                      <button
                        onClick={() => g.doLegacyPerk(p.id)}
                        disabled={!ok}
                        className={cn('shrink-0 min-h-[30px] rounded-full px-2.5 py-1 text-[9px] font-bold transition-all active:scale-95',
                          ok ? 'bg-gold text-black hover:opacity-90' : 'bg-secondary text-muted-foreground')}
                      >
                        {cost} pt{cost === 1 ? '' : 's'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {panel === 'stats' && (
          <div className="bg-card border border-border rounded-xl p-3 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
              {[
                ['Lifetime, this ground', fmtMoney(s.lifetime)],
                ['Career wins', s.totalWins.toLocaleString()],
                ['Career goals', s.totalGoals.toLocaleString()],
                ['Matches played', (s.totalMatches ?? 0).toLocaleString()],
                ['Taps', s.totalTaps.toLocaleString()],
                ['Best division', `${DIVISIONS[Math.min(s.bestDivision ?? 0, DIVISIONS.length - 1)].emoji} ${DIVISIONS[Math.min(s.bestDivision ?? 0, DIVISIONS.length - 1)].name}`],
                ['Golden whistles caught', (s.goldenCaught ?? 0).toLocaleString()],
                ['Hype boosts pressed', (s.boostsUsed ?? 0).toLocaleString()],
                ['Reputation stars', s.rep.toLocaleString()],
                ['Legacy points unspent', legacyPointsOf(s).toLocaleString()],
                ['Legacy perk levels', totalPerkLevels(s).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-secondary/50 px-2 py-2">
                  <div className="text-xs font-bold font-display text-foreground truncate">{value}</div>
                  <div className="text-[9px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* lifetime line */}
        <div className="text-[10px] text-muted-foreground text-center pb-4">
          lifetime {fmtMoney(s.lifetime)} · {s.totalWins} wins · {s.totalGoals} goals · {s.totalTaps} taps · match #{s.matchNo + 1} · milestones {(s.claimed ?? []).length}/{MILESTONES.length} · badges {achCount}/{ACHIEVEMENTS.length}
        </div>

      <Dialog open={Boolean(g.activeSetPiece)} onOpenChange={open => { if (!open) g.closeSetPiece(); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl p-4">
          <DialogTitle className="sr-only">Watched match kick</DialogTitle>
          <DialogDescription data-set-piece-match className="text-xs tabular-nums text-muted-foreground">
            {kickClosed ? 'Kick closed' : `Match ${s.minute}' · ${s.goalsFor} - ${s.goalsAgainst}`}
          </DialogDescription>
          {g.activeSetPiece && <Suspense fallback={<p className="text-sm">Getting the kick ready...</p>}>
            <SetPieceBoard key={`${g.activeSetPiece.rep}:${g.activeSetPiece.match}`} kickIndex={g.activeSetPiece.kickIndex} seed={g.activeSetPiece.seed}
              expired={kickClosed}
              onResult={scored => g.doSetPieceResult(g.activeSetPiece!, scored)} onBack={g.closeSetPiece} />
          </Suspense>}
        </DialogContent>
      </Dialog>

      {/* Away earnings modal */}
      {g.awayPay !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={g.dismissAway}>
          <div role="dialog" aria-modal="true" aria-label="While you were away" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(g.dismissAway)} className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-2">🏟️</div>
            <div className="text-lg font-bold font-display text-foreground">While you were away</div>
            <p className="text-sm text-muted-foreground mt-1">The turnstiles kept spinning at {Math.round(offlineRateOf(s) * 100)}% speed.</p>
            <div className="text-3xl font-bold font-display text-gold mt-3">+{fmtMoney(g.awayPay)}</div>
            {g.awayTrip && (
              <div data-away-results className="mt-3">
                <p className="text-xs text-muted-foreground">Your club kept playing while you were away, with no goal or win bonuses:</p>
                <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                  {g.awayTrip.results.map((m, i) => (
                    <span
                      key={i}
                      role="img"
                      aria-label={`${m.result === 'W' ? 'won' : m.result === 'L' ? 'lost' : 'drew'}${m.friendly ? ' a friendly' : ''}`}
                      className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
                        m.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' : m.result === 'L' ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-muted-foreground',
                        m.friendly && 'opacity-60 ring-1 ring-border')}
                    >
                      {m.result}
                    </span>
                  ))}
                </div>
                {g.awayTrip.results[0]?.friendly && <p className="mt-1 text-[11px] text-muted-foreground">The faded result was a friendly, played outside the table.</p>}
                {g.awayTrip.milestonePay > 0 && <p className="mt-2 text-xs font-bold text-gold">Milestones reached on the road: +{fmtMoney(g.awayTrip.milestonePay)}</p>}
                {g.awayTrip.gems > 0 && <p className="mt-1 text-xs font-bold text-sky-300">Away wins earned 💎 {g.awayTrip.gems} gem{g.awayTrip.gems === 1 ? '' : 's'}</p>}
                {awayTableLine && <p className="mt-2 text-xs text-muted-foreground">{awayTableLine}</p>}
              </div>
            )}
            <button onClick={g.dismissAway} className="mt-4 w-full py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Back to work</button>
          </div>
        </div>
      )}

      {/* Rules modal. Round 583: every number in it is read off the engine, and
          the claims the engine did not back are gone: Hype never doubled goal or
          win bonuses, and "400 fans and $12/s" could not happen (400 fans pay
          $20 a second). scripts/simTycoonHelp.mjs holds the guide to the same. */}
      {showHelp && (() => {
        const h = helpFacts();
        return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div role="dialog" aria-modal="true" aria-label="How Stadium Tycoon works" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(() => setShowHelp(false))} className="bg-card border border-border rounded-2xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold font-display text-foreground">How Stadium Tycoon works</div>
              <button onClick={() => setShowHelp(false)} aria-label="Close the rules"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div data-tycoon-rules className="text-sm text-muted-foreground space-y-2">
              <p>You run a tiny club's matchday money machine. Fans show up if there are seats and things to spend on; every fan pays you every second.</p>
              <p>The match on screen is real: your Squad level drives goals, goals pay a bonus scaled by the crowd, wins extend a streak that multiplies everything and pulls in new fans. A division's rivals stay as strong as they were when you arrived, but every division up is tougher, and the longer the club has played the tougher each new one is.</p>
              <p>Tap the stadium for instant cash (Megaphone makes taps stronger). Buy Stands when the ground is full, spending tracks when it is not.</p>
              <p>Matchday Hype charges over {h.chargeMin} minutes of play (Stadium Voltage in the boardroom trims that to {h.voltage1}, then {h.voltage2}). Press it and your income pays double for {h.hypeSec} seconds, and your taps rise with it; goal and win bonuses are not doubled. It does not charge or burn while you are away.</p>
              <p>Your ground plays in a league, {h.divisions} divisions from the {h.firstDivision} to {h.lastDivision}. Each division is a small league of named rivals: {leagueShape(0).clubs} clubs playing each other once in the bottom {SINGLE_LEG_BELOW} divisions, then {leagueShape(3).clubs} and {leagueShape(6).clubs} clubs home and away. Only the champion goes up, and nobody ever goes down. Every division multiplies all income, up to x{h.topMult} at the top, going up pays a promotion bonus on the spot, and a title at {h.lastDivision} pays it again. Higher divisions send tougher opponents. The League tab shows the table.</p>
              <p>The payroll hires {h.staff} staff, from a {h.firstStaff} to a {h.lastStaff}. Every staff level adds steady income of its own before the multipliers touch it, so a deep payroll compounds hard.</p>
              <p>While you play, a golden whistle drifts onto the pitch every couple of minutes. You get about {h.catchSec} seconds to catch it, for one of {h.prizes} prizes: {GOLDEN_INFO.frenzy.label} ({GOLDEN_INFO.frenzy.blurb} for {GOLDEN_INFO.frenzy.duration} seconds), {GOLDEN_INFO.tapRush.label} ({GOLDEN_INFO.tapRush.blurb} for {GOLDEN_INFO.tapRush.duration} seconds), {GOLDEN_INFO.windfall.label} ({h.windfallMin} minutes of income, instantly), {GOLDEN_INFO.fanWave.label} ({GOLDEN_INFO.fanWave.blurb}) or {GOLDEN_INFO.freeLevel.label} ({GOLDEN_INFO.freeLevel.blurb}).</p>
              <p>A penalty or free-kick offer appears once per watched match. You have {SET_PIECE_WINDOW_SEC} seconds to open it. Pick your aim, power and curve for one shot while the match clock keeps running. Opening uses that match's attempt, including if you leave or reload. A goal before full time adds one goal and the usual goal bonus; a miss costs nothing. Away matches have no kick offers, and kicks have no daily score or direct gem reward.</p>
              <p>Milestones pay once each for the club's firsts, like {h.milestoneExamples}. {h.milestones} in all, and they stay earned even after you sell up.</p>
              <p>Badges are the long game: {h.badges} of them, from {h.firstBadge} to {h.lastBadge}, and each one earned is +{h.badgePct}% income forever. Check them on the Badges tile, and your career numbers on Records.</p>
              <p>When lifetime earnings hit the bar, sell up: fans, ground, staff and division reset, but you keep a permanent Reputation star worth +{h.starPct}% income each, every badge, and your club records. The ladder is faster every run.</p>
              <p>Selling up also pays legacy points: {h.saleBase} for the sale plus {h.perDivision} per division that ground climbed, so cashing out early pays {h.saleBase} and a sale from {h.lastDivision} pays {h.summitPoints}. Spend them in the Legacy boardroom on {h.perks} permanent perks, from {h.firstPerk} (+{h.swayPct}% income per level, forever) to {h.shieldPerk}, which keeps half your streak through a loss. The whole board costs exactly {h.boardCost} points. Perks survive every future sale.</p>
              <p>Away from the game, you earn at {h.awayPct}% speed for up to {h.awayHours} hours (the {h.awayPerk} perk raises both, up to {h.awayMaxPct}% for {h.awayMaxHours} hours). Matchdays keep playing while you are away, one every {h.awayMatchMin} minutes with no goal or win bonuses, and the final matchday of a season always waits for you. Progress saves on this device.</p>
              <p>Gems come only from results: a watched win earns {GEM_PAY.win}, a watched draw {GEM_PAY.draw}, and a win played while you were away {GEM_PAY.awayWin}. Winning a league adds {GEM_PAY.title} and finishing second adds {GEM_PAY.runnerUp}. They open packs of generated kids in the Academy tab, where every pack prints its odds before you open it, and gems are never for sale.</p>
              <p>The Academy tab runs your youth academy inside this game, on its own save, with its own How it works button.</p>
              <p>Worked example: a new club has {h.freshFans} fans paying ${h.perFan} each, ${h.freshRate} a second. The first Stands level costs ${h.standsCost} and adds {h.seatsPerStand} seats you cannot fill yet, so the Ticket Office pays first. Later, a full ground of {h.exampleFans} fans pays {fmtMoney(h.rate400)} a second, a goal pays {fmtMoney(h.goal400)} before any streak, and a win pays {fmtMoney(h.win400)}.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Let's go
            </button>
          </div>
        </div>
        );
      })()}
    </>
  );
}
