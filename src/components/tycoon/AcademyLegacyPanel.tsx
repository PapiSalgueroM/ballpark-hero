import { cn } from '@/lib/utils';
import { REGIONS, canMoveUp, fmtCash, FACILITIES, facilityCost, findSec, trainMult, priceMult } from '@/lib/wonderkidFactory';
import type { FactoryState, FacilityId } from '@/lib/wonderkidFactory';

export default function AcademyLegacyPanel({ s, region, goal, goalPct, doMoveUp }: {
  s: FactoryState;
  region: (typeof REGIONS)[number];
  goal: number;
  goalPct: number;
  doMoveUp: () => void;
}) {
  return (
<div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">earned in {region.name}</span>
                <span className="font-bold text-foreground tabular-nums">{fmtCash(s.lifetime)} / {fmtCash(goal)}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${goalPct}%` }} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Move up and the academy starts again in a bigger place: cash, facilities and academy kids stay behind. Your first team comes with you.
              The star is forever: +15% training and +10% fees each, and the next region's scouts find higher ceilings.
            </p>
            {s.rep < REGIONS.length - 1 && (
              <p className="text-[11px] text-muted-foreground">next stop: {REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].emoji} {REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].name}, ceilings up to {REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].potMax}</p>
            )}
            <button
              onClick={doMoveUp}
              disabled={!canMoveUp(s)}
              className={cn(
                'w-full py-2.5 rounded-xl font-bold text-sm transition-all',
                canMoveUp(s) ? 'bg-gold text-gold-foreground wf-glow' : 'bg-secondary text-muted-foreground',
              )}
            >
              {canMoveUp(s) ? `⭐ Move up to ${REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].name}` : `earn ${fmtCash(Math.max(0, goal - s.lifetime))} more first`}
            </button>
            <div className="text-[10px] text-muted-foreground text-center">
              career: {fmtCash(s.careerEarned)} earned · {s.soldCareer} kids sold on · best fee {fmtCash(s.best)}{s.leftFree > 0 ? ` · ${s.leftFree} walked for free` : ''}
            </div>
          </div>
  );
}

export function AcademyFacilityPanel({ s, panel, cap, doBuy }: {
  s: FactoryState;
  panel: FacilityId;
  cap: number;
  doBuy: (id: FacilityId) => void;
}) {
  return (
(() => {
            const f = FACILITIES.find(x => x.id === panel)!;
            const lvl = s.levels[f.id];
            const cost = facilityCost(s, f.id);
            const maxed = lvl >= f.maxLevel;
            return (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{f.emoji}</span>
                  <div>
                    <div className="text-sm font-bold text-foreground">Level {lvl}{maxed ? ' (maxed)' : ''}</div>
                    <p className="text-xs text-muted-foreground">{f.blurb}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {panel === 'scouting' && <>a find every ~{Math.ceil(findSec(s))}s now{s.levels.scouting < 6 ? `, ceilings read ${s.levels.scouting < 3 ? 'blind' : 'as a range'}` : ', ceilings read exactly'}</>}
                  {panel === 'coaching' && <>training runs at x{trainMult(s).toFixed(2)} right now</>}
                  {panel === 'dorms' && <>{cap} beds, {s.prospects.length} in use. A full academy stops scouting</>}
                  {panel === 'agents' && <>every fee pays x{priceMult(s).toFixed(2)} right now</>}
                </div>
                <button
                  onClick={() => doBuy(f.id)}
                  disabled={maxed || s.cash < cost}
                  className={cn(
                    'w-full py-2.5 rounded-xl font-bold text-sm transition-all',
                    !maxed && s.cash >= cost ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {maxed ? 'maxed out' : `Upgrade for ${fmtCash(cost)}`}
                </button>
              </div>
            );
          })()
  );
}
