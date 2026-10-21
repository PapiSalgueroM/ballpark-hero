# Legal pages review - 2026-07-02

Current operational update, 2026-10-21: the July review and owner decisions below are historical. The current account flow requires a 13+ confirmation. The individual operator and Massachusetts governing-law facts were reconfirmed by the owner. Use the updated access and deletion procedure below, rather than the old name-based procedure. Source changes alone do not establish deployment or legal compliance.

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

## OWNER DECISIONS MADE (2026-07-03, Anthony via chat)

1. Entity: individual owner doing business as DoUKnowBall. Terms Section 1 now states this.
2. Governing law: Commonwealth of Massachusetts, exclusive jurisdiction in Massachusetts state/federal courts. Terms Section 14 updated.
3. COPPA posture: keep the soft policy (option b): no age gate; under-13s asked not to create accounts without a parent; takedown contact provided. Revisit if ad revenue grows.
4. Deletion/access inbox: douknowball1@gmail.com with the 30-day response promise.
   (Corrected 2026-08-27: this doc previously recorded DoUknowBall.com@gmail.com, but the live
   pages, the contact page, the about page and the report relay all use douknowball1@gmail.com,
   one address in seven places, and that consistency is the thing worth protecting. The code was
   right, the doc was stale.)
5. Ad-tech disclosure upkeep: standing practice adopted: any new ad network, analytics tool, or third-party SDK must be added to Privacy Policy Section 4 in the same publish that ships it.

## Original open questions (resolved above, kept for context)

