import { useState, useRef, useEffect } from 'react';
import { getAllF1DriverNames } from '@/data/f1Drivers';

interface Props {
  onGuess: (name: string) => void;
  disabled?: boolean;
  guesses: string[];
}

export function F1DriverSearch({ onGuess, disabled, guesses }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const allDrivers = getAllF1DriverNames();

  const filtered = input.length >= 1
    ? allDrivers.filter(d =>
        d.name.toLowerCase().includes(input.toLowerCase()) &&
        !guesses.some(g => g.toLowerCase() === d.name.toLowerCase())
      ).slice(0, 6)
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
          disabled={disabled}
          placeholder="Type driver name..."
          className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
        />
      </form>
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(d => (
            <button
              key={d.id}
              onClick={() => submit(d.name)}
              className="w-full text-left px-4 py-2.5 hover:bg-red-500/20 text-sm text-zinc-200 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              🏎️ {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
