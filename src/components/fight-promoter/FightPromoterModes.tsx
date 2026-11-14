import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FightPromoterBoard from '@/components/fight-promoter/FightPromoterBoard';
import MmaPromotionBoard from '@/components/fight-promoter/MmaPromotionBoard';
import {
  FIGHT_PROMOTER_MODE_KEY, fightPromoterModeFromSearch, savedFightPromoterMode, type FightPromoterMode,
} from '@/lib/fightPromoterRoutes';

type Mode = FightPromoterMode | null;

function savedMode(): Mode {
  try { return savedFightPromoterMode(localStorage); }
  catch { return null; }
}

function rememberMode(mode: Mode): void {
  try {
    if (mode) localStorage.setItem(FIGHT_PROMOTER_MODE_KEY, mode);
    else localStorage.removeItem(FIGHT_PROMOTER_MODE_KEY);
  } catch { /* The promotion handles its own save notice. */ }
}

export default function FightPromoterModes() {
  const [search, setSearch] = useSearchParams();
  const requested = fightPromoterModeFromSearch(search);
  const [preferred, setPreferred] = useState<Mode>(savedMode);
  const mode = requested ?? preferred;
  useEffect(() => {
    if (!requested) return;
    setPreferred(requested);
    rememberMode(requested);
  }, [requested]);
  const choose = (next: Mode) => {
    setPreferred(next);
    rememberMode(next);
    const params = new URLSearchParams(search);
    if (next) params.set('mode', next);
    else params.delete('mode');
    setSearch(params, { replace: true });
  };
  if (!mode) return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button aria-label="MMA" onClick={() => choose('mma')} className="rounded-xl border-2 border-primary bg-primary/5 p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <span className="block text-xl font-display font-bold">MMA</span>
        <span className="mt-2 block text-sm text-muted-foreground">Build your organization. Sign fighters, book the card and crown your champions.</span>
      </button>
      <button aria-label="Boxing" onClick={() => choose('boxing')} className="rounded-xl border bg-card p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <span className="block text-xl font-display font-bold">Boxing</span>
        <span className="mt-2 block text-sm text-muted-foreground">Make the fights, sell the room and grow your name. Your existing promotion lives here.</span>
      </button>
      <p className="text-xs text-muted-foreground sm:col-span-2">Each mode keeps its own save. Every fighter and promotion is fictional.</p>
    </div>
  );
  return <div className="space-y-3">
    <button onClick={() => choose(null)} className="min-h-[44px] rounded-md border px-3 text-sm">Change sport</button>
    {mode === 'mma' ? <MmaPromotionBoard /> : <FightPromoterBoard />}
  </div>;
}
