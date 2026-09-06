/* ─── Round 469: the gram, the rival and the badges, drawn once ─────────────

   Three small screens the American careers were missing beside the flagship:
   the SocialGram with the fans under the latest post, the rival's card with
   the head to head on it, and the badge case. Each takes facts the sport has
   already computed and draws them; nothing in here decides anything, so what
   a screen says is checkable in scripts/simCareerParity.mjs without a
   browser. Sport neutral: the words come in as props. */
import type { CareerRival } from '@/lib/careerRival';
import type { BadgeDef } from '@/lib/careerBadges';
import { cn } from '@/lib/utils';

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Followers, the standing meter and the three comments under the post. */
export function SocialGram({ followers, standing, standingLabel, comments, headlines }: {
  followers: string;
  standing: number;
  /** "Fanbase" or "Popularity": what the meter is called in this sport. */
  standingLabel: string;
  comments: string[];
  /** The last few headlines the season wrote, newest first. */
  headlines: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 text-center">
        <div className="text-3xl font-black text-foreground">{followers}</div>
        <div className="text-[10px] text-muted-foreground">followers</div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-foreground"><span>{standingLabel}</span><span>{standing}</span></div>
        <Meter value={standing} color="bg-pink-500" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Latest comments</div>
        {comments.map((c, i) => (
          <div key={i} className="rounded-lg bg-secondary px-3 py-2 text-[11px] text-foreground">{c}</div>
        ))}
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What they wrote</div>
        {headlines.length === 0 ? (
          <p className="rounded-lg bg-secondary px-3 py-2 text-[11px] text-muted-foreground">Nobody is writing about you yet. Play a season.</p>
        ) : (
          headlines.map((h, i) => (
            <div key={i} className="rounded-lg bg-secondary px-3 py-2 text-[11px] text-foreground">📰 {h}</div>
          ))
        )}
      </div>
    </div>
  );
}

/** The player drafted alongside you, and where the two of you stand. */
export function RivalCard({ rival, myName, teamLabel, ringWord }: {
  rival: CareerRival | null | undefined;
  myName: string;
  teamLabel: string;
  ringWord: string;
}) {
  if (!rival) {
    return <p className="rounded-2xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">No rival on this save. A new career draws one on draft night.</p>;
  }
  const played = rival.myYears + rival.hisYears;
  const lead = rival.myYears > rival.hisYears ? `${myName} leads` : rival.hisYears > rival.myYears ? `${rival.name} leads` : 'Dead level';
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🪞 Your rival, drafted the same year</p>
        <p className="mt-1 text-xl font-black text-foreground">{rival.name}</p>
        <p className="text-xs text-muted-foreground">{rival.pos} · {teamLabel} · {rival.retired ? 'retired' : `age ${rival.age}`}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary p-2"><div className="text-lg font-black text-foreground">{rival.ovr}</div><div className="text-[9px] text-muted-foreground">overall</div></div>
          <div className="rounded-xl bg-secondary p-2"><div className="text-lg font-black text-foreground">{rival.rings}</div><div className="text-[9px] text-muted-foreground">{rival.rings === 1 ? ringWord : `${ringWord}s`}</div></div>
          <div className="rounded-xl bg-secondary p-2"><div className="text-lg font-black text-gold">{rival.myYears}-{rival.hisYears}</div><div className="text-[9px] text-muted-foreground">head to head</div></div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <p><b className="text-foreground">{lead}</b> after {played} season{played === 1 ? '' : 's'} measured side by side.</p>
        {rival.lastLine && <p className="mt-1">Last season he went {rival.lastLine}.</p>}
        {rival.retired && <p className="mt-1">He has hung them up. The record stands.</p>}
      </div>
    </div>
  );
}

/** The badge case: earned ones lit, the rest locked with what they are for. */
export function BadgeGrid<F>({ defs, earned }: { defs: BadgeDef<F>[]; earned: BadgeDef<F>[] }) {
  const have = new Set(earned.map(b => b.id));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 text-[11px]">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">🎖️ Badges</span>
        <span className="text-muted-foreground">{earned.length} of {defs.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
        {defs.map(b => {
          const on = have.has(b.id);
          return (
            <div key={b.id} className={cn('rounded-xl border p-2', on ? 'border-gold/50 bg-gold/10' : 'border-border bg-secondary/40 opacity-60')}>
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                <span>{on ? b.emoji : '🔒'}</span>
                <span className="truncate">{b.label}</span>
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{b.blurb}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
