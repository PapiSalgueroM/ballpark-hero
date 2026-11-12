export function loadSupabase() {
  return import('@/integrations/supabase/client').then(module => module.supabase);
}
