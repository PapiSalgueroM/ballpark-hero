import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import type { GmStaffBlock, GmStaffCtx, GmStaffPack, GmStaffPerson, GmStaffPost } from '@/lib/gmStaff';
import {
  gmEffectLine, gmHireStaff, gmMatchStaffOffer, gmReleaseToPoacher, gmSackStaff, gmSeverance,
  gmStaffPayroll, gmStaffPortraitSvg, gmStaffShortlist,
} from '@/lib/gmStaff';

/* Round 910: the staff desk for any manager game, from its pack.
   Small tiles, one per post, and a tap opens that post with a back button:
   who holds it and what he is worth today, or the shortlist when the chair
   is empty. An approach from a rival sits on top, because it is the only
   thing here on a clock. Every number on it comes from the pack and from
   gmStaff, never typed here: scripts/simGmStaff.mjs section 8 holds the
   effect lines to the values the game applies.

   Controlled: the game owns the block and the purse and hears about every
   change through onChange, with one line for its own feed. */

export interface GmStaffPanelProps<P extends string> {
  pack: GmStaffPack<P>;
  block: GmStaffBlock<P>;
  ctx: GmStaffCtx<P>;
  /** What the desk can spend right now, in the pack's purse unit. */
  purse: number;
  /** How the game writes an amount of its purse unit, e.g. "$1.2m". */
  purseText?: (n: number) => string;
  onChange: (next: GmStaffBlock<P>, purse: number, line: string) => void;
}

function Portrait({ person, size = 40 }: { person: Pick<GmStaffPerson, 'id'>; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-lg overflow-hidden block"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: gmStaffPortraitSvg(person, size) }}
    />
  );
}

function LevelBar({ level, potential, max }: { level: number; potential: number; max: number }) {
  return (
    <div className="flex gap-0.5 mt-1" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn('h-1.5 flex-1 rounded-sm', i < level ? 'bg-primary/80' : i < potential ? 'bg-primary/25' : 'bg-secondary')} />
      ))}
    </div>
  );
}

/** Every effect a post has, as the lines the game applies, at a level or on an empty chair. */
function EffectLines<P extends string>({ pack, post, level }: { pack: GmStaffPack<P>; post: GmStaffPost<P>; level: number | null }) {
  return (
    <>
      {post.effects.map(e => (
        <p key={e.key} className="text-[9px] text-muted-foreground mt-0.5" data-staff-effect={e.key}>
          {gmEffectLine(pack.keys[e.key], e, level, pack.rules.maxLevel)}
        </p>
      ))}
    </>
  );
}

