import { useEffect, useRef, useState } from 'react';
import { moneyIn, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import {
  addRecruitment, removeRecruitment, recruitmentOf, recruitmentKey, resolveRecruitmentTarget, RECRUITMENT_LIMIT,
  type RecruitmentCommit, type RecruitmentPick, type RecruitmentTarget,
} from '@/lib/clubManagerRecruitment';

interface Props {
  career: CareerState;
  market: MarketPlayer[];
  initial?: RecruitmentPick;
  onCommit: RecruitmentCommit;
  onBack: () => void;
  onFind: (player: MarketPlayer) => void;
}
const button = 'min-h-11 min-w-11 rounded-lg border border-border px-3 py-2 text-sm font-bold break-words';
export function RecruitmentBoard({ career, market, initial, onCommit, onBack, onFind }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const root = useRevealScroll<HTMLElement>(help ? 'recruitment-help' : selected ?? 'recruitment', { skipFirst: false });
  const heading = useRef<HTMLHeadingElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const tileButtons = useRef(new Map<string, HTMLButtonElement>());
  const attempted = useRef<RecruitmentPick>();
  const helpButton = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState('');
  const saved = recruitmentOf(career), targets = saved?.targets ?? [];
  const selectedTarget = targets.find(target => recruitmentKey(target) === selected);
  const overview = targets.length > 1 && !selectedTarget;
  const showing = targets.length === 1 ? targets : selectedTarget ? [selectedTarget] : [];
  const cash = moneyIn(career), closed = career.transferWindow === null;
  useEffect(() => { if (selectedTarget) detailHeading.current?.focus({ preventScroll: true }); }, [selectedTarget]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!initial || attempted.current === initial) return;
    attempted.current = initial;
    /* Release BS fix: a full list refuses the save, and the board says so rather than blaming the save */
    const full = (recruitmentOf(initial.career)?.targets.length ?? 0) >= RECRUITMENT_LIMIT;
    const ok = onCommit(current => current === initial.career ? addRecruitment(current, initial.player) : null);
    setMessage(ok ? 'Target saved.' : full ? `Your shortlist is full: ${RECRUITMENT_LIMIT} of ${RECRUITMENT_LIMIT}. Remove a target to save another.` : 'Could not save this target. Check the save notice and try again.');
  }, [initial, onCommit]);
  const remove = (target: RecruitmentTarget) => {
    const ok = onCommit(current => current === career ? removeRecruitment(current, target) : null);
    setMessage(ok ? 'Target removed.' : 'Could not remove this target. Check the save notice and try again.');
    if (ok) { setSelected(null); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }
  };
  return (
    <section ref={root} aria-labelledby="cm-recruitment-title" className="min-w-0 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <button className={button} onClick={() => {
          if (help) { setHelp(false); requestAnimationFrame(() => helpButton.current?.focus({ preventScroll: true })); }
          else if (selectedTarget && targets.length > 1) {
            const key = recruitmentKey(selectedTarget);
            setSelected(null);
            requestAnimationFrame(() => tileButtons.current.get(key)?.focus({ preventScroll: true }));
          } else onBack();
        }}>Back</button>
        <div className="min-w-0 text-center">
          <h3 ref={heading} tabIndex={-1} id="cm-recruitment-title" className="text-lg font-black break-words">Recruitment shortlist</h3>
          <p className="text-xs text-muted-foreground">{targets.length}/{RECRUITMENT_LIMIT} saved for this club</p>
        </div>
        <button ref={helpButton} className={button} aria-label="Recruitment shortlist help" aria-expanded={help} onClick={() => setHelp(v => !v)}>?</button>
      </div>
      <p className="text-sm text-muted-foreground">Current asking prices and game ratings. Saving a target spends nothing and makes no approach.</p>
      {help ? (
        <div className="rounded-xl border border-border p-3 space-y-2 text-sm">
          <h4 className="font-bold">Keep a few options</h4>
          <p>Save up to 12 players from Buy. Open this list between windows to compare their current asking price, age, rating and primary position with your current squad.</p>
          <p>For example, save two centre-backs, compare their current numbers, then use Find in Buy when the window opens. Any talks and payment happen on the ordinary Buy desk.</p>
          <p>Older records can become unavailable after a club move. If a player cannot be matched safely, the entry stays here so you can remove it.</p>
          <p>The list belongs to this club and this saved world. Remove clears an entry. Nothing here promises minutes, growth, a transfer or a future price.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {closed && <p className="text-sm text-muted-foreground">The transfer window is shut. You can compare and remove targets; Find in Buy returns when it opens.</p>}
          {!targets.length && <p className="rounded-xl border border-border p-3 text-sm">No saved targets for this club and world. Use Save beside a player on Buy.</p>}
          {overview ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {targets.map(target => {
              const key = recruitmentKey(target), player = resolveRecruitmentTarget(career, target, market);
              const name = player?.name ?? target.name;
              return <button key={key} aria-label={`View ${name}`} className="min-h-20 min-w-0 rounded-xl border border-border bg-card p-3 text-left"
                ref={node => { if (node) tileButtons.current.set(key, node); else tileButtons.current.delete(key); }}
                onClick={() => setSelected(key)}>
                <span className="block font-bold text-sm break-words">{name}</span>
                <span className="block text-xs text-muted-foreground break-words">{player?.club ?? target.club} · {player?.position ?? target.position}</span>
              </button>;
            })}
          </div> : showing.map(target => {
            const player = resolveRecruitmentTarget(career, target, market);
            const peers = player ? [...career.squad].filter(p => p.position === player.position)
              .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)).slice(0, 3) : [];
            const name = player?.name ?? target.name;
            return (
              <article key={recruitmentKey(target)} aria-label={name} className="min-w-0 rounded-xl border border-border bg-card p-3 space-y-3">
                <h4 ref={detailHeading} tabIndex={-1} className="font-bold break-words">{name}</h4>
                {player ? <>
                  <p className="text-xs text-muted-foreground break-words">{player.club}{player.generated ? ' · MADE UP' : ''}</p>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[['Asking price', cash(player.price)], ['Age', `${player.age}y`], ['Game rating', String(player.rating)], ['Primary position', player.position]].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-lg bg-secondary/30 p-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-bold break-words">{value}</dd></div>
                    ))}
                  </dl>
                  {player.joinedThisSeason && <p className="text-xs text-muted-foreground">Joined this club this season. The ordinary Buy desk keeps its sale restrictions.</p>}
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">Highest-rated current players at {player.position}, up to 3:</p>
                    {peers.length ? peers.map(p => <p key={p.id} className="break-words">{p.name} · {p.age}y · {p.rating} · {p.position}</p>) : <p>No current player at this primary position.</p>}
                  </div>
                </> : <p className="text-sm text-muted-foreground">Unavailable in the current market. This entry stays here so you can remove it.</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button className={button} disabled={!player || closed} aria-label={`Find ${name} in Buy`} onClick={() => { if (player && !closed) onFind(player); }}>Find in Buy</button>
                  <button className={button} aria-label={`Remove ${name}`} onClick={() => remove(target)}>Remove</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p aria-live="polite" className="text-sm break-words">{message}</p>
    </section>
  );
}
