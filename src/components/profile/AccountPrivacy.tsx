import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { cacheDisplayName } from '@/lib/completions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccountPrivacy() {
  const navigate = useNavigate();
  const passwordInput = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const request = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('sign_in_required');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/account-privacy`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(body), cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) {
      if (response.status === 409) throw new Error('manual_required');
      if (response.status === 403) throw new Error('password_not_confirmed');
      if (response.status === 401) throw new Error('sign_in_required');
      throw new Error('request_failed');
    }
    return result;
  };

  const exportAccount = async () => {
    setBusy(true); setMessage('');
    try {
      const result = await request({ action: 'export' });
      if (!result.export?.account?.id || !result.export.data) throw new Error('request_failed');
      const url = URL.createObjectURL(new Blob([JSON.stringify(result.export, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'douknowball-account.json';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Your account download is ready. Keep it somewhere private.');
    } catch {
      setMessage('We could not download your account data. Please try again or contact douknowball1@gmail.com.');
    } finally { setBusy(false); }
  };

  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    const password = passwordInput.current?.value ?? '';
    if (busy || confirmation !== 'DELETE MY ACCOUNT' || !password) return;
    if (passwordInput.current) passwordInput.current.value = '';
    setBusy(true); setMessage('');
    let deleted = false;
    try {
      const result = await request({ action: 'delete', confirmation, password });
      if (result.deleted !== true) throw new Error('request_failed');
      deleted = true;
      cacheDisplayName(null);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw new Error('sign_out_failed');
      navigate('/', { replace: true });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setMessage(deleted
        ? 'Your account was deleted. Please sign out or close this tab to clear the old session on this browser.'
        : code === 'manual_required'
          ? 'Please contact douknowball1@gmail.com to finish this request. Accounts with admin access, protected sign-in or uploaded files need a manual check.'
          : code === 'password_not_confirmed'
            ? 'We could not confirm your current password. Try again, or use Forgot password when signing in.'
            : 'We could not confirm whether deletion finished. Sign in again to check, or contact douknowball1@gmail.com.');
    } finally { setBusy(false); }
  };

  return (
    <Card className="border-border/60">
      <CardHeader><CardTitle className="text-lg font-display">Your account data</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Download your account details, saved preferences, scores, votes and account-linked saves.
          Your file includes the account-linked score backup we hold.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={busy} onClick={exportAccount}>Download account data</Button>
          {!deleting && <Button variant="destructive" disabled={busy} onClick={() => { setDeleting(true); setMessage(''); }}>Delete account</Button>}
        </div>
        <p className="text-xs text-muted-foreground">
          Browser-only saves, reports, inbox messages and provider backups need separate handling.
          For access, corrections or deletion requests about those, contact <a className="underline" href="mailto:douknowball1@gmail.com">douknowball1@gmail.com</a>.
          {' '}We respond within 30 days. A matching display name alone cannot verify who owns a public play record.
        </p>
        {deleting && (
          <form onSubmit={deleteAccount} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm">This permanently removes your login and account-linked data, including saved account progress. It cannot be undone. Browser-only saves stay on this device.</p>
            <label className="block text-sm space-y-1" htmlFor="account-delete-confirmation">
              <span>Type DELETE MY ACCOUNT</span>
              <Input id="account-delete-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" disabled={busy} required />
            </label>
            <label className="block text-sm space-y-1" htmlFor="account-delete-password">
              <span>Current password</span>
              <Input ref={passwordInput} id="account-delete-password" type="password" autoComplete="current-password" maxLength={1024} disabled={busy} required />
            </label>
            <p className="text-xs text-muted-foreground">Forgot your password or used Google to join? Use Forgot password on the sign-in screen first, or contact us.</p>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="destructive" disabled={busy || confirmation !== 'DELETE MY ACCOUNT'}>Permanently delete account</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => { setDeleting(false); setConfirmation(''); setMessage(''); }}>Cancel</Button>
            </div>
          </form>
        )}
        {message && <p role="alert" className="text-sm">{message}</p>}
      </CardContent>
    </Card>
  );
}
