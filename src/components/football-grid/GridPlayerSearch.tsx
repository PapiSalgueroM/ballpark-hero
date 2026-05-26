import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { nflCareerPlayers } from '@/data/nflCareerPlayers';
import { toTitleCase } from '@/lib/smartSearch';

interface Props {
  onSelect: (name: string) => void;
  disabled: boolean;
}

export function GridPlayerSearch({ onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = query.length >= 2
    ? nflCareerPlayers
        .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : [];

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  useEffect(() => {
    setHighlightIndex(0);
    setShowDropdown(suggestions.length > 0);
  }, [query]);

  // scroll highlighted item into view
  useEffect(() => {
    listRef.current?.children[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const submit = useCallback((name: string) => {
    onSelect(name);
    setQuery('');
    setShowDropdown(false);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (showDropdown && suggestions.length > 0) {
      submit(suggestions[highlightIndex].name);
    } else if (query.trim().length >= 2) {
      submit(toTitleCase(query.trim()));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex gap-2 w-full max-w-md mx-auto">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Type a player name…"
          disabled={disabled}
          autoComplete="off"
          className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--fg-navy))]/50 disabled:opacity-50"
        />
        {showDropdown && suggestions.length > 0 && (
          <ul
            ref={listRef}
            className="absolute z-50 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
          >
            {suggestions.map((p, i) => (
              <li
                key={p.name}
                onMouseDown={() => submit(p.name)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  i === highlightIndex ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground truncate ml-2">{p.teams[0]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled || query.trim().length < 2}
        className="px-5 py-2.5 rounded-full font-semibold text-sm bg-[hsl(var(--fg-gold))] text-[hsl(var(--fg-navy))] hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-2"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Submit
      </button>
    </form>
  );
}
