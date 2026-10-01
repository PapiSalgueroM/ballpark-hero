import type { RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { decodeSharedResult, SHARED_RESULT_PARAM } from '@/lib/sharedResult';
import { useRoutePath } from '@/hooks/useRoutePath';

export default function SharedResultCard({ returnFocusRef }: { returnFocusRef: RefObject<HTMLButtonElement> }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routePath = useRoutePath();
  const result = decodeSharedResult(routePath, location.search);
  if (!result) return null;

  const dismiss = () => {
    const query = new URLSearchParams(location.search);
    query.delete(SHARED_RESULT_PARAM);
    navigate({ pathname: location.pathname, search: query.toString() ? `?${query}` : '', hash: location.hash }, { replace: true });
    returnFocusRef.current?.focus({ preventScroll: true });
  };

  return (
    <aside data-shared-result="" data-no-prerender="" aria-label="Shared result" className="mx-auto flex w-full max-w-3xl items-start gap-2 border-b border-primary/25 bg-primary/5 px-3 py-2">
      <div className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">
        <p className="font-semibold text-primary">Shared result</p>
        <p className="text-foreground"><span className="font-semibold">{result.gameName}:</span> {result.score}</p>
        <p className="text-xs text-muted-foreground">Play below and see how you do.</p>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss shared result" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
