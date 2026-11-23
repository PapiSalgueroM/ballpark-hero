import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { ContinueSave } from '@/data/continueSaves';
import {
  deleteSoccerCareerAccountSave, readSoccerCareerAccountLocal, readSoccerCareerAccountSaves,
  restoreSoccerCareerAccountSave, summarizeAccountCareer, writeSoccerCareerAccountSave,
  type AccountCareerSave, type AccountCareerSummary,
} from '@/lib/soccerCareerAccount';

type BrowserCopy = { raw: string | null; summary: AccountCareerSummary | null; savedAt: string | null };
type AccountCopy = AccountCareerSave & { summary: AccountCareerSummary | null };
type Props = {
  slots: readonly ContinueSave[];
  locals: (BrowserCopy | null)[];
  onLocalChange: () => void;
};
type Request = {
  action: 'upload' | 'restore' | 'remove';
  number: number;
  saveKey: string;
  local: BrowserCopy | null;
  remote: AccountCopy | null;
};
type Copies = { kind: 'loading' | 'failed' } | { kind: 'ready'; rows: AccountCareerSave[] };

const ACCOUNT_CHANGED = 'Your account save changed. Review both copies and try again.';
const BROWSER_CHANGED = 'Your browser save changed. Review it before trying again.';
const RESTORE_FAILED = 'Could not restore the account save. Your account copy is still available.';
const nameOf = (copy: { summary: AccountCareerSummary | null }) => copy.summary?.playerName.trim() || (copy.summary ? 'Unnamed player' : 'Unreadable career');

function SaveDetails({ copy, empty }: { copy: BrowserCopy | AccountCopy | null; empty: string }) {
  if (!copy || copy.raw === null) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <>
      <p className="break-words text-sm font-semibold">{nameOf(copy)}</p>
      {copy.summary && <p className="break-words text-xs text-muted-foreground">{copy.summary.club} · Age {copy.summary.age}</p>}
      {copy.savedAt && Number.isFinite(Date.parse(copy.savedAt)) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Saved <time dateTime={copy.savedAt}>{new Date(copy.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
        </p>
      )}
    </>
  );
}

export default function SoccerCareerAccountSaves(props: Props) {
  const { user, loading } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  return (
    <section aria-labelledby="soccer-career-account-heading" className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div>
        <h2 id="soccer-career-account-heading" className="font-bold">Account saves</h2>
        <p className="text-sm text-muted-foreground">Copy a career between devices. You choose when to save or restore it.</p>
      </div>
      {loading ? <p role="status" className="text-sm text-muted-foreground">Checking sign-in...</p> : user && !user.is_anonymous ? (
        <SignedInAccountSaves key={user.id} {...props} userId={user.id} />
      ) : (
        <>
          <Button type="button" variant="outline" size="lg" onClick={() => setSignInOpen(true)}>Sign in</Button>
          <AuthModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} defaultTab="login" />
        </>
      )}
    </section>
  );
}

