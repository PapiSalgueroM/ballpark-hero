# Robert Ljubičić's opening loan in Club Manager

## Verified registration

LASK announced on July 22, 2026 that Robert Ljubičić had joined on loan from AEK Athens with an option to buy. UEFA independently identifies AEK as his parent club and lists him in LASK's starting midfield against AEK on September 8. [LASK loan announcement](https://www.lask.at/de/m/news/robert-ljubicic-wird-laskler), [UEFA LASK season profile](https://www.uefa.com/uefachampionsleague/news/02a9-2182ea0b2967-71f1f3de557b-1000--lask-in-the-2026-27-champions-league-what-are-their-fixtu/), [UEFA match lineup](https://www.uefa.com/uefachampionsleague/match/2049558--aek-athens-vs-lask/)

AEK's January 31, 2024 announcement identifies him as a Croatian midfielder born on July 14, 1999 and gives the parent contract through 2029. UEFA's player profile confirms his country, date of birth, and midfield role. Croatian public broadcaster HRT also reported the 2029 contract year. [AEK signing announcement](https://www.aekfc.gr/newsdetails/stin-aek-o-rompert-lioumpisits-131141.htm?lang=el&path=1613797096), [UEFA player profile](https://www.uefa.com/uefachampionsleague/clubs/players/250143322--robert-ljubicic/), [HRT signing report](https://sport.hrt.hr/hrvatski-nogomet/aek-potvrdio-dolazak-ljubicica-iz-dinama-11330326)

## In-game treatment

The modern 2026-27 opening registration puts Ljubičić in LASK's playing squad on loan and keeps AEK Athens as the parent. Club Manager uses its standard season-end return to AEK. LASK's announcement confirms the purchase option and leaves its price, any loan fee, wage split and recall rights unspecified. The initial budgets use the standard career amounts. [LASK loan announcement](https://www.lask.at/de/m/news/robert-ljubicic-wird-laskler), [Opening loan regression](../../src/lib/clubManagerOpeningLoan.test.ts)

The baked AEK row `Robert Ljubicic` supplies the existing identity. Its player ID is `p-robert-ljubicic` and its world roster key is `["now","AEK Athens","Robert Ljubicic","CM",1999,0]`. Keeping this key ties the LASK playing registration to the existing AEK contract. A saved transfer takes precedence over the default opening registration. [Baked AEK roster](../../src/data/clubManagerRosters.ts#L90)

## Older save control

The baseline fixture uses published main `2a0d545efa0cb2c2e2c49cbe61bf749d772fa1e2` and tree `7be7cd99c12ce7f68e70fb4a4e68026baddc8958`. In the Madrid-managed fixture, Porto has already signed Ljubičić permanently. Active and parked saves share SHA-256 `d82fcf60498e5c818fd6821d483589d1cc55dc4eb549f56badf7c9b82aa28229`. Baseline reload resolves the same AEK-origin key and player ID at Porto alone. The negative control that moved the baked AEK row to LASK displayed him at both LASK and Porto. The fixture and receipt are in the temporary `dukb-cm-robert-ownership-2a0d545e-Sj9nQb` directory.
