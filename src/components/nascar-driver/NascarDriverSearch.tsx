import { useState, useRef, useEffect, useMemo } from 'react';
import { NascarDriverPuzzle } from '@/types/nascarDriver';
import { smartMatch, smartScore, highlightMatches } from '@/lib/smartSearch';

interface Props {
  onGuess: (name: string) => void;
  guesses: string[];
  drivers: NascarDriverPuzzle[];
}

export function NascarDriverSearch({ onGuess, guesses, drivers }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (input.length < 2) return [];
    return drivers
      .filter(d => !guesses.some(g => g.toLowerCase() === d.driver_name.toLowerCase()))
      .filter(d =>
        smartMatch(d.driver_name, input) ||
        d.common_names.some(n => smartMatch(n, input))
      )
      .sort((a, b) => smartScore(a.driver_name, input) - smartScore(b.driver_name, input))
      .slice(0, 10);
  }, [input, drivers, guesses]);

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
      if (filtered.length > 0) submit(filtered[highlightIndex].driver_name);
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
        placeholder="Type driver name..."
        aria-label="Search NASCAR drivers"
        className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-neutral-900 text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((d, idx) => (
            <button
              key={d.id}
              onClick={() => submit(d.driver_name)}
              className={`w-full text-left px-4 py-2.5 text-sm text-neutral-200 transition-colors first:rounded-t-xl last:rounded-b-xl ${idx === highlightIndex ? 'bg-red-500/20' : 'hover:bg-red-500/20'}`}
            >
              🏁 {renderName(d.driver_name)}
            </button>
          ))}
        </div>
      )}
      {showSuggestions && input.trim().length >= 3 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl shadow-lg p-3 text-center text-neutral-400 text-sm">
          No drivers found
        </div>
      )}
    </div>
  );
}
