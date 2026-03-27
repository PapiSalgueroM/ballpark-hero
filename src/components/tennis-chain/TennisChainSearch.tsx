import { useState, useMemo, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { ALL_TENNIS_PLAYERS, TENNIS_PLAYER_ALIASES } from '@/types/tennisChain';

interface TennisChainSearchProps {
  usedPlayers: Set<string>;
  onSelect: (name: string) => void;
  disabled?: boolean;
}

export function TennisChainSearch({ usedPlayers, onSelect, disabled }: TennisChainSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return ALL_TENNIS_PLAYERS
      .filter(name => {
        if (usedPlayers.has(name.toLowerCase())) return false;
        if (name.toLowerCase().includes(q)) return true;
        const aliases = TENNIS_PLAYER_ALIASES[name] || [];
        return aliases.some(a => a.toLowerCase().includes(q));
      });
  }, [query, usedPlayers]);

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
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Type a player who beat them at a Grand Slam..."
          disabled={disabled}
          className="w-full bg-gray-900 border border-emerald-600 text-white rounded-xl pl-12 pr-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 placeholder:text-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>

      {isOpen && filtered.length > 0 && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-emerald-600 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
          {filtered.map(name => (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className="w-full text-left px-5 py-3 hover:bg-emerald-900/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="font-medium text-white">{name}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && filtered.length === 0 && !disabled && (
        <div className="absolute top-full mt-2 w-full bg-gray-900 border border-emerald-600 rounded-xl shadow-2xl z-50 p-4 text-center text-gray-400 text-sm">
          No players found — you can still type any name and press Enter
        </div>
      )}
    </div>
  );
}
