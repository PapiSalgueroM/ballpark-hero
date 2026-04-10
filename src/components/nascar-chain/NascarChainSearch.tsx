import { useState, useMemo, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { ALL_NASCAR_DRIVERS, NASCAR_DRIVER_ALIASES } from '@/types/nascarChain';
import { smartMatch, smartScore, highlightMatches } from '@/lib/smartSearch';

interface Props {
  usedDrivers: Set<string>;
  onSelect: (name: string) => void;
  disabled?: boolean;
}

export function NascarChainSearch({ usedDrivers, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    return ALL_NASCAR_DRIVERS
      .filter(name => {
        if (usedDrivers.has(name.toLowerCase())) return false;
        if (smartMatch(name, query)) return true;
        const aliases = NASCAR_DRIVER_ALIASES[name] || [];
        return aliases.some(a => smartMatch(a, query));
      })
      .sort((a, b) => smartScore(a, query) - smartScore(b, query))
      .slice(0, 10);
  }, [query, usedDrivers]);

  useEffect(() => setHighlightIndex(0), [filtered]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (name: string) => {
    onSelect(name);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); handleSelect(filtered[highlightIndex]); }
  };

  const renderName = (name: string) => {
    const segments = highlightMatches(name, query);
    return segments.map((seg, i) =>
      seg.highlight ? <mark key={i} className="bg-primary/30 text-foreground rounded-sm px-0.5">{seg.text}</mark> : <span key={i}>{seg.text}</span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type a driver who beat them to the Cup title..."
          disabled={disabled}
          className="w-full bg-neutral-900 border border-red-600 text-white rounded-xl pl-12 pr-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-400 placeholder:text-neutral-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>

      {isOpen && filtered.length > 0 && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-neutral-900 border border-red-600 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
          {filtered.map((name, idx) => (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className={`w-full text-left px-5 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl ${idx === highlightIndex ? 'bg-red-900/30' : 'hover:bg-red-900/30'}`}
            >
              <span className="font-medium text-white">🏁 {renderName(name)}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 3 && filtered.length === 0 && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-neutral-900 border border-red-600 rounded-xl shadow-2xl z-50 p-4 text-center text-neutral-500 text-sm">
          No drivers found — you can still type any name and press Enter
        </div>
      )}
    </div>
  );
}
