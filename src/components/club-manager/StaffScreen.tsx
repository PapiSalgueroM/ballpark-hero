import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { money, moneyIn } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  STAFF_MATCHES_PER_SEASON, STAFF_MAX, STAFF_POST_IDS, STAFF_POST_INFO,
  severanceFor, staffEffectLine, staffOf, staffPayrollWeekly, staffPortraitSvg, staffShortlist, staffWageLine,
  hireStaff, sackStaff, matchStaffOffer, releaseToPoacher,
} from '@/lib/clubManagerStaff';
import type { StaffPerson, StaffPostId } from '@/lib/clubManagerStaff';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import styles from './StaffScreen.module.css';

/* ─── Round 471: the staff desk. ───
   Four posts on one card: who holds it, what he is worth today, what he
   could still be worth, and the button that changes it. An approach from a
   rival sits at the top, because it is the only thing here on a clock. */

interface StaffScreenProps {
  career: CareerState;
  onHire: (post: StaffPostId, candidateId: string) => void;
  onSack: (post: StaffPostId) => void;
  onMatch: () => void;
  onLetGo: () => void;
}

/** Portrait art: flat shapes from his id, never a photograph and never a real face. */
function Portrait({ person, size = 40 }: { person: Pick<StaffPerson, 'id'>; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-lg overflow-hidden block"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: staffPortraitSvg(person, size) }}
    />
  );
}

function LevelBar({ level, potential }: { level: number; potential: number }) {
  return (
    <div className="flex gap-0.5 mt-1" aria-hidden>
      {Array.from({ length: STAFF_MAX }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-sm',
            i < level ? 'bg-primary/80' : i < potential ? 'bg-primary/25' : 'bg-secondary',
          )}
        />
      ))}
    </div>
  );
}

