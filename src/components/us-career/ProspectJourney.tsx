import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Check, HelpCircle } from 'lucide-react';
import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import { PreDraftSeasonCard } from '@/components/career/PreDraftSeasonCard';
import { DraftShowcaseCard } from '@/components/career/DraftShowcaseCard';
import { preDraftChoose, preDraftPlaySeason, preDraftProjection, preDraftProjectionLine, preDraftRunDraft, preDraftShowcase, preDraftStart, type PreDraftState } from '@/lib/careerPreDraft';
import type { UsCareerProspect } from '@/lib/usCareerProspect';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { useRevealScroll } from '@/hooks/useRevealScroll';
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
     the night ends: the words and the club are held on the board's clock. */
  const nightHold = night && nightKit && nightStage !== 'skipped' ? `${nightKit.careerNightClock(night).closeAt}s` : undefined;
  const held = !!night && nightStage === 'live';
  const out = state?.draft;
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
      <div className={styles.stage} key={eventKey} data-arrival={state?.phase === 'done' || undefined} data-night-hold={nightHold ? '' : undefined}>
        <div className={styles.stadium} aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className={styles.stageCopy}>
          <p className={styles.chapter}>{sport.label} Road to the Draft</p>
          <h2 ref={titleRef} tabIndex={-1}>{title}</h2>
          <p>{out ? desc.teamLabel(out.team) : state ? desc.routes.find(r => r.id === state.routeId)?.label : 'Choose the road. Build your stock. Find your team.'}</p>
        </div>
        <div className={styles.portrait} aria-hidden="true"><PlayerAvatar appearance={prospect.appearance} clubColor={sport.create.clubColor} size={130} /></div>
      </div>
      <div className={styles.file} data-night-hold={nightHold && out?.devSeasons.length ? '' : undefined}>
        <div className={styles.identity}><strong>{prospect.name}</strong><span data-night-held>{prospect.pos}{state ? ` · Age ${out?.ageAfter ?? state.age}` : ''}</span></div>
        <dl className={styles.meters}>
          <div><dt>Rating</dt><dd data-night-held>{out?.ratingAfter ?? state?.rating ?? prospect.rating}</dd></div>
          <div><dt>Potential</dt><dd>{prospect.pot}</dd></div>
          <div><dt>Health</dt><dd data-night-held>{out?.devSeasons.length ? 100 : state?.health ?? 100}</dd></div>
          {state && <div><dt>Draft stock</dt><dd>{state.stock}<small>/100</small></dd></div>}
        </dl>
      </div>
      {help && <div id="prospect-help" className={styles.help}>
        <h3>Make the league on your terms</h3>
        <p>Pick a route, play its seasons, then decide how to handle scouts, training and health. Your rating and health shape your performances. Draft stock shapes how early a team takes you.</p>
        <p><strong>For example:</strong> playing through a knock can raise your stock but cost health. The button shows the exact change before you choose. The showcase lets you push hard, play safe or skip; each option lists its possible stock changes. Its grade is simulated from your rating, health and saved career seed.</p>
        <p><strong>Draft night:</strong> before the draft the scouts quote a range for you, and the night always ends inside it. At a draft stock of 60, for example: {preDraftProjectionLine(preDraftProjection(desc, { stock: 60, pos: prospect.pos }), 'have')} Then you watch the picks ahead of yours come off the board in the order the game already set, until your name is called or the last pick goes by without it. Nothing is drawn while you watch, no other prospect is ever named, and you can skip to your pick at any time.{desc.lottery ? ' The lottery tile shows which club won each drawn pick. Seed 1 is the worst record.' : ''}</p>
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
          : <DraftShowcaseCard desc={{ ...desc, bonusLine: undefined }} state={state} onShowcase={approach => onChange(preDraftShowcase(desc, state, approach))}
              onRunDraft={() => { setNightStage(!nightKit ? 'off' : lessMotion() ? 'skipped' : 'live'); onChange(preDraftRunDraft(desc, state)); }} onContinue={onJoin}
              showRange nightHold={nightHold}
              night={night && nightKit && out ? <nightKit.DraftNightSequence night={night} desc={desc} draftYear={out.draftYear} stage={nightStage === 'live' ? 'live' : nightStage === 'landed' ? 'landed' : 'skipped'}
                onLanded={() => setNightStage(s => (s === 'live' ? 'landed' : s))} onSkip={() => setNightStage('skipped')} onContinue={onJoin} /> : undefined} />}
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
