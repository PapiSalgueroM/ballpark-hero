/**
 * Round 1522: the four team instructions as small tiles, one row each (pressing, tempo, width, line), three
 * settings a row and one plain line under it on what the chosen setting does and what it costs. The tactics tab
 * sets the standing plan with it; the live sheet and the dressing room set tonight's with it.
 */
import { cn } from '@/lib/utils';
import {
  AI_STYLES, INSTRUCTION_INFO, INSTRUCTION_KEYS, isBalanced,
  type AiStyleId, type Setting, type TeamInstructions,
} from '@/lib/clubManagerTactics';

const SETTINGS: Setting[] = [-1, 0, 1];

export function InstructionsPicker({ value, onChange, theirStyle, idPrefix = 'cm' }: {
  value: TeamInstructions;
  onChange: (next: TeamInstructions) => void;
  /** The other side's style, when there is a match to read: a line on what tends to work against it. */
  theirStyle?: AiStyleId | null;
  /** Keeps the test hooks apart when two pickers are on one screen. */
  idPrefix?: string;
}) {
  const style = theirStyle ? AI_STYLES[theirStyle] : null;
  return (
    <div className="space-y-1.5" data-cm-instructions={idPrefix}>
      {style && (
        <p className="text-[10px] leading-snug text-muted-foreground" data-cm-instr-read={theirStyle ?? ''}>
          <span className="font-semibold text-foreground">{style.emoji} In this sim they play {style.label}.</span> {style.read}
        </p>
      )}
      {INSTRUCTION_KEYS.map(k => {
        const info = INSTRUCTION_INFO[k];
        const chosen = info.options[String(value[k]) as '-1' | '0' | '1'];
        return (
          <div key={k} data-cm-instr-row={k} className="rounded-lg border border-border bg-card px-2 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[4.5rem] shrink-0">{info.label}</span>
              <div className="grid grid-cols-3 gap-1 flex-1 min-w-0">
                {SETTINGS.map(v => {
                  const on = value[k] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={on}
                      data-cm-instr-btn={`${idPrefix}:${k}:${v}`}
                      onClick={() => { if (!on) onChange({ ...value, [k]: v }); }}
                      className={cn(
                        'min-h-[28px] rounded-md border px-1 py-1 text-[10px] font-bold leading-tight truncate transition-colors',
                        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:border-primary',
                      )}
                    >
                      {info.options[String(v) as '-1' | '0' | '1'].label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-1 text-[9px] leading-snug text-muted-foreground" data-cm-instr-line={k}>
              {chosen.does}{value[k] !== 0 && <> <span className="font-semibold text-foreground">Cost:</span> {chosen.costs}</>}
            </p>
          </div>
        );
      })}
      {!isBalanced(value) && (
        <button
          type="button"
          data-cm-instr-reset={idPrefix}
          onClick={() => onChange({ press: 0, tempo: 0, width: 0, line: 0 })}
          className="text-[10px] font-semibold text-primary hover:opacity-80"
        >
          Back to balanced on all four
        </button>
      )}
    </div>
  );
}
