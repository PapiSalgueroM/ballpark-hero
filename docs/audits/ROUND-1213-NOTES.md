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
reviewer has done this. It is never typed: `check <leagueId> --dir <new folder> --record "<who read it>"` writes
it, only from a second read (not the folder the receipt was written from) and only with no difference: who, the
day, the matchdays compared, and the read moment, byte count and hash of each source's fresh bytes. A later
`write` that leaves the list as it was keeps it. All nine receipts hold one since the fix round (see the end).

On a machine that does not have the owner's snapshot folder (any Linux session) every command of the tool stops
and asks for `--dir <folder>` or `CM_FIXTURE_RAW`: it never makes a folder inside the repo.

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
- Matchday numbers are the league's own, as both sources label or count them. A match moved to another date
  keeps its matchday. Whether a ledger is the list as first published or the list as it stood on the day read
  is decided a league and written in its receipt: four are the first, five the second (the section below).
- The order of matches inside a matchday is the order of the source the receipt names in `orderSource`.
- The harness finds ledgers by listing `src/data/clubManager*Fixtures2026.ts`. When Release AT brings the Premier
  League's file to main it will be listed as PENDING (no frozen line) and held to sections A to G. The binding
  round freezes its line. That is the ONLY ledger that may be pending: the harness names its key
  (`PRE_TOOL_KEYS`), because Round 1184 wrote it by hand before the tool existed. Every other ledger is the
  tool's, and one of those with no frozen line is red (the line was lost).
- A receipt source says when its bytes were read (`readOn`, `readAtUtc`, and `firstPageReadAtUtc` for a source
  of many pages), and, where its bytes carry them, when it was published or created and last changed
  (`published`, `created`, `modified`) and the day its list came out (`released`, with `releasedBasis`).

## Leagues

(one entry a league as it lands: in or out, sources, snapshot hashes, sizes, the runner result that proved it)

- **laliga: IN.** 20 clubs, 38 matchdays, 380 fixtures. Sources: Fixture Download's JSON feed
  (`https://fixturedownload.com/feed/json/la-liga-2026`, 83,963 bytes, sha256 `bc918a15c644...`, parser
  `feedJson`) and Maxifoot's season stamped calendar page
  (`https://www.maxifoot.fr/calendrier-liga-espagne-2026-2027.htm`, 152,716 bytes, sha256 `e5827f0ec107...`,
  parser `maxifoot`). Both read 2026-10-10. Zero tuple differences in 380. Name table: 15 lines for the feed
  (it prints the league's formal names: "R. Racing Club" is Racing Santander, "RC Deportivo" is Deportivo La
  Coruña), 10 for Maxifoot (French spellings: "La Corogne", "FC Seville", "Betis Séville"). Data file
  `src/data/clubManagerLaLigaFixtures2026.ts` 13,260 bytes; receipt 80,333 bytes. For the binding round: the
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
  file `src/data/clubManagerLigue2Fixtures2026.ts` 9,006 bytes; receipt 64,599 bytes. The game spells the club
  `Red Star FC` and `Saint-Étienne`.
- **eredivisie: IN.** 18 clubs, 34 matchdays, 306 fixtures. Sources: the feed
  (`https://fixturedownload.com/feed/json/eredivisie-2026`, 66,365 bytes, sha256 `968d871b6c4f...`) and Maxifoot
  (`https://www.maxifoot.fr/calendrier-pays-bas-2026-2027.htm`, the season stamped address, 110,826 bytes, sha256
  `46a0df585d9d...`). Both read 2026-10-10. Zero tuple differences in 306. Name table: 8 lines for the feed, 12
  for Maxifoot. Data file `src/data/clubManagerEredivisieFixtures2026.ts` 10,492 bytes; receipt 64,781 bytes.
