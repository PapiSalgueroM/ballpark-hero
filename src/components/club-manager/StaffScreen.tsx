import { useState } from 'react';
import { cn } from '@/lib/utils';
import { money } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  STAFF_MATCHES_PER_SEASON, STAFF_MAX, STAFF_POST_IDS, STAFF_POST_INFO,
  severanceFor, staffEffectLine, staffOf, staffPayrollWeekly, staffPortraitSvg, staffShortlist, staffWageLine,
} from '@/lib/clubManagerStaff';
import type { StaffPerson, StaffPostId } from '@/lib/clubManagerStaff';
import { useRevealScroll } from '@/hooks/useRevealScroll';

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
  const s = staffOf(career);
  const [open, setOpen] = useState<StaffPostId | null>(null);
  const listRef = useRevealScroll<HTMLDivElement>(`staff:${open ?? ''}`, { skipFirst: true });
  const poachPerson = s.poach ? s[s.poach.postId] : null;

  return (
    <div className="space-y-2" data-staff-desk>
      {s.poach && poachPerson && (
        <div className="bg-card border border-gold/40 rounded-xl p-3" data-staff-poach={s.poach.postId}>
          <div className="text-[10px] text-gold uppercase tracking-wider mb-1.5">
            📞 {s.poach.club} want your {STAFF_POST_INFO[s.poach.postId].label.toLowerCase()}
          </div>
          <div className="flex items-center gap-2">
            <Portrait person={poachPerson} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground truncate">{poachPerson.name}</div>
              <div className="text-[9px] text-muted-foreground">
                Level {poachPerson.level} · {staffWageLine(career, poachPerson)} · answer within {s.poach.weeksLeft} week{s.poach.weeksLeft === 1 ? '' : 's'} or he goes
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={onMatch}
              disabled={s.matchesLeft <= 0}
              className="flex-1 text-[10px] font-bold rounded-full px-2 py-1 border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              Match it ({s.matchesLeft} of {STAFF_MATCHES_PER_SEASON} left)
            </button>
            <button
              onClick={onLetGo}
              className="flex-1 text-[10px] rounded-full px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors"
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
            return (
              <div key={post} data-staff-post={post} data-staff-level={person?.level ?? 0}>
                <div className="flex items-center gap-2">
                  {person ? <Portrait person={person} /> : (
                    <span className="shrink-0 w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-base" aria-hidden>{info.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-foreground truncate">
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
                        onClick={() => onSack(post)}
                        disabled={pay === null || career.budget < pay}
                        className="text-[9px] rounded-full px-2 py-0.5 border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        Pay off {pay === null ? '' : money(pay)}
                      </button>
                    ) : (
                      <button
                        onClick={() => setOpen(open === post ? null : post)}
                        className="text-[9px] font-bold rounded-full px-2 py-0.5 border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                      >
                        {open === post ? 'Close' : 'Find one'}
                      </button>
                    )}
                  </span>
                </div>
                {person && <LevelBar level={person.level} potential={person.potential} />}
                <p className="text-[9px] text-muted-foreground mt-0.5">{staffEffectLine(career, post)}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">
          Every one of them is a lift on the game you already play, and a level 1 man does nothing at all, the same as an empty chair. The forwards and the number ten are the attack coach's, the back line and the holding midfielder the defence coach's, the keepers their own man's, and the middle of the park splits the two. Wages are a running cost the board covers; fees and pay offs come out of the kitty. They belong to the club, so a new job starts on the new club's staff.
        </p>
      </div>

      {open && !s[open] && (
        <div ref={listRef} className="bg-card border border-border rounded-xl p-3" data-staff-shortlist={open}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
            {STAFF_POST_INFO[open].emoji} Who is available: {STAFF_POST_INFO[open].label.toLowerCase()}
          </div>
          <div className="space-y-0.5">
            {staffShortlist(career, open).map(c => (
              <div key={c.person.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                <Portrait person={c.person} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground truncate">{c.person.name}</div>
                  <div className="text-[9px] text-muted-foreground">
                    Level {c.person.level}, can reach {c.person.potential} · {c.person.wage}k a week · {c.from}
                  </div>
                </div>
                <button
                  onClick={() => { onHire(open, c.person.id); setOpen(null); }}
                  disabled={career.budget < c.fee}
                  className="shrink-0 text-[9px] font-bold rounded-full px-2 py-0.5 border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  {c.fee > 0 ? `Hire ${money(c.fee)}` : 'Promote'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            The last name is your own academy staff. He starts lower than anyone out there and costs nothing, but he has the most room left, and he grows on the training pitch every summer like everybody else.
          </p>
        </div>
      )}
    </div>
  );
}
