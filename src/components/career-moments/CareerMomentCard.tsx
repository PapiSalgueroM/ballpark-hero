import { useRef, type CSSProperties, type ReactNode } from 'react';
import VictoryMoment from '@/components/game/VictoryMoment';
import { CelebrationStyles, revealAfter, revealDelay } from '@/components/club-manager/Celebration';
import { cn } from '@/lib/utils';
import { CareerMomentStyles } from './CareerMomentStyles';
import { Confetti } from './Confetti';
import {
  MAX_MOMENT_TICKS, TONE_COLOUR, clampLines, flatColour, momentBeats,
  type CareerMomentSpec, type MomentKind, type MomentTick,
} from './moments';
import { beatStyle, useCareerMoment, type CareerMoment } from './useCareerMoment';

/* Round 1107: the career moment kit. One card, four scenes (a signing, a
   trophy, an award, a milestone), built once for every career on the site.
   Soccer Career binds it in Round 1107; the four US career boards bind the
   same four scenes in Round 1131.

   It imports no game file. Its only imports are React, its own folder, the
   shared cup (VictoryMoment), the site's celebration layer (the stagger
   helper and CelebrationStyles, which live in the Club Manager folder for
   history's sake and are mounted by 75 games) and cn. A scene is handed
   plain strings and one colour; it never reads a save, an engine or a sport.
   scripts/simCareerMoments.mjs S1 holds that as an allow list.

   The three house rules (src/lib/usCareerReveal.ts wrote them down):
   - A NUMBER NEVER PASSES THROUGH A VALUE THAT WAS NEVER TRUE. The one number
     on a scene is two strings the game already formatted. The old one shows,
     the new one rolls in over it, and no third value ever exists. CSS only:
     no script ever touches the number.
   - LOSSES STAY QUIET. A quiet scene gets one plain rise: no slam, no rolling
     number, no ring, no ink, no confetti.
   - INVENT NOTHING. Every word is a string the binder's engine already wrote.

   The colour rule: One flat colour, used as a solid fill only. Never a
   stripe, a hoop, a sash, a second club colour, a sponsor, a crest, a number
   or anything that reads as a kit. docs/LEGAL_REVIEW.md has no line about
   colours (read 2026-10-07), so the governing words are CLAUDE.md's legal
   rules: no league or club logos, crests, kits or player photos, ever.

   The cup is VictoryMoment's generic cup and the medal below is a plain
   rosette, never the likeness of a real trophy or award. For a trophy won
   with a country the cup comes to the tournament card; the season summary
   already lifts one for the same win two cards earlier.

   A scene is an IN PLACE card, not an overlay: it mounts where the page puts
   it and the page's own reveal scroll brings it into view. The kit never
   scrolls, never focuses, never traps anything, holds no timer and writes no
   storage. Every box has its final size on the first frame and everything
   that moves is a transform or an opacity, so a scene never moves the page.
   It plays once per key (useCareerMoment), then holds its last frame for as
   long as it is mounted. There is no transition anywhere in the kit: the
   button's hover is a brightness step. */

export interface CareerMomentCardProps {
  spec: CareerMomentSpec;
  /** The binder's own picture for the left side: an avatar, a flag, an emoji. Wrapped aria-hidden. */
  art?: ReactNode;
  /** Given: the kit draws ONE button and calls this once. Absent: the binder's own control dismisses. */
  onDone?: () => void;
  /** Default "Continue →". */
  doneLabel?: string;
  /** No border, no background, no padding, no bar, no confetti, no button: the head of a card the binder owns. */
  embedded?: boolean;
  /** Stack the art above the copy, centred (a card head) instead of beside it. */
  stacked?: boolean;
  /** The binder's own moment, when its card already called useCareerMoment.
      With it the kit attaches no watch ref (the binder's card is what is
      watched) and spec.key is ignored. */
  moment?: CareerMoment;
  /** A short id for harnesses, unique per binding. Printed as data-cmo-bind. */
  bind?: string;
  /** Up to eight changed attributes, drawn as small tiles under the count. */
  ticks?: readonly MomentTick[];
  /** The binder's own rows under the lines. Not animated by the kit. */
  children?: ReactNode;
}

