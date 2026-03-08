import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  onSelect: (name: string) => void;
  disabled: boolean;
}

export function GridPlayerSearch({ onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2 || disabled) return;
    onSelect(query.trim());
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md mx-auto">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a player name…"
        disabled={disabled}
        className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--fg-navy))]/50 disabled:opacity-50"
      />
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
