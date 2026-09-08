# Consent and ad-placement follow-up

Read-only audit against the Round 514 candidate. No AdSense configuration, consent
architecture or ad placement was changed by this audit. Approval is not established.

## Consent

The September 2 console record in docs/adsense/reapply-readiness.md records a
published Google European regulations message targeting douknowball.com. Do not
claim a certified CMP is absent merely because source has no Funding Choices tag.

The current custom banner stores cookie-consent=accepted before loading AdSense
and analytics. AdSense also waits for a manual ad slot. Google's message depends
on its tag, so the custom prompt precedes the certified flow. The two records and
withdrawal actions are not explicitly synchronized. No present caller bypass was
found, but shared script loaders do not independently check stored consent.
CookieConsent's getItem/setItem are unguarded and can break the banner when storage
is blocked. Its simple consent record has no timestamp or message version.

Google's certification requirement explicitly covers personalized ads in the
EEA, UK and Switzerland; its current audit guidance also calls for certified
publisher consent mechanisms. Non-personalized treatment is not itself a waiver
of applicable cookie/data consent requirements. The current code sets NPA before
loading AdSense. This audit does not claim a proven live regulatory violation.

Next: verify the message is still Published and targets this domain. Test a fresh
visitor with Google's documented forced-message test from an EEA test context.
Inspect the actual prompt, TCF decision, request ordering and revocation control,
not a test where adsbygoogle.js is stubbed empty. If the flows diverge, make the
certified CMP authoritative and gate optional scripts from its actual decision.
Do not merely polish the custom banner and declare compliance.

A browser inventory reached the correct publisher's Sites URL on September 8,
but the control tool returned "Debugger unattached" before its page content could
be read. Current review status and CMP publication were therefore NOT reverified.
No settings or review submission were changed.

Sources checked September 8:

- https://support.google.com/adsense/answer/13554116?hl=en
- https://support.google.com/adsense/answer/16758589?hl=en
- https://support.google.com/adsense/answer/10961068?hl=en
- https://www.google.com/about/company/user-consent-policy/

## Ad spacing

Claude commit db5da6bd changes only AdBanner.tsx and playAdRoutes.mjs. Both parent
blobs match origin/main a4579db3, so that commit can be isolated without Club
Manager changes. It adds 120px top padding; existing callers' mt-8 yields at least
152px in its measured tight route. It is not merged or published here.

Verification limitations: it measures only controls above the slot, at 390px,
on three routes. Desktop checks width but not clearance. It has no permanent
spacing negative control or excess-gap ceiling. The component default my-6 plus
120px gives 144px, not a universal component-owned 150px floor.

Next: isolate safely, measure both sides across phone and desktop, and keep a
working negative control. Treat 150px as this project's conservative game-layout
target, not a universal Google rule. Google's explicit 150px recommendation is
under Flash gaming; its broader requirement is to avoid accidental ad clicks.

- https://support.google.com/adsense/answer/1346295?hl=en
