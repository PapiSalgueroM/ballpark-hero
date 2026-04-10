import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Player } from '@/types/game';
import { Search } from 'lucide-react';
import { smartMatch, smartScore, highlightMatches } from '@/lib/smartSearch';

interface PlayerSearchProps {
  players: Player[];
  guessedNames: string[];
  onSelect: (player: Player) => void;
}

export function PlayerSearch({ players, guessedNames, onSelect }: PlayerSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    return players
      .filter(p => !guessedNames.includes(p.name))
      .filter(p => smartMatch(p.name, query))
      .sort((a, b) => smartScore(a.name, query) - smartScore(b.name, query))
      .slice(0, 10);
  }, [query, players, guessedNames]);

  useEffect(() => setHighlightIndex(0), [filtered]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((player: Player) => {
    onSelect(player);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    }
  };

  const renderName = (name: string) => {
    const segments = highlightMatches(name, query);
    return segments.map((seg, i) =>
      seg.highlight
        ? <mark key={i} className="bg-primary/30 text-foreground rounded-sm px-0.5">{seg.text}</mark>
        : <span key={i}>{seg.text}</span>
    );
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
          placeholder="Search for a player..."
          className="w-full bg-card border border-border text-foreground rounded-xl pl-12 pr-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground transition-all"
          autoComplete="off"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
          {filtered.map((player, idx) => (
            <button
              key={player.name}
              onClick={() => handleSelect(player)}
              className={`w-full text-left px-5 py-3 transition-colors flex items-center justify-between first:rounded-t-xl last:rounded-b-xl ${idx === highlightIndex ? 'bg-secondary' : 'hover:bg-secondary'}`}
            >
              <span className="font-medium text-foreground">{renderName(player.name)}</span>
              <span className="text-xs text-muted-foreground ml-2">{player.club} · {player.league}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 3 && filtered.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-2xl z-50 p-4 text-center text-muted-foreground text-sm">
          No players found
        </div>
      )}
    </div>
  );
}
