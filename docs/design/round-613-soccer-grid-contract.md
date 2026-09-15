ROUND 613 CONTRACT: Soccer Grid records pass, derived club and nation identity, closed routing, sound World Cup names

Draft written 2026-09-15 by a read-only contract agent. The same day a second read-only agent tried to refute it and revised it. Every number below was read by SELECT (Supabase flawuiqbvjobmkfkauhw), by get_edge_function (soccer-grid-validate v23, updated 2026-09-07) or by a 24h log read. No edge function was invoked. Probe files are in C:\Users\antho\AppData\Local\Temp\claude\r613\: probe_contract_2026-09-15.sql, probe_refute_2026-09-15.sql, probe_wc_bands.mjs (the World Cup name bands as written and as corrected), probe_routes.mjs, probe_wc_match.mjs, probe_queries.sql.

DECISION ON THE COLLEGE GRID PRECEDENT: fix the records pass now. Do not move Soccer Grid to a browser key this round.
1. Soccer Grid gets finished; College Grid did not. game_completions for soccer-grid: 86 since 2026-07-01 (52 at 900 or more), 72 since fail closed went live on 07-22, 31 since 08-30. College Grid had 2 rows since 07-22. The default normal tier had no AI cell on 46 of 46 daily boards (08-01 to 09-15). Since 08-30, correct picks split normal 360, hard 40, easy 9.
2. What is broken is a handful of rules inside one 440-line function, not the architecture. Every proven wrong verdict traces to them:
 - substring clubs: Taarabt confirmed at Rangers from a QPR row;
 - the Atlético alias gap: 6 wrong cached refusals;
 - nationality fallthrough: 4 caps refusals;
 - substring World Cup names: Cristiano Ronaldo and Thomas Müller cached as 1994 winners; 'ram', 'pirl' and 'stefa' cached YES;
 - cross-person pairing: Romário x 1994 x Defender, and the Ruggeri and Frank fullNames.
3. A browser judge needs definite NOs that the tables do not hold.
 - Clubs fill 1,888 of 4,260 slots, and no table holds complete careers. stints is player_market_values capped at rank 500 per position per year; Defensive Midfield has 0 player-years in 2023 to 2025 and 46 in 2026.
 - Positions fill 986 slots and settle a NO for only about 2,500 names.
 - Leagues fill 474 slots, 441 of them on easy boards, and there is no club-season-league table.
 - 42 honour labels (74 slots) have no per-player data.
 - Judged without the model, a wrong club or position guess would be a free retry on most cells, so boards could be won but almost never lost.
4. Size. Retiring league labels alone touches 372 of the 710 boards. Regenerating boards resets rarity, because soccer_grid_selections is keyed by puzzle_id. The key would sit over 80,586 stint rows (27,803 names) plus 9,427 squad rows, against the NFL key's 22,008 rows. That is two or three rounds, not one.
5. Revisit when a club-season-league table is imported and a second position source covers the position slots, or if the model allowance is withdrawn for good.

GOAL. Every verdict the records pass gives is one of two things:
 - a confirmed fact about one person; or
 - a definite NO from a complete fact: a complete World Cup winning squad, or a single stored nationality that no second table and no shared citizenship contradicts.
A YES that combines two stint rows counts only when the rows are shown to be one person. A club miss is never a NO. No label reaches a matcher that was not built for it. A failed read never produces a NO or a YES. The model stays as the fail-closed fallback for what records cannot settle.

What does not change:
 - the hook (src/hooks/useSoccerGrid.ts), the page, the boards and tiers;
 - the cache-first order, the rate limit, the prompt;
 - the Round 407 and 501 name guard, the 429 handling, and every unverified shape.
No src file changes, so no snapshot changes. What a player pays does not change: unverified and exhausted still cost no guess. What a player sees does change (see RISKS: the exhausted lockout).

1. DATA: GENERATED IDENTITY (derived, never typed)
New script: scripts/genSoccerGridIds.mjs.

Reads, through REST with the publishable key (paged, retried like simSoccerGridLabels.getPage):
 - soccer_player_club_stints (club, name_folded, player_name, first_year, last_year, nationality)
 - world_cup_players (player_name, club, nationality, world_cup_year)
 - soccer_club_puzzles (full_name, common_names)
 - soccer_grid_puzzles (rows_json, cols_json)
 - the labels of the 15 fallback puzzles in src/data/soccerGridPuzzles.ts

Fail closed: the script reads each table's exact row count (Prefer: count=exact). If any paged read returns fewer rows than that, it exits 1 and writes nothing.

It writes two things, and --check exits 1 when either differs from a fresh derivation:
 a) scripts/data/soccerGridIds.json. Per label: the resolved stored strings, the evidence behind each (exact label, exact puzzle full_name, or world_cup_players n/total), and the names reachable. Also every unresolved or low-coverage label with its reason, and every accepted stored string reaching fewer than 10 names, listed with those names for review. The header names the command, the thresholds, the stints year convention (season end year) and the date.
 b) The block between the lines "// @generated-ids-begin" and "// @generated-ids-end" inside supabase/functions/soccer-grid-validate/index.ts:
  - CLUB_IDS: folded label text after "Played for ", mapped to exact stored strings;
  - CLUB_COMPOUND: label mapped to {mode: both or either, parts};
  - NATION_IDS: folded label mapped to {label, stints, wc[]}.
  Do not edit the block by hand.

