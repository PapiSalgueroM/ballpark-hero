# Flagship priorities from Anthony's traffic and feature requests

Anthony supplied last-week analytics and asked to perfect the games people
already choose. He then explicitly prioritized more Club Manager leagues and
clubs, alongside substantially deeper career and management systems.

## Evidence and order

The supplied traffic screenshot shows roughly4,000 visits to Soccer Career,
2,600 to home,1,100 to Club Manager,412 to NBA My Career,295 to Stadium Tycoon,
290 to NFL My Career,256 to the soccer hub,212 to College Grid,155 to Front
Office and152 to Build Your XI. The separate search screenshot supports the
soccer-career and college-grid priorities. Search clicks are not visits and
are not added to these totals.

The main build order is Soccer Career and Club Manager, then NBA/NFL careers,
then the other proven games above. Existing work on smaller games can reach a
safe verified checkpoint. It does not justify starting further new games ahead
of these priorities. Court Life1075 is therefore preserved, unregistered and
unpublished while its existing safety and verification checkpoint is finished.

## Club Manager coverage, counted from source

| Revision | League entries | Clubs | Joined real-player rows | Partial clubs | Empty rosters |
| --- | ---: | ---: | ---: | ---: | ---: |
| be3f552d, before AH | 22 | 368 | 4,253 | 143 | 27 |
| eeedbf43, AH product | 23 | 380 | 4,562 | 144 | 27 |
| 0201a513, active1040 branch | 26 | 438 | 4,710 | 196 | 42 |

League entries count MLS East and West separately. Club counts are not claims
of complete verified squads. Source: REAL_LEAGUES in src/lib/clubManager.ts,
src/data/clubManagerRosters.ts, src/data/clubManagerWorldRosters.ts and
src/data/clubManagerALeague2026.ts. The joined AH count excludes the superseded
Southampton Ryan Fraser row before adding310 A-League rows.

Session D's release receipt records AH published at02:42 EDT on October7,
deployment02585196, entry index-BetRYEt2.js. Receipt commit2fff5e04 has the
same product as eeedbf43. This audit read the release lead's receipt; it did
not independently run a public browser or query production data.

Round1040 remains owned by Claude's existing chain. It adds Serie B20,
Ligue2 18 and Segunda20 eligible clubs. Two reserve sides are explicitly
omitted. The58 additions currently have175 real-player rows:78/49/48 by
division. Only seven clubs have at least eight rows and15 have none. Completing
their data is a priority, and this branch is not counted as delivered.

Historical starts2020/2015/2010/2005 each contain the five big European
leagues and98 club slots. They have1,774/1,659/1,751/1,727 player rows and
5/7/2/5 squads below eight players, with no empty rosters. Sources:
src/lib/clubManagerEras.ts and src/data/clubManagerEraYYYY.ts.

## Depth beyond the league count

The current expansion increases promotion pairs from two to five. It still
uses straight swaps without played promotion playoffs. It does not create
a third-tier pyramid. Other countries retain static membership. Domestic cups
use16-slot fields with only a few lower-division entrants. Non-European
continental club competitions remain absent. Some domestic postseasons and
split phases are explicitly simplified. These are separate unfinished systems,
not completed merely by adding clubs to the picker.

The23 existing league entries are selectable. The in-career WorldTablesCard
selector is a single horizontal row of10px pills without search or country
grouping. A bounded follow-up can improve that component while preserving
worldLeagueDefs(career), actual era and edited-world membership, live tables,
rounds and club scouting. This does not overlap1040's engine/data work.

Argentina is a candidate for the next wider-world expansion once the existing
data lane settles. It needs verified squads and its real two-stage competition
model. The available offline player dump is research input, not a verified
current roster. No new league, player fact or competition rule is added by
this audit. Do not turn preliminary row matches into shipping claims.

## Connected systems and acceptance

Club Manager depth means verified squads, seasons, promotion, cups, scouting,
contracts, transfers, tactics and finances affecting the same saved world.
Career depth means playable match progression, earned stats, training, roles,
relationships, money and life choices with lasting consequences.

Claude's1045 design owns the match-by-match season architecture, Soccer first
and NBA/NFL next. Session D's03:45 EDT ledger records its implementation launched
on r1045-season-centre. Codex1076 owns the independent practice lifecycle bugs: abandoned
results must not overwrite another drill; help and focus loss must preserve
active practice time; pause must ignore input until explicit resume. Existing
gain rules and simulation engines remain unchanged.

Round1076 now also removes invented earned-stat estimates from Soccer Career's
stats panel. Preparation37588483223 is accepted with exact evidence in
ROUND1076-CAREER-PRACTICE-LIFECYCLE.md. Its combined PR with1078 remains pending.
Round1078 owns bounded failed-write recovery in the central persistence effect
and inline notice, outside1045's six integration hunks. No architecture or
ownership overlap is claimed.

A feature is complete only after its actual player journey works, consequences
persist, displayed numbers match saved outcomes, interruption/recovery works,
and phone plus keyboard verification passes. Prepared, PR-verified, merged and
published are separate states. Keep the master spec's dated totals separate
from a new claim about current completeness.

Anthony should review short batches now, beginning with Soccer Career and Club
Manager. His useful feedback is fun, confusion, realism and visual feel. Full
technical regression checking remains the builders' work.

## Next bounded reliability candidate, read-only audit

SoccerCareer.tsx's central persistence effect silently catches storage refusal.
Training and season results still advance in memory, while the disk retains
older bytes. Reload can therefore lose earned progress without a warning.
The shared US career board has the same defect. Club Manager already exposes
saveFailed and tests refusal/recovery.

After1076/1077, prioritize a visible Soccer failed-save notice and explicit Retry
save using the current in-memory career. Retry must not rerun the simulation,
training or score submission. Keep old disk bytes and earned memory intact;
clear the notice only after a successful write. Extend the actual-page save
recovery tests with refused write, recovery and reload outcomes. Apply the same
behavior to NBA/NFL's shared board afterward. Round1078 now owns the bounded
Soccer implementation and verification; acceptance remains pending.
