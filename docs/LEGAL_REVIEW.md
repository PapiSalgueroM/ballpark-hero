# Legal pages review - 2026-07-02

Scope: `src/pages/PrivacyPolicy.tsx` and `src/pages/TermsOfService.tsx`. Only the text content inside these two components was changed. No other files were touched.

## What was wrong or missing

Privacy Policy:
1. Claimed "We do not require account creation, login, or any form of registration to use the Site" and implied zero personal data is ever collected, but the app has a working optional Supabase email/password login and Google OAuth login (`src/contexts/AuthContext.tsx`, `src/components/auth/AuthModal.tsx`) that store email, display name/username, avatar, and game scores/streaks in a `profiles` table. This was a real, material gap, not a wording nitpick.
2. No mention of Google Sign-In as a data source, even though it shares name, email, and profile picture with the app.
3. No mention of Supabase as the backend/hosting provider for account and score data.
4. Local storage section did not explicitly mention best scores or the cookie-consent flag itself being stored in local storage.
5. "How We Use Data" and "Data Retention" sections described only anonymous data, with no path for a signed-in user to access, correct, or delete their account data (no labeled "right to deletion" for account holders).
6. Children's privacy section flatly asserted "we do not knowingly collect any personal information from anyone, including children under 13," which stopped being true the moment optional accounts (collecting email) shipped with no age gate in the sign-up flow. This was the highest-risk inaccuracy in the whole page.
7. No mention of the in-game "Report" button, which does submit and store free-text data (`src/components/game/ReportQuestion.tsx`).
8. "Last updated" date was stale (March 8, 2026).

Terms of Service:
1. No "Accounts" section at all, despite accounts existing (sign-up conduct, responsibility for credentials, account suspension for abuse).
2. No mention of advertising/AdSense as a condition of using the free site.
3. "Age Requirement" section said "No account creation or personal information is required to use the Site," which is the same stale claim as the Privacy Policy and needed to be reconciled with the real, no-age-gate sign-up flow rather than just deleted.
4. "Last updated" date was stale (March 8, 2026).
5. Everything else (warranty disclaimer, liability limit, indemnification, non-affiliation/IP stance, governing-law placeholder, acceptable-use list) was already present and reasonable, and was left intact.

## What was changed

Privacy Policy (`src/pages/PrivacyPolicy.tsx`):
- Updated "Last updated" to July 2, 2026.
- Section 1 rewritten to disclose optional account data (email, display name/username, avatar, scores/streaks), and added a line for report-button submissions.
- Section 2 (Cookies & Local Storage) now explicitly covers best scores, the cookie-banner flag, and personalized-ad cookies, matching the actual banner copy ("we use cookies to improve your experience and show personalised ads").
- Section 3 (How We Use Data) now covers sign-in/leaderboards and ad personalization, and clarifies "we do not sell your data" (previously said "sell, rent, or share," which technically wasn't true once processors like Supabase and AdSense are counted; the section now names those processors and says we don't sell).
- Section 4 (Third-Party Services) adds Supabase and Google Sign-In as named data recipients, alongside the existing Google AdSense, Wikipedia REST API, and AI evaluation service entries.
- Section 5 renamed "Data Retention, Access & Deletion" and now gives account holders an explicit right to ask what data is held, correct it, or delete it, via the existing contact email.
- Section 6 (Children's Privacy) rewritten to be accurate: play requires no account and no personal information, but the optional account feature is not directed at children and asks that anyone under 13 not create one without a parent/guardian, with a takedown contact path. This does not claim COPPA compliance or an age gate, because neither exists in the code; it only describes the actual, honest posture.
- Section 8 (Contact) now also mentions the "Report" button as a channel for content-accuracy issues, separate from privacy questions.
- Removed all em dashes (replaced with colons or rephrased).

Terms of Service (`src/pages/TermsOfService.tsx`):
- Updated "Last updated" to July 2, 2026.
- Added new Section 4 "Accounts": no account required to play, responsibilities if you create one, grounds for suspension, link to Privacy Policy for data details.
- Added new Section 5 "Advertising": site is ad-supported via Google AdSense including personalized ads, link to Privacy Policy/cookie banner for opt-out.
- Renumbered all subsequent sections (old 4 through 13 became 6 through 15) to stay sequential.
- Section 12 "Age Requirement" rewritten to match reality: general audience, no account or personal info needed to play, optional account needs an email, ask for parent/guardian involvement if under 13, link to Privacy Policy.
- Removed the one em dash (in the page's SEO title string).

Both pages: confirmed valid JSX after edits (all tags balanced, entities intact), confirmed zero em dashes remain, and confirmed no changes were made outside the text content of these two files (imports, routing, component structure, and the footer/disclaimer block were left untouched).

## Decisions that need the owner or a lawyer, not just a copy fix

1. **Formal business name / entity.** The pages currently say "DoUKnowBall" as if it were the operating entity, with no LLC/company name, business address, or registered agent. If DoUKnowBall operates as an individual (not a formal company), the Terms should say so, or the owner should decide whether to form an entity before this matters (e.g., for the indemnification and liability sections to have a real party behind them).
2. **Governing law and venue.** "Laws of the United States... resolved in the applicable courts" is a vague placeholder inherited from the original draft. It does not name a state or a venue for disputes. A real jurisdiction (the owner's home state, most likely) should be chosen, ideally with a lawyer's input, especially once there is any revenue via AdSense.
3. **COPPA posture for the account feature.** The app markets to a general audience that "may include minors" per the task brief, has no age gate on sign-up, and now (correctly) discloses that accounts collect email. Legally, the safer and more common approaches are: (a) add an actual age gate or age-affirmation checkbox at sign-up, or (b) keep accounts fully optional with no targeted marketing to under-13 users and treat the current soft "ask for parent involvement" language as the whole policy. This review implemented option (b) as the honest description of current behavior, but only the owner (with a lawyer, if this app starts generating meaningful ad revenue) should decide whether that is sufficient or whether an age gate needs to be built.
4. **Data deletion SLA and mechanism.** The pages promise a 30-day response to deletion/access requests via a personal Gmail address (`footyfein1@gmail.com`). That is functionally fine for a small site today, but the owner should confirm this inbox is actually monitored, and consider a dedicated support address if the site grows.
5. **Google AdSense / ad-tech disclosure completeness.** This review described AdSense and personalized ads at a level consistent with the existing cookie banner. If the owner later adds any other ad network, analytics tool (e.g., Google Analytics), or third-party SDK, the Privacy Policy's Section 4 list needs a matching addition; this was not preemptively added because no such integration currently exists in the codebase.