- **primeira: IN.** 18 clubs, 34 matchdays, 306 fixtures. Sources: the feed
  (`https://fixturedownload.com/feed/json/primeira-liga-2026`, 70,041 bytes, sha256 `85df04dc94b1...`) and
  Maxifoot (`https://www.maxifoot.fr/calendrier-portugal-2026-2027.htm`, 108,804 bytes, sha256
  `a2278a6ba8f0...`). Both read 2026-10-10. Zero tuple differences in 306. Name table: 15 lines for the feed, 10
  for Maxifoot. The feed prints the promoted club as plain "Académico"; Maxifoot prints "Academico Viseu"; both
  land on the game's `Académico de Viseu` and the two lists then agree on all 34 of its rows, which is what
  checks that line. "Sporting Lisbo." is `Sporting CP` and "Sporting Braga" is `Braga`. Data file
  `src/data/clubManagerPrimeiraFixtures2026.ts` 10,665 bytes; receipt 65,162 bytes.
- **seriea: IN.** 20 clubs, 38 matchdays, 380 fixtures. Sources: TuttoMercatoWeb's release day article
  (`https://www.tuttomercatoweb.com/serie-a/serie-a-2026-2027-ecco-il-nuovo-calendario-completo-con-le-38-giornate-2241512`,
  115,093 bytes, sha256 `afc43e946402...`, parser `tuttomercatoweb`: one paragraph a matchday, Home-Away a line)
  and the feed (`https://fixturedownload.com/feed/json/serie-a-2026`, 79,172 bytes, sha256 `451786660663...`).
  Both read 2026-10-10. Zero tuple differences in 380. Name table: "Inter" and "Internazionale" are the game's
  `Inter Milan`, "Milan" is `AC Milan`. The article is the list as printed on release day, so its matchday
  numbers are the first published ones by construction. Data file `src/data/clubManagerSerieAFixtures2026.ts`
  10,684 bytes; receipt 71,871 bytes.
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
  files and was not used. Data file `src/data/clubManagerBundesligaFixtures2026.ts` 11,192 bytes; receipt 71,371
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
  `src/data/clubManagerSuperLigFixtures2026.ts` 11,059 bytes; receipt 69,326 bytes.
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
  `src/data/clubManagerBundesliga2Fixtures2026.ts` 11,639 bytes; receipt 86,986 bytes.
  A FINDING ABOUT THE PDF PARSER, kept because it shows the self check working: the first draft took the club
  columns from the heading row, and on page 1 of THIS list the label "Heim" sits 51 points right of the home
  clubs, so matchdays 1 and 2 (18 rows) were skipped. The parser refused its own output (`the match numbers are
  not 1 to 288 without a hole`). It now takes the two column starts from the rows themselves, and the
  Bundesliga's ledger was rebuilt with it byte for byte the same (`check bundesliga`: 34 matchdays compared, 0
  tuple differences, digest equal; `write bundesliga`: no diff).
- **championship: IN, and no longer the least verified.** 24 clubs, 46 matchdays, 552 fixtures. Sources: ESPN's
  release day article (`https://www.espn.com/soccer/story/_/id/49173379/efl-championship-fixtures-schedule-2026-27-full`,
  164,365 bytes, sha256 `cdfa77885a46...`, published 2026-06-25 by the page's own stamp, parser `espnByDate`)
  and the feed (`https://fixturedownload.com/feed/json/championship-2026`, 122,462 bytes, sha256
  `4f834d4c924d...`). Both read 2026-10-10. The article prints NO matchday number, so its `roundBasis` is
  `ordinal`: reading it top to bottom, a match is the nth game of its home club and the nth game of its away
  club, and the parser throws if those two counts ever differ. They never do across 552 lines, and every
  counted matchday then EQUALS the feed's labelled `RoundNumber`: zero tuple differences in 552. That is the
  whole list compared tuple for tuple, not the opening game. Two things the parser had to learn, both guarded
  now: one date's paragraph sits behind an advert block (the first draft read 540 rows in 45 matchdays with no
  count disagreeing, which is exactly the silent failure counting can have), so the parser now also requires
  that the rows kept equal the number of " vs. " the article prints (552). Name table: four lines, the same for
  both sources (QPR, West Brom, West Ham, Wolves). The order of matches inside a matchday is the feed's. The
  ledger ships the article's address as `url: "https://www.espn.com/..."` and `scripts/simLiveScores.mjs`
  passes untouched. Data file `src/data/clubManagerChampionshipFixtures2026.ts` 19,769 bytes; receipt 118,398.
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