Club rules, in this order, per label or compound part:
 - Names of the label: the label itself, plus the full_name of the single soccer_club_puzzles row whose full_name or common_names fold equal to the label. If two or more rows match, the label (or compound part) is unresolved as a whole. Common names are only used to find the row; they are never matched against stints.
 - A stored string (the stints club split on " / ") is accepted when either:
  - its fold equals one of the names; or
  - a world_cup_players club spelling whose fold equals one of the names co-occurs with that stored string, for the same folded player name, with first_year <= world cup year and last_year >= year minus 1, on at least 3 players and at least 0.3 of that spelling's joined players.
  Rows whose stored club contains " / " are excluded from the co-occurrence count.
 - The window is not season-aligned for the winter 2022 tournament (stints year is the season end year: Messi PSG first_year 2022, Haaland Manchester City 2023). Today it admits no wrong club. Lowest accepted share 0.36 (Corinthians 4/11). Rejected with n >= 2: West Ham United for Corinthians 2/11, Red Bull Salzburg for Leeds United 2/11, Inter Milan for Parma 2/10, FC Toulouse for Bordeaux 2/12, Santos FC for Santos 2/4. A season-aligned window would raise the lowest accepted share to 0.67 but lose Corinthians and Al-Ittihad. Record both readings in the header.
 - Compound labels: "both A and B" and "A or B" are split, and each part is resolved as above. A label with an unresolved part is unresolved.
 - No hand alias. The five v23 CLUB_ALIASES entries re-derive: PSG via the puzzle row (Paris Saint-Germain, and 40/63), Bayer Leverkusen 25/36, Celta Vigo 7/8, Rennes 19/32, LA Galaxy 4/8.

Club readings today: 101 single labels, 99 resolve.
 - Unresolved: Santos (two puzzle rows, Santos FC and Santos Laguna, 16 slots) and "England at a World Cup" (1 slot).
 - Low coverage: Grêmio. Only the 1 name stored as "Grêmio" (a Luis Suárez row) is reachable; the 166 names at "Grêmio Foot-Ball Porto Alegrense" have no evidence at threshold (17 slots).
 - Compounds: "both AC Milan and Inter" is unresolved because "Inter" names two puzzle rows (1 slot). Man United and Man City, Real Madrid and Atlético, and Boca or River all resolve.
 - No world_cup_players spelling maps to two targets.
 - Small accepted strings for review: Roma 4 names, Napoli 3, Torino 3, Genoa 3, Sampdoria 2, Lazio 2, Sevilla 2, Bologna 1, Atalanta 1, Udinese 1, Parma 1. These are mostly Second Striker, aged 16 to 19, one season, so possibly youth rows. Barcelona, Liverpool, Ajax, Atlético Madrid, Grêmio and Inter Miami are one Luis Suárez row each (person_key 'luis suarez 1987').
 - Examples: "Atlético Madrid" and "Atletico Madrid" give Atlético de Madrid (180 names, evidence 35/52) plus Atlético Madrid (1). "Barcelona" gives FC Barcelona (48/76) plus Barcelona. "Rangers" gives Rangers FC only. "Tottenham" gives Tottenham Hotspur via the puzzle row.

Nation rules:
 - DEMONYM (label word to English country name) moves out of the function into the generator and is extended so every nationality label on the boards has a key: add "south korean" to south korea and "tunisian" to tunisia. A label is a nationality only when its fold is a DEMONYM key.
 - Country to stored stints string: fold equality; else token set equality ("south korea" and "Korea, South"); else a world_cup_players nationality spelling equal to the country that co-occurs with one stints nationality on at least 3 players and at least 0.9 share. Today: Ivory Coast to Cote d'Ivoire 59/59, Turkey to Türkiye 21/21, Bosnia and Herzegovina to Bosnia-Herzegovina 29/29. wc[] lists the world_cup_players spellings seen for that stints string.
 - Readings today: 37 nationality labels. Irish is Ireland (196 names, not Northern Ireland's 68). Nigerian is Nigeria (248, not Niger's 6). Ivorian is Cote d'Ivoire (221). South Korean is Korea, South (175). "African" has no DEMONYM key and is not a nationality.
 - The generator also checks that every key in the typed SHARED_CITIZENSHIP table (part 2) is a stored stints nationality string, and fails otherwise.

2. VALIDATOR v24 (supabase/functions/soccer-grid-validate/index.ts)

Structure.
 - All judging moves into pure functions between the lines "// @judge-begin" and "// @judge-end". The generated block sits inside it.
 - Nothing in the block is indented at top level. TRANSLIT is immediately followed by norm, ending with its ".trim();" line, because simTeammatesPairs and simSoccerStintNameFold lift them by line position.
 - The block has no import, no fetch, no sb, no Deno. serve() does the reads and calls judge().
 - Delete from the file: DEMONYM, CLUB_ALIASES, clubMatches' substring test, parseCriterion's regex fallthrough, careerComplete, the v23 checkWorldCupWinner matcher and the use of debut_year and debut_age.
 - Keep: norm, TRANSLIT, cacheKeyOf, WC_WINNER_BY_YEAR, positionBucket, the stints lookup on name_folded (eq, then the unique surname-like fallback), the rate limiter.
 - Keep the AI branch verbatim, except that the verdict object it caches gains rule: "v24".
 - New typed table inside the block, next to WC_WINNER_BY_YEAR and with the same standing: legal fact, no table in the database holds it. SHARED_CITIZENSHIP, wanted stints string to stored strings whose holders share that citizenship:
  - France: Martinique, Guadeloupe, French Guiana, New Caledonia, Saint-Martin, Tahiti, Réunion
  - Netherlands: Curacao, Aruba
  - Denmark: Faroe Islands
  - United States: Puerto Rico, Guam, American Virgin Islands
  - England: Gibraltar, Jersey
  - Ireland: Northern Ireland

