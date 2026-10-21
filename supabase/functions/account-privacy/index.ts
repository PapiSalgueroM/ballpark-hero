import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2.95.3';
import { handleAccountPrivacy, type PrivacyServices } from './handler.ts';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const publicClient = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, options);
const serviceClient = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);

const services: PrivacyServices = {
  async getUser(jwt) {
    const { data, error } = await publicClient().auth.getUser(jwt);
    return error ? null : data.user;
  },
  async exportData(userId) {
    const { data, error } = await serviceClient().rpc('account_privacy_export', { p_user_id: userId });
    if (error) throw new Error('export_failed');
    return data;
  },
  async deletionBlockers(userId) {
    const { data, error } = await serviceClient().rpc('account_privacy_deletion_blockers', { p_user_id: userId });
    if (error) throw new Error('preflight_failed');
    return data;
  },
  async confirmPassword(email, password) {
    const client = publicClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) return null;
    const userId = data.user.id;
    // Revoke only the temporary server confirmation session, never the browser session.
    const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
    if (signOutError) throw new Error('confirmation_failed');
    return userId;
  },
  async deleteUser(userId) {
    const { error } = await serviceClient().auth.admin.deleteUser(userId, false);
    if (error) throw new Error('deletion_failed');
  },
};

Deno.serve(request => handleAccountPrivacy(request, services));
