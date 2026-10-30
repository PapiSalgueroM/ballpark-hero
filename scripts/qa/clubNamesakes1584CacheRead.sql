-- Round 1584: Q6, the cached verdicts that mention Arsenal, with the guard hash the purge form checks.
-- READ ONLY. The lead runs it once at the apply, right before scripts/qa/genClubNamesakePurge1584.mjs, and saves the
-- rows as a JSON array of {game, cache_key, verdict, h}. scripts/qa/rehearseClubNamesakes1584.mjs runs this exact
-- text in PGlite on a synthetic cache. Builders never run it against production.
select game, cache_key, verdict::text as verdict, md5(concat_ws('|', game, cache_key, verdict::text)) as h
from public.ai_validation_cache
where game in ('soccer-grid', 'football-connect4', 'build-your-xi') and cache_key ilike '%arsenal%'
order by game, cache_key;
