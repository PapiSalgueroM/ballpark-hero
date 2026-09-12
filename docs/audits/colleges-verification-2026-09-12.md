# Guess The College data verification, 2026-09-12 (Round 535)

Target file: `src/data/colleges.ts` (70 schools, read by `/guess-the-college` through
`src/hooks/useGuessTheCollege.ts`). Before this round the file carried no provenance and no
harness, and every countable claim (championship counts, title years, enrollment, acceptance
rate) sat inside free prose where nothing could pin it.

Status: IN PROGRESS. Method and sources recorded first, per-school rows follow.

## Method

Two publishers per fact. Rows record old value, new value, both URLs and a verdict of
VERIFIED, CORRECTED or REMOVED. Blocked fetches are named here and never cited as evidence.
