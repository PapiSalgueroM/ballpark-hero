/* Round 1045: the Season Centre's "?" sheet: how it works and worked
   examples, shown by itself the first time a viewer opens a season and
   from every "?" after that. The words come from the sport's entry, so the
   NBA and NFL binds bring their own. The "seen it" flag is a per viewer
   convenience in localStorage; every access is guarded, and a browser that
   refuses storage simply sees the sheet again next time. */
import { useEffect, useState } from 'react';

const SEEN_KEY = 'seasonCentre:help';

/** Open by itself once per viewer; [open, setOpen]. */
export function useHelpOnce(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { seen = false; }
    if (seen) return;
    setOpen(true);
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage refused: show it again next time */ }
  }, []);
  return [open, setOpen];
}

export interface HelpWords {
  title: string;
  intro: string[];
  controls: string;
  examples: { head: string; body: string }[];
  footnote: string;
}

export function SeasonCentreHelp({ words, onClose }: { words: HelpWords; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center overflow-y-auto bg-background/95 p-4" role="dialog" aria-modal="true" aria-label={words.title} data-season-help>
      <div className="w-full max-w-lg space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <h3 className="text-base font-black">{words.title}</h3>
        {words.intro.map(p => <p key={p} className="leading-relaxed text-muted-foreground">{p}</p>)}
        <p className="leading-relaxed">{words.controls}</p>
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Worked examples</div>
          {words.examples.map(x => (
            <div key={x.head} className="rounded-lg bg-muted/30 p-2">
              <div className="text-xs font-bold">{x.head}</div>
              <div className="text-xs leading-relaxed text-muted-foreground">{x.body}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{words.footnote}</p>
        <button type="button" onClick={onClose} className="h-10 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground">Got it</button>
      </div>
    </div>
  );
}
