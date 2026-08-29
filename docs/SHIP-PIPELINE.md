# Ship pipeline

How code gets from a session to douknowball.com. Every rule here was paid for.

---

## Which pipeline are you on

**Read this section first. There are two, and most of this document only describes one of them.**

| | Cowork session | claude.ai/code session |
|---|---|---|
| GitHub credentials | none | yes |
| Anthony's Windows folder | connected through the desktop bridge | not there at all |
| Route to `main` | zip plus bat, he double-clicks it | commit, push, PR |
| Zip, `RUNnn.bat`, `SHIPnn.bat` | required | **never build them** |
| Which chapters below apply | all of them | this one, plus **Deploying** |

**How to tell.** A claude.ai/code session is handed a branch name to develop on, has the GitHub
tools, and `git ls-remote origin` succeeds. A Cowork session has the desktop bridge tools and
`C:\Users\antho\ballpark-hero` instead. If you genuinely cannot tell, try the push: if it is
refused for want of credentials, you are on the Cowork path.

**Do not run the wrong one.** Packaging a zip from a claude.ai/code session writes files nobody
will ever click, into a folder that does not exist, while the actual change sits uncommitted.
Trying to push from a Cowork session just fails.

### Path A, claude.ai/code: commit and push

This is the short one, and it is now the normal one.

```
claude.ai/code session       GitHub                 Lovable            live
----------------------       ------                 -------            ----
edit the clone
  |
verification gates
  |
git commit
  |
git push -u origin <branch> --> your branch
                                  |
                             open a PR
                                  |
                             merged ----------> main
                                                  |
                                            preview rebuilds
                                                  |
                            you call deploy_project
                                                  |
                                            published --------> douknowball.com
```

Rules for this path:

- **Push to the branch you were given and nothing else.** Never push to `main` directly.
- **Do not produce `ROUNDnn_FILES.zip`, `RUNnn.bat` or a `SHIP` wrapper.** None of the packaging
  chapters below apply to you: not the round number reservation dance, not the findstr assertion
  rules, not the chain guard. They exist to make a Windows double-click safe, and you are not
  doing a Windows double-click.
- **The verification gates do not change.** Types, build, sims, sweeps, all still run before you
  commit. The bat assertions were a second net under those gates, and on this path the gates are
  the only net, so do not skip them.
- **A round is still a round.** Keep numbering rounds, keep the commit message style below, and
  keep updating `docs/PROJECT-STATE.md` in the same round.
- **The PR is the handoff.** `main` does not move until it merges, so the preview does not
  rebuild until it merges either, and `deploy_project` before that publishes the old code.

### Path B, Cowork: package a bat

```
Cowork session         Anthony's Windows machine        GitHub            Lovable            live
--------------         -------------------------        ------            -------            ----
edit clone
  |
package ROUNDnn_FILES.zip
  + RUNnn.bat
  |
device_commit_files -> C:\Users\antho\ballpark-hero
                              |
                       he double-clicks RUNnn.bat
                              |
                       tar -xf, assert, git add, commit, push --------> main
                                                                          |
                                                                    preview rebuilds
                                                                          |
                                                       you call deploy_project
                                                                          |
                                                                    published --------> douknowball.com
```

**A Cowork session can never push.** It has no credentials, by design. Every commit happens on
Anthony's machine when he double-clicks a bat. Do not try to work around this, and do not nag
him about unrun bats more than once.

**Everything from here to the Deploying section is Path B only.** Read the whole of it before
packaging your first round.

---

## Packaging a round

### Picking the round number, carefully

Round numbers are sequential and **never reused**. Getting this wrong collides with an
already-packaged round and is the most likely mistake a fresh session makes, because the
obvious method is wrong.

**`git log` alone is not enough.** Rounds sit packaged on Anthony's disk for days before he
clicks the bats, so the log routinely trails the real high-water mark by several rounds. The
correct number is:

> **one above the highest of: the highest `Round nn:` in `git log`, and the highest
> `ROUNDnn_FILES.zip` sitting in `C:\Users\antho\ballpark-hero`.**