export function StaffScreen({ career, onHire, onSack, onMatch, onLetGo }: StaffScreenProps) {
  /* Round 514: the money symbol follows the start option. Shadowing the
     import here is one line instead of a career argument on every call. */
  const money = moneyIn(career);
  const s = staffOf(career);
  const [open, setOpen] = useState<StaffPostId | null>(null);
  const [confirm, setConfirm] = useState<{ post: StaffPostId; personId: string } | null>(null);
  const [request, setRequest] = useState<{ post: StaffPostId; next: CareerState; text: string } | null>(null);
  const [cue, setCue] = useState<{ post: StaffPostId; text: string; id: number } | null>(null);
  const posts = useRef<Partial<Record<StaffPostId, HTMLDivElement | null>>>({});
  const payoffButtons = useRef<Partial<Record<StaffPostId, HTMLButtonElement | null>>>({});
  const cueNumber = useRef(0);
  const listRef = useRevealScroll<HTMLDivElement>(`staff:${open ?? ''}`, { skipFirst: true });
  const poachPerson = s.poach ? s[s.poach.postId] : null;

  const act = (post: StaffPostId, next: CareerState | null, text: string, callback: () => void) => {
    if (!next) return;
    setRequest({ post, next, text });
    callback();
  };

  useLayoutEffect(() => {
    if (confirm && s[confirm.post]?.id !== confirm.personId) setConfirm(null);
  }, [confirm, s]);

  useLayoutEffect(() => {
    if (!request) return;
    const expected = staffOf(request.next);
    const person = s[request.post];
    const nextPerson = expected[request.post];
    const committed = person?.id === nextPerson?.id && person?.wage === nextPerson?.wage &&
      s.hires === expected.hires && s.matchesLeft === expected.matchesLeft &&
      s.seasonSpend === expected.seasonSpend && career.budget === request.next.budget &&
      s.poach?.postId === expected.poach?.postId;
    if (committed) {
      setOpen(previous => previous === request.post ? null : previous);
      setConfirm(null);
      setCue({ post: request.post, text: request.text, id: ++cueNumber.current });
      posts.current[request.post]?.focus({ preventScroll: true });
    }
    setRequest(null);
  }, [request, career, s]);

  useEffect(() => {
    if (!cue) return;
    const timer = window.setTimeout(() => setCue(null), 500);
    return () => window.clearTimeout(timer);
  }, [cue]);

  return (
    <div className="space-y-2" data-staff-desk>
      {s.poach && poachPerson && (
        <div className={cn('bg-card border border-gold/40 rounded-xl p-3', styles.wrap)} data-staff-poach={s.poach.postId}>
          <div className="text-[10px] text-gold uppercase tracking-wider mb-1.5">
            📞 {s.poach.club} want your {STAFF_POST_INFO[s.poach.postId].label.toLowerCase()}
          </div>
          <div className="flex items-center gap-2">
            <Portrait person={poachPerson} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground">{poachPerson.name}</div>
              <div className="text-[9px] text-muted-foreground">
                Level {poachPerson.level} · {staffWageLine(career, poachPerson)} · answer within {s.poach.weeksLeft} week{s.poach.weeksLeft === 1 ? '' : 's'} or he goes
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => act(s.poach!.postId, matchStaffOffer(career), 'Offer matched.', onMatch)}
              disabled={s.matchesLeft <= 0}
              className="flex-1 min-h-[44px] min-w-[44px] text-[10px] font-bold rounded-full px-2 py-1 border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              Match it ({s.matchesLeft} of {STAFF_MATCHES_PER_SEASON} left)
            </button>
            <button
              onClick={() => act(s.poach!.postId, releaseToPoacher(career), 'Staff member released.', onLetGo)}
              className="flex-1 min-h-[44px] min-w-[44px] text-[10px] rounded-full px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Let him go
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            Matching puts a quarter on his wage for good and spends one of your matches for the season. You get {STAFF_MATCHES_PER_SEASON} a year and they come back in the summer.
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
          🧑‍🏫 Staff · {money(career.budget)} to spend · {staffPayrollWeekly(career)}k a week on the four
        </div>
        <div className="space-y-2.5">
          {STAFF_POST_IDS.map(post => {
            const person = s[post];
            const info = STAFF_POST_INFO[post];
            const pay = severanceFor(career, post);
            const paying = confirm?.post === post && confirm.personId === person?.id;
            const afterPayoff = paying ? sackStaff(career, post) : null;
            return (
              <div key={post} ref={node => { posts.current[post] = node; }} tabIndex={-1} role="group" aria-label={`${info.label} post`} className={styles.wrap} data-staff-post={post} data-staff-level={person?.level ?? 0} data-staff-feedback={cue?.post === post ? 'committed' : undefined}>
                <div className="flex items-center gap-2">
                  {person ? <Portrait person={person} /> : (
                    <span className="shrink-0 w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-base" aria-hidden>{info.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-foreground">
                      {info.emoji} {person ? person.name : `${info.label}: nobody`}
                    </div>
                    {/* Not truncated: on a 390 wide phone the level, the
                        ceiling and the wage do not fit on one line, and a
                        wage cut off mid word is worse than a second line. */}
                    <div className="text-[9px] text-muted-foreground">
                      {person
                        ? `${info.label} · level ${person.level}/${STAFF_MAX}, can reach ${person.potential} · ${staffWageLine(career, person)}${person.academy ? ' · came up from the academy' : ''}`
                        : info.blurb}
                    </div>
                  </div>
                  <span className="shrink-0">
                    {person ? (
                      <button
                        ref={node => { payoffButtons.current[post] = node; }}
                        onClick={() => setConfirm({ post, personId: person.id })}
                        disabled={pay === null || career.budget < pay}
                        className="min-h-[44px] min-w-[44px] text-[9px] rounded-full px-2 py-0.5 border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        Pay off {pay === null ? '' : money(pay)}
                      </button>
                    ) : (
                      <button
                        onClick={() => setOpen(open === post ? null : post)}
                        className="min-h-[44px] min-w-[44px] text-[9px] font-bold rounded-full px-2 py-0.5 border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                      >
                        {open === post ? 'Close' : 'Find one'}
                      </button>
                    )}
                  </span>
                </div>
                {person && <LevelBar level={person.level} potential={person.potential} />}
                <p className="text-[9px] text-muted-foreground mt-0.5">{staffEffectLine(career, post)}</p>
                {paying && (
                  <div className="rounded-lg border border-border bg-secondary/30 p-2 mt-2" data-staff-payoff={post}>
                    <p className="text-[11px]">Pay off {person!.name} for {pay === null ? '' : money(pay)}?</p>
                    {afterPayoff && <p className="text-[10px] text-muted-foreground mt-1">After: {money(afterPayoff.budget)} to spend, {staffPayrollWeekly(afterPayoff)}k a week on staff. {staffEffectLine(afterPayoff, post)}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button disabled={!afterPayoff} onClick={() => act(post, afterPayoff, 'Staff payoff completed.', () => onSack(post))} className="min-h-[44px] min-w-[44px] rounded-lg border border-border px-2 text-[10px] font-bold disabled:opacity-30">Confirm payoff</button>
                      <button onClick={() => { setConfirm(null); payoffButtons.current[post]?.focus({ preventScroll: true }); }} className="min-h-[44px] min-w-[44px] rounded-lg border border-border px-2 text-[10px]">Cancel payoff</button>
                    </div>
                  </div>
                )}
                {cue?.post === post && <p key={cue.id} role="status" className={cn('text-[11px] text-primary rounded-lg mt-1 px-2 py-1', styles.committed)}>{cue.text}</p>}
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">
          Every one of them is a lift on the game you already play, and a level 1 man does nothing at all, the same as an empty chair. The forwards and the number ten are the attack coach's, the back line and the holding midfielder the defence coach's, the keepers their own man's, and the middle of the park splits the two. Wages are a running cost the board covers; fees and pay offs come out of the kitty. They belong to the club, so a new job starts on the new club's staff.
        </p>
      </div>

      {open && !s[open] && (
        <div ref={listRef} className={cn('bg-card border border-border rounded-xl p-3', styles.wrap)} data-staff-shortlist={open}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
            {STAFF_POST_INFO[open].emoji} Who is available: {STAFF_POST_INFO[open].label.toLowerCase()}
          </div>
          <div className="space-y-0.5">
            {staffShortlist(career, open).map(c => {
              const preview = hireStaff(career, open, c.person.id);
              return (
              <div key={c.person.id} data-staff-candidate={c.person.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                <Portrait person={c.person} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground">{c.person.name}</div>
                  <div className="text-[9px] text-muted-foreground">
                    Level {c.person.level}, can reach {c.person.potential} · {c.person.wage}k a week · {c.from}
                  </div>
                  {preview && <p className="text-[9px] text-muted-foreground mt-0.5">After: {staffPayrollWeekly(preview)}k a week on staff. {staffEffectLine(preview, open)}</p>}
                </div>
                <button
                  onClick={() => act(open, preview, c.person.academy ? 'Academy staff member promoted.' : 'Staff member hired.', () => onHire(open, c.person.id))}
                  disabled={career.budget < c.fee}
                  className="shrink-0 min-h-[44px] min-w-[44px] text-[9px] font-bold rounded-full px-2 py-0.5 border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  {c.fee > 0 ? `Hire ${money(c.fee)}` : 'Promote'}
                </button>
              </div>
            ); })}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            The last name is your own academy staff. He starts lower than anyone out there and costs nothing, but he has the most room left, and he grows on the training pitch every summer like everybody else.
          </p>
        </div>
      )}
    </div>
  );
}
