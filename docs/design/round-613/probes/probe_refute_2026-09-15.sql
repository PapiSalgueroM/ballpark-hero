-- READ ONLY refutation probes for the Round 613 contract draft (2026-09-15). SELECT only.
-- No edge function invoked. Readings next to each query. Node probe: probe_wc_bands.mjs (same folder).

-- A. Club x club cells on the boards (the draft's same-row pairing would never confirm them).
--    Reading: 6,390 cells; 713 club x club on 208 boards; 1,707 club x position.
--    Cached records YES on club x club: 5 of 361. Correct picks since 08-30 on club x club cells: 1 of 410.

-- B. debut_year and debut_age are per name, not per row: 46 of 27,803 names carry more than one pair.
--    'pedro' rows all carry debut 2008 age 23 (born 1985) while player_market_values ages give
--    Sporting Gijon 1985, Barcelona/Chelsea/Roma/Lazio 1988, Fluminense/Flamengo 1998, Corinthians/Zenit 2007.
--    Rodri: Barcelona 2006 born 1985, Betis/Cartagena 1987, Huesca 1977, Villarreal/Atletico/Man City 1997.
--    Koke: Marseille/Sporting/Aris born 1984, Atletico 1993.
--    Birth-year spread per name_folded in player_market_values: 0 = 26,382; 1 = 123; 2 = 754; 3 = 85; 4-6 = 82; >6 = 378.
--    Stints rows with a player_market_values birth year (same name_folded, club or split part, year in span): 78,670 of 80,586.

-- C. Nationality strings whose holders are citizens of a labelled country (a hard NO would be wrong):
--    Martinique 34, Guadeloupe 23, French Guiana 9, New Caledonia 3, Saint-Martin 1, Tahiti 1, Reunion 1 (France);
--    Curacao 34, Aruba 2 (Netherlands); Faroe Islands 11 (Denmark); Puerto Rico 2, Guam 1, American Virgin Islands 1
--    (United States); Gibraltar 1, Jersey 1; Northern Ireland 68 (Irish citizenship entitlement).
--    Samples: Aurelien Capoue, Andreaw Gravillon (Guadeloupe); Angelo Fulgini (New Caledonia); Jean-Claude Darcheville
--    (French Guiana); Armando Obispo (Curacao); Danny Higginbotham (Gibraltar).

-- D. world_cup_players (2006+) joined to single-nationality stints names on the folded name: 3,801 joins,
--    345 differ in the raw player_name (accents, hyphens): Carlos Tevez / Carlos Tévez, Théo Hernandez / Theo Hernández,
--    Vinícius Júnior / Vinicius Junior, Hans-Jörg Butt / Hans Jörg Butt.

-- E. Exact label strings with few names: Roma 4, Napoli 3, Torino 3, Genoa 3, Sampdoria 2, Lazio 2, Sevilla 2,
--    Bologna 1, Atalanta 1, Udinese 1, Parma 1 (mostly Second Striker, age 16-19, one season);
--    Barcelona, Liverpool, Ajax, Atlético Madrid, Grêmio, Inter Miami: one Luis Suarez row each (person_key 'luis suarez 1987').

-- F. Co-occurrence window. Stints year is the season end year (Messi PSG first_year 2022, Haaland Man City 2023).
--    Draft window [year-1, year]: lowest accepted share 0.36 (Corinthians 4/11); highest rejected with n>=2: Santos 2/4.
--    Season-aligned window (2022 uses 2023): lowest accepted 0.67; loses Corinthians and Al-Ittihad (n<3).

-- G. Cache (game soccer-grid) today: 642 rows, 0 with a rule marker. Records club refusals 64; refusals on other
--    records-routed labels 7 (Dutch, German, Over 100 International Caps; 4 of them caps).
--    AI refusals the tables contradict, not in the draft purge:
--      'nicholas jackson|played for bayern munich|forward (fwd)': stints Nicolas Jackson Bayern Munich 2026 Centre-Forward;
--        world_cup_players 2026 Senegal club Bayern Munich.
--      'acheampong|played for chelsea|defender (def)': stints and player_market_values Josh Acheampong Chelsea FC 2025-2026 Right-Back.
--    Pre-Round 501 name-guard refusal cached as a hard NO: 'vard|played for leicester city|played in premier league'
--      (reason 'That name did not match a player we could verify.', no unverified flag).

-- H. ai_validation_cache primary key (game, cache_key). Hook: src/hooks/useSoccerGrid.ts lines 316-331 (unverified is
--    not counted; exhausted sets checkingDown) and src/pages/SoccerGrid.tsx line 216 (checkingDown replaces the input).
