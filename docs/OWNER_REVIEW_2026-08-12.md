# Owner review, Aug 12 2026 (the big game-by-game list)

Anthony reviewed the site game by game and granted full decision-making autonomy
("every decision making is on u... use all ur usage on this"). This file is the
canonical backlog from that review. IMPORTANT CONTEXT: he wrote much of it while
his browser was serving a stale pre-Aug-5 cached build, so items marked ALREADY
DONE were fixed before or during the Aug 12 session. Verify against the live
site before re-doing anything.

## Already done before/during Aug 12 (do not redo, just re-verify occasionally)
- Lovable badge, guest stat gating, days-in-a-row, games-today, login/signup/Google/forgot-password: all live (Rounds 34-43).
- Deleted long ago with redirects: Grade the Transfer, Guess the Club, World Cup Legends, Guess the Value, plain Deal or No Deal, Draft Guesser, base Perfect Lineup.
- How-to "?" instructions exist sitewide (HowToPlayPopover); he wants them checked for overlap with the Back button on some games.
- Rebuild: pitch view, coach hire, board objectives, rival AI managers, bidding wars, season sim shipped R37/R38. His new Box2Box notes below EXTEND this.
- Sign the Player live raise-by-raise bidding shipped R38; more below.
- Club Manager real leagues shipped R44. FIFA-style age-aware ratings R35 (check Mbappe/Yamal/Lewandowski specifically).
- Fantasy Draft criteria enforcement (under-25 etc.) shipped R35 (lib/fantasyCriteria.ts); his Bernardo Silva repro was the stale build.
- Transfer path give-up option R35. Navbar zero-stats bug R3x. Report button relays to douknowball1@gmail.com (report-relay edge function).
- Poll votes DO record (82/day); the own-vote-shows-0% race + scroll-restore drift + sitewide em-dash purge + Missing XI data audit: fixed in Round 45.

## Round 45 (staged this session)
- Poll results race fix, scroll restore hold, em-dash sweep (387 across 129 files), this backlog doc.

## The real new backlog, roughly in his priority order

### Cross-cutting rules he keeps repeating
1. DATA CORRECTNESS FIRST. Verify every player that can be guessed exists in every game's data. Audit every puzzle in every game for wrong answers (the Missing XI Asensio-type bug).
2. No AI-sounding copy anywhere, no em dashes ever. Casual human tone.
3. Every game needs way more puzzles/content. Daily pools must differ from unlimited pools.
4. Games that take "two seconds" with no replay value bore him. Either deepen them or delete them.
5. Research Box2Box (YouTube) formats before building their game types. Also FIFA/FM/Madden/2K for sims and ratings.

### Big builds he wants (multi-session projects)
- SOCCER CAREER: his #1. "Most popular game." Wants the most realistic soccer career sim ever, a combo of BitLife and FIFA. Add hours of depth, polish, life events, everything.
- REBUILD CHALLENGE, full Box2Box rules: 3 managers pick neighboring-tier clubs with different budgets (big spenders more, small clubs less); coach fire/hire step with 3 tiered options; management cards tied to the club's real identity (e.g. Bayern: sign 2+ Germans) with end-of-game penalties (e.g. forced player sale) if unmet; flip-one-of-10 face-down management AND financial cards during the run (finance can add or remove money, e.g. +30M from sales boom); per-position replacement flow: first commit keep/sell before seeing the 3 buy options + bench promote option; simultaneous picks vs 2 AI rivals; contested picks go to a bidding war, uncontested go at market value; can go into the red mid-game but not at the end; full season sim + FIFA-manager-level stats at the end.
- BILLION DOLLAR XI: too shallow (just picking best players). Add criteria/eras like an 82-0 style mode, negotiations, or fold its ideas into Rebuild. Undefeated-goal era variants.
- SIGN THE PLAYER (credit Box2Box style): show bidding play-by-play (not skip to result), usually a mid player revealed first but sometimes the best; everyone bids or passes, highest wins; go position by position; show everyone's XI filling out live; after first XIs done, better players come with higher values; last unfilled position still pays market value; show player stats before bidding.
- PLAYER STOCK MARKET: wrong concept currently. You are NOT meant to know the player's name, only some stats, before investing. Rework to the Box2Box format.
- SQUAD DEAL: add manager, atmosphere, jerseys etc. as pickable extras; banker offers are too weak; research YouTube versions of the format.
- NFL CONQUEST (and other conquests): "work a ton ton ton more", research how people play the format, records/standings polish.
- 17-0 (Perfect Season NFL): add coach, defense, and everything that makes a team great (partially in R41 with coaches/defenses; extend further).
- CLUB MANAGER: he loves it. Table must match real league tables; add UCL mode and league mode; keep building toward FIFA/FM/PES depth: facilities upgrades, everything.