`docs/PROJECT-STATE.md` states the next free number outright and is authoritative when it is
current. Cross-check it against the folder anyway; it costs one `device_list_dir` call.

Note that round 115 never existed. A gap in the sequence is not evidence of anything.

### What to deliver

Deliver **two** files per round into `C:\Users\antho\ballpark-hero`:

- `ROUNDnn_FILES.zip` containing every changed file at its repo-relative path,
  **plus `_commit_msg_nn.txt` inside the zip.** That is how every existing round does it: the
  bat extracts the zip before it reaches `git commit -F _commit_msg_nn.txt`, so the message file
  arrives at extraction time. Delivering a loose copy alongside does no harm, but the copy in
  the zip is the one that matters.
- `RUNnn.bat`

**Do not verify a zip's contents with `tar -tf` over the device bridge.** GNU tar on Linux cannot
read these archives and reports "This does not look like a tar archive", which reads as a
corrupt zip when the zip is fine. Windows `tar` is bsdtar and handles zip correctly, which is
why the bats work. To inspect a zip, stage it and open it with Python's `zipfile`.

When several rounds are queued, add or refresh a `SHIPn.bat` wrapper so Anthony gets one
double-click instead of five. See below.

Deliver via `SendUserFile` **and** `device_commit_files`. Both. The first puts it in the chat,
the second puts it on his disk where the bat can find it.

### Commit message style

**This part applies on both paths.** The message is the same whether a bat writes it or you do.

One line, lowercase after the round number, written as a plain sentence about what changed and
why it mattered. Look at the real log for the voice:

```
Round 130: the phone stops being a one shot novelty, because you asked to be able to continue the conversation and now you can.
Round 125: seven of the permanent guards had been failing since Round 119 and nobody knew, because nothing was checking the checkers.
Round 122: a ticking clock had quietly switched off the harness's own stall detection.
```

No em dashes. No conventional-commit prefixes. No bullet lists.

---

## The findstr assertion rules, learned the expensive way (Round 251, 2026-08-21)

**Read this before you hand-write or hand-edit any assertion.** Four separate bugs in this one
line shape kept a 97 round backlog off the live site for weeks. Each one made a fail-closed
check STOP a run that should have passed, so a ship looked like it worked and quietly quit
partway. Each was reproduced on Windows before it was fixed, and `pkg/mkbat.py` now emits the
correct shape while `pkg/verifybat.py` refuses to bless a bat carrying any of them.

The rules, all four:

1. **The file argument must use BACKSLASHES.** `findstr /C:"x" "src/lib/f.ts"` returns
   errorlevel 1 whether or not the pattern is there, because findstr rejects forward slash
   paths. Measured: same file, same pattern, forward slash quoted gives 1, backslash quoted
   gives 0. This alone killed 56 bats at Round 179, every attempt, for weeks.
2. **A double quote in the pattern must be escaped as `\"`.** cmd ends the quoted argument at
   the first raw quote, so any assertion quoting real code (an aria-label, a JSX prop, an array
   of strings) reaches findstr mangled. Escaped quotes match correctly AND a missing file or a
   wrong pattern still fail, so the check stays fail closed.
3. **Never mix a quote with a cmd operator (`>` `<` `|` `&`) in one pattern.** cmd tracks
   quoting by COUNTING quote characters and knows nothing about `\"`, so it believes the
   argument ended at the escape and treats a later `>` as a redirection. RUN209 asserted on a
   class string ending `">` and its check silently wrote a file instead of running. There is no
   reliable escape for this mix: pick a quote-free marker instead. mkbat refuses it.
4. **Never put a percent sign in a pattern.** cmd strips a lone `%` as variable expansion
   syntax, so the assertion looks for text the file does not contain. RUN251 asserted on a
   comment reading "the 40% wash measured 3.80" and stopped on a file that contained it
   verbatim. mkbat refuses it; pick another marker.

Two more constraints that are not bugs but will stop a run:

- **Patterns must be ASCII and single line.** The bat writer is ASCII only, so an emoji in a
  pattern cannot be emitted at all, and findstr matches per line, so a pattern spanning a
  wrapped comment can never match.
