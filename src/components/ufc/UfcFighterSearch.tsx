import { useState, useMemo, useRef, useEffect } from 'react';
import { UfcFighter } from '@/types/ufc';
import { Search } from 'lucide-react';

interface UfcFighterSearchProps {
  fighters: UfcFighter[];
  guessedNames: string[];
  onSelect: (fighter: UfcFighter) => void;
}

export function UfcFighterSearch({ fighters, guessedNames, onSelect }: UfcFighterSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return fighters
      .filter(f => !guessedNames.includes(f.name))
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, fighters, guessedNames]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (fighter: UfcFighter) => {
    onSelect(fighter);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a fighter..."
          className="w-full bg-card border border-border text-foreground rounded-xl pl-12 pr-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground transition-all"
          autoComplete="off"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
          {filtered.map((fighter) => (
            <button
              key={fighter.name}
              onClick={() => handleSelect(fighter)}
              className="w-full text-left px-5 py-3 hover:bg-secondary transition-colors flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="font-medium text-foreground">{fighter.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{fighter.weightClass} · {fighter.nationality}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-2xl z-50 p-4 text-center text-muted-foreground text-sm">
          No fighters found
        </div>
      )}
    </div>
  );
}
