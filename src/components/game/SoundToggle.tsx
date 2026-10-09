/* ─── Round 1132: the sound switch on screen ───
   One button in three shapes, all reading the same switch (src/lib/sound.ts),
   so every one mounted shows the same thing and another tab's change arrives.

   - 'text' is the footer's: styled like its neighbours, on every route, phones
     included. Its box is one fixed width, so "Sound: off" turning into
     "Sound: on" cannot re-wrap the row under his thumb.
   - 'icon' is for a header or a dialog's top row: the button's own box is 44
     by 44, a real thumb target, around a 36 px bordered glyph that matches the
     controls beside it.
   - 'chip' is for a control row: 44 px tall, the glyph and the words.

   While the switch reads on it primes the kit: the chunk is fetched after load
   and the first tap anywhere wakes the audio inside that tap, the one place an
   iPhone allows it. A visitor whose switch is off fetches nothing.

   No icon library, no animation, no state of its own. The server render and
   the saved pages are always off. */
import { useEffect, useSyncExternalStore } from 'react';
import { preloadSound, primeSound, setSoundOn, soundOn, subscribeSound } from '@/lib/sound';

const off = (): boolean => false;

export function SoundToggle({ variant, className = '' }: { variant: 'text' | 'icon' | 'chip'; className?: string }) {
  const on = useSyncExternalStore(subscribeSound, soundOn, off);
  useEffect(() => { if (on) primeSound(); }, [on]);
  const common = {
    type: 'button' as const,
    'aria-pressed': on,
    'data-sound-toggle': variant,
    onPointerDown: on ? undefined : preloadSound,
    onClick: () => setSoundOn(!on),
  };
  if (variant === 'text') {
    return (
      <button {...common} className={`inline-block min-w-[10ch] whitespace-nowrap text-center underline hover:text-foreground transition-colors ${className}`}>
        Sound: {on ? 'on' : 'off'}
      </button>
    );
  }
  if (variant === 'icon') {
    return (
      <button
        {...common}
        aria-label="Sound"
        title={on ? 'Sound is on' : 'Sound is off'}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center ${className}`}
      >
        <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm">{on ? '🔊' : '🔇'}</span>
      </button>
    );
  }
  return (
    <button
      {...common}
      className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold ${className}`}
    >
      <span aria-hidden="true">{on ? '🔊' : '🔇'}</span>
      <span>Sound {on ? 'on' : 'off'}</span>
    </button>
  );
}