## Which lists are the list as first published, and which are the list as it stood on the day read

The brief asks that matchday numbers follow the originally published list. Whether a ledger can promise that
depends on what its sources ARE, and Ligue 1 showed why it matters: a page kept up to date shows a change of
ground made after release. So every parser says what its source family is (`listAsOf`), every receipt carries
that a source, and a receipt says "as first published" only when one of its two sources is a release day copy
(the harness holds that in section E).

Since the fix round a release day copy is borne out by the source's own bytes, not by the parser's word alone.
The tool calls a source a release day copy only when all three hold (`listAsOfFrom` in `build.mjs`): its parser
reads release day documents, the day the list came out is known, and the bytes' own last change stamp is no
later than that day. For an article the day is its own publication stamp. For the DFL's PDFs, which print none,
it is typed in the league table from the league page that links them (`released`, `releasedNote`). An article
or a document changed on a later day is written as a read day source. The harness works the same thing out
again from the parser the receipt names and the stamps the receipt recorded, so the claim cannot be made by
editing a receipt. What the kept bytes say:

| league | source | published or created | last changed | list came out |
|---|---|---|---|---|
| seriea | TuttoMercatoWeb article | 2026-06-05T19:56:07+02:00 | 2026-06-05T20:18:10+02:00 | 2026-06-05 |
| championship | ESPN article | 2026-06-25T11:00:00Z | 2026-06-25T11:00:00Z | 2026-06-25 |
| bundesliga | DFL PDF | created 2026-07-01T12:23:22+02:00 | 2026-07-02T10:14:35+02:00 | 2026-07-02 (league page stamp 2026-07-02T09:02:00Z) |
| bundesliga2 | DFL PDF | created 2026-07-01T12:20:34+02:00 | 2026-07-02T10:14:55+02:00 | 2026-07-02 (the same page) |

- **As first published (a release day copy agrees with the second source on every row):** seriea (the article
  of release day), bundesliga and bundesliga2 (the league body's PDF of release day), championship (the article
  of release day). For these four a later change of ground would have shown up as a disagreement, and there is
  none.
