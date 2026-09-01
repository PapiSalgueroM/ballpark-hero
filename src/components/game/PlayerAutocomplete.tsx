import { foldSpecialLatin } from '@/lib/nameFold';
import { useState, useEffect, useRef, useCallback, useMemo, useId, type KeyboardEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  normalizeName,
  searchPlayers,
  mergeLocalNames,
  type PlayerEntity,
  type SearchPlayersOptions,
} from '@/lib/playerSearch';

/**
 * Shared player-name autocomplete input. Replaces the five near-identical
 * suggestion components scattered across the app (PlayerSuggestions,
 * NbaPlayerSuggestions, ChainSuggestions, Connect4Suggestions,
 * FootballConnect4Suggestions), which each called an AI edge function and
 * rendered whatever text it returned. That is what caused the "suggestion
 * text doesn't match what I typed" bug: the highlighted portion was computed
 * against the raw typed string while the suggestion text came back from a
 * different (AI-normalized) source. Here, suggestions come straight from
 * src/lib/playerSearch.ts's searchPlayers(), which is the same normalization
 * pipeline used to decide what matched in the first place, so the highlight
 * offsets are always computed against text that is guaranteed to contain the
 * normalized query.
 *
 * This component only searches and lets the user pick a suggestion (or, when
 * validateOnly is false, submit free text). It does not itself decide
 * whether a picked name is a *valid* answer for a given game rule (e.g.
 * "played for this club") - that validation still belongs to each game's
 * hook, same as today. What changes is that every game now shares one
 * search box, one debounce, one keyboard-nav implementation and one
 * highlight algorithm instead of five slightly different copies of each.
 */

export interface PlayerAutocompleteProps {
  /** Current input text (controlled). */
  value: string;
  /** Called whenever the text changes, including plain typing. */
  onChange: (value: string) => void;
  /** Called when the user picks a player, by suggestion click or Enter on a highlighted row. */
  onSelect: (entity: PlayerEntity) => void;
  /** Options forwarded to searchPlayers (source, filters, limit, minChars, exclude). */
  searchOptions: Omit<SearchPlayersOptions, 'query' | 'signal'>;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * When true, Enter with no suggestion highlighted does nothing: only a
   * suggestion click, or Enter/Tab while a suggestion is highlighted, can
   * select a player. Free text can still be typed and will still trigger
   * search, but onSelect never fires for typed-only text. Use this wherever
   * "must pick a real player from the list" is the intended rule.
   * When false (default), pressing Enter with text typed but no suggestion
   * highlighted calls onSubmitFreeText if provided, otherwise does nothing.
   */
  validateOnly?: boolean;
  /** Called on Enter when validateOnly is false and no suggestion row is highlighted. */
  onSubmitFreeText?: (value: string) => void;
  /**
   * Round 84: extra names matched CLIENT-SIDE and merged into the suggestion
   * list. Use this when the game's answer pool contains players the remote
   * search source cannot know (the NFL roster table starts in 2002, so a
   * legend like Jim Kelly was impossible to pick with validateOnly set,
   * exactly as a player reported). Local matches append after remote results,
   * dedupe by normalized name, and respect searchOptions.exclude.
   */
  localNames?: string[];
  className?: string;
  inputClassName?: string;
  /** Debounce delay before a search fires, in milliseconds. Default 200. */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 200;
const MIN_ROW_HEIGHT_PX = 44; // mobile-friendly tap target

// Combining diacritical marks block (U+0300 to U+036F), built from char codes
// (never literal accented characters) so it cannot be mangled by copy/paste
// or re-encoding. Mirrors the DIACRITICS regex in src/lib/playerSearch.ts;
// duplicated here (rather than exported) so this module has no dependency on
// playerSearch.ts internals beyond its public normalizeName/searchPlayers API.
const DIACRITICS_CHARS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']');

