# Round 1424: NFL retirees can take an entry-level staff role

Status: claimed design and source hypothesis, not runtime qualified or published.

Owner report: NFL My Career offers no way forward when retirement produces no
coaching offers. Source investigation finds a genuine dead end: sitting out
only lowers standing, eventually making all automatic offers impossible.

Root claims only a new explicit NFL staff-entry action in usCoachCareer.ts and
its empty-market button/copy in CoachCareerPanel.tsx, plus new regression/proof/
browser/workflow and closing docs. Base main775564305e9da84dab59f2b9fe246d044a3cc8e9.
Shared host UsCareerBoard, underlying market/distribution, save schema and
retirement/completion logic are held. Existing 1346 retirement work is preserved.

Design: an empty unemployed NFL market offers Take a staff role. This explicit
choice selects an existing generated T4 vacancy and uses acceptCoachOffer.
No head-coach gift, temporary reputation inflation, season skip or new schema.
Employment resets idle time through the existing acceptance transition. Earned
record, year, awards and playing reputation stay held. Finished, employed,
non-NFL and already-offered careers cannot use recovery or consume random draws.
Automatic offers and sit-out outcomes remain unchanged when recovery is unused.
NFL empty-market copy must explain the new alternative without changing other sports.

Verification: require original actual engine/component failure and a genuine
production-route no-offer retirement journey before product adoption. Cover a
new fictional retiree and an older JSON-restored stranded coach, acceptance,
persistence/reload and a normal staff season. Preserve completed coaching,
earned offers and all other sports. Prove whole-original/button/transition
controls effective, restore source, run real types, existing relevant checks,
serial plain build, all15 readers and all14 unchanged fatal weight caps.

All project runtime runs remotely in Actions under ordinary offlineTransport.
Native local text/Git/ZIP/hash/savedJSON only. No live DB, real data import,
dependency/source/transport/cap waiver, release or publication claim. Prior61
report branches stay sealed. Shared primary WORKBOARD append only. I retains
protected SC/Manager/tournaments and actual release/main/publication ownership.
