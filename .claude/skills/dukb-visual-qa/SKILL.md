---
name: dukb-visual-qa
description: Use when reviewing how the site LOOKS (spacing, alignment, overlap, phone layouts, fold placement) or when the owner reports something looks off. Boxes and pixels, not vibes; screenshots plus measured rectangles.
---

# DoUKnowBall Visual QA

A screenshot of an overlapping navbar looks like a slightly busy navbar; two
rectangles intersecting by 65.9px is not an opinion. Measure first, then eyeball.

## The measuring kit

- Playwright at 320, 390, 430 and 1440, driven through
  scripts/lib/playwrightLoader.mjs against hostLikeServer or the live site.
- Bounding boxes for overlap (fail past half a pixel), document scrollWidth vs
  clientWidth for sideways bleed (a few px is rounding, more is a bug), element
  scrollWidth vs clientWidth for text truncation.
- Screenshots at set scroll stops for the eyeball pass, read as images. The
  eyeball judges what boxes cannot: text scale, crowding, hierarchy, whether a
  screen reads like a product or a spreadsheet.
- getBoundingClientRect is not clipped by overflow; when hunting sideways bleed,
  walk ancestors for an overflow-x container before accusing an element.

## The standing floors and ceilings

Tap targets 30px minimum in page content (44 is the ideal); the home page's first
game tile at or above y=430 on a 390 phone with at most two account asks above it
(playHomeFold); the wordmark and every header never truncated at 320 even with a
three digit streak flame (playIphone section 4, simMobileChrome name check); wide
tables scroll inside their own container, the page body never scrolls sideways.

## The worst rows, always tested

The widest state is never the empty one. Plant the nasty day before measuring:
five-figure points, three-figure streak, the full games count, the longest club
names, a save built with the real engine (simMobileChrome's WORST pattern). Every
sweep that runs as a fresh streakless guest is blind to the flame; say so when
signing off a header.

## Judgment rules already paid for

A repeated BADGE on genuinely new games is a fact; a repeated SUBTITLE under
different games is a constant standing in for a description; only the second is a
finding. Count PLACES, not elements, when tallying prompts (a span and a button
in one row are one place). A floating button transiently covering a row that
scrolls clear is a note, not a defect, when the button is owner-approved; the
same button permanently covering an unreachable value is a defect. Reveal
animations make mid-scroll screenshots look emptier than the page is; settle
before shooting. And the fix hierarchy is: structural guarantee first (wrap,
truncate, min-width) so the bug CANNOT return, cosmetic step-downs second so the
guarantee never visibly fires.
