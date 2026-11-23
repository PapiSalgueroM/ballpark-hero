# Alisson career identity audit

Roma's 2016 signing announcement and Liverpool's 2025 appearance record both call their Brazilian goalkeeper Alisson and Alisson Becker. [Roma signing announcement](https://www.asroma.com/en/news/44396/club-confirms-the-signing-of-goalkeeper-alisson) · [Liverpool appearance record](https://www.liverpoolfc.com/news/alisson-becker-becomes-seventh-liverpool-goalkeeper-to-reach-300-appearances/)

The public career table has two exact rows for these labels. The archived Career Ladder roster and the earlier Internacional seasons migrations use the same IDs. Both live records and both bundled entries identify a Brazilian goalkeeper.

| Player label | Public career row ID |
| --- | --- |
| Alisson | `a0000001-0000-0000-0000-000000000040` |
| Alisson Becker | `a0000001-0000-0000-0000-000000000066` |

[Career Ladder archive](../../src/data/careerLadderRoster.json) · [Career first clubs migration](../../supabase/migrations/20261001120000_career_first_clubs.sql)

## Reproductions

- Classic Transfer Path `tp-14` accepts Salah to Alisson via Roma, then Alisson to Alisson Becker via Internacional under the original name-only repeat check.
- Career Quiz can choose either name as a Daily or Unlimited answer. Selecting the other entry originally consumed an attempt.
- Career Ladder uses two distinct rows in the frozen Daily rotation. The original guess check rejected the alternate name, and an Unlimited ladder could draw both records.

The answer checks use a shared verified identity for these two rows. The bundled fallback uses the verified labels, nationality and goalkeeper position. The wider career and market lists can have real namesakes, so matching the short label alone carries no alias credit. The archived rows anchor puzzle dates, saved labels and Transfer Path endpoints.

A read-only comparison of the two live season histories found nine club-season rows whose appearance counts, assists or estimated values differ. The two Roma rows alone show 40 and 37 appearances for 2016-17. Roma records 64 appearances across the keeper's two seasons in all competitions. Following up requires source checks by season and competition scope. [Roma's departure announcement](https://www.asroma.com/it/notizie/46773/alisson-ceduto-a-titolo-definitivo-al-liverpool)
