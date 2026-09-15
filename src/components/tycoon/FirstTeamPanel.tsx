import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HubPanelHeader } from '@/components/hub/HubTiles';
import { cn } from '@/lib/utils';
import {
  FIRST_TEAM_SLOTS, SENIOR_YEAR_SEC, RETIRE_AGE, PROMOTE_AGE, LEAVE_AGE, fmtCash, potentialRead,
  salePrice, seniorBirthdayPreview, squadEdge,
} from '@/lib/wonderkidFactory';
import type { FactoryState } from '@/lib/wonderkidFactory';

export default function FirstTeamPanel({ state: s, onSell, onBack }: {
  state: FactoryState;
  onSell: (id: string) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { pathname } = useLocation();
  const team = s.firstTeam ?? [];
  const selected = team.find(p => p.id === selectedId) ?? team[0];
  const birthday = selected ? seniorBirthdayPreview(s, selected) : null;
  const seconds = selected ? Math.max(0, Math.ceil(SENIOR_YEAR_SEC - selected.ageClock)) : 0;
  const edge = (squadEdge(s) * 100).toFixed(1);
  const read = selected ? potentialRead(s, selected) : null;

  return (
    <section data-first-team-panel data-no-prerender className="space-y-3">
      <HubPanelHeader title="First team" onBack={onBack} />
      <div className="rounded-2xl border border-primary/30 bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Your graduates</h2>
          <span className="text-xs font-bold tabular-nums text-primary">{team.length} / {FIRST_TEAM_SLOTS}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Opponents get up to <strong className="text-foreground">{edge}% fewer scoring chances</strong> with this team.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="First team players">
          {Array.from({ length: FIRST_TEAM_SLOTS }, (_, i) => {
            const p = team[i];
            return p ? (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected?.id === p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn('min-h-[64px] min-w-0 rounded-xl border p-2 text-left',
                  selected?.id === p.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30 hover:border-primary')}
              >
                <span className="block text-[10px] font-bold uppercase text-muted-foreground">{p.pos} · {Math.floor(p.rating)} rated</span>
                <span className="mt-0.5 block break-words text-xs font-bold leading-tight">{p.name}</span>
              </button>
            ) : (
              <div key={`empty-${i}`} className="flex min-h-[64px] items-center justify-center rounded-xl border border-dashed border-border px-2 text-xs text-muted-foreground">
                Open place
              </div>
            );
          })}
        </div>
      </div>

      {selected && birthday ? (
        <article data-senior-card className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words font-display text-lg font-bold leading-tight">{selected.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{selected.nation} · {selected.pos} · age {selected.age}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl font-bold tabular-nums text-primary">{Math.floor(selected.rating)}</p>
              <p className="text-[10px] text-muted-foreground">ceiling {read?.kind === 'exact' ? read.lo : read?.kind === 'range' ? `${read.lo} to ${read.hi}` : '?'}</p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-secondary/50 p-2">
              <dt className="text-muted-foreground">Sell today</dt>
              <dd className="mt-1 font-bold tabular-nums text-gold">{fmtCash(salePrice(s, selected))}</dd>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2">
              <dt className="text-muted-foreground">{birthday.retiring ? 'Retires' : `Turns ${birthday.age}`} in</dt>
              <dd className="mt-1 font-bold tabular-nums">{Math.floor(seconds / 60)}m {String(seconds % 60).padStart(2, '0')}s</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {birthday.retiring
              ? `At ${RETIRE_AGE} he retires without a fee.`
              : `At age ${birthday.age}: ${fmtCash(birthday.price)} without more training, using today's fee multiplier.`}
          </p>
          <button type="button" onClick={() => onSell(selected.id)} className="mt-3 min-h-[44px] w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">
            Sell {selected.name} for {fmtCash(salePrice(s, selected))}
          </button>
        </article>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          Promote an academy player aged {PROMOTE_AGE} to {LEAVE_AGE - 1} to fill a place. His bed opens for a new kid, and he helps the club defend while you decide when to sell.
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        This team helps in watched and away matches. Your graduates stay when the academy moves up or you sell the ground.
        {(s.retired ?? 0) > 0 && <> Retired players: {s.retired}.</>}
      </p>
      {pathname !== '/stadium-tycoon' && <Link to="/stadium-tycoon" className="inline-flex min-h-[44px] items-center text-xs font-bold text-primary underline underline-offset-4">Watch them at Stadium Tycoon</Link>}
    </section>
  );
}
