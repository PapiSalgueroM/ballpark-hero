import { useState } from 'react';
import FightPromoterBoard from './FightPromoterBoard';
import MmaPromotionBoard from './MmaPromotionBoard';

type Mode = 'mma' | 'boxing' | null;
const MODE_KEY = 'fight-promoter-mode-v1';

function savedMode(): Mode {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    if (mode === 'mma' || mode === 'boxing') return mode;
    if (localStorage.getItem('fight-promoter-save-v1')) return 'boxing';
  } catch { /* Mode selection works without storage. */ }
  return null;
}

export default function FightPromoterModes() {
  const [mode, setMode] = useState<Mode>(savedMode);
  const choose = (next: Mode) => {
    setMode(next);
    try {
      if (next) localStorage.setItem(MODE_KEY, next);
      else localStorage.removeItem(MODE_KEY);
    } catch { /* The promotion handles its own save notice. */ }
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
