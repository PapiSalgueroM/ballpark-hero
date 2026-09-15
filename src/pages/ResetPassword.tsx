import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, AlertCircle, KeyRound } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import { PASSWORD_SET_FLAG, sendPasswordLink } from '@/lib/googlePaused';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Set-a-new-password screen (#login-recovery).
 *
 * Players land here from the "Forgot password?" email link. The link signs
 * them into a temporary recovery session (supabase-js picks the tokens out of
 * the URL automatically); this page just needs a session to exist, then
 * updateUser({ password }) saves the new password and they stay signed in.
 *
 * Also works as a plain change-password page for anyone already signed in who
 * navigates here directly.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  // 'checking': waiting for supabase-js to digest the recovery link tokens.
  // 'ready': we have a session, show the form. 'invalid': no session showed
  // up, the link is expired/used/mangled.
  const [phase, setPhase] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* Round 610: set when the server wants a fresh sign in before it will change
     the password (a session older than a day, if the project requires that).
     The email link is the one route that always satisfies it. */
  const [linkInstead, setLinkInstead] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    const settle = (next: 'ready' | 'invalid') => {
      if (cancelled || settled) return;
      settled = true;
      setPhase(next);
    };

    // The recovery tokens in the URL are processed asynchronously on page
    // load, so poll getSession briefly instead of trusting a single read.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) settle('ready');
    });

    (async () => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) { settle('ready'); return; }
        await new Promise(r => setTimeout(r, 500));
      }
      settle('invalid');
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }
    setSaving(true);
    /* Round 610: the flag tells the account menu this player has a password
       now, so it stops offering Google-only accounts a link to set one. */
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { [PASSWORD_SET_FLAG]: true } });
    setSaving(false);
    if (updateError) {
      const reauth = /reauthenticat/i.test(updateError.message);
      const msg = /same password/i.test(updateError.message)
        ? 'That is already your password. Pick a different one.'
        : reauth
          ? 'For safety this needs a fresh link. Tap below and we will email you one.'
          : updateError.message;
      setLinkInstead(reauth);
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success('Password updated! You are signed in.');
    navigate('/');
  };

  const handleEmailLink = async () => {
    setSendingLink(true);
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email;
    if (email) await sendPasswordLink(email);
    else toast.error('Could not find the email on this account. Log out, then use Forgot password on Log In.');
    setSendingLink(false);
  };

  return (
    <>
      <PageSeo
        title="Reset Password | DoUKnowBall"
        description="Set a new DoUKnowBall password"
        path="/reset-password"
        noindex
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-center flex items-center justify-center gap-2">
              <KeyRound className="w-6 h-6 text-primary" /> Set a new password
            </CardTitle>
          </CardHeader>
          <CardContent>
            {phase === 'checking' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Checking your reset link...</p>
              </div>
            )}

            {phase === 'invalid' && (
              <div className="space-y-4 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  This reset link is expired or was already used. Head back home,
                  open Log In and tap "Forgot password?" to get a fresh one.
                </p>
                <Button asChild className="w-full">
                  <Link to="/">Back to DoUKnowBall</Link>
                </Button>
              </div>
            )}

            {phase === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Type it again</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                  />
                </div>
                {error && (
                  <p className="flex items-start gap-1.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                  </p>
                )}
                {linkInstead && (
                  <Button type="button" variant="outline" className="w-full" onClick={handleEmailLink} disabled={sendingLink} data-email-link-instead>
                    {sendingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Email me a link instead'}
                  </Button>
                )}
                <Button type="submit" className="w-full h-11" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save new password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
