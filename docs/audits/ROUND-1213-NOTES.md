# Round 1213 notes: Club Manager, the real 2026/27 fixture lists of more leagues (the data)

Branch `r1213-cm-fixture-data`, based on `origin/main` at `074a9054`. Written by the builder as it goes, so a
later session can finish from here. Nothing in this round is imported by the game: no screen changes.

## What this round is, and is not

It is the DATA round of a three round split. It adds a tool, committed source parsers, one ledger file and one
receipt a league, a pure data harness and a frozen digest file. The round that binds the ledgers to the engine
(the registry, the lazy loaders, Help, What's New, the browser walk) comes after Release AT is live. A third
round takes the harder leagues.

## How a league is added (the whole procedure)

1. Its entry in `scripts/lib/cmFixtureSources/leagues.mjs`: the game's league id, two sources on two hosts, the
   committed parser for each, and an explicit name table a source (source spelling to game spelling, exact).
2. `node scripts/genCmLeagueFixtures.mjs fetch <leagueId>` saves both sources as raw bytes OUTSIDE the repo, in
   `C:/Users/antho/dukb-handoff/2026-10-10/cm-fixtures-raw/<leagueId>/` (or `CM_FIXTURE_RAW`). One plain GET with
   an honest User-Agent. A snapshot is never overwritten.
3. `node scripts/genCmLeagueFixtures.mjs rows <leagueId>` prints counts and club spellings (never a list), which
   is how the name table gets filled.
4. `node scripts/genCmLeagueFixtures.mjs write <leagueId>` runs the whole proof and writes
   `src/data/clubManager<League>Fixtures2026.ts`, `scripts/data/clubManager<League>Fixtures2026.receipt.json` and
   the league's line in `scripts/data/cmLeagueFixtures.frozen.json`. It writes nothing on any doubt.
5. `node scripts/simCmLeagueFixtures.mjs` on a runner, plus the rule fences, then one commit for that league.

A reviewer's independent recheck: fetch again into a NEW folder and compare with the committed ledger:
`node scripts/genCmLeagueFixtures.mjs fetch <leagueId> --dir <new folder>` then
`node scripts/genCmLeagueFixtures.mjs check <leagueId> --dir <new folder>`. It prints the matchdays compared and
the tuple differences, exits 0 only on zero, and writes nothing. The receipt's `recheck` field is null until a
reviewer has done this; whoever does it records `{ on, by, rounds compared, differences }` there.

## What must not be trusted

- A count or a fixture quoted in the brief from a summarising reader. Only rows parsed from kept bytes count.
- A snapshot hash can not be reproduced from the web later: the pages change every week (scores, moved dates).
  It can be reproduced from the kept bytes, which is why they are kept.
- Section E of the harness is a drift guard (ledger equals receipt). The truth check is the tool's: two sources,
  two different committed parsers, every tuple equal.

## Design choices a later round must know

- The data files are written with UNQUOTED keys (`url: "https://..."`), because `scripts/simLiveScores.mjs`
  accepts a publisher's address in the browser bundle only in that shape. The fence was not touched.
- The frozen digest covers `key, leagueId, seasonStartYear, clubs, rounds` only. The `sources` of a ledger can be
  repaired without a new key.
- A receipt source's `kind` says what the source is (league, federation, press, broadcaster, compiled feed).
  Nothing looks a source up by its kind.
- Matchday numbers are those of the list as first published. A match moved to another date keeps its matchday.
- The order of matches inside a matchday is the order of the source the receipt names in `orderSource`.
- The harness finds ledgers by listing `src/data/clubManager*Fixtures2026.ts`. When Release AT brings the Premier
  League's file to main it will be listed as PENDING (no frozen line) and held to sections A to G. The binding
  round freezes its line.

## Leagues

(one entry a league as it lands: in or out, sources, snapshot hashes, sizes, the runner result that proved it)

- **laliga: IN.** 20 clubs, 38 matchdays, 380 fixtures. Sources: Fixture Download's JSON feed
  (`https://fixturedownload.com/feed/json/la-liga-2026`, 83,963 bytes, sha256 `bc918a15c644...`, parser
  `feedJson`) and Maxifoot's season stamped calendar page
  (`https://www.maxifoot.fr/calendrier-liga-espagne-2026-2027.htm`, 152,716 bytes, sha256 `e5827f0ec107...`,
  parser `maxifoot`). Both read 2026-10-10. Zero tuple differences in 380. Name table: 15 lines for the feed
  (it prints the league's formal names: "R. Racing Club" is Racing Santander, "RC Deportivo" is Deportivo La
  Coruña), 10 for Maxifoot (French spellings: "La Corogne", "FC Seville", "Betis Séville"). Data file
  `src/data/clubManagerLaLigaFixtures2026.ts` 13,233 bytes; receipt 80,064 bytes. For the binding round: the
  game's club names are the row in `REAL_LEAGUES`, nothing differs.
- **ligue1: OUT of this round (held), not a source disagreement but a list that is not whole.** Both sources
  were fetched and parsed (Maxifoot `calendrier-ligue-1-france-2026-2027.htm`, 131,148 bytes, sha256
  `d84909200e43...`; the feed `ligue-1-2026`, 68,393 bytes, sha256 `625cb36e45cc...`): 306 rows each, 34
  matchdays of 9, 18 clubs that map onto the game's row, and the two agree on every tuple. But BOTH print
  Rennes at home to PSG twice, in matchday 1 (Maxifoot line 1143, feed match 7) and in matchday 23 (Maxifoot
  line 1362, feed match 205), and PSG at home to Rennes never. So one of the two matches changed ground after
  the list was published and the pages show the list as it stands today, not as first published. The tool
  refuses it (an ordered pair missing, one repeated) and nothing was patched. What a later round needs: a source
  of the list as first published (the league's own release of June 2026) to say which meeting was in Paris. The
  name tables are checked and stay in `leagues.mjs`.
- **ligue2: IN.** 18 clubs, 34 matchdays, 306 fixtures. Sources: Maxifoot
  (`https://www.maxifoot.fr/calendrier-ligue-2-france-2026-2027.htm`, 104,183 bytes, sha256 `b47ad1e27180...`)
  and the feed (`https://fixturedownload.com/feed/json/ligue-2-2026`, 69,651 bytes, sha256 `faa579116111...`).
  Both read 2026-10-10. Zero tuple differences in 306. Name table: 5 lines for Maxifoot, 17 for the feed. Data
  file `src/data/clubManagerLigue2Fixtures2026.ts` 8,979 bytes; receipt 64,330 bytes. The game spells the club
  `Red Star FC` and `Saint-Étienne`.
- **eredivisie: IN.** 18 clubs, 34 matchdays, 306 fixtures. Sources: the feed
  (`https://fixturedownload.com/feed/json/eredivisie-2026`, 66,365 bytes, sha256 `968d871b6c4f...`) and Maxifoot
  (`https://www.maxifoot.fr/calendrier-pays-bas-2026-2027.htm`, the season stamped address, 110,826 bytes, sha256
  `46a0df585d9d...`). Both read 2026-10-10. Zero tuple differences in 306. Name table: 8 lines for the feed, 12
  for Maxifoot. Data file `src/data/clubManagerEredivisieFixtures2026.ts` 10,465 bytes; receipt 64,512 bytes.
- **primeira: IN.** 18 clubs, 34 matchdays, 306 fixtures. Sources: the feed
  (`https://fixturedownload.com/feed/json/primeira-liga-2026`, 70,041 bytes, sha256 `85df04dc94b1...`) and
  Maxifoot (`https://www.maxifoot.fr/calendrier-portugal-2026-2027.htm`, 108,804 bytes, sha256
  `a2278a6ba8f0...`). Both read 2026-10-10. Zero tuple differences in 306. Name table: 15 lines for the feed, 10
  for Maxifoot. The feed prints the promoted club as plain "Académico"; Maxifoot prints "Academico Viseu"; both
  land on the game's `Académico de Viseu` and the two lists then agree on all 34 of its rows, which is what
  checks that line. "Sporting Lisbo." is `Sporting CP` and "Sporting Braga" is `Braga`. Data file
  `src/data/clubManagerPrimeiraFixtures2026.ts` 10,638 bytes; receipt 64,893 bytes.
- **seriea: IN.** 20 clubs, 38 matchdays, 380 fixtures. Sources: TuttoMercatoWeb's release day article
  (`https://www.tuttomercatoweb.com/serie-a/serie-a-2026-2027-ecco-il-nuovo-calendario-completo-con-le-38-giornate-2241512`,
  115,093 bytes, sha256 `afc43e946402...`, parser `tuttomercatoweb`: one paragraph a matchday, Home-Away a line)
  and the feed (`https://fixturedownload.com/feed/json/serie-a-2026`, 79,172 bytes, sha256 `451786660663...`).
  Both read 2026-10-10. Zero tuple differences in 380. Name table: "Inter" and "Internazionale" are the game's
  `Inter Milan`, "Milan" is `AC Milan`. The article is the list as printed on release day, so its matchday
  numbers are the first published ones by construction. Data file `src/data/clubManagerSerieAFixtures2026.ts`
  10,652 bytes; receipt 71,745 bytes.
- **bundesliga: IN, and the lead owes a ruling before it is bound.** 18 clubs, 34 matchdays, 306 fixtures.
  Sources: the DFL's own fixture list PDF
  (`https://media.dfl.de/sites/2/2026/07/DE_s73GnueV_Bundesliga_Spielplan_2026_27.pdf`, 631,949 bytes, sha256
  `7408552a6c3b...`, parser `dflPdf` over `pdfText`: the text layer read with zlib alone, a league row is a whole
  number under Spieltag, a match number, Heim and Gast, and the match numbers kept must run 1 to 306 with no
  hole) and the feed (`https://fixturedownload.com/feed/json/bundesliga-2026`, 68,680 bytes, sha256
  `f47773844254...`). Both read 2026-10-10. Zero tuple differences in 306. The same 15 line name table serves
  both: the feed prints the league's formal names. The PDF address carries a random token, so the ledger SHIPS
  the league page that links it,
  `https://www.bundesliga.com/de/bundesliga/news/spielplan-saison-start-termine-daten-2026-27-22043`: its bytes
  (599,821, sha256 `3cae76538785...`, kept beside the snapshots as `cited-bundesliga-com-de.html`) hold both PDF
  file names. The English page `.../en/bundesliga/news/2026-27-fixture-lists-now-available-38068` links other
  files and was not used. Data file `src/data/clubManagerBundesligaFixtures2026.ts` 11,160 bytes; receipt 71,257
  bytes. OWED BY THE LEAD: every page of the PDF prints that all rights to the fixture list lie with the
  league body. The ledger holds matchday, home club and away club only, with the source linked, the same class
  of fact as the Premier League list in Release AT; `docs/LEGAL_REVIEW.md` has no entry on fixture lists yet.
- **superlig: IN.** 18 clubs, 34 matchdays, 306 fixtures. Sources: the Turkish federation's own fixture page
  (`https://www.tff.org/default.aspx?pageID=198`, 336,663 bytes, sha256 `7ce787598690...`, parser `tff`, decoded
  by its declared charset windows-1254) and the feed (`https://fixturedownload.com/feed/json/super-lig-2026`,
  67,482 bytes, sha256 `d28cc553706f...`). Both read 2026-10-10. Zero tuple differences in 306. Name table: 18
  lines for the federation (it prints company and sponsor forms in capitals, "TÜMOSAN KONYASPOR", "ÇAYKUR
  RİZESPOR A.Ş.", "AMED SPORTİF FAALİYETLER"), 7 for the feed (it drops Turkish letters: "Besiktas",
  "Kasimpasa"). FOR THE BINDING ROUND: the federation's address is a ROLLING page (no season in it; no season
  stamped address is known), so next summer it will show another season. The receipt records the day read, and
  the ledger's sources are outside the frozen digest so the link can be mended. Data file
  `src/data/clubManagerSuperLigFixtures2026.ts` 11,032 bytes; receipt 69,057 bytes.
- **bundesliga2: IN, under the same owed ruling as the Bundesliga.** 18 clubs, 34 matchdays, 306 fixtures.
  Sources: the DFL's own PDF (`https://media.dfl.de/sites/2/2026/07/DE_mgKX2qjj_2.-Bundesliga_Spielplan_2026_27.pdf`,
  637,177 bytes, sha256 `06287b32026d...`, parser `dflPdf`; the ledger ships the same league page as the
  Bundesliga's, which links this PDF too) and hessenschau.de, the public broadcaster Hessischer Rundfunk, ONE
  PAGE A MATCHDAY (`https://www.hessenschau.de/sport/ergebnisse-tabellen/fussball-2bl100~_matchday-1.html` to
  `...matchday-34.html`, 34 files, 9,981,937 bytes in all, each with its own hash in the receipt and one hash (`e211fb8c9bb9...`)
  over the 34; parser `hessenschau`, which reads the full club name from the title attribute and refuses a page
  that does not itself state "Fußball 2. Bundesliga 2026/2027" and the matchday its address asks for, because
  those addresses are ROLLING ones). All read 2026-10-10. Zero tuple differences in 306. Name table: 15 lines
  for the DFL ("VfL Bochum 1848", "1. FC Heidenheim 1846"), 14 for hessenschau ("Hertha BSC Berlin"). Data file
  `src/data/clubManagerBundesliga2Fixtures2026.ts` 11,607 bytes; receipt 86,872 bytes.
  A FINDING ABOUT THE PDF PARSER, kept because it shows the self check working: the first draft took the club
  columns from the heading row, and on page 1 of THIS list the label "Heim" sits 51 points right of the home
  clubs, so matchdays 1 and 2 (18 rows) were skipped. The parser refused its own output (`the match numbers are
  not 1 to 288 without a hole`). It now takes the two column starts from the rows themselves, and the
  Bundesliga's ledger was rebuilt with it byte for byte the same (`check bundesliga`: 34 matchdays compared, 0
  tuple differences, digest equal; `write bundesliga`: no diff).
