import { useState, useRef, useEffect } from 'react';
import { NationPuzzle } from '@/types/guessTheNation';
import { FlagImg } from '@/components/FlagImg';

interface Props {
  countries: NationPuzzle[];
  usedGuesses: string[];
  onGuess: (name: string) => void;
}

export function NationSearch({ countries, usedGuesses, onGuess }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const normalize = (s: string) => s.toLowerCase().trim();
  const usedSet = new Set(usedGuesses.map(normalize));

  const matches =
    query.length >= 2
      ? countries
          .filter((c) => {
            const q = normalize(query);
            return (
              !usedSet.has(normalize(c.countryName)) &&
              [c.countryName, ...c.commonNames].some((n) => normalize(n).includes(q))
            );
          })
      : [];

  const handleSelect = (name: string) => {
    onGuess(name);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type a country name..."
        className="w-full px-4 py-3 rounded-lg border border-amber-500/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {matches.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.countryName)}
              className="w-full px-4 py-2.5 text-left hover:bg-amber-500/10 transition-colors flex items-center gap-2"
            >
              <FlagImg name={c.countryName} size={20} />
              <span className="text-foreground">{c.countryName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
