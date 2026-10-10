# Rounds1195-1196: Soccer Career derby history

Design contract, 2026-10-10. The owner asked for continued Soccer Career depth.

See the rivalry games already recorded throughout your career. This extends
Soccer Career's existing season derby lines and totals, which do not offer a
whole-career meeting ledger. It uses the saved engine results.

Open Derby history from Career Stats, choose a saved senior season, read every
saved rival and meeting, then return to the same tile and scroll position.
Two spells in the same year remain separate. Zero appearance seasons still
show the club's recorded fixtures. Older seasons without a derby record say so.

Round1196 adds a rival view. Pick a saved opponent to see the whole-career
head-to-head record and every retained meeting against that exact name, including
the original season and club. Club fixtures and player appearances stay separate.
No aliases are merged. Missing records contribute no invented fixture.

Controls use compact tiles and a Back button, with 44px targets on phones.
Instructions appear before the tiles. Help remains available from a question mark.
It explains the club-side score, home and away, missed meetings, the separate
team and player records, and a worked example. The page under the dialog stays
in place. Closing returns focus to the opener.

This is a history view, with no new scoring, daily mode, rewards or simulation
decisions. It reads saved season identity and derby data only. It adds no real
facts, photos, assets, quotes, dates, opponents or new rivalry pairs. No table,
award, fixture, random stream, save payload or engine result changes.

Verification uses an independent raw-save oracle, duplicate years and loans,
away score orientation, all missed fixtures, more than three rivals, explicit
empty records, absent old fields and malformed data. Copied source defects must
change compiled code and fail named outcomes. Baseline whole season and campaign
states and their random draw vectors must hold. Native remote browser journeys
check actual displayed scores, Help and Back, focus and scroll restoration,
reload identity, whole-save bytes, zero random reads and phone geometry.
Types, build, relevant sims and every rebuilt-site reader run on remote CI.
Root F docs and existing READY drafts stay frozen. F integrates and publishes.
