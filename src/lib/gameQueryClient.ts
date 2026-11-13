import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Same client and session, loosely typed for game tables the generated schema does not list yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gameQueryClient = supabase as unknown as SupabaseClient<any, 'public', any>;