- **A SHIP wrapper must start at the FIRST UNCOMMITTED round.** Each bat's chain guard greps
  `git log --oneline -80`, so a wrapper beginning at an old round fails immediately once the
  head is more than 80 commits past that round's predecessor. After the big backlog landed, a
  157-to-253 wrapper died at RUN157 with "Round 156 is not in the log yet"; a 251-to-253
  wrapper ran clean.

**When a fifth one appears, test it, do not reason about it.** The method that worked every
time: write a throwaway bat that runs the candidate shapes against a known file, echo
`%errorlevel%` after each into a log, double-click it, read the log. Three of these four were
diagnosed in minutes that way after much longer spent guessing.

## Anatomy of a RUNnn.bat

Every one of these elements is required. Each exists because its absence broke something.

**This is a template, not copy-paste code.** `nn` and `nn-1` are placeholders you substitute
with real integers when you generate the file. `cmd.exe` cannot evaluate `nn-1`. Generate these
bats programmatically, with the numbers already filled in.

```bat
@echo off
setlocal
cd /d C:\Users\antho\ballpark-hero
set GIT_PAGER=cat
set PAGER=cat

echo === ROUND nn ===

REM 1. ALWAYS clear the lock first.
if exist ".git\index.lock" del /f /q ".git\index.lock"

REM 2. Self-skip if already committed.
git log --oneline -80 | findstr /C:"Round nn:" >nul 2>&1
if not errorlevel 1 (
  echo Round nn is already committed. Nothing to do.
  timeout /t 15
  exit /b 0
)

REM 3. Chain guard on the previous round.
git log --oneline -80 | findstr /C:"Round nn-1:" >nul 2>&1
if errorlevel 1 (
  echo STOP. Round nn-1 is not in the log yet.
  timeout /t 60
  exit /b 1
)

REM 4. Zip must exist, and must unpack.
if not exist "ROUNDnn_FILES.zip" ( echo STOP. zip missing. & timeout /t 60 & exit /b 1 )
tar -xf "ROUNDnn_FILES.zip"
if errorlevel 1 ( echo STOP. The zip did not unpack. & timeout /t 60 & exit /b 1 )

REM 5. Content assertions. FAIL CLOSED. Prove the new code actually arrived.
findstr /C:"SOME_NEW_MARKER" "src\lib\theNewFile.ts" >nul 2>&1
if errorlevel 1 ( echo STOP. the new code did not arrive. & timeout /t 60 & exit /b 1 )

REM 6. Explicit git add. NEVER -A.
git add -- path/one.ts path/two.tsx ...
if errorlevel 1 ( echo STOP. git add failed. & timeout /t 60 & exit /b 1 )

git commit -F _commit_msg_nn.txt
if errorlevel 1 ( echo STOP. Nothing committed. & timeout /t 60 & exit /b 1 )

git push origin main
if errorlevel 1 ( echo PUSH FAILED. The commit is safe, still local. & timeout /t 60 & exit /b 1 )

git log --oneline -3
echo.
echo Round nn pushed.
timeout /t 20
```

### Why each element is there

**1. `del /f /q ".git\index.lock"`.** A crashed git left a zero-byte lock behind on 14 August
and it silently failed **every commit for two days**. Nothing reported an error that looked like
the real cause. Clear it at the top of every bat, unconditionally.

Related: **the device bridge cannot delete files.** `rm` fails with "Operation not permitted",
and `mv` will report success while the unlink silently fails. This is exactly why the lock has
to be cleared Windows-side by the bat rather than from a tool call.

**2. Self-skip.** Anthony re-runs bats. He should be able to double-click the whole folder in
order without thinking about which ones already went.

**3. Chain guard.** Rounds build on each other. A round landing out of order produces a commit
that references files that are not there yet.

**4. Zip existence and unpack check.** `tar -xf` is available natively on Windows 10 and later.