Reads in serve():
 - Any read that errors or returns null data makes the criteria depending on it unknown, never false and never YES.
 - If the whole records pass throws, the AI branch runs, as in v23.
 - Reads made only when needed:
  (a) world_cup_players winner squad for a year label (player_name, position, date_of_birth, nationality);
  (b) before any nationality false: one row confirming NATION_IDS.stints still exists in soccer_player_club_stints (limit 1), and world_cup_players.player_name where nationality is in NATION_IDS.wc;
  (c) before any YES that combines two stint rows, or pairs a stint row with a squad row: player_market_values club, year, age for the name_folded (limit 200).

Closed classifier, first match wins:
 1. /^(\d{4}) World Cup Winner$/ with the year in WC_WINNER_BY_YEAR: wc_winner.
 2. Fold equals one of "forward fwd", "midfielder mid", "defender def", "goalkeeper gk": position.
 3. /^Played for (.+)$/: fold of the rest in CLUB_IDS is club; in CLUB_COMPOUND is compound; otherwise other.
 4. /^Played in /: league.
 5. Fold in NATION_IDS: nationality.
 6. Everything else: other.
League and other never produce a records verdict.

Kind counts today, over 236 labels and 4,260 slots:
 - club 99 labels / 1,867 slots
 - compound 3 / 3
 - nationality 37 / 471
 - position 4 / 986
 - wc_winner 11 / 338
 - league 12 / 474
 - other 70 / 121: 18 club-shaped unresolved slots, the 25 labels v23 sent to the nationality matcher (29 slots), and 42 honour labels (74 slots)

Records criteria per stints row r:
 - club: some trimmed part of r.club split on " / " is exactly one of the CLUB_IDS strings. A miss is unknown, never false.
 - compound either: any part matches on some row; a miss is unknown.
 - compound both: every part matches on some row, and the rows used pass the one-person test below; otherwise unknown.
 - position: positionBucket(r.position) is the bucket; a miss is unknown (as v23).
 - nationality: r.nationality equals NATION_IDS.stints. A definite false only when all of these hold:
  - the name resolved by the exact folded full name, not the surname fallback;
  - every fetched row carries one nationality, and it is not the wanted string;
  - that stored string is not listed under the wanted string in SHARED_CITIZENSHIP;
  - read (b) confirms the wanted string exists in the table;
  - no world_cup_players row with a nationality in NATION_IDS.wc has norm(player_name) equal to norm of the stored stints player_name.
 Otherwise unknown.

One-person test for rows used together: the rows share a non-null person_key, or every row has player_market_values birth years (year minus age, from rows with the same name_folded, club equal to the row's club or one of its " / " parts, and year inside the row's span) and all of those birth years lie within 2 of each other. A row with no birth year fails the test.
 - Measured birth-year spread per name_folded: 0 for 26,382 names, 1 for 123, 2 for 754, 3 for 85, 4 to 6 for 82, above 6 for 378.
 - 78,670 of the 80,586 stint rows have a birth year.

Pairing two records criteria:
 - Both criteria can be read off one row (club, compound either, position, nationality, in any combination except two club-type criteria): YES only when one single stints row satisfies both. This is Round 482's rule from validate-player, which that function applies to a team plus a position.
 - Two club-type criteria (club x club, club x compound, compound x compound): YES only when a row satisfying each exists and the rows chosen pass the one-person test. This covers 713 club x club cells on 208 boards.
 - Compound both paired with position or nationality: the part rows must pass the one-person test, and the paired criterion must hold on one of those rows.

World Cup names. The squad query adds date_of_birth and nationality. Fold everything with norm; nospace means spaces removed; a run is two or more consecutive tokens of a squad name joined without spaces. For the typed guess g against the year's squad rows s, the first band that applies:
 A. g equals s, or nospace(g) equals nospace(s): YES on that row.
 B. Every token of g is a whole token of s; or nospace(g) equals one token of s; or nospace(g) equals a run of s ending with its last token. If exactly one squad row qualifies: YES on that row. If two or more qualify: unknown.
 D. Every token of some s is a token of g and g has extra tokens: unknown.
 E. Near: unknown. Near means any of:
  - g shares at least one whole token with some s;
  - nospace(g), at least 3 characters long, is a prefix of a token of s or of nospace(s);
  - Levenshtein(nospace(g), x) <= max(1, floor(max length / 6)), for x any single token or run of s, or nospace(s);
  - some token pair of length at least 4 is within that same distance.
 F. Otherwise: definite false. The squad is complete; 15 or more rows are required, as today.

