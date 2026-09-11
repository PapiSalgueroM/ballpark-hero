# League cap figures, verification record, 2026-09-11

Round 531 piece 4. The four front office engines priced every contract against a bare
literal with no publisher and no read date. This is the evidence behind
`src/lib/leagueCaps.ts`, one row per figure, two publishers each, every URL that was read,
and every URL that refused.

Read date for every row: 2026-09-11.

## The figures

| League | Season | Figure | In code before | Verdict | Source 1 (league) | Source 2 (independent) |
|---|---|---|---|---|---|---|
| NFL | 2026 | $301.2M salary cap per club | 260 | WRONG, corrected | nfl.com news, 2026-02-27: "$301.2 million per team", up from "$279.2 million" | ESPN, 2026-02-27: "landing at $301.2 million in 2026 for a $22 million increase over last year" |
| NBA | 2026-27 | $164.961M salary cap (tax level $200.428M) | 155 | WRONG, corrected | nba.com news, 2026-06-30: "$164.961 million", tax level "$200.428 million", in effect 2026-07-01 | Hoops Rumors, 2026-06-30: cap $164,961,000, tax line $200,428,000, "about 6.7% on last season's $154,647,000" |
| NHL | 2026-27 | $104M upper limit | 104 | correct | nhl.com, NHL and NHLPA joint announcement 2025-01-31: upper limits $95.5M (2025-26), $104M (2026-27), $113.5M (2027-28) | ESPN, 2026-05-06: "will climb to $104 million next season, an $8.5 million increase" |
| MLB | 2026 | $244M competitive balance tax base threshold | 244 | correct | mlb.com glossary refused the read (HTTP 406), see below; ESPN, 2026-04-16: "eight teams began 2026 over the $244 million tax threshold" | CBS Sports, 2026-05-28: the union proposed raising the threshold "from $244 million to $300 million" |

The NFL and NBA figures in the code were not the previous season's numbers either
(2025 NFL cap $279.2M, 2025-26 NBA cap $154.647M). They were close to the 2025 figures and
had never been read from anywhere.

## Next season figures

| League | Published next season value | Used by the game |
|---|---|---|
| NFL | none published for 2027 | no, the engine's 5% per season stays as its own assumption |
| NBA | Hoops Rumors reports a league projection of about $174M for 2027-28 (about 5.5%); one publisher, a projection | no, recorded in the comment only; the engine's 7% stays as its own assumption |
| NHL | $113.5M for 2027-28, published by the league (a 9.1% rise) | recorded as `NHL_UPPER_LIMIT_2027_28`; the engine's 9% stays as its own assumption, unchanged this round |
| MLB | none, the 2022-26 agreement expires after 2026 and the line is under negotiation | no, the engine's 3% stays as its own assumption |

## Every URL read

Confirmed and cited:

- https://www.nfl.com/news/nfl-announces-2026-salary-cap-set-at-301-2-million-per-team (NFL, 2026-02-27)
- https://operations.nfl.com/calendar-events/nfl-free-agency/nfl-salary-cap (NFL operations, same publisher as above, agrees: 2026 $301.2M, 2025 $279.2M, 2024 $255.4M)
- https://www.espn.com/nfl/story/_/id/48055711/nfl-salary-cap-hits-new-milestone-3012-million-2026 (ESPN, 2026-02-27)
- https://www.nba.com/news/nba-salary-cap-2026-27-season (NBA, 2026-06-30)
- https://www.hoopsrumors.com/2026/06/salary-cap-tax-line-set-for-2026-27-nba-season.html (Hoops Rumors, 2026-06-30)
- https://www.nhl.com/news/nhl-nhlpa-announce-team-payroll-ranges-for-next-3-seasons (NHL and NHLPA, 2025-01-31)
- https://www.espn.com/nhl/story/_/id/48697122/nhl-salary-cap-increase-104-million-next-season (ESPN, 2026-05-06)
- https://www.espn.com/mlb/story/_/id/48502875/dodgers-smashed-mlb-spending-record-515m-2025 (ESPN, 2026-04-16)
- https://www.cbssports.com/mlb/news/mlb-proposes-salary-cap-floor-cba-negotiations-mlbpa/ (CBS Sports, 2026-05-28)

Refused or unreachable, not cited for any figure:

- https://www.spotrac.com/nfl/cba (HTTP 403)
- https://www.spotrac.com/mlb/cba (HTTP 403)
- https://pr.nba.com/2026-27-salary-cap/ (connection reset; the nba.com news page carries the same release and was read instead)
- https://www.mlb.com/glossary/transactions/competitive-balance-tax (HTTP 406)
- https://www.mlb.com/news/mlb-owners-players-agree-to-new-labor-deal-c209969472 (HTTP 406)
- https://www.mlbplayers.com/cba (HTTP 404)
- https://www.baseball-reference.com/glossary/competitive-balance-tax/ (HTTP 403)
- https://legacy.baseballprospectus.com/compensation/cots/league-info/luxury-tax-thresholds/ (access denied page)

The MLB row therefore rests on two independent outlets rather than the league plus one
outlet. Both agree, both date from 2026, and both state the figure as the current threshold
rather than a projection. If the league's glossary becomes readable, add it to the row.

## The fence

`scripts/simLeagueCaps.mjs` pins these values and the read date, requires the four engines
to take their figure from `src/lib/leagueCaps.ts` rather than a literal, and renders each
board's roster screen to find the "Cap figures as of September 2026" line beside the cap.
Control `CAPS_CONTROL=retype` puts one engine's constant back as a literal and must go red.
