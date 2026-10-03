/**
 * Round 945: the lineup panel, shared by every GM seat.
 *
 * One component for whatever a sport declares in src/lib/gmLineupSports.ts:
 * the batting nine and the rotation, four lines and three pairs, the NFL's
 * personnel and front. Small tiles and a back button at each level (a tile
 * per group, then the group), and the Round 723 tap to swap: tap a man, then
 * the one to swap him with, in the lineup or off the bench.
 *
 * It holds no save of its own. The board passes the team and its saved
 * choice, and gets the next choice back through onChange, so every rule
 * about what a tap may do lives in gmLineup.ts where the harness reads it.
 * No board renders it yet: the binds that follow wire it in one sport at a
 * time, after the strength functions are handed over.
 */
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type GmLineupChoice, type GmLineupMan, type GmLineupSport, type GmPick,
  gmGroupPool, gmGroupSlots, gmLineupReading, gmLineupReset, gmLineupSetOpen, gmLineupSetScheme, gmLineupSwap, gmResolveLineup,
} from '@/lib/gmLineup';

interface GmLineupPanelProps<T> {
  sport: GmLineupSport<T>;
  team: T;
  /** The saved choice, absent on a team the GM has never set. */
  choice?: GmLineupChoice;
  onChange: (next: GmLineupChoice) => void;
  /** Back out of the panel to wherever the board opened it from. */
  onBack?: () => void;
}

const signed = (x: number): string => (Math.abs(x) < 0.005 ? 'even' : `${x > 0 ? '+' : ''}${x.toFixed(2)}`);
const pickKey = (p: GmPick): string => ('slot' in p ? `slot:${p.slot}` : p.id);