const SHELL: Record<CareerMomentSpec['tone'], string> = {
  gold: 'border-amber-500/40 bg-amber-500/10',
  good: 'border-emerald-500/40 bg-emerald-500/10',
  quiet: 'border-border bg-muted/30',
};
const ART_INK: Record<CareerMomentSpec['tone'], string> = {
  gold: 'text-amber-400',
  good: 'text-emerald-400',
  quiet: 'text-muted-foreground',
};
const DONE: Record<CareerMomentSpec['tone'], string> = {
  gold: 'bg-amber-600 text-black',
  good: 'bg-emerald-600 text-black',
  quiet: 'bg-secondary text-secondary-foreground',
};

/** A plain rosette: a scalloped disc and two ribbon tails. Nobody's medal. */
function Rosette() {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
      <path d="M13 24 9 38l7-4 4 5 0-13zM27 24l4 14-7-4-4 5 0-13z" fill="currentColor" opacity=".55" />
      <path d="M20 2l3.2 2.6 4.1-.5 1.6 3.8 3.8 1.6-.5 4.1L34.8 17l-2.6 3.2.5 4.1-3.8 1.6-1.6 3.8-4.1-.5L20 31.8l-3.2-2.6-4.1.5-1.6-3.8-3.8-1.6.5-4.1L5.2 17l2.6-3.2-.5-4.1 3.8-1.6 1.6-3.8 4.1.5z" fill="currentColor" />
      <circle cx="20" cy="17" r="7.5" fill="black" fillOpacity=".2" />
    </svg>
  );
}

/** The card itself. No hooks: the state comes in as two booleans, so a test
    or a rig can draw any of the three states directly.
      fresh and not live  "fresh": every beat holds on its first frame
      fresh and live      "live":  the beats run once
      not fresh           "still": no animated class, same box, same text */
