import { useState, useRef, useEffect } from 'react';
import { TennisPlayerPuzzle } from '@/types/tennisPlayer';

interface Props {
  onGuess: (name: string) => void;
  guesses: string[];
  players: TennisPlayerPuzzle[];
}

export function TennisPlayerSearch({ onGuess, guesses, players }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = input.length >= 2
    ? players.filter(p =>
        (p.player_name.toLowerCase().includes(input.toLowerCase()) ||
         p.common_names.some(n => n.toLowerCase().includes(input.toLowerCase()))) &&
        !guesses.some(g => g.toLowerCase() === p.player_name.toLowerCase())
      )
    : [];

  const submit = (name: string) => {
    onGuess(name);
    setInput('');
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <form onSubmit={e => { e.preventDefault(); if (input.trim()) submit(input.trim()); }}>
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Type player name..."
          className="w-full px-4 py-3 rounded-xl border border-purple-500/30 bg-green-950 text-white placeholder:text-green-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </form>
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-green-950 border border-green-800 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => submit(p.player_name)}
              className="w-full text-left px-4 py-2.5 hover:bg-purple-500/20 text-sm text-green-200 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              🎾 {p.player_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