Measured with probe_wc_bands.mjs on today's cached records rows for the 11 labelled years (distinct typed name and year pairs):
 - YES rows: A 64, B 30, D 4 (cristiano ronaldo 1994, thomas muller 1994, ronaldo nazario 1994 and 2002), E 3 (ram, pirl, stefa).
 - NO rows: F 116, E 27, B 1 ('n‘zonzi', now YES).
 - The E refusals include the misspellings tafarel, ronaldino, jairzinio, lillian thuram, sweinsteiger, umtitti, voler, mathaus, blaise matiudi, julian alavrez, jurgen koller, ricardino, beberto and mcallister.
 - The literal draft rule put sweinsteiger and mcallister in F, along with the common spellings Dimaria, MacAllister, DePaul, Delpiero and DeRossi. Under the rule above, Dimaria, MacAllister, DePaul, Delpiero, DeRossi and Guivarch are B, and McAllister and Sweinsteiger are E.
 - Known residue: squad rows store one short name, so "Paulo Cesar" (squad "Caju") and "Dada Maravilha" (squad "Dario") for 1970 still land in F.

Pairing with a World Cup YES on squad row R:
 - position: YES when positionBucket(R.position) is the bucket; otherwise unknown.
 - club, compound or nationality from stints: counted only when both hold:
  - norm(stints player_name) equals norm(R.player_name);
  - the stints row satisfying the criterion has player_market_values birth years all within 2 of year(R.date_of_birth).
 Otherwise unknown. Do not use debut_year or debut_age: they are stored per name, not per row. Example: every 'pedro' row says born 1985, while its rows are men born 1985, 1988, 1998 and 2007. Romário: stints born 1993, squad 1966.
 - Both labels World Cup years: YES only when the two matched rows share folded name and date_of_birth.
 - properName is always R.player_name.

Verdict writing:
 - A pair is YES when both criteria are true, false when either is false, and otherwise the AI branch runs exactly as in v23.
 - Reasons keep their exact v23 wording: "Verified from career records." and `${shown} does not satisfy "${which}".`
 - Every verdict object this version caches, records or AI, carries rule: "v24". The hook reads only valid, fullName, unverified and exhausted.
 - The header comment is rewritten to describe v24 and its date.

Deploy and sync:
 1. Run genSoccerGridIds.mjs (it writes the block).
 2. Run the harnesses.
 3. Deploy through the Supabase MCP deploy_edge_function with the repo index.ts, and record the deploy time.
 4. Read it back with get_edge_function: version 24, and the CRLF-normalised sha256 of the returned content equals the repo file.
 5. In the same commit, update scripts/data/edgeDeployed.json for soccer-grid-validate to that sha256, version 24 and the deploy date.
simEdgeSync's unverified baseline stays 19.

3. BOARDS AND LABELS: none retired or regenerated this round
- No soccer_grid_puzzles row changes and no fallback puzzle changes. Reasons: every wrong verdict found is a routing or matching bug fixed above; the labels no table settles are still judged by the model instead of refusing everyone; and changing boards moves the daily index and splits rarity.
- Recorded for the key round, not done now (put this list in docs/PROJECT-STATE.md next to Soccer Grid):
 - Retire:
  - Played under x5, Became a PL manager, the two fee labels, three or more countries;
  - the six goal-threshold, derby and Clasico labels;
  - Captained their national team, Captained a World Cup winning team;
  - Scored in a World Cup final, Sent off at a World Cup, Missed a penalty at a World Cup, Scored at two or more World Cups, Played in a World Cup knockout game;
  - Golden Boot Winner, Puskás, Golden Boy, PFA;
  - the 18 club or national trophy winner labels.
 - Relabel "Played for Santos" and "both AC Milan and Inter" to unambiguous names.
 - Settle from tables:
  - Ballon d'Or (ballon_dor);
  - World Cup Winner without a year (winner squads with an era gate);
  - Played at 2006 / 2022 / both (squad membership);
  - England at a World Cup;
  - Named African Player of the Year (soccer_awards after its column shift).
 - Leagues need an imported club-season-league table.

4. CACHE PURGE (right after the v24 read-back, same session; the cache is served before the records pass)
The cache holds 642 soccer-grid rows today, none with a rule marker. Primary key (game, cache_key).

Step 1, export (SELECT). Save to a scratch file outside the repo; it holds player-typed text.
 select cache_key, verdict, created_at from ai_validation_cache where game = 'soccer-grid' and not (verdict ? 'rule');

Step 2, replay: SG_JUDGE_REPLAY=<that file> node scripts/simSoccerGridJudge.mjs
 - Replays every exported row, records and AI alike, through the v24 records pass. It reads stints, squads and player_market_values through REST, never the function.
 - Prints every key where either:
  - for a records-reason row: the v24 verdict differs (different valid, now unknown, or a different folded fullName);
  - for an AI row: v24 records give a definite verdict that disagrees with the stored valid.
 - For each key it prints the band or class, and the key base64-encoded. Player text never appears in SQL.