export function GmLineupPanel<T>({ sport, team, choice, onChange, onBack }: GmLineupPanelProps<T>) {
  const [view, setView] = useState<string | null>(null);
  const [picked, setPicked] = useState<GmPick | null>(null);
  const [refused, setRefused] = useState(false);
  const reading = gmLineupReading(sport, team, choice);
  const lineup = gmResolveLineup(sport, team, choice);
  const group = sport.groups.find(g => g.key === view) ?? null;

  const open = (key: string | null) => { setView(key); setPicked(null); setRefused(false); };
  const commit = (next: GmLineupChoice | null) => {
    setPicked(null);
    setRefused(next === null);
    if (next) onChange(next);
  };
  const tap = (p: GmPick) => {
    if (!group) return;
    setRefused(false);
    if (!picked) { setPicked(p); return; }
    if (pickKey(picked) === pickKey(p)) { setPicked(null); return; }
    commit(gmLineupSwap(sport, team, choice, group.key, picked, p));
  };
  const saved = (key: string) => !!choice?.slots?.[key] || !!choice?.schemes?.[key];

  return (
    <div data-lineup-panel={sport.id} className="space-y-2">
      <div className="flex items-center gap-2">
        {(group || onBack) && (
          <button
            data-lineup-back
            onClick={() => (group ? open(null) : onBack?.())}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {group ? 'Lineup' : 'Roster'}
          </button>
        )}
        <span className="font-display text-sm font-bold text-foreground">{group ? group.label : 'Lineup'}</span>
        <span data-lineup-strength className="ml-auto text-[11px] text-muted-foreground">
          Strength <b className="text-foreground">{reading.strength.toFixed(1)}</b>
          {' '}({signed(reading.strength - reading.base)} on the sim's pick)
        </span>
      </div>
      {!group && (
        <>
          <p className="text-center text-[10px] text-muted-foreground">
            Tap a group to set it. Anything you leave alone stays the sim's pick, best men first.
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {sport.groups.map(g => {
              const men = lineup[g.key].filter((p): p is GmLineupMan => !!p);
              const scheme = sport.schemes?.[g.key]?.find(s => s.slots === gmGroupSlots(sport, g, choice));
              const delta = reading.groups.find(x => x.key === g.key)?.delta ?? 0;
              return (
                <button
                  key={g.key}
                  data-lineup-group={g.key}
                  onClick={() => open(g.key)}
                  className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-left hover:border-primary/60"
                >
                  <span className="block text-xs font-bold text-foreground">
                    {g.label}{scheme && <span className="font-normal text-muted-foreground"> · {scheme.label}</span>}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {men.length ? men.slice(0, 3).map(p => p.name ?? p.id).join(', ') : 'Nobody'}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {saved(g.key) ? `Your pick, ${signed(delta)}` : "The sim's pick"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {group && groupView()}
    </div>
  );

  /* A plain render function, not a component: a component declared in here would be a new type every render and remount. */
  function groupView() {
    if (!group) return null;
    const slots = gmGroupSlots(sport, group, choice);
    const placed = lineup[group.key];
    const inLineup = new Set(placed.filter((p): p is GmLineupMan => !!p).map(p => p.id));
    const bench = sport.chartOnly ? [] : gmGroupPool(group, sport.men(team)).filter(p => !inLineup.has(p.id)).sort((a, b) => b.ovr - a.ovr);
    const delta = reading.groups.find(x => x.key === group.key)?.delta ?? 0;
    const schemes = sport.schemes?.[group.key];
    const optional = group.rotation ? slots.length - group.rotation.optional : -1;
    const isPicked = (p: GmPick) => !!picked && pickKey(picked) === pickKey(p);
    return (
      <div data-lineup-group-open={group.key} className="space-y-2">
        <p className="text-center text-[10px] text-muted-foreground">
          {sport.chartOnly
            ? 'These men come off your depth chart. Pick the shape here, and the chart decides who fills it.'
            : 'Tap a man, then tap the one to swap him with, here or on the bench.'}
          {' '}<span data-lineup-group-delta>This group: {signed(delta)} on the sim's pick.</span>
        </p>
        {schemes && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {schemes.map(s => {
              const active = slots === s.slots;
              return (
                <button
                  key={s.key}
                  data-lineup-scheme={s.key}
                  disabled={active}
                  onClick={() => commit(gmLineupSetScheme(sport, choice, group.key, s.key))}
                  className={cn('rounded-full border px-3 py-1 text-[11px] font-bold', active ? 'border-gold bg-gold/10 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary')}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {slots.map((slot, i) => {
            const p = placed[i];
            const me: GmPick = p ? { id: p.id } : { slot: i };
            return (
              <button
                key={`${slot.label}-${i}`}
                data-lineup-slot={i}
                disabled={sport.chartOnly}
                onClick={() => tap(me)}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs',
                  isPicked(me) ? 'border-gold bg-gold/10' : 'border-border/60 bg-background hover:border-primary/60',
                )}
              >
                <span className="min-w-0">
                  <span className="block text-[10px] text-muted-foreground">{slot.label}</span>
                  <span className="block truncate font-bold text-foreground">{p ? p.name ?? p.id : i >= optional && optional >= 0 ? 'Skipped' : 'Open'}</span>
                </span>
                {p && <b className="ml-2 shrink-0 text-primary">{p.ovr}</b>}
              </button>
            );
          })}
        </div>
        {optional >= 0 && (
          <div className="text-center">
            <button
              data-lineup-open
              onClick={() => commit(gmLineupSetOpen(sport, team, choice, group.key, optional, placed[optional] !== null))}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              {placed[optional] === null
                ? 'Use the last spot again'
                : 'Skip the last spot (everyone else then pitches on short rest, and every start costs)'}
            </button>
          </div>
        )}
        {bench.length > 0 && (
          <div data-lineup-bench-list>
            <p className="mb-1 text-[10px] font-bold text-muted-foreground">Bench</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {bench.map(p => (
                <button
                  key={p.id}
                  data-lineup-bench={p.id}
                  onClick={() => tap({ id: p.id })}
                  className={cn('flex items-center justify-between rounded-lg border px-2 py-1 text-left text-[11px]', isPicked({ id: p.id }) ? 'border-gold bg-gold/10' : 'border-border/60 bg-background hover:border-primary/60')}
                >
                  <span className="truncate">{p.name ?? p.id} <span className="text-muted-foreground">{p.pos}</span></span>
                  <b className="ml-1 text-primary">{p.ovr}</b>
                </button>
              ))}
            </div>
          </div>
        )}
        {refused && <p data-lineup-refused className="text-center text-[10px] text-destructive">That move doesn't work here, so nothing changed.</p>}
        {saved(group.key) && (
          <div className="text-center">
            <button data-lineup-reset onClick={() => { setPicked(null); onChange(gmLineupReset(choice, group.key)); }} className="text-[11px] font-bold text-primary hover:underline">
              Back to the sim's pick
            </button>
          </div>
        )}
      </div>
    );
  }
}
