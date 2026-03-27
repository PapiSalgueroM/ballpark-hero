import { useState, useRef, useEffect } from 'react';
import { NascarDriverPuzzle } from '@/types/nascarDriver';

interface Props {
  onGuess: (name: string) => void;
  guesses: string[];
  drivers: NascarDriverPuzzle[];
}

export function NascarDriverSearch({ onGuess, guesses, drivers }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = input.length >= 2
    ? drivers.filter(d =>
        (d.driver_name.toLowerCase().includes(input.toLowerCase()) ||
         d.common_names.some(n => n.toLowerCase().includes(input.toLowerCase()))) &&
        !guesses.some(g => g.toLowerCase() === d.driver_name.toLowerCase())
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
          placeholder="Type driver name..."
          className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-neutral-900 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
        />
      </form>
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(d => (
            <button
              key={d.id}
              onClick={() => submit(d.driver_name)}
              className="w-full text-left px-4 py-2.5 hover:bg-red-500/20 text-sm text-neutral-200 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              🏁 {d.driver_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