- **As both sources showed them on 2026-10-10 (both are kept up to date; no release day copy was read):**
  laliga, ligue2, eredivisie, primeira, superlig. Their matchday numbers are the labelled ones, and a match
  moved to another date keeps its matchday on both. What can NOT be ruled out from these two sources alone: a
  pair of clubs whose two meetings both changed ground after the list came out. The list would still be a whole
  double round robin, both pages would agree, and the ledger would hold the venues as they now stand. Each of
  the five receipts says exactly this in `roundNumbers`. A reviewer who wants "as first published" for them
  needs one release day copy a league (the league's own release document); if it differs anywhere, the ledger
  is rebuilt with `--refreeze` before it is ever bound.
- **What the read lens reviewer found about those five (2026-10-10, its report `review-read-1213.md`), for the
  lead who decides whether they are bound as they are.** No row it could put beside a release day or draw day
  source differs, about 180 rows across the five. primeira and superlig are perfectly mirrored (matchday k + 17
  is matchday k reversed) with no club three in a row at home or away; eredivisie and ligue2 have no run of
  three either; La Liga's three runs of three away games are in the list as it came out. That is evidence, not
  proof, for laliga, ligue2, eredivisie and superlig.
- **Primeira can be made "as first published" with one more parser.** RTP's draw day article prints the whole
  first half by matchday and says the second half mirrors it, and it answers a plain request:
  `https://www.rtp.pt/noticias/futebol-nacional/classico-entre-fc-porto-e-benfica-abre-os-confrontos-entre-grandes-na-i-liga_d1750966`.
  The reviewer compared five of its matchdays in full (45 of 45 rows equal). Not done in the fix round: a new
  source and parser is a data step of its own, with its own receipt. A warning for whoever does it: another
  outlet's draw day article prints matchday 17's list under a "34th matchday" heading and puts Benfica v Braga
  in matchday 15; RTP and the kept feed dates show the ledger is right (matchday 17 on 2027-01-10, Benfica v
  Braga in matchday 14).

## The count, for whoever runs the gate

Nine ledgers, all frozen, 3,148 fixtures (380 x 2, 552, 306 x 6). The gate line gives BOTH counts:
`CM_LEAGUE_FIXTURES_EXPECT=9 CM_LEAGUE_FIXTURES_EXPECT_FROZEN=9 node scripts/simCmLeagueFixtures.mjs`, and its
last line today is `9 ledger(s), 9 frozen, 0 pending, 3148 fixtures, 166 of 166 controls fired`. When Release
AT brings the Premier League's file to main the harness lists ten, nine frozen and one pending (premier),
3,528 fixtures: `CM_LEAGUE_FIXTURES_EXPECT=10 CM_LEAGUE_FIXTURES_EXPECT_FROZEN=9`. When the binding round has
frozen the Premier League's line: `EXPECT=10 EXPECT_FROZEN=10`, and the last line reads `10 ledger(s), 10
frozen, 0 pending, 3528 fixtures, 177 of 177 controls fired`. All three were run on a runner, the last two with
the round's files laid over `origin/release-at-int` (c75992f6), and are green (r1213-fix-a).

What the counts are for: the frozen file is one JSON object that every later league round edits, and a merge
that keeps one side of it drops the other side's lines without touching a ledger. Before the fix round that was
green. Now a ledger of the tool's with no frozen line is red on its own (section I), the frozen count is a
second number in the gate line, and a run that checked ledgers and ran no control at all is red.

## Sizes (bytes), for the binding round's weight decision

Source as committed (LF), minified with esbuild, minified and gzipped at level 9. Measured 2026-10-10.

| ledger | source | minified | gzip |
|---|---|---|---|
| bundesliga | 11,192 | 9,735 | 1,710 |
| bundesliga2 | 11,639 | 10,325 | 1,785 |
| championship | 19,769 | 17,664 | 2,806 |
| eredivisie | 10,492 | 8,966 | 1,710 |
| laliga | 13,260 | 11,879 | 2,040 |
| ligue2 | 9,006 | 7,557 | 1,612 |
| primeira | 10,665 | 9,488 | 1,698 |
| seriea | 10,684 | 8,979 | 1,900 |
| superlig | 11,059 | 10,865 | 1,721 |
| all nine | 107,766 | 95,458 | 16,982 |

Nothing imports these files, so no route's weight changes in this round and no budget row was touched.
Since the fix round each of the eight ledgers that reads the feed is 2 bytes shorter in source than this table
says (the cited address, see below); bundesliga2 is as measured. The table was not measured again.

## The tool refusing, seen happen

- Two real leagues: ligue1 (an ordered pair missing and one repeated, in both sources) and proleague (one
  source a row short, one tuple difference). Nothing written for either.
- A snapshot with one byte changed: `snapshot ... no longer matches the hash recorded when it was read`, exit 1.
- A snapshot with match 1's clubs swapped and its hash record rewritten to match: `the two sources differ in 2
  matchday|home|away tuple(s)`, with both rows printed, exit 1.
- A frozen line with another digest: `laliga-2026-27-v1 is frozen as ... and this read gives ...`, exit 1.
- Three parsers refused their own first drafts through their self checks, each kept in its header: `dflPdf` (a
  hole in the match numbers), `espnByDate` (fewer rows than the article prints matches), `walfoot` (a row whose
  cells and link disagree).
- The tool is deterministic here: `write bundesliga` again after the PDF parser was reworked left no diff.

## For the round that binds these ledgers

- IN, with file names: `clubManagerLaLigaFixtures2026.ts` (LALIGA_FIXTURES_2026),
  `clubManagerLigue2Fixtures2026.ts` (LIGUE2_FIXTURES_2026), `clubManagerEredivisieFixtures2026.ts`
  (EREDIVISIE_FIXTURES_2026), `clubManagerPrimeiraFixtures2026.ts` (PRIMEIRA_FIXTURES_2026),
  `clubManagerSerieAFixtures2026.ts` (SERIEA_FIXTURES_2026), `clubManagerBundesligaFixtures2026.ts`
  (BUNDESLIGA_FIXTURES_2026), `clubManagerSuperLigFixtures2026.ts` (SUPERLIG_FIXTURES_2026),
  `clubManagerBundesliga2Fixtures2026.ts` (BUNDESLIGA2_FIXTURES_2026),
  `clubManagerChampionshipFixtures2026.ts` (CHAMPIONSHIP_FIXTURES_2026). Keys are `<leagueId>-2026-27-v1`.
- Every ledger's clubs equal the league's row in `REAL_LEAGUES` on main (section D). No club is named
  differently, no league starts on another calendar: all nine are double round robins of 2 x (n - 1) matchdays,
  which is the shape the engine plays.
- Same eight fields as the Premier League's ledger, in the same order, `as const`. Two differences in form
  only: unquoted keys, and a matchday a line. A registry typed on the fields reads both.
- The `coverage` sentence is the Premier League's, word for word.
- `sources[].label` is what the Calendar line would print as link text: Fixture Download, Maxifoot,
  TuttoMercatoWeb, DFL, TFF, hessenschau, ESPN.
- Rolling addresses among the shipped links (no season in the address): the Turkish federation's page and
  hessenschau's matchday-1 page. The Maxifoot links are season stamped. The DFL link is the league's article.
- The Fixture Download link the eight feed ledgers ship is the publisher's page for a reader,
  `https://fixturedownload.com/results/<slug>`, not the feed (`/feed/json/<slug>`), which is raw JSON with
  dates and scores in it. The receipt keeps both: `url` is what was fetched, `citedUrl` is what ships, with a
  `citedNote`. Checked 2026-10-10: each page answers a plain GET with 200 and names every club its feed names.
  The lead may prefer another address; it is one line in `FEED()` in `leagues.mjs` and a `write` a league, and
  no digest moves (sources are outside it).
- The frozen file is the list of what is registered as data. The binding round adds the Premier League's line
  from Round 1184's untouched file and the registry section H. HOW, because the first way that comes to mind
  was a trap the run lens reviewer found: Round 1184's receipt was written by hand, in another shape, and has
  no hash of kept bytes, no read time, no release day field and no digest, and the brief forbids touching it.
  Before the fix round the harness asked every FROZEN ledger for those fields, so freezing the Premier line
  turned it red. Now the harness names that one key (`PRE_TOOL_KEYS` in `scripts/simCmLeagueFixtures.mjs`):
  the Premier ledger is held to sections A to G and I and to the eleven controls its shape can carry, pending
  or frozen, and is let off only the checks a receipt of the tool's carries. Proven on a runner with the
  round's files over `origin/release-at-int` and the Premier line added with its digest 2a0b44638bbb042c:
  exit 0, `10 ledger(s), 10 frozen, 0 pending, 3528 fixtures, 177 of 177 controls fired`, and each of the
  eleven controls fired on premier for its own sections (r1213-fix-a, labels prem-frozen and
  prem-frozen-controls). So: add the line (key, leagueId, file, receipt, clubs, rounds, fixtures, sha256 of
  `canonicalLedgerJson`), change the gate line to `EXPECT=10 EXPECT_FROZEN=10`, and touch nothing else. Never
  add a second key to `PRE_TOOL_KEYS`: a new ledger is written by the tool. (A ledger of the tool's whose key
  is put on that list is red: its receipt records a digest, which says the tool wrote it.)
- A RESIDUAL the two source proof cannot see, named by the run lens reviewer: the name tables in
  `leagues.mjs` are the one hand typed input. A table typed wrong THE SAME WAY for both sources (two clubs
  crossed in both) passes the tool and the harness on a first write: the sources still agree, the list is still
  a whole double round robin, the clubs are still the game's. Once a ledger is frozen the same mistake is
  refused (the digest differs). What covers the nine today: the reviewer read all eighteen tables by eye and
  found nothing mapped onto a wrong club, and third sources agree on matchday 1 of every league and on one
  club's whole season in most (both reviews, about 330 rows). For a NEW league in the second wave: read the
  two tables by eye against the game's row, and check one matchday against a third source, before its first
  write is committed.
- If a ledger must be corrected before it ships in a release, `write <leagueId> --refreeze` is the only way
  the tool changes a frozen line. After a key has shipped, a correction is a new key.

## Owed by the lead

- A ruling in `docs/LEGAL_REVIEW.md` on shipping fixture lists (matchday, home, away, source linked) before ANY
  ledger beyond the Premier League is registered in the game, which is how the critic's answer Q7 puts it: the
  file has no ruling on fixture lists at all, so it is owed for all nine and for the Premier League list in
  Release AT just the same. The two German leagues are the sharpest case (both PDFs print that all rights to
  the list lie with the league body), not the only one.
- DONE in the fix round: the independent recheck of each ledger. The run lens reviewer fetched both sources of
  all nine leagues afresh on 2026-10-10 (0 differences each) and the read lens reviewer did the same for eight
  on a GitHub runner; the first of those is recorded in each receipt's `recheck` by the tool.
- A gate list line: `simCmLeagueFixtures` with `CM_LEAGUE_FIXTURES_EXPECT=9 CM_LEAGUE_FIXTURES_EXPECT_FROZEN=9`.
- A decision on the five read day ledgers (laliga, ligue2, eredivisie, primeira, superlig): bind them as the
  list that stood on 2026-10-10, or first get a release day copy (Primeira's is one parser away, see above).
- ligue1 and proleague for the second wave, with what each needs (their entries above).
- No guide sentence is owed to the other lane: nothing a player sees changed.

## Runner results

Every result is on the branch `origin/rc-results/<name>`. A league's request ran the type gate, this harness,
simNoRivalNames, simLiveScores, simInventedNames, simHarnessAnchors and the harness again with the Premier
League's two files added from `origin/release-at-int`.

| name | commit | result |
|---|---|---|
| r1213-s1 | dc125f8a | tsc 0; harness 0; 11 controls each exit 1 and FIRED; unknown control exit 3; a wrong expected count exit 1; simLiveScores 0 and its citedespn control exit 1 (fired on leagueCaps.ts); the Premier League's file RED in G (its receipt rows carry a `duplicate` field), fixed in 3d99594b |
| r1213-ligue2 | 72f59a31 | 7 of 7 exit 0 |
| r1213-eredivisie | 24cbd5d1 | 7 of 7 exit 0 |
| r1213-primeira | 37c64e61 | 7 of 7 exit 0 |
| r1213-seriea | a3e5e568 | 7 of 7 exit 0 |
| r1213-bundesliga | a1bd09fc | 7 of 7 exit 0 |
| r1213-superlig | 95def69b | 7 of 7 exit 0 |
| r1213-bundesliga2 | a23c7f25 | 7 of 7 exit 0 |
| r1213-championship | 349ecfe9 | 7 of 7 exit 0 (simLiveScores green with the espn.com address in the ledger) |
| r1213-final | 92cbee41 (main merged in) | tsc 0; harness 0 with `CM_LEAGUE_FIXTURES_EXPECT=9` (3,148 fixtures, 99 of 99 controls); the suite runner runs it, 0; `CM_LEAGUE_FIXTURES_ONLY=championship` 0 and `=nosuch` 1; eleven controls on eight different leagues, each exit 1 and FIRED; simLiveScores 0, its citedespn control 1; the Championship ledger with its keys rewritten as `"url":` FAILS simLiveScores by name (exit 1), which is the proof the unquoted shape is what passes; the Premier League's files added, `EXPECT=10`, 0; simNoRivalNames, simInventedNames, simHarnessAnchors 0 |
| r1213-fences | 92cbee41, on a build | 16 rule fences exit 0. simSchemaNames and simLeaderboardCaps exit 1 because the live database is unreachable from a runner by design (nothing was checked). simWritesAreSent and simResultMoment exit 1 for want of Playwright in that request. simDailySaveHardening exit 1, see below |
| r1213-fences-b | 07233a04, on a build with Chromium, one command at a time | tsc 0; harness 0; simNoRivalNames 0; simResultMoment 0; simWritesAreSent 1 (it cannot drive a game whose data is in the live database; the same 2 failures on origin/main in r1213-base); simDailySaveHardening 1 |
| r1213-asof | 6c38fa4c | every line of r1213-final again, the same exit codes |
| r1213-base | origin/main faf0a5f3 in a second worktree | simWritesAreSent 1, the same 2 failures as on this branch; simDailySaveHardening 0 that once |
| r1213-daily | 6c38fa4c and origin/main, alternating, one command at a time | simDailySaveHardening four times each: this branch red, red, green, red; origin/main red, red, green, green. Every red run on both trees is the same two lines about /olympics (`guesses null`, first difference at 2159). The flake is on main and is Round 1210's; this round adds 37 new files, edits none, and nothing under src imports a ledger |
| r1213-fix-a | 208f651c (the fix round) | tsc 0; harness 0 with `EXPECT=9 EXPECT_FROZEN=9` (166 of 166 controls); a wrong ledger count 1, a wrong frozen count 1; the suite runner 0; each league alone 0; the nineteen controls on nine leagues, each exit 1 and FIRED; a control that does not apply exit 3; the tool without a snapshot folder exit 1 and no folder made; simLiveScores, simNoRivalNames, simInventedNames, simHarnessAnchors, simStorageWrites, simNoInventedQuotes 0; over `origin/release-at-int` (c75992f6): Premier pending 0 (`EXPECT=10 EXPECT_FROZEN=9`), a frozen count of 10 there 1, Premier alone 1 (no control ran), Premier frozen 0 (177 of 177), the eleven controls its shape carries each FIRED on premier, the type gate 0 |
| r1213-fix-b | 208f651c, one command at a time | twenty four mutations on the runner's checkout, each restored after: all exit 1 for their own reason, among them the six the run lens reviewer saw survive (a frozen line deleted, the frozen file deleted, a list rewritten with its frozen line and digest deleted, a read day receipt claiming release day, the harness without its as first published checks, the harness without its snapshot check) |

## The fix round (2026-10-10, after two adversarial reviews)

The reviews are `results-g/review-run-1213.md` and `results-g/review-read-1213.md` beside the handoff, the
fixer's report is `results-g/fix-1213.md`. No fixture row changed and no frozen digest moved. What changed:

- Receipts (written by the tool from the kept bytes, never by hand): each source says when its bytes were read;
  the four release day sources carry the stamps from their own bytes that bear the claim out; the feed's link
  is the publisher's page for a reader; each receipt holds its recheck; `awayPerClub` is counted.
- Data files: one line in eight of them, the Fixture Download address.
- The tool: `listAsOfFrom`, the stamps in three parsers, `released` for the DFL's PDFs, `check --record`, a
  `write` that keeps a recheck, the refusal to run without a snapshot folder, comments that say what the
  receipts say.
- The harness: a lost frozen line is red, a second gate count, a run with no control is red, release day is
  worked out again from the parser and the stamps, the read times and the recheck are held, Round 1184's key is
  named as the one pre tool ledger, and eight new controls (nineteen in all).