function SignedInAccountSaves({ userId, slots, locals, onLocalChange }: Props & { userId: string }) {
  const [copies, setCopies] = useState<Copies>({ kind: 'loading' });
  const [request, setRequest] = useState<Request | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef(false);
  const operation = useRef(false);
  const readVersion = useRef(0);
  const opener = useRef<HTMLButtonElement | null>(null);
  const status = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      readVersion.current += 1;
    };
  }, []);

  const reload = useCallback(async (showLoading: boolean) => {
    const version = ++readVersion.current;
    if (showLoading) setCopies({ kind: 'loading' });
    try {
      const rows = await readSoccerCareerAccountSaves(userId);
      if (!active.current || version !== readVersion.current) return null;
      setCopies({ kind: 'ready', rows });
      return rows;
    } catch {
      if (active.current && version === readVersion.current) setCopies({ kind: 'failed' });
      return null;
    }
  }, [userId]);
  useEffect(() => { void reload(true); }, [reload]);

  const remoteCopies = useMemo(() => new Map(copies.kind === 'ready' ? copies.rows.map(copy => [copy.slot, {
    ...copy, summary: summarizeAccountCareer(copy.raw),
  }]) : []), [copies]);

  const ask = (next: Request, button: HTMLButtonElement) => {
    if (operation.current) return;
    opener.current = button;
    setMessage('');
    setRequest(next);
  };

  const confirm = async () => {
    if (!request || !active.current || operation.current) return;
    const { action, number, saveKey, local, remote } = request;
    if (action !== 'remove' && (!local || readSoccerCareerAccountLocal(saveKey)?.raw !== local.raw)) {
      onLocalChange();
      setMessage(BROWSER_CHANGED);
      return;
    }
    operation.current = true;
    setBusy(true);
    setMessage(action === 'upload' ? 'Saving to your account...' : action === 'remove' ? 'Removing the account copy...' : 'Checking the account save...');
    try {
      if (action === 'restore') {
        const rows = await reload(false);
        if (!active.current) return;
        const latest = rows?.find(copy => copy.slot === number);
        if (!rows) setMessage(RESTORE_FAILED);
        else if (!latest || latest.revision !== remote.revision || latest.raw !== remote.raw) setMessage(ACCOUNT_CHANGED);
        else {
          const result = restoreSoccerCareerAccountSave(saveKey, local.raw, latest.raw);
          setMessage({
            restored: `Account save restored in slot ${number}.`,
            changed: BROWSER_CHANGED, failed: RESTORE_FAILED, current: 'This account save is already open in this slot.',
          }[result]);
          onLocalChange();
        }
      } else {
        const result = action === 'upload'
          ? await writeSoccerCareerAccountSave(userId, number, remote?.revision ?? null, local.raw)
          : await deleteSoccerCareerAccountSave(userId, number, remote.revision);
        if (!active.current) return;
        setMessage({
          saved: `Account copy saved for slot ${number}.`,
          removed: `Account copy removed for slot ${number}.`,
          changed: ACCOUNT_CHANGED,
          failed: action === 'upload'
            ? 'Could not confirm the account save. Your browser save is still here.'
            : 'Could not confirm removal. Check your account copies and try again.',
        }[result]);
        await reload(false);
      }
    } finally {
      operation.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" variant="outline" size="lg" disabled={busy || copies.kind === 'loading'} onClick={() => { setMessage(''); void reload(true); }}>
          Refresh account saves
        </Button>
        <p ref={status} role="status" tabIndex={-1} className="text-sm text-muted-foreground outline-none">
          {message || (copies.kind === 'loading' ? 'Loading account saves...' : copies.kind === 'failed' ? 'Could not load account saves. Try again.' : '')}
        </p>
      </div>
      {copies.kind === 'ready' && (
        <ul className="grid gap-3 sm:grid-cols-3">
          {slots.map(({ saveKey }, index) => {
            const number = index + 1;
            const local = locals[index] ?? null;
            const remote = remoteCopies.get(number) ?? null;
            const same = !!remote && remote.raw === local?.raw;
            return (
              <li key={saveKey} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3">
                <h3 className="text-sm font-bold">Slot {number}</h3>
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-medium text-muted-foreground">This browser</h4>
                    <SaveDetails copy={local} empty={local ? 'Empty slot' : 'Storage unavailable'} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-medium text-muted-foreground">Your account</h4>
                    <SaveDetails copy={remote} empty="No account copy" />
                  </div>
                </div>
                {same && <p className="text-xs text-muted-foreground">Both copies match.</p>}
                <div className="mt-auto grid gap-2">
                  {!same && local?.summary && <Button type="button" variant="outline" size="lg" className="whitespace-normal" disabled={busy}
                    aria-label={`Save slot ${number} to account`} onClick={event => ask({ action: 'upload', number, saveKey, local, remote }, event.currentTarget)}>
                    Save to account
                  </Button>}
                  {!same && local && remote?.summary && <Button type="button" variant="outline" size="lg" className="whitespace-normal" disabled={busy}
                    aria-label={`Use account save in slot ${number}`} onClick={event => ask({ action: 'restore', number, saveKey, local, remote }, event.currentTarget)}>
                    Use account save
                  </Button>}
                  {remote && <Button type="button" variant="ghost" size="lg" className="whitespace-normal" disabled={busy}
                    aria-label={`Remove account copy for slot ${number}`} onClick={event => ask({ action: 'remove', number, saveKey, local, remote }, event.currentTarget)}>
                    Remove account copy
                  </Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <AlertDialog open={request !== null} onOpenChange={open => { if (!open) setRequest(null); }}>
        {request && <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl" onCloseAutoFocus={event => {
          event.preventDefault();
          const button = opener.current;
          (button?.isConnected && !button.disabled ? button : status.current ?? document.getElementById('soccer-career-account-toggle'))?.focus({ preventScroll: true });
          opener.current = null;
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{request.action === 'upload' ? `Save slot ${request.number} to your account?`
              : request.action === 'restore' ? `Use the account save in slot ${request.number}?` : `Remove the account copy for slot ${request.number}?`}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 break-words">
                {request.action === 'upload' && <p>{request.remote
                  ? `This will replace the account copy of ${nameOf(request.remote)} with ${nameOf(request.local)} from this browser.`
                  : `This will save ${nameOf(request.local)} to your account.`}</p>}
                {request.action === 'restore' && <>
                  <p>{`Load ${nameOf(request.remote)} from your account.`}{request.local.raw !== null && ' The current browser save will be kept as a recovery copy.'}</p>
                  <p>The restored career's retirement score stays off the public leaderboard.</p>
                </>}
                {request.action === 'remove' && <p>{`This deletes the account copy of ${nameOf(request.remote)}. Any save in this browser stays here.`}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => void confirm()}>
              {request.action === 'upload' ? 'Save to account' : request.action === 'restore' ? 'Use account save' : 'Remove account copy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>}
      </AlertDialog>
    </>
  );
}
