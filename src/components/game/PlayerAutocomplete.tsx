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
 *
 * Round 1138: a list is only ever on screen for the query that produced it.
 * The names used to stay painted under new text until the new search
 * answered, and a tap in that window picked the old name. Now the list is
 * tagged with its query (the folded text plus the search options), it is gone
 * in the same render the text or the options change, and leaving the box
 * (a tap outside, Escape, focus moving away, a pick) drops it, so coming back
 * searches again. Where the page asks for a pick from the list, Enter picks
 * the name when exactly one is showing.
 */

export interface PlayerAutocompleteProps {
  /** Current input text (controlled). */
  value: string;
  /** Called whenever the text changes, including plain typing. */
  onChange: (value: string) => void;
  /**
   * Called when the user picks a player: a suggestion tap or click, Enter or
   * Tab on a highlighted row, or (with validateOnly) Enter when exactly one
   * name is showing.
   */
  onSelect: (entity: PlayerEntity) => void;
  /** Options forwarded to searchPlayers (source, filters, limit, minChars, exclude). */
  searchOptions: Omit<SearchPlayersOptions, 'query' | 'signal'>;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * When true, only a name from the list can be selected: a suggestion click,
   * Enter/Tab while a suggestion is highlighted, or (Round 1138) Enter when
   * exactly one name is showing. Enter with two or more names and nothing
   * highlighted does nothing. Free text can still be typed and will still trigger
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
  /**
   * Round 1010a: what the list says when a search settles with nothing to
   * offer. Defaults to 'No players found'. The search-failed text is separate
   * and never replaced.
   */
  emptyText?: string;
  /**
   * Round 1010a: called once per search that settles with an empty merged
   * list and no error, with the text that was searched. Never on an abort, a
   * stale response or a failed search.
   */
  onNoResults?: (query: string) => void;
}

