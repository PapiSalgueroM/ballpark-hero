# Animation inventory, 2026-09-11

Read-only inventory taken by the desktop lane on 2026-09-11 for the owner's open row "More
animation across every sim: reveals, draft nights, celebrations. Reading text is not a game
feel". It is the backlog for Round 530 and whatever follows it. Nothing here was changed when
it was written.

Legend. DONE means already animated, do not rebuild. PART means the shell moves and the payload
does not. NONE means plain text with no motion. "Pure" means the facts are already computed in a
lib, so a reveal component can be pure presentation over them (the Round 186 and Round 515
split).

The shared kit is `src/components/club-manager/Celebration.tsx` (ConfettiBurst, CelebrationStyles,
classes cm-rise, cm-slam, cm-win-pulse, cm-loss-shake, cm-gold-glow, cm-tick-in). Nine files
import it: MatchReportCard, FrontOfficeBoard, DraftNightCard, ResultScreen, the MLB, NBA and NHL
front office boards, SeasonRevealCard, ClubManager.tsx.

## Soccer Career

| Moment | Where | State | Pure |
|---|---|---|---|
| Season summary | SoccerCareer.tsx:490 | DONE (animate-in, Confetti on trophies) | yes |
| Trophy won | SoccerCareer.tsx:535 | DONE (ShineWrap, gold Confetti) | yes |
| Injury in the season summary | SoccerCareer.tsx:518 | NONE | yes |
| Ballon d'Or win or podium headline | SoccerCareer.tsx:2728 | DONE | yes |
| Ballon d'Or top ten nominee countdown | SoccerCareer.tsx:2759 | NONE, all ten at once | yes, already ordered |
| World Cup result | SoccerCareer.tsx:2221 | DONE | yes |
| International debut | SoccerCareer.tsx:2188 | NONE | yes |
| Transfer completed | SoccerCareer.tsx:769 | NONE, a toast | yes |
| Contract extended, loan agreed, request refused | SoccerCareer.tsx:791 to 805 | NONE, toasts | yes |
| Retirement ceremony | SoccerCareer.tsx:2801 | PART (confetti for GOAT and LEGEND only; grid, clubs, money, tier static; legacy uses CountUp) | yes |
| Legacy card | SoccerCareer.tsx:3012 | NONE | yes |
| Manager season result and final table | SoccerCareer.tsx:2907 | NONE | yes |
| Manager sacked or out of work | SoccerCareer.tsx:2950 | NONE | yes |
| Manager job offer accepted | SoccerCareer.tsx:2962 | NONE | yes |
| Newspaper headlines including milestones | SoccerCareer.tsx:449 | NONE, no stagger | yes |
| Random, rivalry and dilemma events | SoccerCareer.tsx:2159, 2354, 3137 | DONE | yes |

## Club Manager

| Moment | Where | State | Pure |
|---|---|---|---|
| Full time and match report | MatchReportCard.tsx:168 | DONE | yes |
| Cup or UCL final won | MatchReportCard.tsx:285 | DONE (cm-gold-glow, ConfettiBurst) | yes |
| Injuries, cards, subs chips | MatchReportCard.tsx:247 | NONE | yes |
| Season end headline, grade, stat row | ClubManager.tsx:684 | DONE (ResultScreen) | yes |
| Season end trophies, golden boot, player of the season, Ballon d'Or, UCL qualification, board objectives, transfer business | ClubManager.tsx:729 to 790 | NONE (children of ResultScreen render raw at ResultScreen.tsx:160) | yes |
| Job offers on the table | ClubManager.tsx:707 | NONE | yes |
| Sacked | ClubManager.tsx:797 | PART (shell only; no cm-loss-shake unlike the front offices) | yes |
| Wilderness offer accepted | ClubManager.tsx:832 | NONE | yes |
| Manager level up or XP point | XpScreen.tsx:28, ClubManager.tsx:1161 | NONE, no level up moment exists | yes |

## The four front offices (NFL, NBA, MLB, NHL boards are structural clones)

| Moment | Where | State | Pure |
|---|---|---|---|
| Season verdict, champion crowned | FrontOfficeBoard.tsx:573 and siblings | DONE (stageVerdict) | yes |
| Fired | FrontOfficeBoard.tsx:555 and siblings | DONE | yes |
| Draft night, own pick plus rival picks | DraftNightCard via the boards | DONE (Round 515) | yes |
| Final pick of a draft | FrontOfficeBoard.tsx:369 | NONE, named as not done by the code | yes |
| Weekly news feed: injury, AI trade, retirement, free agency, development, mandate | FrontOfficeBoard.tsx:679 and 767 and siblings | NONE, flat paragraphs | yes, plain strings |
| Trade completed | FrontOfficeBoard.tsx:468 | NONE, feed line | yes |
| Free agent signed | FrontOfficeBoard.tsx:425 | NONE, feed line | yes |
| GM press conference | GmPressCard.tsx | PART | yes |

