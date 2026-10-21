import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Check, HelpCircle } from 'lucide-react';
import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import { PreDraftSeasonCard } from '@/components/career/PreDraftSeasonCard';
import { DraftShowcaseCard } from '@/components/career/DraftShowcaseCard';
import { preDraftChoose, preDraftPlaySeason, preDraftProjection, preDraftProjectionLine, preDraftRunDraft, preDraftShowcase, preDraftStart, preDraftUndoSkip, type PreDraftState } from '@/lib/careerPreDraft';
import type { UsCareerProspect } from '@/lib/usCareerProspect';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useTapSettle } from '@/hooks/useTapSettle';
import styles from './ProspectJourney.module.css';

const ACTS = ['Pick your path', 'Earn your place', 'Draft day'];

/* Round 1220: draft night is one lazy chunk (the rows, the clock and the
   lottery tile), asked for when the road reaches the draft. If it is not
   here when "Draft day" is pressed there is no night, only the result. */
type NightKit = typeof import('@/components/career/DraftNightSequence');
type NightStage = 'off' | 'live' | 'landed' | 'skipped';
const lessMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ProspectJourney({ sport, prospect, onChange, onJoin, onBack }: {
  sport: UsCareerSport;
  prospect: UsCareerProspect;
  onChange: (state: PreDraftState) => void;
  onJoin: () => void;
  onBack: () => void;
}) {
  const { state } = prospect;
  const desc = sport.preDraft(prospect.eraId);
  const act = !state ? 0 : state.phase === 'season' || state.phase === 'choice' ? 1 : 2;
  const eventKey = `${state?.phase ?? 'routes'}:${state?.seasonsDone ?? 0}:${state?.pendingChoice ?? ''}`;
  const screenRef = useRevealScroll<HTMLElement>('prospect', { enabled: !state, skipFirst: false });
  const actionRef = useRevealScroll<HTMLDivElement>(eventKey, { enabled: !!state, skipFirst: false });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionTitleRef = useRef<HTMLHeadingElement>(null);
  const [help, setHelp] = useState(!state);
  /* Round 1346: draft night can be watched again in the mount that played it (never saved, like the night itself).
     Each run remounts the card and the stage, whose keys carry it, so the rows and the held result arrive again on
     the night's clock. The keys matter after a night that landed on its own: its hold (the result's cm-rise and the
     stage's data-night-hold) is already on, so without a remount nothing would start again and the pick would stay
     in sight while the rows replay (after a skipped night the hold is added fresh either way). Focus goes to the
     play area's own title, as it does at every new step. */
  const [nightRun, setNightRun] = useState(0);
  useEffect(() => { if (nightRun) actionTitleRef.current?.focus({ preventScroll: true }); }, [nightRun]);
  /* "Skip to the end" and "Watch it again" share one cell, so a press of either ignores a tap for a second after the
     other (useTapSettle): a double tap on the skip no longer starts the night over, nor one on the replay end it. */
  const nightSettle = useTapSettle();
  useEffect(() => { (state ? actionTitleRef : titleRef).current?.focus({ preventScroll: true }); }, [eventKey]);
  /* Round 1220: the night plays once, in the mount that pressed "Draft day".
     The flag is never saved, so a reload at the result shows the result. */
  const [nightKit, setNightKit] = useState<NightKit | null>(null);
  const [nightStage, setNightStage] = useState<NightStage>('off');
  const atDraft = state?.phase === 'draft';
  useEffect(() => {
    if (!atDraft) return;
    let alive = true;
    import('@/components/career/DraftNightSequence').then(kit => { if (alive) setNightKit(kit); }, () => undefined);
    return () => { alive = false; };
  }, [atDraft]);
  const nightOn = nightStage !== 'off';
  const night = useMemo(
    () => (nightOn && nightKit && state?.phase === 'done' ? nightKit.buildCareerDraftNight(sport.preDraft(prospect.eraId), state) : null),
    [nightOn, nightKit, state, sport, prospect.eraId],
  );
  /* While the rows are still arriving, nothing above the board may say how
     the night ends: the words and the club are held on the board's clock,
     and for a screen reader, which reads through opacity, they are out of
     the tree (aria-hidden) until the closing row has landed. */
  const nightHold = night && nightKit && nightStage !== 'skipped' ? `${nightKit.careerNightClock(night).closeAt}s` : undefined;
  const held = !!night && nightStage === 'live';
  const out = state?.draft;
  /* The file keeps the numbers it had before the press until the closing row
     has landed: the age, rating and health after the minors are part of the
     ending. (They were faded out and back in at first, which left "Rating" and
     "Health" with nothing beside them and took the position away as well.) */
  const after = held ? undefined : out;
  const title = !state ? 'Your career starts here.' : state.phase === 'done'
    ? out?.pick === null ? 'A different way in.' : 'This is your moment.'
    : state.phase === 'showcase' ? 'One last look.' : state.phase === 'draft' ? 'You have done the work.'
      : state.phase === 'choice' ? 'Scouts are watching.' : 'Put it on film.';

  return (
    <section ref={screenRef} className={styles.journey} data-prospect-journey={sport.slug} data-prospect-phase={state?.phase ?? 'routes'}
      style={nightHold ? { '--night-hold': nightHold } as CSSProperties : undefined}>
      <div className={styles.toolbar}>
        {!state ? <button onClick={onBack}><ArrowLeft size={16} /> Back to player</button> : <span>Your progress saves after every choice</span>}
        <button onClick={() => setHelp(v => !v)} aria-label="Road to the draft help" aria-expanded={help} aria-controls="prospect-help"><HelpCircle size={19} /></button>
      </div>
      <ol className={styles.acts} aria-label="Your road to the draft">
        {ACTS.map((label, i) => <li key={label} aria-current={i === act ? 'step' : undefined} data-complete={i < act || undefined}>
          <span>{i < act ? <Check size={15} /> : i + 1}</span>{label}
        </li>)}
      </ol>
      <div className={styles.stage} key={`${eventKey}:${nightRun}`} data-arrival={state?.phase === 'done' || undefined} data-night-hold={nightHold ? '' : undefined}>
        <div className={styles.stadium} aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className={styles.stageCopy}>
          <p className={styles.chapter}>{sport.label} Road to the Draft</p>
          <h2 ref={titleRef} tabIndex={-1} aria-hidden={held || undefined}>{title}</h2>
          <p aria-hidden={held || undefined}>{out ? desc.teamLabel(out.team) : state ? desc.routes.find(r => r.id === state.routeId)?.label : 'Choose the road. Build your stock. Find your team.'}</p>
        </div>
        <div className={styles.portrait} aria-hidden="true"><PlayerAvatar appearance={prospect.appearance} clubColor={sport.create.clubColor} size={130} /></div>
      </div>
      <div className={styles.file} data-prospect-file>
        <div className={styles.identity}><strong>{prospect.name}</strong><span>{prospect.pos}{state ? ` · Age ${after?.ageAfter ?? state.age}` : ''}</span></div>
        <dl className={styles.meters}>
          <div><dt>Rating</dt><dd>{after?.ratingAfter ?? state?.rating ?? prospect.rating}</dd></div>
          <div><dt>Potential</dt><dd>{prospect.pot}</dd></div>
          <div><dt>Health</dt><dd>{after?.devSeasons.length ? 100 : state?.health ?? 100}</dd></div>
          {state && <div><dt>Draft stock</dt><dd>{state.stock}<small>/100</small></dd></div>}
        </dl>
      </div>
      {help && <div id="prospect-help" className={styles.help}>
        <h3>Make the league on your terms</h3>
        <p>Pick a route, play its seasons, then decide how to handle scouts, training and health. Your rating and health shape your performances. Draft stock shapes how early a team takes you.</p>
        <p><strong>For example:</strong> playing through a knock can raise your stock but cost health. The button shows the exact change before you choose. The showcase lets you push hard, play safe or skip; each option lists its possible stock changes. Its grade is simulated from your rating, health and saved career seed.</p>
        <p>Pressed Skip it by mistake? Undo it any time before you press Draft day. For example: skip at a draft stock of 50 and you drop to 48; Undo skip puts you back at 50 with all three options open again.</p>
        <p><strong>Draft night:</strong> before the draft the scouts quote a range for you, and the night always ends inside it. At a draft stock of 60, for example: {preDraftProjectionLine(preDraftProjection(desc, { stock: 60, pos: prospect.pos }), 'have')} Then you watch the picks ahead of yours come off the board in the order the game already set, until your name is called or the last pick goes by without it. Nothing is drawn while you watch, no other prospect is ever named, and you can skip to the end at any time. Once it is over, Watch it again plays the same night from the start, unless your device is set to reduce motion.{desc.lottery ? ' The lottery tile shows which club won each drawn pick. Seed 1 is the worst record.' : ''}</p>
        <p>All prospects and results are fictional. The era sets the available teams and routes. The draft uses a simplified order without traded or extra picks; baseball and hockey lotteries are not modeled. Money in your career is a simulation, not a real contract quote. Going undrafted still leads to a camp signing.</p>
        <button className={styles.helpClose} onClick={() => setHelp(false)}>Got it</button>
      </div>}
      <div ref={state?.phase === 'choice' ? undefined : actionRef} className={styles.playArea}>
        <h3 ref={actionTitleRef} tabIndex={-1} className="sr-only">{held ? 'Draft night.' : title}</h3>
        {!state ? <div className={styles.routes}>
          {desc.routes.map(route => <button key={route.id} className={styles.route} onClick={() => { setHelp(false); onChange(preDraftStart(desc, { seed: prospect.seed, routeId: route.id, rating: prospect.rating, pot: prospect.pot, pos: prospect.pos })); }}>
            <span className={styles.routeTop}><span>{route.seasons} {route.seasons === 1 ? 'season' : 'seasons'}</span><ArrowRight size={19} /></span>
            <strong>{route.label}</strong><span>{route.blurb}</span>
            <small>Start at age {route.startAge} · Draft at {route.startAge + route.seasons}</small>
          </button>)}
        </div> : act === 1 ? <PreDraftSeasonCard desc={desc} state={state} choiceRef={actionRef} onPlaySeason={() => onChange(preDraftPlaySeason(desc, state))} onChoose={i => onChange(preDraftChoose(desc, state, i))} />
          : <DraftShowcaseCard key={nightRun} desc={{ ...desc, bonusLine: undefined }} state={state} onShowcase={approach => onChange(preDraftShowcase(desc, state, approach))}
              onRunDraft={() => { setNightStage(!nightKit ? 'off' : lessMotion() ? 'skipped' : 'live'); onChange(preDraftRunDraft(desc, state)); }} onContinue={onJoin}
              showRange nightHold={nightHold} nightHeld={held} onUndoSkip={() => onChange(preDraftUndoSkip(state))}
              night={night && nightKit && out ? <nightKit.DraftNightSequence night={night} desc={desc} draftYear={out.draftYear} stage={nightStage === 'live' ? 'live' : nightStage === 'landed' ? 'landed' : 'skipped'}
                onLanded={() => setNightStage(s => (s === 'live' ? 'landed' : s))} onSkip={() => { if (!nightSettle.settled()) return; nightSettle.mark(); setNightStage('skipped'); }} onContinue={onJoin}
                onReplay={lessMotion() ? undefined : () => { if (!nightSettle.settled()) return; nightSettle.mark(); setNightRun(n => n + 1); setNightStage('live'); }} /> : undefined} />}
      </div>
      {state && state.lines.length > 0 && <details className={styles.history}>
        <summary>Your scout file <span>{state.lines.length} {state.lines.length === 1 ? 'season' : 'seasons'}</span></summary>
        {state.lines.map((line, i) => <div key={i}><strong>Age {line.age} · {line.level}</strong><p>{line.stats.map(st => `${st.value} ${st.label}`).join(' · ')}</p><span>Draft stock {line.stockDelta >= 0 ? '+' : ''}{line.stockDelta}</span></div>)}
      </details>}
    </section>
  );
}

export function ProspectRecord({ sport, state }: { sport: UsCareerSport; state: PreDraftState }) {
  const desc = sport.preDraft(state.eraId);
  const out = state.draft;
  if (!out) return null;
  return <details className="rounded-2xl border border-border bg-card px-4" data-prospect-record>
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Your road to the draft</summary>
    <div className="space-y-3 pb-4 text-xs">
      <p>{desc.routes.find(r => r.id === state.routeId)?.label}. {out.draftYear}: {out.pick === null ? 'Undrafted signing' : `Round ${out.round}, ${out.pick} overall`} with {desc.teamLabel(out.team)}.</p>
      {[...state.lines, ...out.devSeasons].map((line, i) => <div className="rounded-lg bg-secondary p-3" key={i}>
        <p className="font-semibold">Age {line.age} · {line.level}</p>
        <p className="mt-1 text-muted-foreground">{line.stats.map(st => `${st.value} ${st.label}`).join(' · ')}</p>
      </div>)}
      <p className="text-muted-foreground">Entered the league in {out.draftYear + out.devSeasons.length} at age {out.ageAfter}, rated {out.ratingAfter}.</p>
    </div>
  </details>;
}
