# Player Bingo: Rodri's verified Champions League honour

Base: 5b630266d261b39128e4fb4544783d8e22214ce3. Branch: codex/bingo-rodri-honour.

The 15 October human report says Rodri was rejected on the Champions League winner tile, with entry index-fWiarNFA (Release BE). Native Git comparison finds the Bingo page, library and identity helpers unchanged from Release BE to bd3b6244. This report is still relevant to that source. No current production row or rejection has been read or reproduced by this round.

The page runs the local criterion directly and spends a strike on false. There is no AI validator or cached validator answer. The UCL winner pairs already contain Manchester City and 2023. The criterion requires an exact matching player history row. Round 315 records that Rodri had no market rows after 2022 and only a 2026 current row was inserted. This is historical evidence of a sparse-history failure mode, not proof that today's database still lacks 2023. The Robertson correction was a separate World Cup ingestion alias, already in Release BE.

Verified on 16 October 2026:

- [UEFA final report, 10 June 2023](https://www.uefa.com/uefachampionsleague/news/0282-1839b24603ef-36e94e63621d-1000--highlights-report-man-city-win-champions-league/) names Rodri in City's starting side and credits his goal in the 1-0 Champions League final win over Inter.
- [Manchester City final report, 10 June 2023](https://www.mancity.com/news/mens/manchester-city-v-inter-champions-league-final-match-report-63822017) independently names Rodrigo in the starting side, describes Rodri's winner and the club's first Champions League title.
- [UEFA player profile](https://www.uefa.com/uefachampionsleague/clubs/players/250082664--rodri/) lists Spain, midfielder and birth date 22 June 1996.
- [Manchester City's Rodrigo: Anchorman](https://www.mancity.com/features/rodri-anchorman/) independently gives 22 June 1996 and describes the holding midfielder's Spain career.

Bounded design: add one audited UCL honour for the exact normalized Rodri name, Spain, an explicit defensive midfield role and the 1996 birth cohort. A positive integer year/age must imply birth year 1996 or 1997, covering both pre-birthday and post-birthday listed ages. Union that honour with the existing club-year criterion. Never manufacture a club season, statistics, current club, value, database row or broad Rodrigo alias. Preserve the existing history and 2026 late-arrival rules. No other player receives a newly researched honour.

1. Write the actual criterion regression and strict remote baseline wrapper. Verify exactly the sparse Rodri case fails, while all ten named preservation cases pass without setup or transport errors.
2. After review of that causal red, add only the verified honour and identity guard. Verify normal, original-source negative control, individual executable guard controls and full restored source outcomes.
3. Run the existing Bingo proofs, full build and every rebuilt-site reader remotely. Retain source/package hashes, complete unit reports and controls. Review any old whole-library source pin only with its preservation proof. Do not adopt generated build output or claim a live fix.

Native work is text authoring and Git only. All installs, application runtimes, types, tests, builds and browser tooling run on GitHub Actions with production database transport blocked. Baseline and fixed receipts remain separate. Status: tests and remote baseline workflow authored; no runtime credit yet and product unchanged.
