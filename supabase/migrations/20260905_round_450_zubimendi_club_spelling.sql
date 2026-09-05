-- Round 450 (2026-09-05): one 2026 row spelt Arsenal as 'Arsenal' while the other 24 say 'Arsenal FC'.
-- Martin Zubimendi is the 42nd most valuable player in the pool Player Bingo and Sign the Player
-- draw, and the short spelling is the Round 315 trap (a club to league lookup that misses on the
-- short name). Found while checking every pool row for this round's transfer pass; not a transfer.
update public.player_market_values set club = 'Arsenal FC' where year = 2026 and player_name = 'Martín Zubimendi' and club = 'Arsenal';