Step 3, find (SELECT). Keys from step 2 enter only as convert_from(decode('<base64>', 'base64'), 'UTF8').
 with c as (select cache_key, verdict from ai_validation_cache where game = 'soccer-grid' and not (verdict ? 'rule'))
 select 'P1 club data refusal' why, cache_key from c where verdict->>'reason' like '% does not satisfy "Played for %'
 union all select 'P2 refusal on a label v24 never judges from records', cache_key from c where verdict->>'reason' like '% does not satisfy "%' and verdict->>'reason' !~ 'does not satisfy "(Played for |[0-9]{4} World Cup Winner")' and substring(verdict->>'reason' from 'does not satisfy "([^"]+)"') <> all (array[<the 37 nationality label strings from soccerGridIds.json>])
 union all select 'P3 verdict v24 replays differently', cache_key from c where cache_key = any (array[<decoded keys from step 2>])
 union all select 'P4 AI refusal the tables contradict', cache_key from c where cache_key in ('michael olise|played for bayern munich|midfielder (mid)', 'julian alvarez|played for atletico madrid|forward (fwd)', 'nicholas jackson|played for bayern munich|forward (fwd)', 'acheampong|played for chelsea|defender (def)')
 union all select 'P5 AI confirmation of a name no table holds', cache_key from c where cache_key = 'qwerty uiop|won the pfa player of the year|scored in the milan derby'
 union all select 'P6 name-guard refusal cached as a hard no', cache_key from c where verdict->>'reason' = 'That name did not match a player we could verify.' and not coalesce((verdict->>'unverified')::boolean, false);

Evidence:
 - P4:
  - Olise: stints Bayern Munich 2025-2026, and world_cup_players 2026 club Bayern Munich.
  - Álvarez: stints Atlético de Madrid 2025-2026, and world_cup_players 2026 club Atlético Madrid.
  - Nicolas Jackson: stints Bayern Munich 2026 Centre-Forward, and world_cup_players 2026 (Senegal) club Bayern Munich.
  - Josh Acheampong: stints and player_market_values Chelsea FC 2025-2026 Right-Back. One source lineage, but the purge removes a cached no rather than asserting a fact.
 - P5: 0 rows in stints and world_cup_players.
 - P6: 'vard|played for leicester city|played in premier league', written before Round 501 made that refusal unverified.

Stop unless every P1 and P2 key is also in P3 (the replay must agree with the patterns). Readings today: P1 64, P2 4 (the caps rows), P4 4, P5 1, P6 1. P3 is whatever the replay prints and is expected to include:
 - the 5 extra-token and 3 fragment confirmations;
 - the 27 near refusals;
 - romario|1994 world cup winner|defender (def);
 - ruggeri|1986 world cup winner|defender (def);
 - frank|1990 world cup winner|forward (fwd);
 - adel taarabt|played for rangers|midfielder (mid);
 - any club x club or position confirmation that fails the one-person test.
Correct club refusals are purged too, because v24 can no longer write them; the model re-judges them on the next guess. Messi x PSG x Forward and Aspas x Celta x Forward replay YES and stay.

Step 4, guarded delete (one execute_sql call; any mismatch raises and rolls back):
 do $$ declare expected int := <distinct count from step 3>; got int; begin
   create temp table r613_purge on commit drop as select distinct cache_key from (<step 3 query>) s;
   delete from ai_validation_cache a using r613_purge p where a.game = 'soccer-grid' and a.cache_key = p.cache_key and not (a.verdict ? 'rule');
   get diagnostics got = row_count;
   if got <> expected then raise exception 'r613 purge expected % rows, deleted %', expected, got; end if;
 end $$;

Step 5, recount: rerun step 3; it must return 0 rows.

Step 6, straggler sweep: a v23 worker can stay warm after the read-back. 30 minutes after step 4, rerun step 1 restricted to created_at after the recorded deploy time. If any row lacks the rule marker, replay and purge those keys with steps 2 to 5.

No other game's rows are touched (college-grid belongs to Round 611; football-grid to 614 and 615).