**5. Content assertions, fail closed.** These are the real safety net, and they matter more than
they look. A green `npm run build` in the cloud does **not** prove the code exists on his disk,
because the sandbox mount serves stale reads. The assertion is the only thing that checks the
bytes that actually arrived. Assert on a marker string from the new code, and where a round
removes something, assert its **absence** too. Round 133 does both.

**6. Explicit `git add` file list, never `git add -A`.** `-A` would sweep in `.env`. The list
gets long; split it across several `git add --` lines with an errorlevel check after each, the
way `RUN133.bat` does.

### Deleting a file in a round (Round 272, first time this was needed)

A round normally only ever adds or overwrites: the zip carries files, `tar -xf` writes them, and
nothing is ever removed. Round 272 needed to remove one, `src/pages/CollegeHub.tsx`, which had
been dead since Round 270 replaced every hub with one shared component and which two permanent
harnesses were failing on. Leaving it meant either a permanently red board or widening two
guards to accommodate dead code, and both are worse than deleting it.

The shape, and it is deliberately not clever:

```bat
REM Round nn deletes src\pages\Foo.tsx. Guarded so a re-run cannot fail on it.
if not exist "src\pages\Foo.tsx" goto :nodel
git rm -q -- src/pages/Foo.tsx
if errorlevel 1 ( echo STOP. git rm failed. & timeout /t 60 & exit /b 1 )
:nodel
if exist "src\pages\Foo.tsx" ( echo STOP. Foo.tsx is still on disk. & timeout /t 60 & exit /b 1 )
```

Three things about it:

- **The existence guard is required, not defensive noise.** Bats get re-run. `git rm` on a file
  that is already gone returns non zero, and without the guard a perfectly successful round
  would refuse to run a second time before its self-skip could even help.
- **`git rm` and not `del`.** `del` leaves the deletion unstaged, and the explicit `git add --`
  list further down names only files that exist, so the removal would never reach the commit.
- **Assert the absence afterwards, outside the guard.** That is the fail-closed half. The
  positive assertions prove the new code arrived; this one proves the old code left.

The file must of course NOT be in the zip. Check that before delivering: a zip that still carries
it would write it back after `git rm` ran, and the absence assertion would then stop the round.

### Two more hard-won bat rules

- **Never put a `.bat` inside a zip with the same name as the bat that is currently running.**
  `cmd.exe` reads the running script by byte offset, so overwriting it mid-run makes the run die
  silently, part way through, with no error.
- **Write bats with CRLF line endings.** LF-only bats misbehave.

---

## SHIP wrapper bats

When several rounds are pending, wrap them so Anthony gets one double-click instead of five.

**The current wrapper is whichever one `docs/PROJECT-STATE.md` names.** Wrappers go stale the
moment a new round is packaged, because the round list is baked into the `for` loop. When you
package a round, either extend the existing wrapper or write the next one and record it in
`docs/PROJECT-STATE.md`. **Never point Anthony at a wrapper without checking that its `for` loop
includes every pending round**, or the rounds it omits will sit unshipped while everything looks
like it worked.

`SHIP5.bat` is the current one at time of writing, and it is the reference implementation:

```bat
set LOG=ship_log5.txt
echo Shipping rounds 131, 132, 133 and 134. > "%LOG%"
if exist ".git\index.lock" ( del /f /q ".git\index.lock" )
for %%R in (131 132 133 134) do (
  echo ----- RUN%%R ----- >> "%LOG%"
  if not exist "RUN%%R.bat" ( echo STOP. RUN%%R.bat is missing. >> "%LOG%" & goto :done )
  call "RUN%%R.bat" >> "%LOG%" 2>&1
  if errorlevel 1 ( echo STOP. RUN%%R exited non zero. >> "%LOG%" & goto :done )
)
:done
git log --oneline -6 >> "%LOG%" 2>&1
echo DONE >> "%LOG%"
type "%LOG%"
timeout /t 90
```

**Every bat must log.** `call RUNnn.bat >> ship_log.txt 2>&1`, then read it back with
`device_bash`. Without the log, a bat that failed and a bat that was never clicked look exactly
the same from the cloud side, and you will waste a session guessing.

---

## Deploying

