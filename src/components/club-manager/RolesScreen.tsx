import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, Users } from 'lucide-react';
import {
  ROLE_INFO, ROLE_LADDER, roleOf, playingShare, promiseGap, promiseMood,
  deservedRole, standingGap, roleChangeCost, squadByRole, brokenPromises, money,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, SquadRole } from '@/lib/clubManager';
import { useRevealScroll } from '@/hooks/useRevealScroll';

interface RolesScreenProps {
  career: CareerState;
  onSetRole: (playerId: string, role: SquadRole) => void;
}

const TONE: Record<'good' | 'ok' | 'bad' | 'none', string> = {
  good: 'text-emerald-400',
  ok: 'text-yellow-400',
  bad: 'text-red-400',
  none: 'text-muted-foreground',
};

/** His last ten as dots, so you can see the run without reading a number. */
function LastTen({ p }: { p: CMPlayer }) {
  const w = p.lastTen ?? [];
  if (!w.length) return <span className="text-[9px] text-muted-foreground">No games yet</span>;
  return (
    <span className="inline-flex items-center gap-[2px]">
      {w.map((v, i) => (
        <span
          key={i}
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', v ? 'bg-emerald-500' : 'bg-secondary border border-border')}
        />
      ))}
    </span>
  );
}

function PlayerRow({ p, onOpen, showRole }: { p: CMPlayer; onOpen: () => void; showRole?: boolean }) {
  const mood = promiseMood(p);
  const share = playingShare(p);
  const played = (p.lastTen ?? []).reduce((s, x) => s + x, 0);
  const of = (p.lastTen ?? []).length;
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0 text-left hover:bg-secondary/40 transition-colors rounded px-1"
    >
      <span className="w-8 shrink-0 text-[9px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-foreground truncate">{p.name}</span>
          {p.wantsOut && (
            <span className="shrink-0 text-[8px] font-bold text-red-400 border border-red-400/60 rounded px-1">WANTS OUT</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <LastTen p={p} />
          <span className="text-[9px] text-muted-foreground truncate">
            {of ? `${played} of last ${of}` : ''}{showRole ? ` · ${ROLE_INFO[roleOf(p)].label.toLowerCase()}` : ''}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs font-bold font-display text-foreground">{p.rating}</div>
        <div className={cn('text-[9px] font-bold', TONE[mood.tone])}>
          {share === null ? 'New' : mood.text}
        </div>
      </div>
    </button>
  );
}

/**
 * Round 127: the dressing room.
 *
 * Owner's two standing rules drive the shape of this. No long stacked pages,
 * so the front of it is five small rung tiles and a short list of the men who
 * need you rather than every player in the building one after another. And no
 * scrolling after a tap, so the people you are letting down sit at the top of
 * the first screen, above the tiles, where your thumb already is.
 */
export function RolesScreen({ career, onSetRole }: RolesScreenProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [openRole, setOpenRole] = useState<SquadRole | null>(null);
  const detailRef = useRevealScroll<HTMLDivElement>(`role:${openId ?? ''}:${openRole ?? ''}`, { skipFirst: true });

  const open = openId ? career.squad.find(p => p.id === openId) ?? null : null;
  const groups = squadByRole(career);

  /* ---------- one player ---------- */
  if (open) {
    const current = roleOf(open);
    const mood = promiseMood(open);
    const played = (open.lastTen ?? []).reduce((s, x) => s + x, 0);
    const of = (open.lastTen ?? []).length;
    const deserved = deservedRole(career, open);
    const insulted = standingGap(career, open) >= 2;
    return (
      <div ref={detailRef} className="space-y-2">
        <button
          onClick={() => setOpenId(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {openRole ? ROLE_INFO[openRole].label : 'The dressing room'}
        </button>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground truncate">{open.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {open.position} · {open.age}y · rated {open.rating}
                {open.wage ? ` · ${open.wage}k a week` : ''}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={cn('text-xs font-bold', TONE[mood.tone])}>{mood.text}</div>
              <div className="text-[9px] text-muted-foreground">{of ? `${played} of his last ${of}` : 'No games yet'}</div>
            </div>
          </div>
          <div className="mt-2"><LastTen p={open} /></div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {ROLE_INFO[current].emoji} You have him down as a <span className="text-foreground font-semibold">{ROLE_INFO[current].label.toLowerCase()}</span>. {ROLE_INFO[current].promise}
          </p>
          {insulted && (
            <p className="text-[10px] text-red-400 mt-1">
              He does not think that is what he is. He reckons he has earned {ROLE_INFO[deserved].label.toLowerCase()} here, and it eats at him whether he plays or not.
            </p>
          )}
          {open.wantsOut && (
            <p className="text-[10px] text-red-400 mt-1">
              He has asked to leave. Every club knows it, so the offers that come in will be light.
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Tell him what he is</div>
          <div className="space-y-1.5">
            {ROLE_LADDER.map(r => {
              const cost = roleChangeCost(open, r);
              const isNow = r === current;
              const tooDear = cost > career.budget;
              return (
                <button
                  key={r}
                  disabled={isNow || tooDear}
                  onClick={() => onSetRole(open.id, r)}
                  className={cn(
                    'w-full rounded-lg border px-2.5 py-2 text-left transition-colors',
                    isNow ? 'border-primary bg-primary/10' : tooDear ? 'border-border/50 opacity-50' : 'border-border hover:border-primary/60',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[11px] font-bold min-w-0 truncate', isNow ? 'text-primary' : 'text-foreground')}>
                      {ROLE_INFO[r].emoji} {ROLE_INFO[r].label}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold text-gold">
                      {isNow ? 'Current' : cost > 0 ? `Pay off ${money(cost)}` : 'Free'}
                    </span>
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{ROLE_INFO[r].promise}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground mt-2">
            Moving a man up costs nothing today. Moving him down means buying your way out of what you told him, and the bill is six weeks of his wages for every rung. Drop him below what his football says he has earned and he is insulted whatever minutes you give him.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- one rung ---------- */
  if (openRole) {
    const group = groups.find(g => g.role === openRole);
    return (
      <div ref={detailRef} className="space-y-2">
        <button
          onClick={() => setOpenRole(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> The dressing room
        </button>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[11px] font-bold text-foreground">
            {ROLE_INFO[openRole].emoji} {ROLE_INFO[openRole].label}
          </div>
          <p className="text-[9px] text-muted-foreground mb-1">
            {ROLE_INFO[openRole].promise} That is about {Math.round(ROLE_INFO[openRole].share * 100)} out of every 100 matches he is fit for.
          </p>
          {(!group || group.players.length === 0) && (
            <p className="text-[10px] text-muted-foreground">Nobody is on this rung right now.</p>
          )}
          {group?.players.map(p => <PlayerRow key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
        </div>
      </div>
    );
  }

  /* ---------- the front of the room ---------- */
  const broken = brokenPromises(career).slice(0, 5);
  const wantOut = career.squad.filter(p => p.wantsOut);

  return (
    <div className="space-y-2">
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
          <Users className="w-3 h-3" /> The dressing room
        </div>
        <p className="text-[10px] text-muted-foreground">
          {broken.length === 0
            ? 'Everybody is getting roughly the football he was promised. Keep it that way.'
            : `${broken.length} player${broken.length === 1 ? ' is' : 's are'} not getting what you told ${broken.length === 1 ? 'him' : 'them'} they would.`}
          {wantOut.length > 0 && ` ${wantOut.length} ${wantOut.length === 1 ? 'has' : 'have'} asked to leave.`}
        </p>
      </div>

      {broken.length > 0 && (
        <div className="bg-card border border-red-500/30 rounded-xl p-3">
          <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Needs a word</div>
          {broken.map(p => <PlayerRow key={p.id} p={p} onOpen={() => setOpenId(p.id)} showRole />)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ROLE_LADDER.map(r => {
          const group = groups.find(g => g.role === r);
          const n = group?.players.length ?? 0;
          const unhappy = group?.players.filter(p => promiseMood(p).tone === 'bad').length ?? 0;
          return (
            <button
              key={r}
              onClick={() => setOpenRole(r)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all bg-card hover:border-primary hover:-translate-y-0.5',
                unhappy > 0 ? 'border-red-500/40' : 'border-border',
              )}
            >
              <div className="text-base leading-none mb-1">{ROLE_INFO[r].emoji}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{ROLE_INFO[r].label}</div>
              <div className="text-sm font-bold font-display text-foreground">
                {n} {n === 1 ? 'player' : 'players'}
              </div>
              <div className={cn('text-[9px] truncate mt-0.5', unhappy > 0 ? 'text-red-400' : 'text-muted-foreground')}>
                {unhappy > 0 ? `${unhappy} not happy` : `Promised ${Math.round(ROLE_INFO[r].share * 100)}% of games`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RolesScreen;
