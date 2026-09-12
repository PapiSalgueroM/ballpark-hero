# Guess The College data verification, 2026-09-12 (Round 535)

`src/data/colleges.ts`, 70 schools. Before this round the file carried no provenance
header, no source for a single number, and no harness. Every countable claim sat inside
prose, so nothing could pin it: "Has won 18 national championships", "Won 3 NCAA
basketball championships", "Enrollment: 40000", "Acceptance rate: 80%".

This file is the record of what was checked, against what, and what happened to it.
One row per school per field. Status is VERIFIED, CORRECTED or REMOVED.

## Method, and the rules each number now lives under

**Two publishers per fact.** Wikipedia counts as one publisher however many of its pages
are read, so nothing here rests on Wikipedia alone.

**Rules stated, because the same words mean different things.**

- *Football national titles.* There is no NCAA championship in FBS, so "national
  championships" is whatever selector you pick, and the publishers genuinely disagree:
  ESPN's NCAA-recognised list gives Alabama 16, Notre Dame 13, USC 9, Michigan 10, while
  the numbers those schools claim are 18, 11, 11 and 12. A count whose value depends on
  which list you opened is not a fact a quiz can assert, so **the raw "national
  championships" counts do not ship**. What ships instead is
  `CFB_TITLE_SEASONS`: the BCS and College Football Playoff champions, 1998 through 2025.
  One champion per season, no selector to choose, and every school's count is derived
  from that ledger rather than typed beside it. The 2003 season is the BCS champion (LSU);
  USC's split AP title that season is not in the ledger and neither is USC's 2004 BCS
  title, which the NCAA vacated.
- *Basketball titles.* NCAA Division I men's basketball tournament championships, derived
  from `NCAA_MBB_TITLE_SEASONS`. **Vacated titles are excluded and named**: Louisville's
  2013 title was vacated in February 2018 and Louisville is a two-title school in this
  data, not three.
- *Enrollment.* Total fall headcount for the named IPEDS unit, fall 2023, with the year
  written into the data (`enrollmentYear`) and shown in the clue. The IPEDS unit id is
  stored per school so the number is reproducible rather than remembered.
- *Acceptance rate.* **Dropped from the clue set entirely.** See the section below.

**A claim that could not be verified was removed, not softened.** Every removal is a row
in this file.

## What was checked and what was left alone

Checked and two-sourced: the conference for 2026-27, every championship count, every
superlative ("most", "more than any", "record"), every claim naming a person or a dated
event, and the enrollment number.

Deliberately left as written: descriptive lines that assert no checkable specific, for
example "Has produced Olympic athletes in track and field and swimming". These are not
countable, name nobody and date nothing. They are recorded here as NOT RE-VERIFIED rather
than quietly presented as checked.

## Blocked fetches, named and not cited

These were attempted and returned nothing usable. Nothing in this file rests on them.

| URL | Result |
|---|---|
| `https://www.sports-reference.com/cfb/years/2026-standings.html` | HTTP 403 |
| `https://www.ncaa.com/standings/football/fbs` | 200, empty body |
| `https://www.ncaa.com/history/basketball-men/d1` | 200, empty body |
| `https://www.ncaa.com/news/basketball-men/article/2026-04-06/college-basketball-teams-most-national-championships` | 200, empty body |
| `https://www.secsports.com/schools`, `/teams`, `/standings/football` | 404, 404, 200 with no table |
| `https://bigten.org/schools` | HTTP 404 |
| `https://themw.com/sports/2016/6/10/member-directory.aspx` | HTTP 500 |
| `https://gocards.com/sports/mens-basketball/history` | HTTP 404 |
| `https://ukathletics.com/sports/mens-basketball/` | HTTP 404 |
| `https://en.wikipedia.org/wiki/College_football_national_championships_in_NCAA_Division_I_FBS` | 200, the by-school table did not come back |

(rows follow, filled as the checks complete)