**Both paths run this section. It is the only part of the pipeline they share, and it is the part
most often skipped.**

Landing on `main` rebuilds the Lovable **preview** only. douknowball.com serves the published
snapshot, which does not move on its own. On the claude.ai/code path, "landing on `main`" means
the PR merged: deploying before the merge publishes the code that was already there.

1. Confirm Lovable actually synced the commit. **Check `latest_commit_sha` in
   `mcp__Lovable__get_project` against `git rev-parse origin/main`; that sha is what a deploy
   builds.** Round 330 (2026-08-29) proved `read_file` is NOT a sync check: it served the new
   commit's content while `latest_commit_sha` sat one commit behind, two deploys in a row built
   without the round, and the live site verified stale both times. `read_file` reads the git
   mirror at head; the build source lags it. If the sha is behind, wait or push again to re-kick
   the webhook, and only deploy once the sha matches.
2. Call `mcp__Lovable__deploy_project` on `c29d224f-a662-4a15-b809-d86fa3b3f0ad`.
3. Wait about 5 minutes.
4. Verify **live**, properly. See below.
5. Once live is verified, run `node scripts/indexnowSubmit.mjs` from the cloud session. Bing is
   the number one traffic source and IndexNow (its push protocol, added Round 222) tells it and
   DuckDuckGo and Yahoo to recrawl in minutes instead of days. The script fails closed: it
   refuses to submit until it can read `public/<key>.txt` off the live site itself, so running
   it before the publish landed cannot mis-ping. After a small round, `URLS=/route1,/route2`
   scopes the ping to the pages that changed. Google ignores IndexNow and needs nothing here.

**`deploy_project` returning "pending" is not proof of anything.** It has returned pending while
Lovable sat on a commit several rounds old. If a publish hangs, the fallback is clicking Publish
in the Lovable editor by hand.

### Verifying live, properly

**`node scripts/auditLive.mjs` is the tool for this.** It asks the live site, as Googlebot, what
a crawler actually gets at each URL, and flags the five things that are always defects: a body
byte identical to the home page, fewer readable characters than the home page's own static block,
a missing or wrong canonical, more than one canonical or description, and anything that is not a
200. It does NOT follow redirects, on purpose, because following them reports the destination's
content under the source's name, which is the exact mistake it exists to catch.

```
node scripts/auditLive.mjs                 every URL in the sitemap
node scripts/auditLive.mjs /a /b /c        just these
BASE=https://staging.example.com node scripts/auditLive.mjs
```

It talks to the internet, so `runAllSims` never runs it. It is a tool for answering a question
about the live site, not a guard on the repo.

**Run it after every publish.** On its first run (2026-08-23) it found, in one command, that every
page on the live site was carrying TWO description tags, which a hand-built probe an hour earlier
had missed because that probe read the first tag instead of counting them. Round 276 fixes it, and
the point stands regardless: check the live site, not the queue.


Fetching the homepage and seeing it load proves nothing. Do this instead:

1. Fetch `https://douknowball.com` with a cache-busting param.
2. Read the `index-*.js` filename out of the HTML. If the hash has not changed, the deploy did
   not land.
3. Grep that entry bundle for the lazy chunk name of the route your round touched.
4. Fetch that chunk and grep it for a marker string from the new code.

Always cache-bust (`?v=134`, `/sitemap.xml?v=134`). **CDN edges serve stale copies for hours**,
so an uncached fetch will happily show you last week's build and you will conclude the deploy
failed when it worked, or worse, that it worked when it did not.

---

## The prerender rules, learned the same expensive way (Round 257, 2026-08-21)

Since Round 256 the site prerenders every sitemap route to a real HTML document so a crawler can
read it without running JavaScript. Those documents live in `public/` and are copied verbatim into
**every future build**, which is the source of all three traps below. Every one of them was
reproduced before being fixed, and every one of them is now fenced by a harness.

