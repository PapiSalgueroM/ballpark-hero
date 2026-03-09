import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Props {
  teams: string[];
  usedTeams: string[];
  onSelect: (team: string) => void;
  disabled?: boolean;
}

export function NflTeamSearch({ teams, usedTeams, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableTeams = teams.filter(t => !usedTeams.includes(t));
  
  const filtered = query.length > 0
    ? availableTeams.filter(t => 
        t.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelect = (team: string) => {
    onSelect(team);
    setQuery('');
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for a team..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="pl-10 h-12 text-lg"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map(team => (
            <button
              key={team}
              onClick={() => handleSelect(team)}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
            >
              <span className="text-foreground font-medium">{team}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-4">
          <p className="text-muted-foreground text-center">No teams found</p>
        </div>
      )}
    </div>
  );
}