5. HARNESSES
New scripts/simSoccerGridJudge.mjs, control variable SG_JUDGE_CONTROL.
 - It extracts the judge block from index.ts and bundles it with node_modules/.bin/esbuild into os.tmpdir() (the simSoccerGridTiers pattern).
 - It reads tables through REST and never calls a function.
 - Every control asserts that its in-memory edit changed the text or the data before judging, and a control run exits 0 only when red.

 1. The judge is pure.
  Check: both marker pairs exist once; the block, comments stripped, has no import, fetch(, Deno. or sb.; serve() calls judge; TRANSLIT and norm sit at column 0 with norm directly after TRANSLIT.
  Control impure: plant Deno.env.get("X") inside the block.
 2. The generated block equals the derivation.
  Check: the generator's derive function, run in process on complete reads, matches the parsed block and soccerGridIds.json.
  Control staleids: delete the "atletico madrid" key from the parsed block (assert it was there).
 3. Clubs are exact and every label is covered.
  - Every club-shaped label on the 710 boards and 15 fallback puzzles is club, compound, or on the unresolved ratchet (baseline: Santos, England at a World Cup, both AC Milan and Inter; 3 labels, 18 slots).
  - Low-coverage ratchet under 10 reachable names (baseline Grêmio).
  - Small accepted strings ratchet (baseline: the list in part 1).
  - Impostors, derived, not listed: for each label, every stored string the v23 substring rule accepts that is not in CLUB_IDS must give no club YES. Print the count per label (v23 accepts RCD Espanyol Barcelona, 187 names, for Barcelona; Queens Park Rangers, 120, for Rangers; Arsenal Tula, 40, for Arsenal). v24 must be 0.
  - Pins that must be YES, each fact in stints and world_cup_players: Antoine Griezmann x Played for Atlético Madrid x Forward (FWD); Diego Godín x Played for Atlético Madrid x Defender (DEF); Julián Álvarez x Played for Atlético Madrid x Forward (FWD); Lionel Messi x Played for PSG x Forward (FWD); Michael Olise x Played for Bayern Munich x Forward (FWD).
  - Pin that must not be YES: Adel Taarabt x Played for Rangers x Midfielder (MID).
  Control substring: judge clubs with the v23 rule.
 4. The co-occurrence thresholds keep impostors out.
  Check: every derived world_cup_players pair has n >= 3 and share >= 0.3. Print the lowest accepted share (today 4/11, Corinthians), the highest rejected share, and the lowest accepted share under a season-aligned window.
  Control loose: n >= 1 and share >= 0 must admit at least one string section 3 flags or one spelling with two targets (Leeds United then also admits Red Bull Salzburg). If the first run shows loosening admits nothing, delete this section rather than keep a control that cannot fire.
 5. Routing is closed.
  Check: kind counts over the boards match the reading in part 2 (the first run records the baseline); no label outside NATION_IDS is judged as a nationality; Cristiano Ronaldo x Played for Real Madrid x Over 100 International Caps is unknown, not false (world_cup_players caps 111 in 2014; stints Real Madrid).
  Control fallthrough: restore the v23 default route to nationality; the 25 labels move and the pin turns false.
 6. Nationality is exact and never refuses a shared citizenship.
  Checks:
  - every NATION_IDS stints string exists (print the smallest name count);
  - Jonny Evans (stored Northern Ireland) x Irish is neither YES nor false;
  - a Niger row x Nigerian is not YES;
  - Yaya Touré x Ivorian and Heung-min Son x South Korean are YES;
  - Pascal Chimbonda x French is not false (world_cup_players 2006 France; stints Guadeloupe);
  - Aurélien Capoue (stored Guadeloupe) x French and Armando Obispo (stored Curacao) x Dutch are not false;
  - Ruggeri (surname only) x Argentine is not false.
  Sweep: no single-nationality stints name whose folded name matches a world_cup_players row of a labelled nation is false on that nation's label. Today 345 of 3,801 such joins differ only in accents or hyphens, for example Carlos Tevez / Carlos Tévez.
  Report stints versus world_cup_players nationality disagreements for the labelled nations; the first run sets the ratchet.
  Control substringnat: the v23 includes test.
  Control renamed: rename the wanted stored string in memory; the Touré pin must become unknown, not false.
  Control readfail: make read (b) return an error; no nationality verdict may become false.
 7. World Cup names. Over the 11 labelled winner squads:
  - every member's full name is YES with that properName;
  - every whole token unique in its squad (length 4 or more) is YES;
  - no multi-token stints name that strictly contains a member's token set is ever YES (pins: Cristiano Ronaldo and Thomas Müller x 1994, Vinícius Júnior and Marcos Alonso x 2002, Pedro Neto x 2010);
  - no prefix of a member's longest token that is strictly shorter than the token, 3 or 4 letters, and not itself a whole token of any member of that squad is ever YES (pins: ram 2010, pirl 2006, stefa 1990);
  - one-letter deletions and adjacent swaps of every member's name and longest token, plus the 14 cached misspellings in part 2, are never false;
  - N'Zonzi x 2018, Mac Allister, MacAllister, Dimaria and DePaul x 2022, and Delpiero and DeRossi x 2006 are YES; McAllister x 2022 and Sweinsteiger x 2014 are not false;
  - at least one stints name per year lands in band F (pin: Lionel Messi x 1994 is false).
  Control substringname: the v23 contains-either-way test.
  Control norun: drop the run comparisons; the Dimaria and McAllister pins must flip.
 8. One person across two facts. Pins:
  - Romário x 1994 World Cup Winner x Defender (DEF) is not YES, and x Forward (FWD) is YES (squad FW, born 1966-01-29).
  - Ruggeri x 1986 World Cup Winner x Defender (DEF) is YES with properName Oscar Ruggeri.
  - Frank x 1990 World Cup Winner x Forward (FWD) is YES with properName Frank Mill.
  - Koke x Played for Atlético Madrid x Forward (FWD) is not YES (Atlético row Central Midfield; world_cup_players MF 2014 to 2022), and x Midfielder (MID) is YES.
  - Pedro x 2010 World Cup Winner x Played for Barcelona is YES; Pedro x 2010 World Cup Winner x Played for Flamengo is not YES (the Flamengo rows are born 1998).
  - Ronaldo x 2002 World Cup Winner x Played for Real Madrid is YES.
  Control anyrow: any-row pairing plus stints position for World Cup pairs; the Romário and Koke pins must flip.
  Control debut: the draft's debut_year minus debut_age identity; the Pedro x Flamengo pin must flip.
 9. A club miss is never a no.
  Pins that must not be false (club in world_cup_players and missing from stints): Casemiro x Played for Manchester United (2022 and 2026); Aurélien Tchouaméni x Played for Real Madrid (2022 and 2026); Hakan Çalhanoğlu x Played for Inter Milan (2026; stints end at AC Milan 2021).
  Sweep: for every club label and the first 2,000 stints names by name_folded, the club criterion is never false.
  Control careercomplete: restore v23 careerComplete.
 10. Compound labels.
  - Carlos Tevez x both Manchester United and Manchester City is YES (stints both clubs, all rows born 1985; world_cup_players 2010 Manchester City).
  - Erling Haaland is not YES. A Chester City row is not YES. Karim Benzema x both Real Madrid and Atletico Madrid is not YES.
  - Tevez x Boca Juniors or River Plate is YES. Harry Kane x Boca Juniors or River Plate is not false. Both AC Milan and Inter is unknown.
  Control singlematch: send compound labels through the single matcher on the whole phrase.
 11. Club x club cells are settled from records for one person only.
  Pins:
  - Carlos Tevez x Played for Manchester United x Played for Juventus is YES.
  - Lionel Messi x Played for Barcelona x Played for PSG is YES.
  - Rodri x Played for Barcelona x Played for Manchester City is not YES (Barcelona 2006 row born 1985; Manchester City row born 1997).
  - Koke x Played for Marseille x Played for Atlético Madrid is not YES (born 1984 and 1993).
  Print how many of the 713 club x club cells have at least one records YES among names in stints (the first run sets the baseline).
  Control samerow: require one row for club x club; the Tevez and Messi pins must turn unknown.
  Control nobirth: skip the one-person test; the Rodri and Koke pins must turn YES.
  Control readfail: make the player_market_values read fail; no pair may become YES through the one-person test.

Changes to existing harnesses:
 - Delete scripts/simSoccerGridLabels.mjs. Its section 1 extracts CLUB_ALIASES and re-implements the substring rule, both gone in v24. Its sections 2 and 3 POST to the live validator, which writes ai_validation_cache. Sections 3 and 9 above replace it.
 - scripts/simAnswerFromRecords.mjs stays as it is. It is a deliberate production smoke test, and its two soccer keys (Messi PSG, Aspas Celta) replay YES and are not purged.
 - Must stay green unchanged: simQuotaHonesty (the 429 body reading and the name guard are kept verbatim), simSoccerStintNameFold and simTeammatesPairs (both lift TRANSLIT and norm by line position; the name_folded eq and like lookups are kept), simValidatorsFailClosed, simSoccerGridTiers, simGridRarity, simConnect4ClubRecords.
 - simEdgeSync: green once the ledger entry is updated.

6. GATES
 - node_modules/.bin/tsc --noEmit -p tsconfig.app.json at 0 (read the exit code, not an echo).
 - npm run build.
 - node scripts/genSoccerGridIds.mjs --check exits 0.
 - node scripts/runAllSims.mjs green, never while a build runs. Each control in sections 1 to 11 is run once and is red.
 - simEdgeSync green after the ledger update; get_edge_function read-back at version 24 with the matching hash.
 - No src or public file changes, so the build:seo harness list and the browser sweeps are not required. If any src file does change, run the full list from CLAUDE.md.
 - Purge recount 0, and the straggler sweep finds no v23-shaped row created after the deploy time.

7. WHAT DONE MEASURES (SELECT and log reads only, never a function call)
 - Deployed: version 24; hash equal to edgeDeployed.json.
 - Offline:
  - sections 1 to 11 green;
  - impostor accepts 0;
  - club false 0 over the sweep;
  - the 5 wrong World Cup confirmations not YES;
  - the 14 misspellings not false;
  - the joined-surname spellings YES;
  - the Rodri, Koke and Pedro pins not YES;
  - kind counts equal to the first-run baseline.
 - Live, over the 7 days after deploy, on soccer-grid rows carrying rule v24:
  - 0 with reason like '% does not satisfy "Played for %' (baseline 64 in 62 days; 7 in the 8 days since v23);
  - 0 refusing a label outside the 37 nationality labels and the World Cup year labels (baseline 7, the last on 09-02);
  - 0 World Cup year confirmations whose folded typed name is not one of: equal, with or without spaces, to a squad name of that year; a whole-token subset of exactly one; a single token of exactly one; or equal to a run ending with the last token of exactly one;
  - 0 nationality refusals whose typed name has fewer tokens than the stored fullName;
  - 0 nationality refusals of a player whose stored nationality is listed in SHARED_CITIZENSHIP for that label.
 - Purge: step 3 returns 0 rows, and the straggler sweep is empty.
 - Reported, not gated:
  - v24 rows per day by class (records YES, records NO, model YES, model NO);
  - "ai refused 429 DAY" lines per day (baseline 7 in the 24h to 2026-09-15 06Z, first at 15:59Z);
  - soccer-grid-validate calls per day (baseline 169);
  - the share of calls after the first day-limit line each day, as the exhausted-lockout exposure;
  - game_completions for soccer-grid per week, against 7 to 19 a week since mid August;
  - correct picks per tier per week.
 - docs/PROJECT-STATE.md and docs/WORKBOARD.md record the round, these baselines, the readings and the label list in part 3.

8. FOLLOW UPS
 - Round 615 (Connect 4 audit): football-connect4-validate hand-maps "atletico madrid" to "Atlético Madrid" (1 name) instead of "Atlético de Madrid" (180). It only ever confirms, so nothing is wrong, but it spends the allowance Soccer Grid shares. Regenerate its map from scripts/data/soccerGridIds.json. validate-player's CLUB_STRINGS already has the right Atlético string; bring all three maps onto the one derived identity.
 - Soccer Grid key round: the retire, relabel and table list in part 3.
 - Src round: in useSoccerGrid, checkingDown should block only the cell whose guess came back exhausted, not replace the input for the whole session (src/hooks/useSoccerGrid.ts lines 320 to 322; src/pages/SoccerGrid.tsx line 216).
 - Grêmio coverage: the 166 names at Grêmio Foot-Ball Porto Alegrense need a second source to derive from.
 - Review the small exact-label club strings (Roma, Napoli, Torino, Genoa, Sampdoria, Lazio, Sevilla, Bologna, Atalanta, Udinese, Parma) against a second source, and exclude any that are youth sides.
 - When one label is confirmed by records and the other goes to the model, tell the model which criterion is already confirmed. The Olise, Álvarez and Jackson refusals were the model denying a club the tables hold.
 - A second citizenship source, for dual nationals (Mariano Díaz is stored as Dominican Republic and was capped by Spain).

RISKS
 - More model load. These all go to the model now: club misses (64 distinct cached refusals in 62 days), the World Cup D and E bands (34 rows in 33 days), the 25 labels v23 sent to the nationality matcher, club x club cells whose rows fail the one-person test, and nationality cases on shared citizenship. The free allowance runs out mid-day (7 day-limit lines in 24h, the first at 15:59Z).
 - The exhausted lockout. After the allowance is spent, each of those guesses returns exhausted. The hook then sets checkingDown and the page replaces the input for the rest of the session, including on cells records could still settle. In v23 a club miss was a counted wrong guess and play continued. The player pays no guess, but loses the board for the day. Easy boards are hit hardest; they took 9 of 409 correct picks since 08-30.
 - Event and trivia labels that used to refuse everyone (Scored in the Milan derby, Missed a penalty at a World Cup, Played under Pep Guardiola and others: 29 slots on 17 boards) are now judged and cached by the model. The cached qwerty uiop confirmation shows the name guard can be passed by an echo.
 - Reserve and youth sides stop confirming from records: 205 names sit at the Castilla, Atlètic, Porto B, Benfica B, Bayern II and Sevilla Atlético strings that v23 accepted. The model decides them instead. Short exact-label strings (Roma, Napoli and others, 21 names) may still be youth rows and still confirm until reviewed.
 - Coverage gaps from deriving without hand aliases: Grêmio reaches 1 name from records (166 unreachable); Santos and the Inter part of the compound go to the model; any new board label with no world_cup_players or puzzle-table evidence resolves to nothing. Section 3's ratchet is the only net.
 - The one-person test needs player_market_values birth years. 1,916 stint rows have none, including the manually added Luis Suárez rows (covered by person_key only where both rows carry it). Pairs on those rows go to the model. A tolerance of 2 years can still merge namesakes born within 2 years of each other (754 names have a spread of exactly 2).
 - A nationality NO is honest only about the man the name resolves to. A mononym can resolve to a lesser namesake (stints 'mariano' is a Brazilian right-back; 'eusebio' a Portuguese left-back; 'bebeto' a Brazilian right-back). Dual nationals stored under one citizenship get a hard NO on the other. The stints read is limited to 60 rows, so a name with more rows (juninho) can hide a second nationality.
 - The World Cup F band trusts world_cup_players' one short name per member. A winner typed by a different common name ("Paulo Cesar" for Caju, "Dada Maravilha" for Dario, 1970) is refused and cached.
 - The cache is read before the records pass. Every verdict the purge targets keeps being served until step 4 runs. A v23 worker still warm after the read-back can write rows after the export; the straggler sweep exists for that.
 - The replay reads stints, squads and player_market_values at replay time. A table import between replay and delete changes the list. The DO block raises and rolls back on a count mismatch, and the builder must then redo steps 1 to 3.
 - The near band is wide on purpose. It sends some correct refusals to the model (Carlos Alberto x 2002, Roberto Baggio x 2002, Inesta x 2006, Andrea Pirlo x 2010 in today's cache). That costs allowance, not correctness. A narrower band would bring back hard refusals of misspellings.
 - Section 4's loose control may not fire. If loosening the co-occurrence thresholds admits no impostor, the thresholds are not what protects the map, and the section has to go rather than stay green for the wrong reason.
 - The co-occurrence window counts the previous season's club. For small spellings (Inter Miami CF 3/7, São Paulo 5/7, Corinthians 4/11), a table update after the 2026 transfer window can move a share across 0.3. genSoccerGridIds --check shows the change, but only when someone runs it and reads the diff.
 - The generated block lives inside index.ts. Any regeneration changes the deployed-file hash and turns simEdgeSync red until a redeploy (intended). A hand edit of the block is caught only by genSoccerGridIds --check.
 - simAnswerFromRecords and simConnect4ClubRecords drive production, so a red there during this round can be live state rather than the branch.
 - WC_WINNER_BY_YEAR and SHARED_CITIZENSHIP stay typed tables, because no table in the database holds tournament winners in a usable column or citizenship law.

OWNER DECISIONS
 - Money: whether to pay for a Gemini allowance for the grid validators. After Round 613 the model judges every club miss, every near-miss World Cup name, club x club cells it cannot tie to one person, and 25 labels that used to be refused outright. The free daily allowance already runs out mid-day (7 day-limit refusals in the 24h to 2026-09-15, the first at 15:59Z). After that, those guesses return 'come back tomorrow' at no cost to the player, and the page stops taking answers for the rest of that session. Nothing in Round 613 depends on this decision.