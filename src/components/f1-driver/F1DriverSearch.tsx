import { useState, useRef, useEffect, useLayoutEffect, useMemo, useId } from 'react';
import { getAllF1DriverNames } from '@/data/f1Drivers';
import { F1DriverPuzzle } from '@/types/f1Driver';
import { smartMatch, smartScore, highlightMatches } from '@/lib/smartSearch';
import navigation from './F1DriverSearchNavigation.module.css';

interface Props {
  onGuess: (name: string) => void;
  disabled?: boolean;
  guesses: string[];
  currentPuzzle?: F1DriverPuzzle;
}

export function F1DriverSearch({ onGuess, disabled, guesses, currentPuzzle }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [popup, setPopup] = useState({ above: false, height: 192 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const allDrivers = useMemo(() => getAllF1DriverNames(currentPuzzle), [currentPuzzle]);

  const filtered = useMemo(() => {
    if (input.length < 1) return [];
    return allDrivers
      .filter(d => !guesses.some(g => g.toLowerCase() === d.name.toLowerCase()))
      .filter(d => smartMatch(d.name, input))
      .sort((a, b) => smartScore(a.name, input) - smartScore(b.name, input))
      .slice(0, 10);
  }, [input, allDrivers, guesses]);

  useEffect(() => setHighlightIndex(0), [filtered]);
  useLayoutEffect(() => {
    if (!showSuggestions || disabled) return;
    const position = () => {
      const input = inputRef.current;
      if (!input) return;
      const box = input.getBoundingClientRect(), viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0, bottom = top + (viewport?.height ?? window.innerHeight);
      const below = Math.max(0, bottom - box.bottom - 4), above = Math.max(0, box.top - top - 4);
      const next = { above: below < 192 && above > below, height: Math.min(192, below < 192 && above > below ? above : below) };
      setPopup(previous => previous.above === next.above && previous.height === next.height ? previous : next);
    };
    position();
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    window.visualViewport?.addEventListener('resize', position);
    return () => {
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      window.visualViewport?.removeEventListener('resize', position);
    };
  }, [showSuggestions, disabled]);
  useLayoutEffect(() => {
    const list = listRef.current;
    const option = list?.querySelectorAll<HTMLButtonElement>('[data-f1-driver-option]')[highlightIndex];
    if (!list || !option) return;
    const row = option.getBoundingClientRect(), box = list.getBoundingClientRect();
    if (row.top < box.top + 1) list.scrollTop -= box.top + 1 - row.top;
    if (row.bottom > box.bottom - 1) list.scrollTop += row.bottom - box.bottom + 1;
  }, [showSuggestions, filtered, highlightIndex, popup]);

  const submit = (name: string) => {
    if (disabled) return;
    onGuess(name);
    setInput('');
    setShowSuggestions(false);
    const active = document.activeElement;
    if (inputRef.current?.isConnected && (active === document.body || containerRef.current?.contains(active))) inputRef.current.focus({ preventScroll: true });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || (e.repeat && (e.key === 'Enter' || e.key === ' '))) { e.preventDefault(); return; }
    if (e.key === 'Escape') setShowSuggestions(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.max(0, Math.min(i + 1, filtered.length - 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) submit(filtered[highlightIndex].name);
      else if (input.trim()) submit(input.trim());
    }
  };

  const renderName = (name: string) => {
    const segments = highlightMatches(name, input);
    return segments.map((seg, i) =>
      seg.highlight ? <mark key={i} className="bg-primary/30 text-foreground rounded-sm px-0.5">{seg.text}</mark> : <span key={i}>{seg.text}</span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!disabled && showSuggestions && filtered.length > 0}
        aria-controls={!disabled && showSuggestions && filtered.length > 0 ? listId : undefined}
        aria-activedescendant={!disabled && showSuggestions && filtered[highlightIndex] ? `${listId}-${filtered[highlightIndex].id}` : undefined}
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type driver name..."
        aria-label="Search F1 drivers"
        className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-zinc-900 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
      />
      {!disabled && showSuggestions && filtered.length > 0 && (
        <div ref={listRef} id={listId} role="listbox" aria-label="F1 driver suggestions" style={{ maxHeight: popup.height, ...(popup.above ? { bottom: '100%', marginTop: 0, marginBottom: 4 } : { top: '100%' }) }} className={`absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto ${navigation.list}`}>
          {filtered.map((d, idx) => (
            <button
              key={d.id}
              id={`${listId}-${d.id}`}
              type="button"
              role="option"
              aria-selected={idx === highlightIndex}
              data-f1-driver-option={d.id}
              onFocus={() => setHighlightIndex(idx)}
              onKeyDown={e => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }}
              onClick={() => submit(d.name)}
              className={`w-full text-left px-4 py-2.5 text-sm text-zinc-200 transition-colors first:rounded-t-xl last:rounded-b-xl ${navigation.option} ${idx === highlightIndex ? 'bg-red-500/20' : 'hover:bg-red-500/20'}`}
            >
              🏎️ {renderName(d.name)}
            </button>
          ))}
        </div>
      )}
      {!disabled && showSuggestions && input.trim().length >= 3 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg p-3 text-center text-zinc-400 text-sm">
          No drivers found
        </div>
      )}
    </div>
  );
}
