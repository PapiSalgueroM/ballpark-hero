import { useState, useRef, useEffect, useMemo } from 'react';
import { TennisPlayerPuzzle } from '@/types/tennisPlayer';
import { smartMatch, smartScore, highlightMatches } from '@/lib/smartSearch';

interface Props {
  onGuess: (name: string) => void;
  guesses: string[];
  players: TennisPlayerPuzzle[];
}

export function TennisPlayerSearch({ onGuess, guesses, players }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (input.length < 2) return [];
    return players
      .filter(p => !guesses.some(g => g.toLowerCase() === p.player_name.toLowerCase()))
      .filter(p =>
        smartMatch(p.player_name, input) ||
        p.common_names.some(n => smartMatch(n, input))
      )
      .sort((a, b) => smartScore(a.player_name, input) - smartScore(b.player_name, input))
      .slice(0, 10);
  }, [input, players, guesses]);

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
      if (filtered.length > 0) submit(filtered[highlightIndex].player_name);
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
        placeholder="Type player name..."
        className="w-full px-4 py-3 rounded-xl border border-purple-500/30 bg-green-950 text-white placeholder:text-green-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-green-950 border border-green-800 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => submit(p.player_name)}
              className={`w-full text-left px-4 py-2.5 text-sm text-green-200 transition-colors first:rounded-t-xl last:rounded-b-xl ${idx === highlightIndex ? 'bg-purple-500/20' : 'hover:bg-purple-500/20'}`}
            >
              🎾 {renderName(p.player_name)}
            </button>
          ))}
        </div>
      )}
      {showSuggestions && input.trim().length >= 3 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-green-950 border border-green-800 rounded-xl shadow-lg p-3 text-center text-green-400 text-sm">
          No players found
        </div>
      )}
    </div>
  );
}