const DEFAULT_DEBOUNCE_MS = 200;
/** What the list is while the held one belongs to another query. One identity, so nothing re-renders for it. */
const NO_SUGGESTIONS: PlayerEntity[] = [];
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
  emptyText = 'No players found',
  onNoResults,
}: PlayerAutocompleteProps) {
  /* Round 1138: what the last settled search returned, and the query that
     produced it. The list on screen is derived from the pair below, so a
     list can only ever show for the text and the options it was fetched for. */
  const [heldSuggestions, setSuggestions] = useState<PlayerEntity[]>([]);
  const [heldTag, setHeldTag] = useState<string | null>(null);
  const [searching, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  /* Bumped when the player comes back to a list that was dropped, so the
     search effect runs again under the same text. */
  const [refresh, setRefresh] = useState(0);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  /* True from the moment the list is dropped (the player left the box, or
     picked a name) until the next search is scheduled. */
  const droppedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  /* Read through a ref because the search effect's dependencies leave the
     callbacks out on purpose, so a prop read inside it could be stale. */
  const onNoResultsRef = useRef(onNoResults);
  onNoResultsRef.current = onNoResults;

  const minChars = searchOptions.minChars ?? 3;

  // Serialize searchOptions.source/filters so the effect below only re-fires
  // when the actual query shape changes, not on every render where the
  // caller passes a fresh object literal.
  const optionsKey = useMemo(() => JSON.stringify(searchOptions), [searchOptions]);

  /* Round 1138: THE QUERY. The folded text plus every search option, so
     "Messi" and "messi " are one query and a change of source or filter (a new
     team, a new category) is a new one. Both lines below are computed while
     rendering: the old list is gone in the SAME render that carries the new
     text, not an effect or a frame later, and a tap can never land on a name
     fetched for something else. localNames is left out of the tag on purpose:
     the effect already searches again when it changes, both pages that pass
     it keep one identity, and those names come from the caller's own pool. */
  const normalizedValue = normalizeName(value);
  const enoughText = normalizedValue.length >= minChars;
  const tag = normalizedValue + '\u0000' + optionsKey;
  const suggestions = heldTag === tag ? heldSuggestions : NO_SUGGESTIONS;
  const loading = searching || (enoughText && open && heldTag !== tag);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setSearchFailed(false);

    const normalized = normalizeName(value);
    if (normalized.length < minChars) {
      setSuggestions([]);
      setHeldTag(null);
      setLoading(false);
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    setLoading(true);
    setOpen(true);
    droppedRef.current = false;
    const requestTag = tag;

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
        .then(({ results, error }) => {
          // Stale-response guard: ignore results from a request that is no
          // longer the latest one fired (covers out-of-order network
          // resolution, not just cancellation).
          if (thisRequestId !== requestIdRef.current) return;
          setSuggestions(mergeLocal(results));
          setHeldTag(requestTag);
          setSearchFailed(Boolean(error));
          setLoading(false);
          setHighlightedIndex(-1);
          // searchPlayers settles an aborted search as empty with no error, so
          // the signal is checked too: an abort is never a "no results". The
          // merge is only redone for a caller that listens.
          const notify = onNoResultsRef.current;
          if (notify && !error && !controller.signal.aborted && mergeLocal(results).length === 0) notify(value);
        })
        .catch(error => {
          if (thisRequestId !== requestIdRef.current) return;
          // Remote search failed: the local pool is better than nothing.
          setSuggestions(mergeLocal([]));
          setHeldTag(requestTag);
          setSearchFailed(!(error instanceof DOMException && error.name === 'AbortError'));
          setLoading(false);
        });
    }, debounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      ++requestIdRef.current;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, optionsKey, minChars, debounceMs, localNames, refresh]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  /* Round 1138: leaving the box DROPS the list, it does not just hide it. A
     tap outside, Escape, or focus moving to another control is how every grid
     and Connect 4 changes cell, and the hidden list used to come back under
     the next cell on focus. So a closed list is a dropped list: nothing can
     reopen names fetched before the player left. Coming back searches again
     (see reopen). The request id is bumped so an answer still in flight is
     ignored when it lands. */
  const leave = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    requestIdRef.current += 1;
    droppedRef.current = true;
    setOpen(false);
    setHighlightedIndex(-1);
    setSuggestions([]);
    setHeldTag(null);
    setLoading(false);
  }, []);

  // Drop the suggestion list on an outside tap or click.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        leave();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, leave]);

  /* Coming back to the box. If the list was dropped, search again: without
     the refresh the panel would open with nothing in flight and nothing to
     show. A disabled input cannot be focused or clicked, so this needs no
     disabled check of its own. */
  const reopen = () => {
    if (!enoughText) return;
    setOpen(true);
    if (droppedRef.current) {
      droppedRef.current = false;
      setRefresh(n => n + 1);
    }
  };

  const commitSelection = useCallback(
    (entity: PlayerEntity) => {
      if (disabled) return;
      onChange(entity.name);
      onSelect(entity);
      setOpen(false);
      setSuggestions([]);
      setHeldTag(null);
      /* A pick drops the list too. When the page keeps the picked name in the
         box the text does not change, so no search would be scheduled, and
         coming back has to ask for one (the effect sets this back to false
         the moment it schedules the next search). */
      droppedRef.current = true;
      setHighlightedIndex(-1);
      /* And nothing still in flight may bring a list back after the pick: a
         search under the same text (the caller's local names changed) would
         otherwise land its answer into the closed box. */
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      requestIdRef.current += 1;
      setLoading(false);
    },
    [disabled, onChange, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      /* Escape leaves the box whatever the panel holds: names, the Finding
         players row or the empty row. It is read before the check below
         because since Round 1138 the list is empty between keystrokes, and an
         Escape pressed then was swallowed while the search carried on and
         opened its names anyway. */
      if (e.key === 'Escape' && open) {
        leave();
        return;
      }
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
        } else if (validateOnly && suggestions.length === 1 && !loading && !e.repeat && !e.nativeEvent.isComposing) {
          /* Round 1138: where the page asks for a pick from the list, Enter
             picks the name when it is the ONLY one showing. Exactly one, never
             "the top one": with two names Enter still waits for an arrow key,
             so a keyboard player never sends a name he did not see alone. Not
             while a search is in flight (the one name must be the settled
             answer for the text in the box), not on a held key, and not on an
             input method's own Enter. */
          commitSelection(suggestions[0]);
        } else if (!validateOnly && onSubmitFreeText && value.trim()) {
          onSubmitFreeText(value);
        }
      } else if (e.key === 'Tab') {
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          commitSelection(suggestions[highlightedIndex]);
        }
      }
    },
    [disabled, open, suggestions, loading, highlightedIndex, validateOnly, onSubmitFreeText, value, commitSelection, leave],
  );

  const showDropdown = open && (loading || suggestions.length > 0 || enoughText);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onBlur={e => {
        /* Focus moving to a control outside the box (the keyboard route to
           another cell) leaves it. A blur with no related target (a tap on
           plain page, the window losing focus) is left to the outside tap
           handler, so switching windows and back drops nothing. */
        if (e.relatedTarget instanceof Node && !containerRef.current?.contains(e.relatedTarget)) leave();
      }}
    >
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
          onFocus={reopen}
          /* On a phone a tap on a box that never lost focus fires no focus event. */
          onClick={reopen}
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
              role="status"
              className="flex items-center justify-center px-4 text-sm text-muted-foreground"
              style={{ minHeight: MIN_ROW_HEIGHT_PX }}
            >
              {searchFailed ? 'Could not load players. Try searching again.' : emptyText}
            </div>
          )}

          {suggestions.map((entity, i) => {
            const { before, match, after } = highlightParts(entity.name, value);
            /* Round 668: when two rows share a name (Éderson the Atalanta
               midfielder, Ederson the Fenerbahce keeper) the line under each
               says which man it is, from his latest row. */
            const subtitle = entity.disambiguator ?? metaSubtitle(entity);
            return (
              <button
                key={entity.personKey ?? entity.key}
                type="button"
                role="option"
                disabled={disabled}
                aria-selected={i === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(i)}
                onPointerDown={e => {
                  // pointerdown (not click) so this fires before the input's
                  // blur-driven outside-click handler can close the list first.
                  e.preventDefault();
                  commitSelection(entity);
                }}
                onClick={e => {
                  if (e.detail === 0) commitSelection(entity);
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
