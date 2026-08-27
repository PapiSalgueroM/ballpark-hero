import { useState, useRef, useEffect, useMemo } from 'react';
import { getAllF1DriverNames } from '@/data/f1Drivers';
import { F1DriverPuzzle } from '@/types/f1Driver';
import { smartMatch, smartScore, highlightMatches } from '@/lib/smartSearch';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const allDrivers = getAllF1DriverNames(currentPuzzle);

  const filtered = useMemo(() => {
    if (input.length < 1) return [];
    return allDrivers
      .filter(d => !guesses.some(g => g.toLowerCase() === d.name.toLowerCase()))
      .filter(d => smartMatch(d.name, input))
      .sort((a, b) => smartScore(a.name, input) - smartScore(b.name, input))
      .slice(0, 10);
  }, [input, allDrivers, guesses]);

  useEffect(() => setHighlightIndex(0), [filtered]);

  const submit = (name: string) => {
    onGuess(name);
    setInput('');
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setShowSuggestions(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, filtered.length - 1)); }
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
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((d, idx) => (
            <button
              key={d.id}
              onClick={() => submit(d.name)}
              className={`w-full text-left px-4 py-2.5 text-sm text-zinc-200 transition-colors first:rounded-t-xl last:rounded-b-xl ${idx === highlightIndex ? 'bg-red-500/20' : 'hover:bg-red-500/20'}`}
            >
              🏎️ {renderName(d.name)}
            </button>
          ))}
        </div>
      )}
      {showSuggestions && input.trim().length >= 3 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg p-3 text-center text-zinc-400 text-sm">
          No drivers found
        </div>
      )}
    </div>
  );
}
