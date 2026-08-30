# The Master Build Specification moved to docs/spec/

**The spec is not gone and nothing in it was cut. Read `docs/spec/README.md`.**

The owner's Master Build Specification, version 1.0 of August 2026, adopted in
Round 337, was 7,691 lines in this one file. The operating contract asked for it to
be split into per-part files with an index so a session can load the one section it
needs instead of the whole document, and Round 357 did that. The content lives in
`docs/spec/` as 29 parts covering all 361 sections, verbatim.

This file stays behind as a signpost rather than a second copy, because two copies
of a 7,691 line document drift and then nobody knows which one is the spec.

Where to go:

| You want | Read |
|---|---|
| The index, and which part holds a section | `docs/spec/README.md` |
| Whether a section is already shipped | `docs/SPEC-RECONCILIATION.md` |
| What to build next, and in what order | `docs/OPERATING-CONTRACT-2026-08.md` |
| What is claimed right now | `docs/WORKBOARD.md` |
| The overrides that beat the spec | `docs/OWNER-DIRECTIVES-2026-08.md` |

Section numbers did not change, so every reference written before the split still
resolves: section 68 is section 68, D115 is D115, Appendix Q is Appendix Q. The
lookup table at the bottom of `docs/spec/README.md` maps each one to its file.

`node scripts/simSpecSplit.mjs` reconstitutes the parts and checks the result against
the SHA-256 of the document as adopted, so the claim that nothing was cut is verified
on every suite run rather than promised here.