export function CareerMomentCardView({
  spec, art, onDone, doneLabel = 'Continue →', embedded = false, stacked = false, bind, ticks, children,
  fresh, live, watchRef,
}: CareerMomentCardProps & { fresh: boolean; live: boolean; watchRef?: (el: HTMLElement | null) => void }) {
  const state = !fresh ? 'still' : live ? 'live' : 'fresh';
  const quiet = spec.tone === 'quiet';
  /* loud: this mount animates part by part. A quiet card animates as one. */
  const loud = fresh && !quiet;
  const m: CareerMoment = { fresh, live, ref: () => undefined };
  const lines = clampLines(spec.lines);
  const shown = (ticks ?? []).slice(0, MAX_MOMENT_TICKS);
  const beats = momentBeats(spec, shown.length);
  const at = (beat: number) => (loud ? beatStyle(m, revealDelay(beat, 0.1, 0.2)) : undefined);
  const fx = (cls: string) => (loud ? cls : '');
  const ink = flatColour(spec.colour) ?? TONE_COLOUR[spec.tone];
  const cup = spec.kind === 'trophy' && !quiet;
  const picture = spec.kind === 'award' ? art ?? <Rosette /> : art;
  const ring = spec.kind === 'award' && loud;
  const count = spec.count;
  const from = count && loud && count.from && count.from !== count.text ? count.from : null;
  const tickStart = beats.ticks.length > 0 ? revealAfter(beats.ticks[0], 0.1, 0.2) : 0;

  const copy = (
    <div className={cn('cmo-copy', cup && 'text-foreground')}>
      {/* A slam starts at 1.6 times its size, so it sits on a content wide
          h3 and its row clips across: it can never widen the page. */}
      <div className="overflow-x-clip">
        <h3 data-cmo-beat="title" className={cn('inline-block text-lg font-black leading-tight', fx('cm-slam'))} style={at(beats.title)}>
          {spec.title}
        </h3>
      </div>
      {lines.map((line, i) => (
        <p key={i} data-cmo-beat="line" className={cn('text-xs text-muted-foreground', fx('cm-rise'))} style={at(beats.lines[i])}>
          {line}
        </p>
      ))}
      {children}
    </div>
  );

  return (
    <div
      ref={watchRef}
      data-career-moment={spec.kind}
      data-cmo-tone={spec.tone}
      data-cmo-state={state}
      data-cmo-bind={bind}
      className={cn(
        'cmo',
        !embedded && 'overflow-hidden rounded-xl border p-3 pl-4',
        !embedded && SHELL[spec.tone],
        stacked && 'cmo-stack',
        state === 'fresh' && 'cmo-wait',
        state === 'still' && 'cmo-still',
        fresh && quiet && 'cm-rise',
      )}
      style={{ '--cmo-ink': ink, ...(fresh && quiet ? beatStyle(m, revealDelay(0, 0.1, 0.2)) : null) } as CSSProperties}
    >
      {!embedded && <span className="cmo-bar" aria-hidden="true" />}
      {cup ? (
        /* The cup is drawn in currentColor, so the shell carries the tone's
           colour and the copy inside is put back to the page's own. It is
           never the scene's colour: the cup is not a club's. */
        <div className={ART_INK[spec.tone]}>
          <VictoryMoment>{copy}</VictoryMoment>
        </div>
      ) : (
        <div className={cn('cmo-row', !picture && 'justify-center text-center')}>
          {picture && (
            <span aria-hidden="true" data-cmo-beat="art" className={cn('cmo-art', ART_INK[spec.tone], fx(spec.kind === 'award' ? 'cm-slam' : 'cm-rise'))} style={at(beats.art)}>
              {picture}
              {ring && <span className="cmo-ring" style={at(beats.art)} />}
            </span>
          )}
          {copy}
        </div>
      )}
      {count && (
        <div className="cmo-count">
          <span className="cmo-num bg-background/60 text-2xl font-black leading-none tabular-nums text-foreground" data-cmo-number style={{ minWidth: `${Math.max(count.text.length, (count.from ?? '').length) + 2}ch` }}>
            {from && (
              <span aria-hidden="true" data-cmo-number-old className="cmo-num-old" style={at(beats.count ?? 0)}>{from}</span>
            )}
            <span data-cmo-number-final className={cn('cmo-num-final', fx('cmo-num-new'))} style={at(beats.count ?? 0)}>{count.text}</span>
          </span>
          {count.label && <span className="text-[11px] text-muted-foreground">{count.label}</span>}
        </div>
      )}
      {spec.kind === 'signing' && !quiet && (
        <span aria-hidden="true" data-cmo-beat="ink" className={cn('cmo-ink-line', fx('cmo-ink'))} style={at(beats.ink ?? 0)} />
      )}
      {shown.length > 0 && (
        <div className="cmo-ticks grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {shown.map((tick, i) => (
            <div key={i} data-cmo-tick className={cn('rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-center', fx('cm-tick-in'))} style={loud ? beatStyle(m, revealDelay(i, tickStart, 0.12)) : undefined}>
              <div className="text-[10px] text-muted-foreground">{tick.label}</div>
              <div className="text-sm font-bold tabular-nums">
                {tick.to}
                {tick.from && tick.from !== tick.to && <span className="ml-1 text-[10px] font-normal text-muted-foreground line-through">{tick.from}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {onDone && !embedded && (
        <button type="button" data-cmo-done onClick={onDone} className={cn('cmo-done text-sm font-bold hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', DONE[spec.tone])}>
          {doneLabel}
        </button>
      )}
      {spec.tone === 'gold' && (spec.kind === 'trophy' || spec.kind === 'award') && !embedded && fresh && live && <Confetti pieces={50} gold />}
      <CelebrationStyles />
      <CareerMomentStyles />
    </div>
  );
}

/** The card with the once per key rule. It runs the hook on spec.key, unless
    the binder hands in its own moment (its card already ran the hook, and its
    card is what is watched). Both hooks sit above the one return. */
export function CareerMomentCard(props: CareerMomentCardProps) {
  const own = useCareerMoment(props.moment ? null : props.spec.key);
  const fired = useRef(false);
  const m = props.moment ?? own;
  const { onDone } = props;
  const done = onDone
    ? () => {
        if (fired.current) return;
        fired.current = true;
        onDone();
      }
    : undefined;
  return (
    <CareerMomentCardView
      {...props}
      onDone={done}
      fresh={m.fresh}
      live={m.live}
      watchRef={props.moment ? undefined : own.ref}
    />
  );
}

type PropsOf<K extends MomentKind> = Omit<CareerMomentCardProps, 'spec'> & { spec: CareerMomentSpec & { kind: K } };

/* The four scenes by name, so a binder writes <SigningMoment spec={...} />
   and a wrong kind is a type error. They add no markup. */
export const SigningMoment = (props: PropsOf<'signing'>) => <CareerMomentCard {...props} />;
export const TrophyMoment = (props: PropsOf<'trophy'>) => <CareerMomentCard {...props} />;
export const AwardMoment = (props: PropsOf<'award'>) => <CareerMomentCard {...props} />;
export const MilestoneMoment = (props: PropsOf<'milestone'>) => <CareerMomentCard {...props} />;
