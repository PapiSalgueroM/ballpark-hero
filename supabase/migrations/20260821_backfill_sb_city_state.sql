-- APPLIED live on 2026-08-21 (Round 248). Idempotent: only null cities
-- are touched, so a re-run changes nothing.
--
-- Fills the all-null super_bowls city column and adds state so the pair
-- renders as a proper almanac line ("Glendale, AZ" cannot be confused
-- with Glendale, California). Venue-keyed: every era stadium name in
-- this table sits in exactly one host city, verified against Pro
-- Football Reference's Super Bowl index plus a per-game knowledge
-- sweep, with per-article checks where sources disagreed.
--
-- Two disputes settled before writing anything:
--   Stanford Stadium (XIX): PFR says Palo Alto, Wikipedia's game article
--   and infobox both say Stanford, California, and the stadium's own
--   postal designation is Stanford CA. Stanford wins 2 to 1.
--   Allegiant Stadium (LVIII): Wikipedia says Paradise (unincorporated),
--   PFR and the stadium's own address say Las Vegas. Rule applied across
--   the whole table: the incorporated city containing the venue at game
--   time, or the venue's contemporary postal city where unincorporated.
--   That yields Las Vegas here, Stanford above, and keeps East
--   Rutherford (a real borough) as itself.
--
-- Era accuracy carries into the municipality: the Miami Gardens site was
-- unincorporated Dade County with a Miami postal address until the city
-- incorporated in 2003, so Joe Robbie and Pro Player games (1989, 1995,
-- 1999) file under Miami and the Dolphin, Sun Life and Hard Rock games
-- (2007 on) under Miami Gardens. No venue NAME spans the 2003 line, so
-- keying on venue is exact.
--
-- Verified after applying: 60 of 60 rows carry city and state, no city
-- contains a venue word or a digit, every state is two capitals, and
-- the grouped counts match the known hosting history (New Orleans 11,
-- Miami 8 through 1999, Miami Gardens 3 from 2007, Pasadena 5).

ALTER TABLE super_bowls ADD COLUMN IF NOT EXISTS state text;

UPDATE super_bowls sb
SET city = v.city, state = v.st
FROM (VALUES
  ('Los Angeles Memorial Coliseum', 'Los Angeles', 'CA'),
  ('Miami Orange Bowl', 'Miami', 'FL'),
  ('Tulane Stadium', 'New Orleans', 'LA'),
  ('Rice Stadium', 'Houston', 'TX'),
  ('Rose Bowl', 'Pasadena', 'CA'),
  ('Louisiana Superdome', 'New Orleans', 'LA'),
  ('Pontiac Silverdome', 'Pontiac', 'MI'),
  ('Tampa Stadium', 'Tampa', 'FL'),
  ('Stanford Stadium', 'Stanford', 'CA'),
  ('San Diego-Jack Murphy Stadium', 'San Diego', 'CA'),
  ('Joe Robbie Stadium', 'Miami', 'FL'),
  ('Metrodome', 'Minneapolis', 'MN'),
  ('Georgia Dome', 'Atlanta', 'GA'),
  ('Sun Devil Stadium', 'Tempe', 'AZ'),
  ('Qualcomm Stadium', 'San Diego', 'CA'),
  ('Pro Player Stadium', 'Miami', 'FL'),
  ('Raymond James Stadium', 'Tampa', 'FL'),
  ('Reliant Stadium', 'Houston', 'TX'),
  ('Alltel Stadium', 'Jacksonville', 'FL'),
  ('Ford Field', 'Detroit', 'MI'),
  ('Dolphin Stadium', 'Miami Gardens', 'FL'),
  ('University of Phoenix Stadium', 'Glendale', 'AZ'),
  ('Sun Life Stadium', 'Miami Gardens', 'FL'),
  ('Cowboys Stadium', 'Arlington', 'TX'),
  ('Lucas Oil Stadium', 'Indianapolis', 'IN'),
  ('Mercedes-Benz Superdome', 'New Orleans', 'LA'),
  ('MetLife Stadium', 'East Rutherford', 'NJ'),
  ('Levi''s Stadium', 'Santa Clara', 'CA'),
  ('NRG Stadium', 'Houston', 'TX'),
  ('U.S. Bank Stadium', 'Minneapolis', 'MN'),
  ('Mercedes-Benz Stadium', 'Atlanta', 'GA'),
  ('Hard Rock Stadium', 'Miami Gardens', 'FL'),
  ('SoFi Stadium', 'Inglewood', 'CA'),
  ('State Farm Stadium', 'Glendale', 'AZ'),
  ('Allegiant Stadium', 'Las Vegas', 'NV'),
  ('Caesars Superdome', 'New Orleans', 'LA')
) AS v(venue, city, st)
WHERE sb.venue = v.venue AND sb.city IS NULL;
