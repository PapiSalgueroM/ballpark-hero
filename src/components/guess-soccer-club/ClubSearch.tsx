import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { allClubNames } from '@/data/soccerClubPuzzles';

interface Props {
  usedGuesses: string[];
  onGuess: (name: string) => void;
  disabled?: boolean;
}

export function ClubSearch({ usedGuesses, onGuess, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    query.length >= 2
      ? allClubNames.filter(
          n =>
            n.toLowerCase().includes(query.toLowerCase()) &&
            !usedGuesses.some(g => g.toLowerCase() === n.toLowerCase())
        )
      : [];

  const handleSelect = (name: string) => {
    onGuess(name);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      handleSelect(filtered[0]);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Type a club name…"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pl-10 h-12 text-base"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map(name => (
            <button
              key={name}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(name)}
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0"
            >
              <span className="text-foreground font-medium">{name}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground text-sm">
          No clubs found
        </div>
      )}
    </div>
  );
}