/**
 * Builds the normalized form of `text` alongside a parallel array that maps
 * every character of the normalized string back to the original-string
 * index it came from. Doing this in one forward pass (instead of
 * re-normalizing individual characters after the fact) means the mapping is
 * correct even when normalization changes the string length relative to the
 * source, e.g. accent stripping ("é" -> "e") or whitespace collapsing
 * ("a  b" -> "a b"), which a naive one-char-at-a-time re-normalization would
 * get out of sync on. This is what makes the highlight offsets provably
 * correct rather than "correct as long as the data has no double spaces".
 * The per-character transform (NFD decompose, strip combining marks,
 * lowercase, collapse/trim whitespace) matches normalizeName exactly so this
 * always agrees with what searchPlayers used to decide the row matched.
 */
function normalizeWithIndexMap(text: string): { normalized: string; indexMap: number[] } {
  let normalized = '';
  const indexMap: number[] = [];
  let lastWasSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Format characters vanish in normalizeName, so they vanish here too.
    if (/\p{Cf}/u.test(ch)) continue;
    const stripped = foldSpecialLatin(ch).normalize('NFD').replace(DIACRITICS_CHARS, '').toLowerCase();
    for (const outChar of stripped) {
      const isSpace = outChar === ' ' || outChar === '\t' || outChar === '\n' || outChar === '\r';
      if (isSpace) {
        if (lastWasSpace) continue; // collapse runs of whitespace, matching normalizeName
        normalized += ' ';
        indexMap.push(i);
        lastWasSpace = true;
      } else {
        normalized += outChar;
        indexMap.push(i);
        lastWasSpace = false;
      }
    }
  }
  // Trim leading/trailing space the same way normalizeName's .trim() does,
  // keeping indexMap aligned with whatever survives.
  let start = 0;
  let end = normalized.length;
  while (start < end && normalized[start] === ' ') start++;
  while (end > start && normalized[end - 1] === ' ') end--;
  return { normalized: normalized.slice(start, end), indexMap: indexMap.slice(start, end) };
}

/**
 * Splits a display name into [before, matchedSlice, after] around the first
 * occurrence of the normalized query, so the highlighted slice always
 * corresponds to what the user actually typed (accents, case and extra
 * spaces included), never to some unrelated substring in the source text.
 * This is the fix for the "suggestion text doesn't match what I typed" bug:
 * the offsets are derived from the same normalizeName pipeline that decided
 * the row matched in the first place, via an explicit index map rather than
 * a re-derivation that could drift out of sync.
 */
function highlightParts(displayText: string, rawQuery: string): { before: string; match: string; after: string } {
  const normalizedQuery = normalizeName(rawQuery);
  if (!normalizedQuery) return { before: displayText, match: '', after: '' };

  const { normalized: normalizedText, indexMap } = normalizeWithIndexMap(displayText);
  const idx = normalizedText.indexOf(normalizedQuery);
  if (idx === -1) return { before: displayText, match: '', after: '' };

  const startInOriginal = indexMap[idx];
  const lastMatchedNormalizedIndex = idx + normalizedQuery.length - 1;
  const endInOriginal = indexMap[lastMatchedNormalizedIndex] + 1;

  return {
    before: displayText.slice(0, startInOriginal),
    match: displayText.slice(startInOriginal, endInOriginal),
    after: displayText.slice(endInOriginal),
  };
}

/** Builds a short "club, nationality" style subtitle from whatever meta fields a result carries. */
function metaSubtitle(entity: PlayerEntity): string {
  const parts: string[] = [];
  if (entity.meta.position) parts.push(String(entity.meta.position));
  if (entity.meta.club) parts.push(String(entity.meta.club));
  if (entity.meta.team && !entity.meta.club) parts.push(String(entity.meta.team));
  if (entity.meta.nationality) parts.push(String(entity.meta.nationality));
  return parts.join(' · ');
}

