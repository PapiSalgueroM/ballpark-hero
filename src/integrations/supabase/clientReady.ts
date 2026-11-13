import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

type Client = SupabaseClient<Database>;
type Listener = (client: Client) => void;

// This is the SDK's existing default key for the live project. Pin it in the
// client so startup can check it without loading the SDK or parsing the stored value.
export const AUTH_STORAGE_KEY = 'sb-flawuiqbvjobmkfkauhw-auth-token';

let ready: Client | undefined;
const listeners = new Set<Listener>();

export function publishSupabaseClient(client: Client) {
  ready = client;
  for (const listener of listeners) listener(client);
}

export function onSupabaseClientReady(listener: Listener) {
  listeners.add(listener);
  if (ready) listener(ready);
  return () => { listeners.delete(listener); };
}