**1. A snapshot must contain no hashed path. Ever.**
`vite build` names the entry bundle `assets/index-HASH.js` and the hash changes on every build.
A snapshot that copied the built `<head>` verbatim therefore points at a file that will not exist
the moment anything ships. Proved in a headless browser: serve a fresh build alongside the
previous snapshot and `/soccer-career` 404s on the entry bundle **and on every lazy chunk**, and
`#root`'s first child is still the snapshot's own markup. The page has words on it and nothing on
it works, on every game, for anyone arriving from a search result. `public/prerender-boot.js` has
a stable name no build renames, and it reads the real tags off the live root document and injects
them. `simPrerender` section 6 fails on any `/assets/` reference in a snapshot; `simPrerenderBoot`
serves the shipping files to a real browser and requires React to take `#root` over.

**2. Never prerender the page you are serving as the SPA fallback.**
`scripts/prerender.mjs` serves `dist/` to itself and falls back to `dist/index.html` for every
route, because the routes do not exist as files yet. It also used to WRITE its snapshot of `/`
over `dist/index.html`. From that moment the fallback was a finished document instead of the app
shell, so the next 32 routes captured **the home page's text under their own names**. Caught only
because three unrelated routes came out at exactly 17,578 bytes. Two fixes, either of which alone
would have prevented it: the shell is read into memory once before anything is written, and the
script refuses to start if `dist/index.html` is not a real vite shell (no hashed entry module).
The home page is no longer prerendered at all, because the host regenerates it from the repo
template every build; it carries its content in `index.html` itself instead.

**3. Nothing dated may reach a snapshot.**
A snapshot sits on disk for weeks. "Italian Grand Prix at Monza, in nine days" is true for about a
day. Anything live or dated is marked `data-no-prerender` in the app and stripped by the
prerenderer, and `simPrerender` section 7 reads the calendar's own titles out of the source and
fails if one appears as a ticker line in a shipped file. The same principle as leaving the
database requests hanging, applied to data that lives in the bundle.

**Two operational notes.** The render browser dies on long runs (once at route 108 of 122,
leaving 14 stale snapshots), so it is recreated every 25 routes and retries once on a fresh one;
the run still exits non zero on any failure, so nothing stale can ship silently. And a full
prerender takes roughly 45 minutes for 121 routes, so run it once at the END of a round, after
every source change, not after each one. `PRERENDER_ONLY=/a,/b` re-renders a subset.

---

## Standard round checklist

Copy this into the round and tick it off.

- [ ] Re-staged and extracted every pending `ROUNDnn_FILES.zip` in numeric order, where
      **pending means round number strictly above the current head**. Never extract one at or
      below the head; `ROUND77_FILES.zip` and `ROUND87_FILES.zip` are still in that folder and
      would revert fifty rounds.
- [ ] `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` at **zero** errors
- [ ] `npm run build` clean
- [ ] `node scripts/runAllSims.mjs` all green, **and the harness count it reports matches what
      you expect**. A harness that is silently skipped reports as green by being absent. This
      has happened twice.
- [ ] `sweepGames` / `playGames` run if the round touched UI (`ENGINES=chromium`)
- [ ] Verified every changed file with the **Read/Grep tools**, not bash
- [ ] Zip built, content assertions written to fail closed, both directions where relevant
- [ ] Bat written with CRLF, lock clear, self-skip, chain guard, explicit `git add`
- [ ] `_commit_msg_nn.txt` written, no em dashes
- [ ] Delivered by `SendUserFile` **and** `device_commit_files`
- [ ] Before resetting the clone: every dirty file matches a delivered zip byte for byte
- [ ] `docs/PROJECT-STATE.md` updated with the new head, what is queued, any lesson learned

Keep a copy of everything you package outside the git clone, in a scratch directory that is not
a git repo (past sessions used `/home/claude/pkg`). When the clone reverts mid-turn, that copy
is the restore point. It is per-session scratch, so create it fresh each time rather than
expecting it to exist.

---

## When something breaks

There is no staging environment. The live site is the only environment, so know the way back
before you need it.

**A round pushed and the site is broken.** Do not try to fix forward under pressure. Revert.

