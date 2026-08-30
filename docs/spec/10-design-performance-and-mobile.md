<!-- spec-part-header -->
> Part 11 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 93 to 99. Index: `docs/spec/README.md`. previous `09-tycoon-and-arcade.md`, next `11-social-daily-and-leaderboards.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# 93. HOME / GAME DESIGN SYSTEM

Every game should provide:
- immediate start;
- visible objective;
- minimal loading;
- clear feedback;
- score;
- progress;
- restart;
- share;
- report issue;
- help.

Avoid:
- long loading;
- unexplained mechanics;
- inconsistent controls;
- different help systems;
- random UI patterns.

---

# 94. PERFORMANCE

Target:
- fast first meaningful paint;
- lazy-load game-specific code;
- do not load all game engines on homepage;
- preload only likely next content;
- compress images;
- cache stable data;
- use CDN;
- batch API calls;
- avoid N+1 requests.

Interactive games:
- target stable 60fps where practical on supported devices;
- degrade gracefully on low-end hardware.

---

# 95. MOBILE

Every game must work on:
- phone portrait;
- phone landscape where useful;
- tablet;
- desktop.

Controls:
- touch targets large enough;
- no hover-only critical behavior;
- keyboard optional;
- labels available;
- responsive tables.

---

# 96. ACCESSIBILITY

Support:
- keyboard navigation;
- visible focus;
- semantic buttons;
- screen-reader labels;
- reduced motion;
- non-color-only feedback;
- accessible tables;
- accessible dialogs;
- readable contrast;
- captions/text equivalents where relevant.

Animations should have a reduced-motion mode.

---

# 97. ANIMATION SYSTEM

Shared states:
- idle;
- hover;
- select;
- success;
- failure;
- reveal;
- celebration;
- injury;
- warning;
- level-up;
- trophy;
- pack reveal.

Use a consistent visual language.

Don't add motion to every element just because it is possible.

---

# 98. CARD ART SYSTEM

Card templates:
- base;
- rare;
- epic;
- legendary;
- historical;
- special event.

Card fields:
- player;
- position;
- rating;
- sport;
- season;
- team;
- card type.

Animations:
- pack opening;
- reveal;
- rarity glow;
- walkout-style presentation.

Avoid unlicensed official card designs/logos.

---

# 99. SPORTS BINGO + DRAFT + CARDS SHARED DATA

Cards should be backed by canonical player records.

A card can reference:
- player ID;
- season;
- sport;
- team;
- rating;
- card rarity.

Do not create separate player databases for card games.

---
