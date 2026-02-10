import { useState, useEffect, useRef } from 'react';

interface NbaPlayerSuggestionsProps {
  query: string;
  teamName: string;
  onSelect: (playerName: string) => void;
  visible: boolean;
}

const NbaPlayerSuggestions = ({ query, teamName, onSelect, visible }: NbaPlayerSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible || !query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nba-suggest-players`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ query, teamName }),
          }
        );
        const data = await resp.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, teamName, visible]);

  if (!visible || (!suggestions.length && !loading) || query.length < 2) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      {loading && suggestions.length === 0 && (
        <div className="px-4 py-2.5 text-xs text-muted-foreground">Finding players...</div>
      )}
      {suggestions.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/20 transition-colors border-b border-border last:border-b-0"
        >
          {name}
        </button>
      ))}
    </div>
  );
};

export default NbaPlayerSuggestions;