**You cannot run this yourself.** The no-credentials rule still applies in an outage, so a
revert ships the same way everything else does: as a bat Anthony double-clicks. Write
`REVERT_<sha>.bat` immediately and deliver it, then tell him in one line that it is waiting and
what it does. Do not spend the outage trying to find a way to push.

A revert bat is the only exception to the standard anatomy. It has no zip and no new code, so
**elements 4 (zip existence and unpack) and 5 (content assertions) do not apply and must be left
out.** Keep the lock clear, keep the self-skip (grep the log for `Revert "<subject>"`), drop the
chain guard, and do not consume a round number: a revert is not a round.

```bat
@echo off
setlocal
cd /d C:\Users\antho\ballpark-hero
set GIT_PAGER=cat
set PAGER=cat
if exist ".git\index.lock" del /f /q ".git\index.lock"
git log --oneline -20 | findstr /C:"Revert" >nul 2>&1
if not errorlevel 1 ( echo Looks already reverted. Check the log. & timeout /t 30 & exit /b 0 )
git revert --no-edit <bad-sha>
if errorlevel 1 ( echo STOP. Revert failed, nothing changed. & timeout /t 60 & exit /b 1 )
git push origin main
if errorlevel 1 ( echo PUSH FAILED. The revert is safe, still local. & timeout /t 60 & exit /b 1 )
git log --oneline -3
echo Reverted. Tell Claude so it can republish.
timeout /t 30
```

Once it lands, `deploy_project` and verify live per the section above. The revert is not live
until you publish, exactly like any other commit.

**A push half-landed.** Commits are atomic, so this means the push failed after the commit
succeeded. The bat says so explicitly: "PUSH FAILED. The commit is safe, still local."
Re-running the same bat self-skips the commit and retries the push.

**The site is broken but the repo looks fine.** Suspect the deploy rather than the code. Check
whether Lovable is serving an older commit (`mcp__Lovable__read_file`), and check the live
`index-*.js` hash. A "successful" push with no publish is the single most common way the live
site diverges from the repo.

**Everything Supabase suddenly 404s or unauthorizes.** Check whether something started reading
`VITE_SUPABASE_*`. That points at a deleted project and takes the whole site down. See
`CLAUDE.md`.

**A commit fails for no visible reason, repeatedly.** `.git\index.lock`. Every bat clears it,
but a manual git run from a tool call will not have.

**A Supabase change broke something.** This is the gap in the recovery story, so be careful
going in. Migrations and edge function deploys do **not** flow through git, and there is no
staging project. Before any `apply_migration` or `deploy_edge_function`: save the current
version first (`get_edge_function` for the deployed source, a `select` of the affected rows or
schema for a migration) so there is something to restore. Write migrations to be reversible,
and run `get_advisors` after any DDL. Rolling back means deploying the saved version again, so
if you did not save it, there is nothing to roll back to.

---

## When the Windows folder is not available

**First check whether you can push.** No folder plus working credentials is not a degraded Cowork
session, it is Path A, and the answer is to commit and push, not to work around a missing bridge.
The rest of this section is for the genuinely stuck case: no folder **and** no push.

Path B assumes the device bridge and a connected `C:\Users\antho\ballpark-hero`. A session with
neither has two procedures that silently depend on it: picking the round number, and re-extracting
pending zips.

In that situation:

- Round number: you cannot see the packaged zips, so `git log` plus `docs/PROJECT-STATE.md` is
  all you have. **Take the number from `PROJECT-STATE.md` and say in your message which number
  you used and that you could not verify it against the folder.** Do not silently take
  `git log + 1`; that is how a collision happens.
- Pending zips: you cannot re-extract them. Say so plainly rather than assuming the clone is
  current.
- Delivery: `SendUserFile` still works, so a round can still be delivered into the chat. Anthony
  can download the zip and bat into the folder himself. Tell him that is what he needs to do.

Do not treat a missing bridge as a reason to stop working. It is a reason to be explicit about
what you could not verify.

Note that the round number problem is much smaller on Path A: two sessions cannot quietly collide
on a filename there, because each one is on its own branch and the collision surfaces as a normal
merge, not as a silently overwritten zip.