export function PlayerAutocomplete({
  value,
  onChange,
  onSelect,
  searchOptions,
  placeholder = 'Enter player name...',
  disabled = false,
  autoFocus = false,
  validateOnly = false,
  onSubmitFreeText,
  localNames,
  className,
  inputClassName,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: PlayerAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlayerEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const minChars = searchOptions.minChars ?? 3;

  // Serialize searchOptions.source/filters so the effect below only re-fires
  // when the actual query shape changes, not on every render where the
  // caller passes a fresh object literal.
  const optionsKey = useMemo(() => JSON.stringify(searchOptions), [searchOptions]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const normalized = normalizeName(value);
    if (normalized.length < minChars) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    setLoading(true);
    setOpen(true);

    // Round 84: matches from the caller's own answer pool, computed locally so
    // legends absent from the remote source are still selectable. The merge
    // itself lives in playerSearch.ts (Round 383) so a harness can run the
    // exact one the component runs.
    const mergeLocal = (remote: PlayerEntity[]): PlayerEntity[] =>
      mergeLocalNames(remote, localNames, value, searchOptions.exclude);

    debounceRef.current = window.setTimeout(() => {
      const thisRequestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      searchPlayers({ ...searchOptions, query: value, signal: controller.signal })
        .then(({ results }) => {
          // Stale-response guard: ignore results from a request that is no
          // longer the latest one fired (covers out-of-order network
          // resolution, not just cancellation).
          if (thisRequestId !== requestIdRef.current) return;
          setSuggestions(mergeLocal(results));
          setLoading(false);
          setHighlightedIndex(-1);
        })
        .catch(() => {
          if (thisRequestId !== requestIdRef.current) return;
          // Remote search failed: the local pool is better than nothing.
          setSuggestions(mergeLocal([]));
          setLoading(false);
        });
    }, debounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, optionsKey, minChars, debounceMs, localNames]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  // Close the suggestion list on outside click.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const commitSelection = useCallback(
    (entity: PlayerEntity) => {
      onChange(entity.name);
      onSelect(entity);
      setOpen(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
    },
    [onChange, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open || suggestions.length === 0) {
        if (e.key === 'Enter' && !validateOnly && onSubmitFreeText && value.trim()) {
          onSubmitFreeText(value);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(i => (i + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          commitSelection(suggestions[highlightedIndex]);
        } else if (!validateOnly && onSubmitFreeText && value.trim()) {
          onSubmitFreeText(value);
        }
      } else if (e.key === 'Tab') {
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          commitSelection(suggestions[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    },
    [open, suggestions, highlightedIndex, validateOnly, onSubmitFreeText, value, commitSelection],
  );

  const showDropdown = open && (loading || suggestions.length > 0 || normalizeName(value).length >= minChars);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (normalizeName(value).length >= minChars) setOpen(true);
          }}
          placeholder={placeholder}
          aria-label={placeholder || 'Search players'}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={cn(
            'w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
            inputClassName,
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-72 overflow-y-auto"
        >
          {loading && suggestions.length === 0 && (
            <div
              className="flex items-center justify-center gap-2 px-4 text-xs text-muted-foreground"
              style={{ minHeight: MIN_ROW_HEIGHT_PX }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Finding players...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div
              className="flex items-center justify-center px-4 text-sm text-muted-foreground"
              style={{ minHeight: MIN_ROW_HEIGHT_PX }}
            >
              No players found
            </div>
          )}

          {suggestions.map((entity, i) => {
            const { before, match, after } = highlightParts(entity.name, value);
            const subtitle = metaSubtitle(entity);
            return (
              <button
                key={entity.key}
                type="button"
                role="option"
                aria-selected={i === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(i)}
                onPointerDown={e => {
                  // pointerdown (not click) so this fires before the input's
                  // blur-driven outside-click handler can close the list first.
                  e.preventDefault();
                  commitSelection(entity);
                }}
                className={cn(
                  'w-full flex flex-col items-center justify-center gap-0.5 px-4 py-2.5 text-center transition-colors border-b border-border last:border-b-0',
                  i === highlightedIndex ? 'bg-primary/20' : 'hover:bg-primary/10',
                )}
                style={{ minHeight: MIN_ROW_HEIGHT_PX }}
              >
                <span className="text-sm font-medium text-foreground">
                  {before}
                  {match && <span className="text-primary font-bold">{match}</span>}
                  {after}
                </span>
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Small reusable "search" icon prefix, exported in case a page wants a fully custom input shell instead of the built-in one above. */
export function PlayerAutocompleteSearchIcon({ className }: { className?: string }) {
  return <Search className={cn('w-4 h-4 text-muted-foreground', className)} />;
}

export default PlayerAutocomplete;
