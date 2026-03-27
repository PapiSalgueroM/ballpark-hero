import { useState, useMemo, useRef, useEffect } from 'react';
import { UfcFighter } from '@/types/ufcChain';
import { Search } from 'lucide-react';

interface UfcChainSearchProps {
  fighters: UfcFighter[];
  usedFighters: Set<string>;
  onSelect: (fighter: UfcFighter) => void;
  disabled?: boolean;
}

export function UfcChainSearch({ fighters, usedFighters, onSelect, disabled }: UfcChainSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    return fighters
      .filter(f => !usedFighters.has(f.name))
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, fighters, usedFighters]);

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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type a fighter who beat them..."
          disabled={disabled}
          className="w-full bg-gray-900 border border-red-600 text-white rounded-xl pl-12 pr-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-400 placeholder:text-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>

      {isOpen && filtered.length > 0 && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-red-600 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
          {filtered.map((fighter) => (
            <button
              key={fighter.name}
              onClick={() => handleSelect(fighter)}
              className="w-full text-left px-5 py-3 hover:bg-red-900/30 transition-colors flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="font-medium text-white">{fighter.name}</span>
              <span className="text-xs text-red-400 ml-2">{fighter.weightClass} · {fighter.record}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && filtered.length === 0 && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-red-600 rounded-xl shadow-2xl z-50 p-4 text-center text-gray-400 text-sm">
          No fighters found
        </div>
      )}
    </div>
  );
}