1. **Formal business name / entity.** The pages currently say "DoUKnowBall" as if it were the operating entity, with no LLC/company name, business address, or registered agent. If DoUKnowBall operates as an individual (not a formal company), the Terms should say so, or the owner should decide whether to form an entity before this matters (e.g., for the indemnification and liability sections to have a real party behind them).
2. **Governing law and venue.** "Laws of the United States... resolved in the applicable courts" is a vague placeholder inherited from the original draft. It does not name a state or a venue for disputes. A real jurisdiction (the owner's home state, most likely) should be chosen, ideally with a lawyer's input, especially once there is any revenue via AdSense.
3. **COPPA posture for the account feature.** The app markets to a general audience that "may include minors" per the task brief, has no age gate on sign-up, and now (correctly) discloses that accounts collect email. Legally, the safer and more common approaches are: (a) add an actual age gate or age-affirmation checkbox at sign-up, or (b) keep accounts fully optional with no targeted marketing to under-13 users and treat the current soft "ask for parent involvement" language as the whole policy. This review implemented option (b) as the honest description of current behavior, but only the owner (with a lawyer, if this app starts generating meaningful ad revenue) should decide whether that is sufficient or whether an age gate needs to be built.
4. **Data deletion SLA and mechanism.** The pages promise a 30-day response to deletion/access requests via a personal Gmail address (now `douknowball1@gmail.com`). That is functionally fine for a small site today, but the owner should confirm this inbox is actually monitored, and consider a dedicated support address if the site grows.
5. **Google AdSense / ad-tech disclosure completeness.** This review described AdSense and personalized ads at a level consistent with the existing cookie banner. If the owner later adds any other ad network, analytics tool (e.g., Google Analytics), or third-party SDK, the Privacy Policy's Section 4 list needs a matching addition; this was not preemptively added because no such integration currently exists in the codebase.

## Account access and deletion procedure (updated 2026-10-21)

Keep the existing 30-day access/deletion commitment for requests to douknowball1@gmail.com. Log receipt, verification status, deadline, scope and completion. Escalate unresolved cases before the deadline. Do not claim this document proves that the inbox is monitored, that a request was completed, or that every processor has a known retention period.

### Self-service source and release prerequisites

The own-profile account-data card calls `account-privacy`. Release it only after the reviewed migration, edge function and UI are deployed and the security checks pass. The endpoint gets the current user from Supabase Auth on every request. It accepts no client-selected user ID, email, SQL or table name. Export uses an explicit Auth field allowlist and one service-only SQL function with a fixed public-table field allowlist, so it neither exports Auth secrets nor silently loses rows to pagination.

The 15 direct account tables are `bootroom_save`, `daily_badges`, `daily_completions`, `fantasy_draft_votes`, `overrated_votes`, `profiles`, `saved_brackets`, `tier_list_votes`, `transfer_grade_votes`, `user_best_scores`, `user_game_scores`, `user_preferences`, `user_roles`, `user_scores` and the online `user_scores_bak_20260919`. Six Bootroom child tables are included through the user's save IDs: `bootroom_event_log`, `bootroom_facilities`, `bootroom_match`, `bootroom_save_player`, `bootroom_scout_report` and `bootroom_transfer_log`.

Deletion requires the exact confirmation `DELETE MY ACCOUNT` and a fresh password sign-in to the same server-verified account. The temporary confirmation session is revoked. The server then uses the hard-delete Auth admin API for that account alone. Database cascades cover all 15 direct tables and six children. The 11 newly added auth-user FKs are initially `NOT VALID`, which preserves historical orphan rows while enforcing new writes. Stale JWTs can remain cryptographically valid after Auth deletion, so the endpoint always performs a current `getUser` lookup, and the FKs prevent the deleted ID from recreating account-linked rows. The three guest-vote tables also restrict a non-null user ID to the caller's own ID.

The final deletion-time check lives in one private Auth DELETE trigger. It locks the Auth parent row, every existing subject role and MFA-factor row, then takes SHARE table locks on Storage objects and buckets before checking current admin access, verified MFA and Storage ownership. The existing role/factor Auth FKs prevent new child inserts while the parent is locked; the child row locks cover role/status-only updates. The fixed private trigger needs narrow definer rights because the Auth database role lacks role/Storage read grants. It uses an empty search path, exposes no arbitrary SQL, and is not a public RPC. Deletion outside Read Committed isolation is refused; that is the catalog-confirmed project default. Storage schema is not altered. Its SHARE locks cover in-flight writes and the deletion transaction, but a future trusted-service upload after deletion remains outside this feature's boundary. Current Storage has no client policies and source has no upload path, so a future upload feature must separately review stale JWT and owner attribution. Conflicting transactions can fail or deadlock and roll back; handle the actual failure through the verified manual path. Do not disable the guard or remove roles, factors or files without a verified request, supported APIs and administrative continuity.

Accounts with admin access, verified MFA, no usable email/password sign-in, or owned Storage objects/buckets need a verified manual case. Any failed authorization, preflight, password confirmation or Auth deletion leaves the endpoint without a successful deletion response. Storage ownership races can still make the Auth API refuse deletion; do not delete table rows first to work around that refusal. The UI clears the password field after each attempt, binds responses to the initiating account, and shows a confirmed deletion with an explicit Log Out next step. It does not automatically clear caches, sign out or navigate, because those actions could affect a different account activated while the response was pending. Browser-only game saves are not erased by account deletion.

### Manual cases and identity verification

1. Record the requested action and verify control of the account using a current authenticated session and supported reauthentication or an account recovery process. A matching From address, display name, username, guest handle, screenshot or claimed UUID alone is not sufficient authority to disclose or delete records. Resolve the verified Auth user ID once and use only that ID for account-linked work. Never paste credentials, tokens, full account exports or unnecessary personal data into the repository, chat, logs or tracking notes.
2. For account access, use the same fixed export scope after verification. Deliver the result through a channel whose control was verified. Do not send another account's data because its display name matches. A failure or oversized/unavailable response needs an operator case, not a truncated export labeled complete.
3. For admin accounts, arrange and verify administrative continuity before deletion. For MFA accounts, complete a supported factor challenge or verified recovery. For Storage ownership, identify only the verified subject's objects/buckets using both current `owner_id` and legacy `owner` metadata. Review what is shared and obtain the necessary disposition before removing files through the Storage API. Never delete Storage metadata directly with SQL, and never remove another owner's files to unblock a request.
4. Once prerequisites and intent are verified, use the supported hard-delete Auth admin operation for the exact subject ID with the reviewed cascades in place. Do not manually delete selected account tables first, and do not use a public arbitrary-SQL RPC. Verify completion using authorized, minimally scoped checks and report the actual outcome. A dropped response alone does not prove completion. The historical `private.r644_soccer_scores_bak` was absent from the 2026-10-21 catalog; only `private.app_secrets` was present there. Recheck metadata before assuming that inventory remains current, without reading secrets.

### Public play records, reports, inboxes and backups

`game_completions` uses player names rather than a verified account key. Do not export or delete those rows automatically by display name, username or guest handle. Name collisions can identify a different player. Ask for independent corroboration that narrows the specific records, disclose only records that can be attributed safely, and explain any records that cannot be reliably linked. Clearing site data on the requester's own device handles local data; warn that this also removes their browser-only progress. Do not clear every localStorage key as part of account deletion.

Bug reports and their free-text context can contain personal data independently of an account. A verified account ID does not automatically establish ownership of every matching report or inbox message. Review narrowly corroborated records and related copies separately, including the report relay, Gmail and FormSubmit where applicable. Do not forward a report merely to process a privacy request. Do not expose other people's content, internal secrets or unverified matching rows.

The online score backup is covered by the fixed export and cascade. Supabase infrastructure backups, other archived copies, Auth audit records and other provider logs, email copies, advertising/analytics data and AI-provider data are separate concerns. Their configured retention, deletion availability and processor contracts were not verified by this source audit. Do not invent a retention period or claim immediate removal from every backup. Track relevant requests and confirmed processor responses, record any legally required restriction or exception, and communicate the actual scope within the existing response deadline. If restoring a backup, reconcile verified completed deletions before serving restored account data. Keep any operational record limited to what is necessary for that reconciliation and handling the request, under an explicitly reviewed retention policy.

## Real fixture lists in Club Manager (added 2026-10-10, Release AT and Rounds 1184, 1213, 1225)

What ships. From Release AT a new original Premier League career in Club Manager opens on the real 2026/27
fixture list: which club plays which, home or away, in which matchday (the other lane's Round 1184,
`src/data/clubManagerPremierFixtures2026.ts`). Round 1213 added the same for nine more leagues as data files with
a receipt each under `scripts/data/` (Championship, La Liga, Ligue 2, Eredivisie, Primeira Liga, Serie A,
Bundesliga, 2. Bundesliga, Super Lig); Round 1225 binds them to the game. Each list was read on two independent
sources that agree row for row, and each receipt records both addresses and when they were read. Dates, kick
off times and results are NOT copied: the game simulates them and says so on the calendar.

What it is and is not. It is a list of facts: the order of matches of a public competition, the same kind of
fact as a league table or a result. It carries no logo, crest, kit, photo, broadcast listing, ticket data or
league artwork, and none of a publisher's text or layout: only club pairs by matchday, mapped to the names the
game already uses. The site says nowhere that a league endorses it; the footer disclaimer stands.

The working position (this is the lane lead's reasoning, not legal advice, and it is the owner's to overrule).
Facts as such are not protected by copyright in the United States. In the European Union the Court of Justice
held in Football Dataco v Yahoo (C-604/10, 2012) that a football fixture list is not protected by database
copyright unless its selection or arrangement is its author's own intellectual creation, which the work of
scheduling is not, and in the 2004 Fixtures Marketing and British Horseracing Board cases that the separate
database right does not cover the investment in CREATING the data. Two leagues still print a rights notice on
their published lists (both German lists read by Round 1213 say all rights to the list lie with the league
body), and a league can always ask.

The rule for the repo.
1. Only the matchday order of club pairs is taken, from two sources, with a receipt. Never a publisher's page,
   file, wording, dates grid or artwork, and never a list that only one source carries.
2. The game says what is real (who plays whom in which matchday) and what is simulated (dates, times, results).
3. If a league or a rights body asks for its list to be removed, it is removed the same day: each league is one
   line in the registry of `src/lib/clubManagerFixtures.ts` and one data file, and a career that already opened
   on a list keeps playing it from its own save (nothing is fetched at play time).
4. OWNER DECISION OPEN, raised 2026-10-10: ship the two German lists with the others (the lead's default, on
   the reasoning above), or hold those two until he says so. Until he answers they ship; the hold is one
   registry line each.
