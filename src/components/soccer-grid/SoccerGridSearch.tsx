import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { toTitleCase } from '@/lib/smartSearch';
import { foldSpecialLatin } from '@/lib/nameFold';
import { FlagImg } from '@/components/FlagImg';

const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
const FORMAT_CHARS = /\p{Cf}/gu;

function normalizeName(s: string | null | undefined): string {
  return foldSpecialLatin(
    (s ?? '')
      .replace(FORMAT_CHARS, '')
      .normalize('NFD')
      .replace(DIACRITICS, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '),
  );
}

interface PlayerSuggestion {
  name: string;
  nationality: string;
  position: string;
}

interface Props {
  onSelect: (name: string) => void;
  disabled: boolean;
  players: PlayerSuggestion[];
}

export function SoccerGridSearch({ onSelect, disabled, players }: Props) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedQuery = normalizeName(query);
  const suggestions = query.length >= 2 && normalizedQuery.length > 0
    ? players
        .filter(p => normalizeName(p.name).includes(normalizedQuery))
        .slice(0, 8)
    : [];

  useEffect(() => () => {
    if (blurTimer.current !== null) clearTimeout(blurTimer.current);
  }, []);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  useEffect(() => {
    setHighlightIndex(0);
    setShowDropdown(query.length >= 2);
  }, [query]);

  useEffect(() => {
    listRef.current?.children[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const submit = useCallback((name: string) => {
    onSelect(name);
    setQuery('');
    setShowDropdown(false);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      return;
    }
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
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
          onFocus={() => {
            if (blurTimer.current !== null) clearTimeout(blurTimer.current);
            blurTimer.current = null;
            if (query.length >= 2) setShowDropdown(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => {
              blurTimer.current = null;
              setShowDropdown(false);
            }, 150);
          }}
          placeholder="Type a player name…"
          aria-label="Search for a player"
          disabled={disabled}
          autoComplete="off"
          className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sg-accent))]/50 disabled:opacity-50"
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
                <span className="text-xs text-muted-foreground truncate ml-2"><FlagImg name={p.nationality} size={12} showLabel /> · {p.position}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled || query.trim().length < 2}
        className="px-5 py-2.5 rounded-full font-semibold text-sm bg-[hsl(var(--sg-accent))] text-white hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-2"
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Submit
      </button>
    </form>
  );
}