### Per-game fixes and content
- Overrated/Underrated + Tier List: same player pool reused between them (fix), needs way more players, more replayability, less AI-sounding copy.
- Dart Draft: journeyman ocean-hit should just be a 40 OVR player; map still looks off; more powerups (good and bad); more players; all-time mode check (R38 added one, verify); position coverage bug: got "Iraq + goalkeeper" with no GK option shown; research how Box2Box plays it.
- Career Ladder: more puzzles; club flag next to each stint showing the nation of that club's league; "Stumped after 6 guesses" text shows wrong guess count and "11 stints" confuses him; verify share + report buttons work.
- Who Am I: more puzzles, build on it.
- World XI: position eligibility too loose (RW offered for CM slot); limited respins; accent-tolerant name matching (Odegaard case; R35 added accent-proof matching, verify it covers this); more sim stats afterward.
- Player Bingo: more puzzles; every clue gets an emoji/flag (no text-only tiles); check the weird "8ba" tile.
- Alphabet Sprint: ensure every possible player is in data.
- Clue Auction: more puzzles.
- Rarity Round: more niche prompts (UCL winner last 10 years, Puskas winner, Barca academy, not broad all-time-team asks); final ranking vs everyone who played that day; show MOST-picked instead of least-picked (least is gameable with fresh accounts); way more players in data.
- Missing XI (soccer): suggestion bar should suggest close spellings, not reveal; audit passed Aug 12 (167 lineups clean) but keep auditing new ones; more puzzles; unlimited pool must differ from daily.
- Missing Eleven (football): add suggestion bar; add defenses (R41 added legendary defenses, verify); hard mode should hide O-line/defense instead of same lineup order; more puzzles.
- Connect 4 (soccer + NFL): clarify rules copy ("played with Messi": current club or all time?); more puzzles.
- Footle / Career Quiz / Higher-Lower / Connections: fine, just more puzzles and polish.
- NFL Connections: too easy (all "played for X team"); make categories niche and clever like NYT.
- NFL Higher/Lower: more stat categories than career TDs; avoid ties.
- NFL Career Path: more than 6 clues; add unlimited mode with its own pool.
- Build Your XI: verify sim works, wheel spin too slow.
- Soccer Grid: "so boring and so easy"; needs harder, more niche puzzle generation.
- Fantasy Draft: keep adding to it (criteria enforcement already live).
- Transfer Path: keep improving; unlimited mode exists? verify; more content.
- Bingo/eras/value data: old players should not be auto-cheap; age curve should respect current quality (Lewandowski case; R35 age-aware ratings shipped, verify it looks right).

### Sitewide
- Polls: keep them exciting like RealSports; more of the debate style (all-time Yankee etc.); 0% bug fixed R45.
- Instructions "?" on every game, never overlapping the Back button.
- Scroll restore fixed R45; keep an eye on it.
- Suggestion bars everywhere guessing happens.
- AdSense, Google Search Console, privacy policy, terms of service: re-check all of it, update contact email to douknowball1@gmail.com everywhere.
- GOLF games: he says they have been "pending for way too long", build them out (category exists with 2 games since R35; add more).
- Responsive audit: every game at phone/tablet/desktop; some games look much worse than others. Keep the site a website; consider PWA install later; no native app for now.
- Consider what makes RealSports polls popular and borrow.

### Operational
- Supabase free plan DB was at 102%; July bak tables dropped Aug 12 (now ~447MB / 89%). Watch size; next step is trimming big tables (bootroom_player_trajectory 70MB, nflfastr_* 66MB, lahman_* ~100MB total) or Pro plan.
- Custom SMTP (Resend + GoDaddy DNS) for password-reset emails still pending.
- Apple sign-in parked on the $99/yr Apple Developer decision; code ready behind apple:false flag in src/lib/authProviders.ts.