- **proleague: OUT of this round (held), one source is one row short.** Both sources were fetched and parsed.
  Maxifoot (`https://www.maxifoot.fr/calendrier-belgique-2026-2027.htm`, 109,946 bytes, sha256
  `54e47a7245e1...`): 306 rows, 34 matchdays of 9, 18 clubs that map onto the game's row, a whole double round
  robin. Walfoot (`https://www.walfoot.be/belgique/jupiler-pro-league/calendrier`, a rolling address, 374,773
  bytes, sha256 `bb7c961fcfed...`, parser `walfoot`): 305 league rows. Its matchday 30 has eight rows; the
  ninth, **Club Brugge v Union Saint-Gilloise**, is not in its table at all (the page's prose mentions the game
  and a provisional date, which is not a row). The tool's verdict, in full: `walfoot: matchday 30 holds 8
  matches and 16 different clubs, wanted 9 and 18`; `1 ordered pair(s) of clubs never meet`; `the two sources
  differ in 1 tuple: only in maxifoot: 30|Club Brugge|Union Saint-Gilloise`. So the other 305 tuples are equal
  in both, and nothing was filled in. What a later round needs: a second WHOLE source (the league's own page
  through a browser on a runner, or Walfoot once it shows the row). Things the parser had to learn about that
  page, all stated in `walfoot.mjs`: matchday 13's links are written `journee-13-`; the Supercup is a row of
  the same table with a `supercoupe` link and is passed over; two clubs have two slugs each (`la-louvire` for
  La Louvière in match links, `waasland-beveren` for Beveren).

## Runner results

(name, commit, what ran, exit codes)