export function GmStaffPanel<P extends string>({ pack, block, ctx, purse, purseText, onChange }: GmStaffPanelProps<P>) {
  const [open, setOpen] = useState<P | null>(null);
  const [confirmSack, setConfirmSack] = useState(false);
  const [help, setHelp] = useState(false);
  const detailRef = useRevealScroll<HTMLDivElement>(`gm-staff:${pack.id}:${open ?? ''}:${help}`, { skipFirst: true });
  const r = pack.rules;
  const fmt = purseText ?? ((n: number) => (pack.money.purseUnit === 'm' ? `${n}m` : `${n} ${pack.money.purseUnit}`));
  /* "24k a week" but "4 points a season": a unit that starts with k sits on the number. */
  const wage = (n: number) => `${n}${pack.money.wageUnit.startsWith('k ') ? '' : ' '}${pack.money.wageUnit}`;
  const ticks = (n: number) => `${n} ${pack.money.tickWord}${n === 1 ? '' : 's'}`;
  const seat = (p: P): GmStaffPerson | null => (block as unknown as Record<string, GmStaffPerson | null>)[p] ?? null;
  const postOf = (p: P): GmStaffPost<P> => pack.posts.find(x => x.id === p) ?? pack.posts[0];
  const label = (p: P) => postOf(p).label.toLowerCase();
  const poach = block.poach;
  const poachPerson = poach ? seat(poach.postId) : null;
  const payroll = gmStaffPayroll(r, block);
  const example = pack.posts[0];

  const match = () => {
    const d = gmMatchStaffOffer(r, block);
    if (d) onChange(d.next, purse, `${d.person.name} turned ${d.poach.club} down and signed on again, now on ${wage(d.raised.wage)}.`);
  };
  const release = () => {
    const d = gmReleaseToPoacher(block);
    if (d) onChange(d.next, purse, `${d.person.name} has left for ${d.poach.club}. The ${label(d.poach.postId)} job is open.`);
  };
  const hire = (p: P, id: string) => {
    const d = gmHireStaff(r, block, ctx, p, id, purse);
    if (!d) return;
    setOpen(null);
    onChange(d.next, d.purse, d.cand.fee > 0
      ? `${d.cand.person.name} is the new ${label(p)}, ${fmt(d.cand.fee)} to bring him in.`
      : `${d.cand.person.name} steps up to ${label(p)}.`);
  };
  const sack = (p: P) => {
    const d = gmSackStaff(r, block, p, purse);
    if (!d) return;
    setConfirmSack(false);
    onChange(d.next, d.purse, `${d.person.name} has been paid off, ${fmt(d.pay)} to end it. The ${label(p)} job is open.`);
  };
  const back = () => { setOpen(null); setConfirmSack(false); };

  const ex = example.effects[0];
  const exampleLine = `a level 6 ${example.label.toLowerCase()}: ${gmEffectLine(pack.keys[ex.key], ex, 6, r.maxLevel)} At level ${r.maxLevel}: ${gmEffectLine(pack.keys[ex.key], ex, r.maxLevel, r.maxLevel)}`;

  /* The open post: the man in it, or the shortlist when the chair is empty. */
  const openPost = open === null ? null : postOf(open);
  const openPerson = open === null ? null : seat(open);
  const openPay = gmSeverance(r, openPerson);
  let openView: ReactNode = null;
  if (open !== null && openPost && openPerson) {
    openView = (
      <div>
        <div className="flex items-center gap-2">
          <Portrait person={openPerson} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground">{openPost.emoji} {openPerson.name}</div>
            <div className="text-[9px] text-muted-foreground">
              {openPost.label} · level {openPerson.level}/{r.maxLevel}, can reach {openPerson.potential} · {wage(openPerson.wage)}{openPerson.academy ? ' · promoted from inside' : ''}
            </div>
          </div>
        </div>
        <LevelBar level={openPerson.level} potential={openPerson.potential} max={r.maxLevel} />
        <p className="text-[10px] text-muted-foreground mt-1">{openPost.blurb}</p>
        <EffectLines pack={pack} post={openPost} level={openPerson.level} />
        {confirmSack ? (
          <div className="rounded-lg border border-border bg-secondary/30 p-2 mt-2">
            <p className="text-[11px]">Pay off {openPerson.name} for {openPay === null ? '' : fmt(openPay)}?</p>
            <div className="flex gap-1.5 mt-2">
              <button onClick={() => sack(open)} className="min-h-[44px] rounded-lg border border-destructive/50 text-destructive px-3 text-[11px]">Pay him off</button>
              <button onClick={() => setConfirmSack(false)} className="min-h-[44px] rounded-lg border border-border px-3 text-[11px]">Keep him</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmSack(true)}
            disabled={openPay === null || purse < openPay}
            className="min-h-[44px] mt-2 text-[10px] rounded-full px-3 border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            Pay off {openPay === null ? '' : fmt(openPay)}
          </button>
        )}
      </div>
    );
  } else if (open !== null && openPost) {
    openView = (
      <div data-gm-staff-shortlist={open}>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{openPost.emoji} Who is available: {label(open)}</div>
        <p className="text-[10px] text-muted-foreground mb-1.5">{openPost.blurb}</p>
        <EffectLines pack={pack} post={openPost} level={null} />
        <div className="space-y-2 mt-2">
          {gmStaffShortlist(r, block, ctx, open).map(c => (
            <div key={c.person.id} className="rounded-lg border border-border p-2">
              <div className="flex items-center gap-2">
                <Portrait person={c.person} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground">{c.person.name}</div>
                  <div className="text-[9px] text-muted-foreground">Level {c.person.level}, can reach {c.person.potential} · {wage(c.person.wage)} · {c.fee > 0 ? `${fmt(c.fee)} to bring in` : 'free'}</div>
                  <div className="text-[9px] text-muted-foreground">{c.from}</div>
                </div>
                <button
                  onClick={() => hire(open, c.person.id)}
                  disabled={purse < c.fee}
                  className="min-h-[44px] min-w-[44px] text-[10px] font-bold rounded-full px-2 border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-30"
                >
                  Hire
                </button>
              </div>
              <EffectLines pack={pack} post={openPost} level={c.person.level} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-gm-staff={pack.id}>
      {poach && poachPerson && (
        <div className="bg-card border border-gold/40 rounded-xl p-3" data-gm-staff-poach={poach.postId}>
          <div className="text-[10px] text-gold uppercase tracking-wider mb-1.5">
            {postOf(poach.postId).headCoachTrack
              ? `${poach.club} want your ${label(poach.postId)} as their head coach`
              : `${poach.club} want your ${label(poach.postId)}`}
          </div>
          <div className="flex items-center gap-2">
            <Portrait person={poachPerson} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground">{poachPerson.name}</div>
              <div className="text-[9px] text-muted-foreground">
                Level {poachPerson.level} · {wage(poachPerson.wage)} · answer within {poach.weeksLeft} or he goes
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={match}
              disabled={block.matchesLeft <= 0}
              className="flex-1 min-h-[44px] text-[10px] font-bold rounded-full px-2 py-1 border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-30 transition-colors"
            >
              Match it ({block.matchesLeft} of {r.matchesPerSeason} left)
            </button>
            <button onClick={release} className="flex-1 min-h-[44px] text-[10px] rounded-full px-2 py-1 border border-border text-muted-foreground hover:text-foreground transition-colors">
              Let him go
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            Matching puts {Math.round((r.matchRaise - 1) * 100)}% on his wage for good and spends one of your {r.matchesPerSeason} matches this season.
          </p>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 text-[10px] text-muted-foreground uppercase tracking-wider">
            Staff · {fmt(purse)} to spend · {wage(payroll)} on the desk
          </div>
          <button
            onClick={() => setHelp(h => !h)}
            aria-expanded={help}
            aria-label="How the staff desk works"
            className="min-h-[44px] min-w-[44px] rounded-full border border-border text-xs text-muted-foreground hover:text-foreground"
          >
            ?
          </button>
        </div>
        {help && (
          <div className="rounded-lg border border-border bg-secondary/30 p-2 mb-2 text-[10px] text-muted-foreground space-y-1" data-gm-staff-help>
            <p>Every job holds one person, level 1 to {r.maxLevel}. Level 1 or an empty chair is the game as it always played; every level above that adds a little, and the bar shows how far he can still grow.</p>
            <p>Hire off the shortlist for a fee, or promote the one already in the building for nothing. Paying somebody off costs {ticks(r.severanceTicks)} of his wage.</p>
            <p>Anybody at level {r.poachFromLevel} or better gets noticed. When a rival comes in you have {ticks(r.poachWeeks)} to match them or he goes, and you can match {r.matchesPerSeason} a season.{pack.posts.some(p => p.head) ? ' Nobody comes in for the head coach: he goes when you say so.' : ''}</p>
            <p>Worked example: {exampleLine}</p>
          </div>
        )}
        {open === null ? (
          <div className="grid grid-cols-2 gap-1.5" data-gm-staff-tiles>
            {pack.posts.map(post => {
              const person = seat(post.id);
              return (
                <button
                  key={post.id}
                  onClick={() => setOpen(post.id)}
                  data-gm-staff-post={post.id}
                  className="min-h-[64px] text-left rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 p-2 transition-colors"
                >
                  <div className="text-[10px] text-muted-foreground">{post.emoji} {post.short}{post.head ? ' · your call' : ''}</div>
                  <div className="text-xs text-foreground truncate">{person ? person.name : 'Nobody'}</div>
                  <div className="text-[9px] text-muted-foreground">{person ? `Level ${person.level} · ${wage(person.wage)}` : 'Find one'}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <div ref={detailRef} data-gm-staff-open={open}>
            <button onClick={back} className="min-h-[44px] text-[10px] rounded-full px-3 border border-border text-muted-foreground hover:text-foreground mb-2">
              Back to the staff
            </button>
            {openView}
          </div>
        )}
      </div>
    </div>
  );
}
