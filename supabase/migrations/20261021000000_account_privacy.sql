-- Account privacy: fixed server-only access, complete account deletion cascades.
-- Historical orphan rows remain untouched; NOT VALID enforces all new writes.
alter table public.daily_badges
  add constraint daily_badges_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.daily_completions
  add constraint daily_completions_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.fantasy_draft_votes
  add constraint fantasy_draft_votes_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.overrated_votes
  add constraint overrated_votes_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.saved_brackets
  add constraint saved_brackets_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.tier_list_votes
  add constraint tier_list_votes_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.transfer_grade_votes
  add constraint transfer_grade_votes_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.user_best_scores
  add constraint user_best_scores_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.user_game_scores
  add constraint user_game_scores_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.user_scores
  add constraint user_scores_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.user_scores_bak_20260919
  add constraint user_scores_bak_20260919_account_privacy_user_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

-- Existing permissive policies still allow guest votes. This restriction prevents impersonation.
create policy overrated_votes_account_owner_insert on public.overrated_votes
  as restrictive for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Existing permissive policies still allow guest votes. This restriction prevents impersonation.
create policy tier_list_votes_account_owner_insert on public.tier_list_votes
  as restrictive for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Existing permissive policies still allow guest votes. This restriction prevents impersonation.
create policy transfer_grade_votes_account_owner_insert on public.transfer_grade_votes
  as restrictive for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- A single statement observes one database snapshot and preserves duplicate backup rows.
-- The caller must be service_role; the edge endpoint supplies its freshly verified user ID.
create function public.account_privacy_export(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $function$
  select jsonb_build_object(
    'bootroom_event_log', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.event_log_id, t.save_id, t.event_id, t.year, t.week, t.choice_taken
        from public.bootroom_event_log t where t.save_id in (select s.save_id from public.bootroom_save s where s.user_id = p_user_id)
      ) export_row
    ), '[]'::jsonb),
    'bootroom_facilities', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.save_id, t.training_level, t.medical_level, t.commercial_level, t.scout_infra_level, t.scout_depth, t.scout_reach, t.scout_speed, t.upgrade_in_progress, t.upgrade_completes_year
        from public.bootroom_facilities t where t.save_id in (select s.save_id from public.bootroom_save s where s.user_id = p_user_id)
      ) export_row
    ), '[]'::jsonb),
    'bootroom_match', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.match_id, t.save_id, t.year, t.week, t.opponent, t.is_home, t.goals_for, t.goals_against, t.scorers, t.assists
        from public.bootroom_match t where t.save_id in (select s.save_id from public.bootroom_save s where s.user_id = p_user_id)
      ) export_row
    ), '[]'::jsonb),
    'bootroom_save', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.save_id, t.user_id, t.club, t.start_year, t.current_year, t.current_week, t.seed, t.cash_usd, t.board_standing, t.player_trust, t.market_rep, t.heat, t.integrity_flags, t.status, t.created_at, t.updated_at
        from public.bootroom_save t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'bootroom_save_player', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.save_id, t.player_name, t.position, t.age, t.nationality, t.current_value_usd, t.wage_usd, t.is_anchor, t.squad_number, t.is_starter, t.form, t.morale, t.fitness, t.injured_until_week, t.acquired_year, t.acquired_fee_usd
        from public.bootroom_save_player t where t.save_id in (select s.save_id from public.bootroom_save s where s.user_id = p_user_id)
      ) export_row
    ), '[]'::jsonb),
    'bootroom_scout_report', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.report_id, t.save_id, t.player_name, t.scouted_year, t.scout_depth, t.projected_delta, t.band_low, t.band_high, t.verdict_text, t.ambiguous, t.noise_seed, t.created_week, t.created_at
        from public.bootroom_scout_report t where t.save_id in (select s.save_id from public.bootroom_save s where s.user_id = p_user_id)
      ) export_row
    ), '[]'::jsonb),
    'bootroom_transfer_log', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.transfer_id, t.save_id, t.player_name, t.direction, t.fee_usd, t.year, t.player_age, t.value_at_time, t.had_scout_report, t.scout_verdict, t.created_at
        from public.bootroom_transfer_log t where t.save_id in (select s.save_id from public.bootroom_save s where s.user_id = p_user_id)
      ) export_row
    ), '[]'::jsonb),
    'daily_badges', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.date, t.streak_days, t.created_at
        from public.daily_badges t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'daily_completions', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.game_slug, t.date, t.created_at
        from public.daily_completions t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'fantasy_draft_votes', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.voted_team, t.user_id, t.created_at
        from public.fantasy_draft_votes t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'overrated_votes', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.player_name, t.year, t.vote, t.user_id, t.created_at
        from public.overrated_votes t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'profiles', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.username, t.display_name, t.avatar_url, t.streak_state, t.created_at, t.updated_at
        from public.profiles t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'saved_brackets', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.bracket_data, t.created_at
        from public.saved_brackets t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'tier_list_votes', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.player_name, t.year, t.tier, t.user_id, t.created_at
        from public.tier_list_votes t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'transfer_grade_votes', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.player_name, t.move_year, t.to_club, t.grade, t.user_id, t.created_at
        from public.transfer_grade_votes t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'user_best_scores', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.game_type, t.best_score, t.achieved_at, t.created_at
        from public.user_best_scores t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'user_game_scores', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.game_type, t.score, t.correct_answers, t.puzzle_date, t.created_at
        from public.user_game_scores t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'user_preferences', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.favourite_game, t.favourite_team, t.favourite_player, t.time_spent_minutes, t.created_at, t.updated_at
        from public.user_preferences t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'user_roles', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.role
        from public.user_roles t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'user_scores', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.total_points, t.games_played_today, t.current_streak, t.longest_streak, t.last_played_at, t.updated_at, t.created_at
        from public.user_scores t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb),
    'user_scores_bak_20260919', coalesce((
      select jsonb_agg(to_jsonb(export_row)) from (
        select t.id, t.user_id, t.total_points, t.games_played_today, t.current_streak, t.longest_streak, t.last_played_at, t.updated_at, t.created_at
        from public.user_scores_bak_20260919 t where t.user_id = p_user_id
      ) export_row
    ), '[]'::jsonb)
  );
$function$;
revoke all on function public.account_privacy_export(uuid) from public, anon, authenticated;
grant execute on function public.account_privacy_export(uuid) to service_role;

-- Return only blockers, never Storage names, object metadata, or another account's roles.
create function public.account_privacy_deletion_blockers(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $function$
  select jsonb_build_object(
    'admin', exists(select 1 from public.user_roles where user_id = p_user_id and role = 'admin'),
    'storage',
      exists(select 1 from storage.objects where owner = p_user_id or owner_id = p_user_id::text)
      or exists(select 1 from storage.buckets where owner = p_user_id or owner_id = p_user_id::text)
  );
$function$;
revoke all on function public.account_privacy_deletion_blockers(uuid) from public, anon, authenticated;
grant execute on function public.account_privacy_deletion_blockers(uuid) to service_role;