## The four US careers

| Moment | Where | State | Pure |
|---|---|---|---|
| Season end, awards, team result, title | SeasonRevealCard | DONE (Round 186) | yes |
| Draft day ("With pick N, the X select you") | NflMyCareerBoard.tsx:171 and siblings | NONE, a grey paragraph | yes |
| Retirement and Hall of Fame verdict | NflMyCareerBoard.tsx:571 and siblings | PART (confetti for HOF only; legacy uses CountUp) | yes |
| Contract extension signed | us-career/ExtensionCard.tsx | NONE | yes |
| Free agency signing | us-career/FreeAgencyPanel.tsx | NONE | yes |
| Trophy case | us-career/TrophyCase.tsx | NONE | yes |
| Rivalry event | us-career/RivalryEventCard.tsx | NONE | yes |
| Coach season result | CoachCareerPanel.tsx:304 | NONE, one grey line | yes |
| Coach title, fired, new job | CoachCareerPanel.tsx:238, 124, 277 | NONE | yes |

## CFB and CBB Dynasty

| Moment | Where | State | Pure |
|---|---|---|---|
| Champion crowned plus Heisman | CfbDynastyBoard.tsx:226 | NONE | yes |
| Title won plus player of the year plus Cinderella | CbbDynastyBoard.tsx:186 | NONE | yes |
| Bracket and CCG results | Cfb:248, Cbb:208 | NONE | yes |
| Weekly result feed, recruit signed, offseason | various | NONE | yes |

## Rebuild, Stadium Tycoon, Idle Arena, Wonderkid Factory

| Moment | Where | State | Pure |
|---|---|---|---|
| Rebuild envelope flip, wheel landing | RebuildBoard.tsx:425, 874 | DONE | yes |
| Rebuild final grade and before/after rating | RebuildBoard.tsx:600 | NONE | yes |
| Rebuild penalties, rival windows, season table, shared season | RebuildBoard.tsx:625, 641, 668, 306 | NONE | yes |
| Stadium Tycoon payouts, confetti, golden whistle | StadiumTycoon.tsx:245 to 275 | DONE | yes |
| Stadium Tycoon division promotion, badge, milestone | useStadiumTycoon.ts:154, 161 | NONE, a floater only | yes |
| Idle Arena tap payout | IdleArena.tsx:148 | DONE | yes |
| Idle Arena trophy lift, badge earned, archetype unlocked, offline earnings | IdleArena.tsx:256, 274, 178, 112 | NONE | yes |
| Wonderkid sale | WonderkidFactory.tsx:259 | DONE | yes |
| Wonderkid region move, kid walks free, facility level, deadline day | WonderkidFactory.tsx:204, 224 | NONE or PART | yes |

## The five Conquest routes

| Moment | Where | State | Pure |
|---|---|---|---|
| Region annexed on the map | ConquestRegionMap.tsx:460 | DONE (cq-takeover, cq-flash) | yes |
| Arcade battle result, powerup won | ConquestBoard.tsx:500, 707 | DONE | yes |
| Arcade game over | ConquestBoard.tsx:624 | PART | yes |
| Imperialism champion crowned, all five routes | ImperialismBoardShared.tsx:443 | NONE | yes |
| Imperialism round recap | ImperialismBoardShared.tsx:400 | NONE | yes |

## Cross cutting

- prefers-reduced-motion is missing on StadiumTycoon.tsx:530 (st-glow and st-goldwob loop forever) and WonderkidFactory.tsx:310 (wf-glow loops forever). IdleArena.tsx:336 shortens dukb-floater instead of landing it.
- Round 147's rule (never animate a number through values that were never true) is broken by `CountUp` in `src/components/soccer-career/CareerFx.tsx:60` at SoccerCareer.tsx:500, 504, 508, 2858 and NflMyCareerBoard.tsx:597 plus the three sibling boards, and more mildly by `useCountUp` in StadiumTycoon.tsx:35 with no reduced motion guard.

## Ranked by feel per hour

1. Imperialism champion crowned (one file, five routes).
2. CFB and CBB dynasty recaps (the two biggest unanimated climaxes, same shape as the pre-187 front office recap).
3. Club Manager season end children block.
4. Front office weekly news feed on all four boards.
5. US career draft day (DraftNightCard already takes this shape).
6. US career retirement and Hall of Fame, and kill the CountUp there in the same pass.
7. Idle Arena trophy lift.
8. Ballon d'Or nominee countdown.
9. Rebuild final grade.
10. Coach career season result (the notes already match SeasonRevealCard's lines contract).
