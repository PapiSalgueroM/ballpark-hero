-- Round 492: a second division club stops being told it is in the top division.
-- APPLIED 2026-09-06.
--
-- Guess The Football Club shows `league_hint` verbatim as its second clue. For
-- 36 of the 364 puzzles that clue was factually wrong: the club plays in a
-- SECOND division and the clue said "Compete in the top division in X".
-- Measured 2026-09-06:
--   Championship    24 puzzles, England's second tier
--   2. Bundesliga    7 puzzles, Germany's second tier
--   Serie B          4 puzzles, Italy's second tier
--   J2 League        1 puzzle,  Japan's second tier
-- A player narrowing down on that clue is being sent the wrong way by the game,
-- and the row itself already carried the right answer in its `league` column.
--
-- AND FOUR PUZZLES SHOWED A SQL ESCAPE TO THE PLAYER. The stored strings
-- "Compete in Germany''s second division" and "Compete in Spain''s second
-- division" contained TWO apostrophes: 37 and 35 characters where the correct
-- text is 36 and 34. A doubled apostrophe is how a literal is escaped inside
-- SQL, and it was written into the data rather than consumed by the parser.
--
-- Both are fixed the same way, by normalising every second division hint to the
-- one phrasing that was already correct and has no apostrophe in it (Ligue 2's:
-- "Compete in the second division in France"). That leaves one shape for the
-- tier instead of three.
--
-- The six leagues below are second tiers and the list is deliberately explicit
-- rather than inferred from a name: "Serie B" is a second division and "Serie A"
-- is not, but "First League" is a top flight in Bulgaria while "Primera B" is
-- not in Chile. Guessing from the name is how this kind of error is created
-- rather than caught.
--
-- Verified after: 43 puzzles across the six leagues, 0 still claiming a top
-- division, 0 doubled apostrophes anywhere in the table, one phrasing each.
-- Fence: scripts/simGuessSoccerClubHints.mjs, controls topdivision and escapes.
update public.soccer_club_puzzles
   set league_hint = case league
     when 'Championship'     then 'Compete in the second division in England'
     when '2. Bundesliga'    then 'Compete in the second division in Germany'
     when 'Serie B'          then 'Compete in the second division in Italy'
     when 'J2 League'        then 'Compete in the second division in Japan'
     when 'Ligue 2'          then 'Compete in the second division in France'
     when 'Segunda División' then 'Compete in the second division in Spain'
     else league_hint
   end
 where league in ('Championship', '2. Bundesliga', 'Serie B', 'J2 League', 'Ligue 2', 'Segunda División');
