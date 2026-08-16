# Ship pipeline

How code gets from a cloud session to douknowball.com. Every rule here was paid for. Read the
whole thing before packaging your first round.

---

## The shape of it

```
cloud session          Anthony's Windows machine        GitHub            Lovable            live
-------------          -------------------------        ------            -------            ----
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

**The cloud session can never push.** It has no credentials, by design. Every commit happens on
Anthony's machine when he double-clicks a bat. Do not try to work around this, and do not nag
him about unrun bats more than once.

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

One line, lowercase after the round number, written as a plain sentence about what changed and
why it mattered. Look at the real log for the voice:

```
Round 130: the phone stops being a one shot novelty, because you asked to be able to continue the conversation and now you can.
Round 125: seven of the permanent guards had been failing since Round 119 and nobody knew, because nothing was checking the checkers.
Round 122: a ticking clock had quietly switched off the harness's own stall detection.
```

No em dashes. No conventional-commit prefixes. No bullet lists.

---

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

Pushing to `main` rebuilds the Lovable **preview** only. douknowball.com serves the published
snapshot, which does not move on its own.

1. Confirm Lovable actually synced the commit. Use `mcp__Lovable__read_file` on a file the round
   changed and check the new content is there. Lovable has stuck on an old commit before.
2. Call `mcp__Lovable__deploy_project` on `c29d224f-a662-4a15-b809-d86fa3b3f0ad`.
3. Wait about 5 minutes.
4. Verify **live**, properly. See below.

**`deploy_project` returning "pending" is not proof of anything.** It has returned pending while
Lovable sat on a commit several rounds old. If a publish hangs, the fallback is clicking Publish
in the Lovable editor by hand.

### Verifying live, properly

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

The whole pipeline above assumes the device bridge and a connected `C:\Users\antho\ballpark-hero`.
A web or mobile session, or one with no folder connected, has neither, and two procedures in
these docs silently depend on it: picking the round number, and re-extracting pending zips.

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
