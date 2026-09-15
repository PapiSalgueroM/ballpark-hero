import { useState } from 'react';
import { HubPanelHeader } from '@/components/hub/HubTiles';
import { BOOTS } from '@/lib/soccerBoots';
import { MAX_BOOT_LEVEL } from '@/lib/tycoonRewards';
import type { RewardsLedger } from '@/lib/tycoonRewards';
import type { FactoryState } from '@/lib/wonderkidFactory';
import { cn } from '@/lib/utils';

function BootIcon({ color }: { color: string }) {
  return <svg viewBox="0 0 96 48" aria-hidden="true" className="h-12 w-24 max-w-full">
    <ellipse cx="49" cy="41" rx="36" ry="4" fill="currentColor" opacity=".08" />
    <path d="M15 10 34 13 46 27 77 29Q90 31 88 37L13 37Q8 30 15 10Z" fill={color} stroke="currentColor" strokeOpacity=".5" strokeWidth="2" />
    <path d="m20 13 7 8 9-5M32 20l9 1m-5 4 9 1m-5 4 9 1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M13 37h75M22 37v4m15-4v4m27-4v4m15-4v4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}

export default function BootRoom({ state, ledger, selectedId, onEquip, onUpgrade, onBack, saveBlocked }: {
  state: FactoryState;
  ledger: RewardsLedger;
  selectedId: string | undefined;
  onEquip: (playerId: string, bootId: string | null) => void;
  onUpgrade: (bootId: string) => void;
  onBack: () => void;
  saveBlocked: boolean;
}) {
  const [bootId, setBootId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const team = state.firstTeam ?? [];
  const player = team.find(p => p.id === selectedId) ?? team[0];
  const owned = BOOTS.filter(boot => ledger.gearUnlocked?.includes(boot.id));
  const selected = owned.find(boot => boot.id === bootId) ?? owned[0];
  const level = selected ? ledger.gearLevel?.[selected.id] ?? 1 : 0;
  const wearer = selected ? team.find(p => p.bootId === selected.id) : undefined;
  const equipped = selected && player?.bootId === selected.id;
  const upgrades = ledger.kitUpgrades ?? 0;
  const pages = Math.max(1, Math.ceil(owned.length / 6));
  const currentPage = Math.min(page, pages - 1);

  return <section data-boot-room data-no-prerender className="space-y-3">
    <div className="[&_button]:min-h-[44px]"><HubPanelHeader title="Boot room" onBack={onBack} /></div>
    <div className="rounded-2xl border border-primary/30 bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span>{owned.length} / {BOOTS.length} pairs earned</span>
        <span className="text-gold">{upgrades} kit upgrade{upgrades === 1 ? '' : 's'}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Each pair has one wearer. Boots add match rating for defense. Transfer fees stay the same.
      </p>
      <details className="text-xs leading-relaxed text-muted-foreground">
        <summary className="flex min-h-[44px] cursor-pointer items-center font-bold text-primary">Boot rules</summary>
        <p>A title in a new division earns the next pair. Summit titles keep unlocking pairs until the collection is full. Other titles earn a kit upgrade. Each level adds to the wearer's match rating, up to 99. Only match rating above 60 helps defend. Boots stay with the club when a player leaves.</p>
      </details>
    </div>

    {player ? <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
      <p className="min-w-0 break-words text-xs font-bold">{player.name}<span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">{player.pos} · {Math.floor(player.rating)} rated</span></p>
      <button type="button" onClick={onBack} className="min-h-[44px] shrink-0 text-xs font-bold text-primary">Change player</button>
    </div> : <p className="rounded-xl bg-secondary/50 p-3 text-sm text-muted-foreground">Promote an academy player to give a pair its first wearer. You can still upgrade your collection here.</p>}

    {selected ? <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Earned boot pairs">
        {owned.slice(currentPage * 6, currentPage * 6 + 6).map(boot => <button key={boot.id} type="button" onClick={() => setBootId(boot.id)} aria-pressed={selected.id === boot.id}
          className={cn('flex min-h-[92px] min-w-0 flex-col items-center rounded-xl border p-2 text-center', selected.id === boot.id ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
          <BootIcon color={boot.color} />
          <span className="break-words text-xs font-bold">{boot.label}</span>
          <span className="text-[10px] text-muted-foreground">Level {ledger.gearLevel?.[boot.id] ?? 1}</span>
        </button>)}
      </div>
      {pages > 1 && <nav aria-label="Boot collection pages" className="flex items-center justify-between gap-2 text-xs">
        <button type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setBootId(owned[(currentPage - 1) * 6].id); }} className="min-h-[44px] rounded-lg border border-border px-3 disabled:opacity-40">Previous</button>
        <span>{currentPage + 1} / {pages}</span>
        <button type="button" disabled={currentPage === pages - 1} onClick={() => { setPage(currentPage + 1); setBootId(owned[(currentPage + 1) * 6].id); }} className="min-h-[44px] rounded-lg border border-border px-3 disabled:opacity-40">Next</button>
      </nav>}
      <article data-boot-detail className="rounded-2xl border border-border bg-card p-3">
        <h3 className="font-display text-lg font-bold">{selected.label}</h3>
        <p className="text-xs text-muted-foreground">Level {level} / {MAX_BOOT_LEVEL}. {wearer ? `Worn by ${wearer.name}.` : 'Ready for a wearer.'}</p>
        {player && <p className="mt-2 text-xs text-muted-foreground">For {player.name}: {Math.floor(player.rating)} rated, {Math.floor(Math.min(99, player.rating + level))} with this pair in matches.</p>}
        {player && player.rating + level <= 60 && <p className="mt-1 text-[11px] text-muted-foreground">His match rating needs to exceed 60 before it helps defend.</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={!player} onClick={() => player && onEquip(player.id, equipped ? null : selected.id)}
            className="min-h-[44px] rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40">
            {equipped ? `Take off ${selected.label}` : player ? `${wearer ? 'Move pair to' : 'Equip for'} ${player.name}` : 'Promote a player to equip'}
          </button>
          <button type="button" disabled={level >= MAX_BOOT_LEVEL || upgrades < 1} onClick={() => onUpgrade(selected.id)}
            className="min-h-[44px] rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-bold text-gold disabled:opacity-40">
            {level >= MAX_BOOT_LEVEL ? 'Fully upgraded' : upgrades > 0 ? `Use 1 kit upgrade: level ${level + 1}` : 'Earn a kit upgrade from a title'}
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Moving a pair takes it off its current wearer. One kit upgrade raises one pair by one level, up to level {MAX_BOOT_LEVEL}.</p>
      </article>
    </> : <div className="rounded-2xl border border-dashed border-border p-4 text-center">
      <div className="flex justify-center"><BootIcon color={BOOTS[0].color} /></div>
      <h3 className="font-display font-bold">Your next league title earns {BOOTS[0].label}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Win a league at Stadium Tycoon, then give the pair to a graduate. Moving it between players costs nothing.</p>
    </div>}
    {saveBlocked && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">This change could not be saved. Your equipment and kit upgrades have not changed. Free up device storage and try again.</p>}
  </section>;
}
