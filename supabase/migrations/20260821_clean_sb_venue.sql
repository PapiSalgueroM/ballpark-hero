-- APPLIED live on 2026-08-21 (Round 247). Safe to re-run: the pattern
-- matches nothing once stripped.
--
-- Why: the super_bowls venue column is era-accurate all the way back
-- (Tulane Stadium for IX, Stanford Stadium for XIX, Cowboys Stadium for
-- XLV before the rename) but the scrape carried Wikipedia's
-- times-hosted annotation inside the name: "Rose Bowl (5)",
-- "Levi's Stadium (2)". The count is context that belongs to a list the
-- site does not keep, not part of any venue's name, so it goes. No
-- facts change; 60 era-correct venue names remain.
--
-- The Record Books Super Bowl section gains the Venue column in the
-- same round; simRecords pins it complete and adds a permanent guard
-- that no rendered cell ends in a bare parenthesised count.

BEGIN;

UPDATE super_bowls
SET venue = regexp_replace(venue, ' \(\d+\)$', '')
WHERE venue ~ ' \(\d+\)$';

-- The moment the column joined the rendered set, the harness's long-dash
-- fence caught one more piece of Wikipedia typography: the 1988 venue
-- stored as San Diego(en dash)Jack Murphy Stadium. The site never ships
-- long dashes, and the plain hyphen is a standard rendering of that
-- stadium's name, so it is normalized here (chr() spells the characters
-- to keep them out of this repo).
UPDATE super_bowls
SET venue = replace(replace(venue, chr(8211), '-'), chr(8212), '-')
WHERE venue LIKE '%' || chr(8211) || '%' OR venue LIKE '%' || chr(8212) || '%';

COMMIT;
