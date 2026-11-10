import type { ReactNode } from 'react';
import USCareerActionConfirm from '@/components/us-career/USCareerActionConfirm';

const waiverCopy = {
  title: 'Request a waiver?',
  description: 'Your team agrees to let you go. The rest of your deal in this career ends. Sign with another team before you play again.',
  cancel: 'Keep my contract',
  confirm: 'Confirm waiver',
};

export function WaiverRequest({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="mt-2">
      <USCareerActionConfirm copy={waiverCopy} onConfirm={onConfirm}>
        <button type="button" className="min-h-11 rounded-full border border-border px-4 text-sm font-bold">
          Request a waiver
        </button>
      </USCareerActionConfirm>
    </div>
  );
}

export function WaiverUnavailable({ canReopen, onReopen }: { canReopen: boolean; onReopen: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      {canReopen ? (
        <>
          <p role="status">Your waiver offers could not be restored.</p>
          <button type="button" className="mt-2 min-h-11 rounded-full border border-border px-4 text-sm font-bold" onClick={onReopen}>
            Reopen waiver offers
          </button>
        </>
      ) : <p role="alert">This waiver save could not be opened.</p>}
    </div>
  );
}

export function WaiverSaveConflict({ kind }: { kind: 'changed' | 'unreadable' }) {
  return (
    <>
      <p role="alert">{kind === 'changed'
        ? 'This career changed in another tab. Reload to keep playing.'
        : 'This career save could not be checked. Reload to keep playing.'}</p>
      <button type="button" className="mt-2 min-h-11 rounded-full border border-border px-4 text-sm font-bold" onClick={() => window.location.reload()}>
        Reload career
      </button>
    </>
  );
}

export const waiverMarketIntro: ReactNode =
  'Your team waived you and ended your deal. Sign with another team to keep playing. '
  + 'You can push any offer for more once. An offer can disappear, but the last live offer stays open.';
