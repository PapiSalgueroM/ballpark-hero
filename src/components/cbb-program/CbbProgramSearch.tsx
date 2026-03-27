import { useState, useRef, useEffect } from 'react';
import { CbbProgramPuzzle } from '@/types/cbbProgram';

interface Props {
  onGuess: (name: string) => void;
  guesses: string[];
  programs: CbbProgramPuzzle[];
}

export function CbbProgramSearch({ onGuess, guesses, programs }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = input.length >= 2
    ? programs.filter(p =>
        (p.school_name.toLowerCase().includes(input.toLowerCase()) ||
         p.common_names.some(n => n.toLowerCase().includes(input.toLowerCase()))) &&
        !guesses.some(g => g.toLowerCase() === p.school_name.toLowerCase())
      )
    : [];

  const submit = (name: string) => {
    onGuess(name);
    setInput('');
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <form onSubmit={e => { e.preventDefault(); if (input.trim()) submit(input.trim()); }}>
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Type school name..."
          className="w-full px-4 py-3 rounded-xl border border-amber-500/30 bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
        />
      </form>
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => submit(p.school_name)}
              className="w-full text-left px-4 py-2.5 hover:bg-amber-500/20 text-sm text-slate-200 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              🏀 {p.school_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
