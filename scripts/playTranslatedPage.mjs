/**
 * Round 1140: a translated page in a real browser.
 * Round 1141: and whether what it shows is RIGHT (the sections marked 1141 below).
 *
 * WHY THIS EXISTS. On 2026-10-08 a player in Brazil could not create a Soccer
 * Career, and Try this page again failed the same way. His browser had
 * translated the page. A page translator does not edit text in place: it takes
 * each text node out of the document and leaves
 *   <font style="vertical-align: inherit;"><font ...>the translation</font></font>
 * where it stood, and it keeps doing that to whatever appears later. React
 * still holds the node it made. The next time React removes that node, or
 * inserts something in front of it, the browser throws NotFoundError, the
 * route falls into the error boundary, and the boundary's retry reloads into
 * the same translated page. src/lib/translateGuard.ts makes those two calls
 * tolerate a node that has been moved. Its unit tests prove the mechanism in
 * jsdom. This harness is the other half: the BUILT site, a real browser, the
 * real create flow, and eight more pages, under a translator.
 *
 * THE TRANSLATOR here is a copy of what the real one does, put in with an init
 * script so it survives a reload the way "always translate" does. From 400 ms
 * after the load event, and then after every change through a
 * MutationObserver, each non empty text node under body is taken out and
 * font > font > a new text node stands where it was, and html gets lang="pt"
 * and the class translated-ltr. Since Round 1141 it does that the way the real
 * translator was MEASURED to do it (Google's, loaded into a plain page, in
 * Portuguese, Japanese and German, 2026-10-08), because each of these changes
 * what a guard has to do:
 *   - it READS new text within a few milliseconds (SIM_READ, 4) and ANSWERS
 *     later (SIM_DELAY, 150) with the words it read, whatever the node says by
 *     then. SIM_LATE=0 makes it answer with the node's current words, which no
 *     translator does: it exists to tell what the guard owes from what the
 *     translator's own delay costs.
 *   - the swap is two steps: a font goes in BEFORE the node, then the node
 *     leaves (the record of the removal names the font as previous sibling).
 *   - a node it has taken once it never takes again, however often it is put
 *     back: the real one marks the node. Until it undoes itself: then every
 *     wrapper on the page gives back the very node it took (the node goes
 *     into the wrapper, its saved words are written to it, it comes out, goes
 *     in front, and the wrapper leaves), the marks are forgotten and html
 *     loses lang="pt". window.__walk.undo() plays that, as measured on the
 *     real one's own "show original" button.
 *   - text nodes side by side are one sentence, and the words are not kept
 *     node by node. The worst case measured is the one played: every wrapper
 *     of the run comes back empty but the last, which holds the sentence.
 * It leaves alone what the real one leaves alone: script,
 * style, textarea, noscript, title, iframe, svg, code, anything editable, and
 * anything under translate="no" or class notranslate (so a later repair that
 * marks a subtree that way can be tested with this same file). Two modes, and
 * a plain run does both: keep (the words stay) and alter (every piece of text
 * is rewritten inside a pair of marks, so nothing on screen reads as React
 * wrote it). Each swap remembers the words it took in a JS property, nothing
 * the real translator would not write goes into the DOM, and the walk finds
 * its controls by those ORIGINAL words and presses them with the mouse at
 * their position, so it works in both modes.
 *
 * WHAT IT WALKS, at 390 by 844 and at 1280 by 900, each in a fresh context:
 *   /soccer-career  the whole create flow (name, nationality Brazil, position,
 *                   era, the roll, a reroll, Customize your build and Lock in,
 *                   Begin Career), then the career itself until the save is a
 *                   year older, then on to twelve presses in all. Since the
 *                   review of Round 1141 the translator then undoes itself
 *                   and the career goes on to the next birthday and three
 *                   looks more (UNDO_PRESSES at most, 30).
 *   / /club-manager /nba-my-career /nfl-my-career /stadium-tycoon
 *   /college-grid /build-your-xi /front-office
 *                   the first eight things a player can press: the rules
 *                   dialog a first visit opens, then one control after
 *                   another, never the same one twice while another is left.
 *   /nba-my-career#bank (1141)
 *                   the same page walked on purpose: the rules sheet, Enter
 *                   the draft, The Bank, then money in and out five times.
 *                   Its statement draws {amount >= 0 ? '+' : ''}{figure}, so a
 *                   line that read -$100k has to read +$50k: a sign inserted
 *                   in FRONT of a string the translator took, that string
 *                   rewritten in the same commit, and later the sign removed.
 *                   The reproduction's insertBefore crash was here.
 *
 * WHAT IT ASSERTS, and none of it is only "the page did not crash":
 *   0. The served build really carries the guard: the entry chunk named in the
 *      served index.html holds the off switch __DUKB_NO_TRANSLATE_GUARD__ and
 *      the guard's console line. A control whose switch is not in the build
 *      proves nothing, so the noguard control refuses to run without it.
 *   1. The translator ran on every page (text nodes swapped, lang="pt"), and
 *      the guard is installed there.
 *   2. The create screen drew. All three picks registered: each select box
 *      holds its pick in its text, Brazil among them. And each pick can be
 *      READ in its box, which is not the same thing: the first line box of
 *      the words has to lie inside everything that clips it. Under Round 1140
 *      the nationality pick failed that and sat on KNOWN_HIDDEN_PICKS, a
 *      ratchet. Round 1141 emptied the list: all three must be readable. The
 *      nolive control used to expect that one hidden again; since Round 1096
 *      gave each placeholder a span of its own (Release AN) the box reads
 *      right with layer one alone, so the list is empty in every mode.
 *   3. The create flow REACHED the career: the hub's h1 holds the typed name,
 *      the create form is gone and the save in the browser is his.
 *   4. One season forward: the save is a year older and the hub still stands.
 *   5. On every page the walk really pressed things (at least two controls).
 *   6. The route error boundary never appears. It is matched as an ELEMENT,
 *      the h1 "This page broke" in the box that also holds the Try this page
 *      again button and the link home, never as a loose string.
 *   7. No NotFoundError, as a page error or in the console.
 *   8. Asked directly on every page, on a scratch element outside the
 *      document: a node is swapped out the way a translator swaps it, and
 *      removing it is quiet and inserting before it appends. This is the one
 *      check that does not lean on the app's own copy, so it still means
 *      something the day every string on the walk has a span of its own.
 *
 * WHAT IT ASSERTS SINCE ROUND 1141, on every walk but the noguard control's:
 *   10. The page says what React holds, at EVERY look (after every press).
 *       The judge is React's own tree. For each element that has strings of
 *       its own, the words React holds, in its order, are set against the
 *       words that element shows: its text nodes as they read and each
 *       translator wrapper by the words the translator took. A copy left
 *       behind, a number that did not move, a label that got lost and a
 *       figure frozen by the translator's delay all show as a difference,
 *       and each is printed with React's words, the screen's words and the
 *       element. It leans on neither the guard nor the walk's own bookkeeping,
 *       and the notranslate control proves it is silent on an ordinary page.
 *       Since the review: React's words are read from React's own record of
 *       each string, not from the text node (a translator that undoes itself
 *       writes its saved words into the node it took), and an element in
 *       which React holds no string any more is judged too: a translator's
 *       copy still standing there is a leftover (a placeholder that gave way
 *       to an element). Only wrappers count there, never plain text, which
 *       the page may have written by hand.
 *   11. Asked directly on every page, the way check 8 asks layer one, but IN
 *       the document where the guard can see the swap: a string is taken the
 *       way the translator takes it, and then the page removes it (the copy
 *       must leave with it), inserts in front of it (the new element must be
 *       in front, not at the end) and rewrites it (the page must show the new
 *       words). It does not lean on the app's own copy either. The judge of
 *       check 10 also lists every element it finds out of place among words,
 *       as a record, not as a pass or fail. No run has shown that list with
 *       anything in it so far, the nolive control's included, so it has not
 *       yet proven it can show anything: do not lean on it.
 *   12. No text the translator will never take again is back on the page: a
 *       guard that put React's own node back would leave the visitor's page
 *       half in the first language. The real translator never retakes one.
 *   13. Create walk: no box holds its placeholder beside its pick, by the
 *       words in it ("Choose positionStriker (ST)" is what layer one leaves).
 *   14. Create walk: the age in the hub's own line ("Striker · Age 17 · ...")
 *       is the age in the save at every look, and at least one of those looks
 *       came after a birthday, or nothing was measured and the check fails.
 *   15, 16. The Bank: all five moves were made and the statement has its
 *       lines, and every figure reads as a sign, a dollar and digits, in that
 *       order and with nothing behind it.
 *   9.  On a page nobody translated (the notranslate control) layer two did
 *       nothing: window.__dukbTranslateStats is there and every count is 0.
 *
 * WHAT IT ASSERTS SINCE THE REVIEW OF ROUND 1141 (the translator undoes itself:
 * "show original", a failed translation, the back and forward cache). Review
 * pressed the real translator's own button on the built site and found that
 * every string layer two had refreshed stopped following React for good (the
 * header read Age 19 with the save at 20), where layer one alone healed:
 *   17. Asked directly on every page, in the document: a string is taken,
 *       rewritten (layer two puts a stand in there), taken again, GIVEN BACK
 *       the way the real one gives back, and rewritten once more. The page
 *       must show the last words. Layer one alone passes this as well (it gets
 *       React's own node back), so it is not the nolive control's: it is red
 *       on a layer two that forgets who a stand in was made for, which is the
 *       reviewed build. That build was run against this file once, see below.
 *   18. Create walk: after the career presses the translator undoes itself
 *       (every wrapper on the page gives its node back) and the career goes
 *       on, to the next birthday and three looks more. No wrapper is left, the
 *       page says what React holds at every one of those looks, and layer two
 *       took nodes up again (its count of them is above zero).
 *   19. Create walk: after the undo the age in the hub's line is the age in
 *       the save at every look, at least one of them after a birthday that
 *       came after the undo, or nothing was measured and the check fails.
 *
 * WHAT IT COUNTS, as a record and not as a pass or fail: on how many pages
 * the guard printed its console line (it prints once a page), and, through a
 * recorder laid over removeChild and insertBefore that changes nothing and
 * only counts, how many calls on each page named a node its parent no longer
 * owns. Each of those is one crash the page would have had.
 *
 * WHAT LAYER ONE ALONE LEAVES, which is what Round 1140 shipped and what the
 * nolive control still shows. Layer one stops the crash. It does not put the
 * page right:
 *   - A leftover. The translator's copy of a removed text stays where it was.
 *     In the nationality box that copy is the placeholder, the box shows one
 *     line, and the pick (drawn as a block, with its flag) lands on a second
 *     line nobody sees: the box still READS "Choose national..." after Brazil
 *     is chosen, at both sizes. The pick is taken and the flow goes on.
 *   - Stale text. What React writes to a node the translator took never
 *     reaches the screen: the age line still says 16 when he is 18.
 *   - A new element that belongs in front of a translated string lands at the
 *     end: The Bank reads "-$100k+".
 * Round 1141's layer two ends all three for every game at once (see
 * src/lib/translateGuard.ts), and a fourth that no guard caused: a figure that
 * ticks and then stops used to end on an older value, because the translator
 * answers with the words it read a moment ago. The roll on the create screen
 * ended on 56 when React held 60.
 *
 * CONTROLS (PLAY_TRANSLATED_CONTROL=):
 *   noguard      sets window.__DUKB_NO_TRANSLATE_GUARD__ before the app boots,
 *                so the guard is not installed. The run must go RED for the
 *                reason this file exists: the boundary, with a NotFoundError
 *                behind it, on the create flow, at the nationality step. It
 *                then presses Try this page again and shows the same step
 *                break again. It also asks check 8's question on every page
 *                and must get NotFoundError both times, which keeps this
 *                control firing after the create flow's strings are wrapped.
 *                Exit 1 is the control firing. Exit 2 means it could not run
 *                or did not fire, and proves nothing. It also walks the other
 *                eight pages, which is the measurement of how wide the damage
 *                was without the guard.
 *   nolive       (1141) sets window.__DUKB_NO_TRANSLATE_LIVE__ before the app
 *                boots: layer one only, which is the build Round 1140 shipped.
 *                The run must go RED for layer two's own reasons while the
 *                page still STANDS: on every create walk stale text (check
 *                10) and the age line behind the save (14), and in The Bank
 *                a figure with its sign at the wrong end (16), with no
 *                boundary and no NotFoundError anywhere. A placeholder beside
 *                its pick (13) was the third thing it had to show on the
 *                create walk until Release AN: Round 1096 gave the three
 *                placeholders spans of their own, so layer one alone gets
 *                that right now (measured on the merged tree: 0 of 4 create
 *                walks, where Round 1141's own tree showed 4 of 4). The count
 *                is still printed, a 13 that fails still counts as its own,
 *                and this control can no longer make check 13 go red: its one
 *                known offender was mended at the source. The nospans control
 *                below is what holds check 13 now.
 *                Exit 1 is the control firing. Exit 2 means it did
 *                not fire, or a walk broke, or a check failed that has nothing
 *                to do with layer two, and proves nothing. Checks 18 and 19
 *                are its own too: with layer one alone the undo puts back
 *                copies React removed long ago and nodes holding the words
 *                the translator saved, wrong until React's next write.
 *   nospans      (Release AN, after review) check 13's own control. The create
 *                screen is served the way it was before Round 1096: in the
 *                build's script each of the three placeholders is a bare
 *                string again, not a span (three edits to what is SERVED,
 *                nothing on disk), with layer two off as under nolive. Only
 *                the create page is walked. A placeholder must then stand
 *                beside its pick, and check 13 must be red, on EVERY create
 *                walk, while the page stands. Exit 1 is that. Exit 2 means
 *                the served script did not hold the three placeholders in the
 *                shape the control rewrites (it changed nothing), layer two
 *                ran, a walk broke, a check outside its own list failed
 *                (2, 13 and the nolive list), or 13 stayed green somewhere.
 *                Measured on a GitHub runner, 2026-10-08: 79 checks, 28
 *                failed, which is checks 2, 10, 11, 13, 14, 18 and 19 on
 *                each of the 4 create walks; every box read its placeholder
 *                beside its pick ("Choose nationalityBrazil"). The plain run
 *                of the same build: 447 checks, 0 failed.
 *   undocopies   (after review) both layers on, and the translator's undo
 *                gives back a COPY of every node it took in place of the node
 *                itself. No translator was seen to do that and no guard can
 *                follow it, which is the point: everything before the undo
 *                must stay green, and checks 18 and 19 must go red on every
 *                create walk (stale text, the age line behind the save). Exit
 *                1 is the control firing, exit 2 means it did not or something
 *                else failed. It shows the two checks able to fire. That the
 *                FIX is what keeps them green is shown by the reviewed build
 *                itself, run against this file once (see the numbers below).
 *   notranslate  the same walk with the translator off. It must stay green
 *                AND count zero console lines and zero moved nodes: the guard
 *                does nothing on an ordinary page. Since 1141 it is also where
 *                the judge of check 10 is itself judged (no stale text and
 *                nothing out of place on a page nobody touched) and where
 *                layer two must have done nothing at all (check 9).
 *
 * COST=1 (1141) is not a check. It times an untranslated create walk, and a
 * burst of the calls React makes, on three builds of the same page (both
 * layers, layer one only, no guard), COST_REPS times each, and prints the
 * numbers that stand below.
 *
 * MEASURED 2026-10-08 on the Release AL tree with the guard in it, on a GitHub
 * runner, three runs of the plain walk giving the same numbers each time:
 *   plain        238 checks, 0 failed, 36 walks in 119 s three at a time (363 s
 *                one at a time). The create walk is 22 steps and in every one
 *                of its four walks 9 calls named a moved node, all of them
 *                nodes the translator took: the three placeholders, the
 *                position and era labels twice each (opening the build screen,
 *                then Begin Career), the Latest Events line once and the
 *                plural "s" of "events remaining" once. The guard printed its
 *                line on those 4 page loads and on none of the other 32: the
 *                eight other pages made no such call in eight presses each.
 *                Stale text, most on screen at once: 6 on Soccer Career, 3 on
 *                Front Office, 2 on Stadium Tycoon. The nationality box was
 *                HIDDEN in 4 of 4, position and era readable in 4 of 4.
 *   noguard      exit 1. 166 checks, 28 failed: seven on each of the four
 *                create walks and nothing else. The boundary took the page at
 *                "choose nationality Brazil" in 4 of 4, the retry broke at the
 *                same step in 4 of 4, and asked directly both calls threw
 *                NotFoundError on 36 of 36 pages. None of the other eight
 *                pages reached the boundary.
 *   notranslate  exit 0. 121 checks, 0 failed, 18 walks: 0 pages printed the
 *                guard's line, 0 moved nodes, all three boxes readable.
 *   deeper, once (PAGE_PRESSES=24 CAREER_PRESSES=30 MODES=keep): the create
 *                walk went to age 20 in 40 steps with 12 such calls; the other
 *                eight pages still made none in 24 presses each, and still did
 *                not break without the guard. Stale text showed on five of the
 *                nine pages by then (7 on Soccer Career, 3 each on NBA My
 *                Career, NFL My Career, Stadium Tycoon and Front Office). So
 *                in what these walks reach the crash is Soccer Career's, and
 *                the stale text is everybody's. College Grid's walk is its two
 *                dialogs only: its puzzle comes from the database, which no
 *                walk here may reach.
 *
 * MEASURED FOR ROUND 1141, 2026-10-08, on a GitHub runner, with both layers in
 * the build and the translator answering late the way the real one does (the
 * Round 1140 numbers above are from before any of this and stay as its record;
 * the Bank walk added four walks, so the counts are not comparable line by line):
 *   plain        exit 0. 399 checks, 0 failed, 40 walks. No stale text at any
 *                look on any page (up to 1,058 elements with words of their
 *                own judged at one look). 64 calls named a moved node, 9 on
 *                each create walk and 7 on each Bank walk, and layer two put
 *                every one through: layer one had to fall back, and printed
 *                its line, on 0 of 40 page loads. Layer two saw about 27,200
 *                text nodes taken, put 44 removals and 20 inserts through and
 *                handed about 1,600 strings back fresh (27,241 and 1,619 in
 *                this run, 27,254 and 1,644 in the next one on the same build:
 *                the walks wait on the page, so counts like these move a
 *                little from run to run). All three boxes readable in
 *                4 of 4. The age line was right at 13 of 13 looks, 12 of them
 *                after a birthday. The Bank's statement after the five moves:
 *                +$200k, -$200k, +$50k, +$50k, -$100k.
 *   nolive       exit 1, red on purpose. 399 checks, 74 failed (73 in the next
 *                run: how many walks show stale text moves by one) and every
 *                one its own: asked directly on 40 of 40 pages (the copy stayed,
 *                the element landed at the end, the page still showed the copy
 *                of 16); stale text in 22 of 40 walks, 52 different, 6 on
 *                screen at once at most (three runs gave 52, 54 and 57); a
 *                placeholder beside its pick in 4 of 4 create walks; the age
 *                line behind the save in 4 of 4; The Bank reading "-$100k+" in
 *                4 of 4. No boundary and no NotFoundError in 40 walks.
 *   notranslate  exit 0. 222 checks, 0 failed, 20 walks: every count of layer
 *                two at 0 on every page, and the judge of check 10 silent.
 *   noguard      exit 1, red on purpose. 183 checks, 36 failed, as before.
 *   deeper, once (PAGE_PRESSES=24 CAREER_PRESSES=30 MODES=keep): exit 0, 201
 *                checks, 0 failed, 20 walks, the career to age 20: the age
 *                line right at 31 of 31 looks, 2,227 strings handed back, 38
 *                moved node calls, 0 fallbacks.
 *   before the fourth rule (a string rewritten under the translator), the
 *                plain run was RED, 12 of 399: the roll on the create screen
 *                read 56, 53 or 65 when React held 60, and the title of the
 *                guide under four games kept its first words. With SIM_LATE=0
 *                the same build was green, which is how the cause was told
 *                apart: the translator's own delay, not the guard.
 *   the real translator, not this copy: src/lib/translateGuard.ts was bundled
 *                as it ships and loaded into a plain page under Google's
 *                translator, in Portuguese, Japanese and German, and the page
 *                made React's calls. Every outcome was right in all three:
 *                "Age 16" rewritten to 17 read "17 anos"; the number removed
 *                from "Striker · Age 16 · England" left "Atacante · Idade ·
 *                Inglaterra"; a word inserted before "3" gave "Você só tem 3
 *                gols nesta temporada."; forty rewrites 50 ms apart ended on
 *                "Minuto 41"; a hundred left exactly two nodes; The Bank's
 *                line read "+ US$ 50 mil"; a string rewritten 5 ms after it
 *                appeared showed its SECOND words; a roll of forty ticks ended
 *                on its last value. One rewrite caused exactly two swaps, one
 *                for each string of the pair, at 1.5 s and still two at 6 s.
 *   COST         three runs of each build, the middle one, untranslated, given
 *                as both layers / layer one only / no guard, on two machines.
 *                The create walk and 30 presses: script 0.92 / 0.93 / 0.92 s,
 *                tasks 3.02 / 2.92 / 2.99 s. The create walk and 12 presses:
 *                script 0.51 / 0.48 / 0.54 s. Then 25 s of a season lived week
 *                by week at 3x, five matches started in every run: script
 *                0.31 / 0.28 / 0.29 s, tasks 1.77 / 1.57 / 1.64 s, and the
 *                three runs of one build differ by more than the builds do.
 *                The calls themselves: 100,000 rewrites 91 / 86 / 85 ms and
 *                60 / 49 / 51 ms (60 to 110 billionths of a second each);
 *                20,000 inserts and removals of an element 81 / 65 / 60 and
 *                59 / 51 / 61 ms; 20,000 of a text node 84 / 56 / 56 and
 *                48 / 40 / 41 ms (1.4 millionths of a second a pair at most).
 *                Nothing a person could see, and on the real page nothing the
 *                numbers can tell from noise.
 *
 * MEASURED AFTER THE REVIEW OF ROUND 1141, 2026-10-08, on a GitHub runner (what
 * stands above is from before it and stays as that build's record; checks 17
 * to 19 add 48 checks to a full run):
 *   plain        exit 0. 447 checks, 0 failed, 40 walks. THE UNDO on the four
 *                create walks: the translator gave back 308 nodes each time
 *                and layer two took all 308 up again; the career went on for
 *                7 presses and 8 looks with no stale text at any of them, and
 *                the age line was right at 8 of 8, 3 of them after a birthday
 *                that came after the undo. Asked directly (17): right on 40
 *                of 40 pages. 68 calls named a moved node, 0 fallbacks.
 *   nolive       exit 1, red on purpose. 447 checks, about 80 failed (78, 79
 *                and 87 in three runs: in how many of the 40 walks layer one
 *                shows stale text moves with the timing of the walk), every
 *                one its own (10, 11, 13, 14, 16, 18, 19). After the undo: up to 6
 *                stale texts at once and the age line wrong at 5 of 8 looks.
 *                The judge's new branch (a copy left in an element whose own
 *                strings have all gone) fired in 4 of 4 create walks here and
 *                in 0 of 40 walks of the plain run.
 *   undocopies   exit 1, red on purpose. 447 checks, 8 failed: 18 and 19 on
 *                the four create walks and nothing else. After the undo up to
 *                4 stale texts at once, the age line wrong at 3 of 8 looks.
 *   notranslate  exit 0. 242 checks, 0 failed, 20 walks, every count of layer
 *                two at 0.
 *   noguard      exit 1, red on purpose. 183 checks, 36 failed, as before.
 *   the reviewed build (src/lib/translateGuard.ts as it stood at 3a0fa96e, put
 *                back, built and walked by this file, ONLY=/soccer-career):
 *                exit 1, 79 checks, 12 failed, which are 17, 18 and 19 on all
 *                four create walks and nothing else. Asked directly it "still
 *                shows 17"; after the undo 8 different stale texts and the
 *                header at Age 18 with the save at 19. So the three checks
 *                are red on the defect review found and green on the fix.
 *   the real translator undoing itself (its own "show original" button, the
 *                module bundled as it ships, Portuguese): 15 of 15 nodes came
 *                back and were taken up again. Then "Age 17" rewritten read
 *                "Age 18", a removed number left, an inserted word landed in
 *                front. "Translate" pressed again took the same nodes and the
 *                page followed ("19 anos"), a second undo and it followed
 *                again ("Age 20"). No page error.
 *   what the real translator does not take: strings rewritten on the page
 *                BEFORE its first pass came back from that pass in the first
 *                language (rule four hands them back while it is not
 *                listening) and stayed so until something else on the page
 *                changed. With the hand over again in the module they read
 *                translated at the first look, 3 s on, in Portuguese and in
 *                German. This copy of the translator always listens, so it
 *                cannot show that: only the unit tests and that measurement
 *                hold it. A line ticking once a second read translated at 105
 *                to 120 of 120 samples 100 ms apart over four runs (the first
 *                language shows for a tenth of a second or two after a tick),
 *                eight such lines together at 101 to 120, at one request a tick.
 *   COST         again after the fix round, one runner, the middle of three runs,
 *                both layers / layer one only / no guard. On a page nobody
 *                translated the fix round added one look at each node a batch
 *                of changes brought in, and no timer is ever set. The create
 *                walk and 12 presses: script 0.77 / 0.76 / 0.76 s, tasks 2.05
 *                / 2.04 / 2.05 s. A season week by week: script 0.27 / 0.27 /
 *                0.27 s, tasks 1.44 / 1.45 / 1.46 s. The calls alone: 100,000
 *                rewrites 90 / 81 / 82 ms; 20,000 inserts and removals of an
 *                element 87 / 61 / 59 ms and of a text node 88 / 66 / 51 ms
 *                (under two millionths of a second a pair). Still nothing the
 *                real page can tell from noise.
 *
 * Run: npm run build, then ENGINES=chromium node scripts/playTranslatedPage.mjs
 * (Chromium only: it is where page translation lives). BASE names the server,
 * default http://localhost:4173; when nothing answers there and dist/ exists
 * it serves dist/ itself through scripts/lib/hostLikeServer.mjs. ONLY=/route
 * (comma separated, MSYS_NO_PATHCONV=1 under Git Bash), VIEWS=phone,desktop
 * and MODES=keep,alter scope a run, VERBOSE=1 prints every step, SHOTS names a
 * folder for screenshots. Three walks run side by side (JOBS=1 for one at a
 * time), each with its own context and its own seeded dice, and every wait is
 * for something on the page (the translator has caught up, the button is
 * back), so a slow machine is a slow run and not a red one. PAGE_PRESSES and
 * CAREER_PRESSES deepen a walk, UNDO_PRESSES caps the presses after the undo.
 * ONLY=/nba-my-career#bank walks The Bank alone.
 * SIM_READ, SIM_DELAY and SIM_LATE set how the translator reads and answers.
 * COST=1 (with COST_REPS, COST_WEEK_MS) measures and checks nothing. Every request that is not the local server is
 * aborted (the database host by its own rule, on every page) except the flag
 * images, which are answered with one local pixel.
 *
 * Green is the closing "playTranslatedPage: N checks, 0 failed" line AND exit 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const env = process.env;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BASE = (env.BASE || env.SWEEP_BASE || 'http://localhost:4173').replace(/\/+$/, '');
const CONTROL = env.PLAY_TRANSLATED_CONTROL || '';
const KNOWN_CONTROLS = ['noguard', 'nolive', 'notranslate', 'undocopies', 'nospans'];
/* nospans is nolive on a create screen served WITHOUT Round 1096's placeholder spans (see the header) */
const LAYER_ONE_ONLY = CONTROL === 'nolive' || CONTROL === 'nospans';
/* the three placeholders as the build holds them since Round 1096: an element of their own, <span>Choose ...</span> */
const UNSPAN = /[\w$]+\.jsx\("span",\{children:"(Choose (?:nationality|position|era))"\}\)/g;
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`PLAY_TRANSLATED_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN_CONTROLS.join(', ')})`);
  process.exit(2);
}
const V = !!env.VERBOSE;
const SEED = Number(env.SEED || 20261008);
const SIM_DELAY = Number(env.SIM_DELAY ?? 150);
const SIM_START = Number(env.SIM_START ?? 400);
/* The real translator read new text within 5 ms and answered 48 to 150 ms later. SIM_LATE=0 makes the
   answer use the words the node holds when it lands, which no translator does: it is there to tell
   apart what the guard owes from what the translator's own delay costs. */
const SIM_READ = Number(env.SIM_READ ?? 4);
const SIM_LATE = env.SIM_LATE !== '0';
const CAREER_PRESSES = Number(env.CAREER_PRESSES ?? 12);
/* after the translator undid itself: at most this many presses, fewer once a birthday and three looks have gone by */
const UNDO_PRESSES = Number(env.UNDO_PRESSES ?? 30);
const PAGE_PRESSES = Number(env.PAGE_PRESSES ?? 8);
const SHOTS = env.SHOTS || (env.RC_OUT ? path.join(env.RC_OUT, `translated-${CONTROL || 'plain'}`) : '');
const OUT_JSON = env.OUT_JSON || (env.RC_OUT ? path.join(env.RC_OUT, `playTranslatedPage-${CONTROL || 'plain'}.json`) : '');

/* Git Bash rewrites an env value like /club-manager into C:/Program Files/Git/club-manager: undo that. */
const unGitBash = s => s.replace(/^[A-Za-z]:[\\/].*?[\\/]Git(?=[\\/]|$)/, '').replace(/\\/g, '/') || '/';
const CREATE_ROUTE = '/soccer-career';
/* Round 1141: the second scripted walk. Same page as /nba-my-career, walked into The Bank, whose
   statement is the site's insertBefore case: a plus sign that has to land in front of a figure. */
const BANK_ROUTE = '/nba-my-career#bank';
const ALL_ROUTES = [CREATE_ROUTE, '/', '/club-manager', '/nba-my-career', BANK_ROUTE, '/nfl-my-career', '/stadium-tycoon', '/college-grid', '/build-your-xi', '/front-office'];
const ONLY = env.ONLY ? env.ONLY.split(',').map(s => unGitBash(s.trim())).filter(Boolean) : null;
const ROUTES = CONTROL === 'nospans' ? [CREATE_ROUTE] : ONLY ? ALL_ROUTES.filter(r => ONLY.includes(r)) : ALL_ROUTES;
const VIEW_SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
const VIEWS = (env.VIEWS || 'phone,desktop').split(',').map(s => s.trim()).filter(v => VIEW_SIZES[v]);
/* notranslate has one mode, "off". Everything else runs keep and alter. */
const MODES = CONTROL === 'notranslate' ? ['off'] : (env.MODES || 'keep,alter').split(',').map(s => s.trim()).filter(m => m === 'keep' || m === 'alter');
if (!ROUTES.length || !VIEWS.length || !MODES.length) {
  console.error(`nothing to walk: ONLY=${env.ONLY || ''} VIEWS=${env.VIEWS || ''} MODES=${env.MODES || ''}. NOT CHECKED.`);
  process.exit(2);
}

const PLAYER = 'Joao Teste';
const NAT = env.NAT || 'Brazil';
const POS = env.POS || 'Striker';
const ERA = env.ERA || 'Current era';
const PICKS = [['nationality', NAT], ['position', POS], ['era', ERA]];
/* Round 1140 kept the nationality box on this list: with layer one alone it still READS "Choose
   national..." after a pick, because the translator's copy of the placeholder stays in the box.
   Round 1141's layer two removes that copy, the ratchet said "take the name off", and it is off:
   every pick must be readable. Under the nolive control layer two is switched off and the box was
   hidden again, until Round 1096 gave the placeholder a span of its own (Release AN): with that the
   box reads right under layer one alone, the ratchet said "take the name off" a second time (4 of
   4 create walks on the merged tree), and the list is empty in every mode. */
const KNOWN_HIDDEN_PICKS = [];
const BOUNDARY_WORDS = 'This page broke';
const RETRY_WORDS = 'Try this page again';
const SWITCH = '__DUKB_NO_TRANSLATE_GUARD__';
const SWITCH_LIVE = '__DUKB_NO_TRANSLATE_LIVE__';
const GUARD_LINE = 'a node this page no longer owns';

const failed = [];
let checksRun = 0;
/* Walks run side by side, so each one keeps its own lines and prints them together when it ends. */
function checkLine(name, ok, detail, out = console.log) {
  checksRun += 1;
  const line = `${name}${detail ? ': ' + detail : ''}`;
  if (ok) { out(`  PASS  ${line}`); return true; }
  failed.push(line);
  out(`  FAIL  ${line}`);
  return false;
}

let server = null;
let browser = null;
async function stop(code) {
  try { if (browser) await browser.close(); } catch { /* already gone */ }
  if (server) server.kill();
  process.exit(code);
}

/* ------------------------------------------------------------------ *
 * The server, and check 0: the build that is served carries the guard.
 * ------------------------------------------------------------------ */
async function answers() {
  try { const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(4000) }); return r.ok; } catch { return false; }
}
if (!(await answers())) {
  const u = new URL(BASE);
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (!local || !fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error(`nothing answers at ${BASE}${local ? ' and dist/index.html is missing: run npm run build first' : ''}. NOT CHECKED.`);
    process.exit(2);
  }
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(u.port || 80)], { stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 40 && !up; i += 1) { await new Promise(r => setTimeout(r, 250)); up = await answers(); }
  if (!up) { console.error(`could not serve dist/ at ${BASE}. NOT CHECKED.`); await stop(2); }
}

console.log(`playTranslatedPage: ${BASE}${server ? ' (dist/ served by this run)' : ''}, ${ROUTES.length} page(s), views ${VIEWS.join(' and ')}, text ${MODES.join(' and ')}${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

async function served(urlPath) {
  const r = await fetch(BASE + urlPath, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${urlPath} answered ${r.status}`);
  return r.text();
}
const indexHtml = await served('/');
const scriptTags = [...indexHtml.matchAll(/<script\b[^>]*>/g)].map(m => m[0]);
const entryTag = scriptTags.find(t => /type="module"/.test(t) && /\bsrc="[^"]+\.js"/.test(t)) || '';
const ENTRY = (entryTag.match(/\bsrc="([^"]+\.js)"/) || [])[1] || '';
let entryText = '';
if (ENTRY) { try { entryText = await served(ENTRY); } catch (e) { console.log(`  the entry ${ENTRY} could not be fetched: ${String(e).slice(0, 80)}`); } }
const switchInBuild = entryText.includes(SWITCH);
checkLine(`0. the served entry chunk (${ENTRY || 'none named in index.html'}) holds the guard's off switch ${SWITCH}`, switchInBuild);
checkLine('0. the served entry chunk holds the guard\'s console line', entryText.includes(GUARD_LINE));
if (CONTROL === 'noguard' && !switchInBuild) {
  console.error('control "noguard" cannot run: its switch is not in the served build, so setting it would change nothing. NOT CHECKED.');
  await stop(2);
}
const liveInBuild = entryText.includes(SWITCH_LIVE);
checkLine(`0. the served entry chunk holds layer two's off switch ${SWITCH_LIVE}`, liveInBuild);
if (LAYER_ONE_ONLY && !liveInBuild) {
  console.error(`control "${CONTROL}" cannot run: layer two's switch is not in the served build, so setting it would change nothing. NOT CHECKED.`);
  await stop(2);
}

/* ------------------------------------------------------------------ *
 * How the career is walked once it exists: the flagship walker's own list
 * of advancing actions and its skip rule, read from that file's TEXT (the
 * file runs on import) so the two walks cannot drift apart. Round 1045's
 * playSeasonCentre reads them the same way.
 * ------------------------------------------------------------------ */
function walkerRule() {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/playSoccerCareer.mjs'), 'utf8');
  const at = src.indexOf('const ACTIONS = [');
  const end = src.indexOf('];', at);
  if (at < 0 || end < 0) throw new Error('cannot find ACTIONS in playSoccerCareer.mjs');
  const body = src.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const actions = [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
  const skipLine = src.split('\n').find(l => l.startsWith('const SKIP = /'));
  if (!skipLine) throw new Error('cannot find SKIP in playSoccerCareer.mjs');
  const skip = skipLine.slice(skipLine.indexOf('/') + 1, skipLine.lastIndexOf('/'));
  return { actions, skip };
}
const WALK = walkerRule();
if (!WALK.actions.includes('Next Year') || !WALK.actions.includes('Next Season') || !WALK.skip.includes('Retire')) {
  console.error('the walker rule read from playSoccerCareer.mjs is not the one this harness expects. NOT CHECKED.');
  await stop(2);
}
/* What neither walk presses: ways off the page, the account, the theme, and the help trigger on a
   page whose rules are not the point. The first visit rules dialog is pressed, it opens by itself. */
const NEVER = 'Report a bug|Light mode|Dark mode|Cookie|Sign up|Sign in|Log in|Log out|Essential only|Share|Copy|Install|Delete|Reset|New Career|Start over|Retire|\\bBack\\b|^Home$';

/* ------------------------------------------------------------------ *
 * Page side. Runs before any page code, on every load and reload.
 * ------------------------------------------------------------------ */
function pageInit(cfg) {
  /* seeded Math.random, so a run can be repeated */
  let t = cfg.seed >>> 0;
  Math.random = () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  /* the cookie choice is already made, the way every browser harness here starts */
  try { localStorage.setItem('cookie-consent', 'essential'); } catch (e) { /* storage blocked */ }
  /* THE CONTROL'S SWITCH: the guard reads this before it installs itself */
  if (cfg.noguard) window.__DUKB_NO_TRANSLATE_GUARD__ = true;
  /* Round 1141, the second control's switch: layer one only, nothing follows the translator's copies */
  if (cfg.nolive) window.__DUKB_NO_TRANSLATE_LIVE__ = true;

  /* the words React rendered, whatever the translator has done to them since */
  function origText(node) {
    if (!node) return '';
    if (node.nodeType === 3) return node.nodeValue || '';
    if (node.nodeType !== 1) return '';
    if (node.__simOrig !== undefined) return node.__simOrig;
    let s = '';
    for (const c of node.childNodes) s += origText(c);
    return s;
  }
  const taken = new WeakSet();
  const w = { origText, moved: [], simCount: 0, sweeps: 0, simStarted: false, counting: false, cost: !!cfg.cost };
  window.__walk = w;

  /* THE RECORDER. It changes nothing: it counts a call that names a node its parent no longer owns,
     then hands the call on to whatever was there, the guard or the browser. Laid on top again
     whenever something else has been put over it, so the guard can never hide a call from it. */
  let myRemove = null;
  let myInsert = null;
  const brief = n => (n && n.nodeType === 3 ? (n.nodeValue || '') : origText(n)).replace(/\s+/g, ' ').trim().slice(0, 60);
  const tagOf = n => (n && n.nodeType === 1 ? n.tagName.toLowerCase() : n ? '#' + n.nodeType : '');
  function layRecorder() {
    if (cfg.cost) { w.counting = true; return; } // the cost run times the page as shipped, nothing laid over it
    if (Node.prototype.removeChild !== myRemove) {
      const under = Node.prototype.removeChild;
      myRemove = function (child) {
        if (child && child.parentNode !== this) w.moved.push({ op: 'removeChild', parent: tagOf(this), node: brief(child), byTranslator: taken.has(child) });
        return under.apply(this, arguments);
      };
      Node.prototype.removeChild = myRemove;
    }
    if (Node.prototype.insertBefore !== myInsert) {
      const under = Node.prototype.insertBefore;
      myInsert = function (node, ref) {
        if (ref && ref.parentNode !== this) w.moved.push({ op: 'insertBefore', parent: tagOf(this), node: brief(ref), byTranslator: taken.has(ref) });
        return under.apply(this, arguments);
      };
      Node.prototype.insertBefore = myInsert;
    }
    w.counting = true;
  }

  /* ---------------- what React holds, against what the screen says (Round 1141) ----------------
     The judge of "stale text", and it leans on neither the guard nor the translator above. React keeps
     a tree of its own (the fibers) with the words every string has RIGHT NOW. For each element that
     has strings of its own, those words in React's order are set against the words the page shows in
     that element: its text nodes as they read, and each translator wrapper by the words the
     translator took (__simOrig, which is what the wrapper displays before the marks). A wrapper left
     behind, a number that did not move and a label that got lost all show up as a difference. The
     second list is about place, not words: the run of "text, element, text" inside the element has to
     be the run React has, which is what catches a new element appended at the end. */
  function reactSays() {
    const out = { elements: 0, stale: [], order: [] };
    const rootEl = document.getElementById('root');
    if (!rootEl) return out;
    let top = null;
    for (const k in rootEl) if (k.indexOf('__reactContainer$') === 0 && rootEl[k] && rootEl[k].stateNode) top = rootEl[k].stateNode.current;
    if (!top) return out;
    const groups = new Map();
    const groupOf = el => { let g = groups.get(el); if (!g) { g = { texts: [], kinds: [], portal: false, skip: false }; groups.set(el, g); } return g; };
    const stack = [[top, rootEl, false]];
    while (stack.length) {
      const [f, host, portal] = stack.pop();
      if (f.sibling) stack.push([f.sibling, host, portal]);
      if (f.tag === 6) { // a string of its own
        const g = groupOf(host);
        /* the words React HOLDS (its own record of the string), not what the node says: a translator that
           undoes itself writes the words it saved back into the node it took, and the judge must not
           take that node's word for it */
        const v = typeof f.memoizedProps === 'string' ? f.memoizedProps : (f.stateNode && f.stateNode.nodeValue) || '';
        if (v) { g.texts.push(v); g.kinds.push('T'); }
        if (portal) g.portal = true;
      } else if (f.tag === 5) { // an element
        const g = groupOf(host);
        g.kinds.push('E');
        if (portal) g.portal = true;
        const el = f.stateNode;
        const p = f.memoizedProps || {};
        if (p.dangerouslySetInnerHTML) groupOf(el).skip = true;
        else if (typeof p.children === 'string' || typeof p.children === 'number') { const s = String(p.children); if (s) { const ge = groupOf(el); ge.texts.push(s); ge.kinds.push('T'); } }
        if (f.child) stack.push([f.child, el, false]);
      } else if (f.tag === 4) { // a portal: its children live in another element
        if (f.child && f.stateNode && f.stateNode.containerInfo) stack.push([f.child, f.stateNode.containerInfo, true]);
      } else if ((f.tag === 22 || f.tag === 23) && f.memoizedState !== null) {
        /* a hidden tree (a suspended screen): React blanked it on purpose */
      } else if (f.child) stack.push([f.child, host, portal]);
    }
    const squash = k => k.join('').replace(/T+/g, 'T');
    const where = el => { const bits = []; for (let e = el, i = 0; e && e.nodeType === 1 && i < 3; e = e.parentElement, i += 1) bits.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('data-testid') ? `[${e.getAttribute('data-testid')}]` : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/)[0] : '')); return bits.join(' < '); };
    const clip = s => s.replace(/\s+/g, ' ').trim().slice(0, 70);
    for (const [el, g] of groups) {
      if (g.skip || el.nodeType !== 1 || !el.isConnected) continue;
      if (el.closest('svg,script,style,textarea,noscript,code,[contenteditable="true"]')) continue;
      if (!g.texts.length) {
        /* React holds no string of its own in this element any more (a placeholder that gave way to an
           element). A translator's copy still standing there is a leftover, and nothing else would
           judge it. Only wrappers are looked at: plain text here may be something the page wrote by hand. */
        const left = [];
        for (const c of el.childNodes) if (c.nodeType === 1 && c.nodeName === 'FONT' && c.__simOrig) left.push(c.__simOrig);
        if (left.length) out.stale.push({ react: '', screen: clip(left.join('')), at: where(el), left: true });
        continue;
      }
      out.elements += 1;
      const pieces = [];
      const kinds = [];
      for (const c of el.childNodes) {
        if (c.nodeType === 3) { if (c.nodeValue) { pieces.push(c.nodeValue); kinds.push('T'); } }
        else if (c.nodeType === 1) {
          if (c.nodeName === 'FONT' && c.__simOrig !== undefined) { if (c.__simOrig) { pieces.push(c.__simOrig); kinds.push('T'); } }
          else kinds.push('E');
        }
      }
      const react = g.texts.join('');
      const screen = pieces.join('');
      let same = react === screen;
      if (!same && g.portal) {
        /* a box filled from more than one place (a select's value): the same words, in any order */
        let rest = screen;
        same = true;
        for (const t of g.texts.slice().sort((a, b) => b.length - a.length)) {
          const at = rest.indexOf(t);
          if (at < 0) { same = false; break; }
          rest = rest.slice(0, at) + '\u0000' + rest.slice(at + t.length);
        }
        if (same && rest.replace(/\u0000/g, '')) same = false;
      }
      if (!same) out.stale.push({ react: clip(react), screen: clip(screen), at: where(el) });
      else if (!g.portal && squash(g.kinds) !== squash(kinds)) out.order.push({ react: squash(g.kinds), screen: squash(kinds), words: clip(react), at: where(el) });
    }
    return out;
  }
  w.reactSays = reactSays;
  /* Text the translator will never take again, back on the page: what a guard that put React's own
     node back would leave, in the visitor's first language in the middle of a translated page. */
  w.takenBack = () => {
    if (!document.body) return 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = 0;
    for (let t = walker.nextNode(); t; t = walker.nextNode()) if (taken.has(t) && t.nodeValue && t.nodeValue.trim()) n += 1;
    return n;
  };

  /* ---------------- the translator ---------------- */
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1, IFRAME: 1, SVG: 1, CODE: 1 };
  const made = new WeakSet();
  function translate(text) {
    if (cfg.text !== 'alter') return text;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return lead + '«' + text.trim() + '»' + trail;
  }
  w.shown = translate;
  const queued = new WeakSet(); // read, and the answer is on its way
  /* THE UNDO (Round 1141, after review). A translator can undo itself: "show original", a translation
     that failed, the page going into the back and forward cache. Measured on the real one's own button,
     2026-10-08, with the guard in the page: for every wrapper still on the page the wrapper is emptied,
     the very node it took is put INTO it, the words it saved are written to that node (not through
     nodeValue), the node is taken out again and put in front of the wrapper, and the wrapper leaves.
     It forgets it ever took the node (a second "translate" takes it again) and html loses its marks.
     kind 'copies' is the undocopies control and nothing a translator was seen to do: a COPY of each
     node comes back in place of the node itself, which no guard can follow. */
  const kept = [];
  let stopped = false;
  w.undo = kind => {
    stopped = true;
    const out = { back: 0, copies: 0 };
    for (const k of kept.splice(0)) {
      const wrapper = k.wrapper;
      const parent = wrapper.parentNode;
      if (!parent || !wrapper.isConnected) continue;
      let node = k.node;
      if (kind === 'copies') { node = document.createTextNode(k.words); out.copies += 1; }
      while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
      wrapper.appendChild(node);
      node.data = k.words;
      wrapper.removeChild(node);
      parent.insertBefore(node, wrapper);
      parent.removeChild(wrapper);
      taken.delete(k.node);
      queued.delete(k.node);
      out.back += 1;
    }
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.classList.remove('translated-ltr');
    return out;
  };
  function eligible(node) {
    /* its own text, a node it has taken once (the real one marks those and never looks again), a node it has read */
    if (made.has(node) || taken.has(node) || queued.has(node)) return false;
    if (!node.nodeValue || !node.nodeValue.trim()) return false;
    if (!node.isConnected) return false;
    let e = node.parentElement;
    if (!e || !document.body || !document.body.contains(e)) return false;
    for (; e; e = e.parentElement) {
      if (SKIP_TAGS[e.tagName.toUpperCase()]) return false;
      if (e.getAttribute('translate') === 'no') return false;
      if (e.classList && e.classList.contains('notranslate')) return false;
      if (e.isContentEditable) return false;
    }
    return true;
  }
  /* READ. Every sentence of new text on the page, with the words each node holds right now. Text nodes
     that stand side by side are one sentence, as they are to the real translator. */
  function read() {
    layRecorder();
    if (!cfg.translate || stopped || !document.body) return [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const jobs = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!eligible(n)) continue;
      queued.add(n);
      const last = jobs[jobs.length - 1];
      if (last && last.nodes[last.nodes.length - 1].nextSibling === n) { last.nodes.push(n); last.words.push(n.nodeValue); }
      else jobs.push({ nodes: [n], words: [n.nodeValue] });
    }
    return jobs;
  }
  /* ANSWER, a little later, and every step of it as measured on the real one (Round 1141): only the
     nodes still on the page are taken; a <font> goes in BEFORE each and then the node leaves; the words
     are the ones that were READ (cfg.late), whatever the node says by now; and they are not kept node
     by node: the whole sentence lands in the last wrapper and the others come back empty, which is
     what Portuguese did to "Age " and "16" and German to a five piece line. */
  function answer(jobs) {
    for (const job of jobs) {
      const here = [];
      const words = [];
      job.nodes.forEach((node, i) => {
        if (!node.isConnected || !node.parentNode) return;
        here.push(node);
        words.push(cfg.late ? job.words[i] : node.nodeValue);
      });
      if (!here.length) continue;
      const said = words.join('');
      here.forEach((node, i) => {
        const outer = document.createElement('font');
        kept.push({ node, wrapper: outer, words: words[i] });
        outer.setAttribute('style', 'vertical-align: inherit;');
        const lastOne = i === here.length - 1;
        outer.__simOrig = lastOne ? said : '';
        if (lastOne) {
          const inner = document.createElement('font');
          inner.setAttribute('style', 'vertical-align: inherit;');
          const fresh = document.createTextNode(translate(said));
          made.add(fresh);
          inner.appendChild(fresh);
          outer.appendChild(inner);
        }
        node.parentNode.insertBefore(outer, node);
      });
      for (const node of here) {
        taken.add(node);
        node.parentNode.removeChild(node);
        w.simCount += 1;
      }
    }
    w.sweeps += 1;
  }
  let reading = null;
  let waiting = 0;
  w.busy = () => reading !== null || waiting > 0; // a change has been seen and its answer has not landed yet
  function look() {
    reading = null;
    const jobs = read();
    if (!jobs.length) return;
    waiting += 1;
    setTimeout(() => { waiting -= 1; answer(jobs); }, cfg.simDelay);
  }
  function schedule() {
    if (reading === null) reading = setTimeout(look, cfg.simRead);
  }
  function start() {
    if (cfg.translate) {
      document.documentElement.setAttribute('lang', 'pt');
      document.documentElement.classList.add('translated-ltr');
    }
    look();
    w.simStarted = true;
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }
  window.addEventListener('load', () => setTimeout(start, cfg.simStart));
}

/* ------------------------------------------------------------------ *
 * Node side: one fresh context for each walk.
 * ------------------------------------------------------------------ */
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', new URL(BASE).hostname]);
browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

async function openWalk(view, mode, switches = { noguard: CONTROL === 'noguard', nolive: LAYER_ONE_ONLY }) {
  const ctx = await browser.newContext({ viewport: VIEW_SIZES[view], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.addInitScript(pageInit, {
    seed: SEED, translate: mode !== 'off', text: mode, simDelay: SIM_DELAY, simStart: SIM_START, simRead: SIM_READ, late: SIM_LATE,
    noguard: !!switches.noguard, nolive: !!switches.nolive, cost: !!switches.cost,
  });
  const w = { ctx, page: null, blocked: new Set(), dbBlocked: 0, guardLines: 0, notFound: [], consoleErrors: [], pageErrors: [], unspanned: [] };
  /* nothing leaves this machine: flags get one local pixel, everything else that is not the server is aborted */
  await ctx.route('**/*', route => {
    let host = '';
    try { host = new URL(route.request().url()).hostname; } catch { /* data: and friends */ }
    if (!host || LOCAL_HOSTS.has(host)) return route.continue();
    if (host.endsWith('flagcdn.com')) return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    w.blocked.add(host);
    return route.abort();
  });
  /* the database host by its own rule, registered last so it is asked first: production is off limits */
  await ctx.route(/supabase\.co/, route => { w.dbBlocked += 1; return route.abort(); });
  /* control nospans: the build's own script, served with each of the three placeholders a bare string again,
     the way the create screen held them before Round 1096. Only this server's own .js is touched. */
  if (CONTROL === 'nospans') {
    await ctx.route(url => LOCAL_HOSTS.has(url.hostname) && url.pathname.endsWith('.js'), async route => {
      const res = await route.fetch();
      const body = (await res.text()).replace(UNSPAN, (_all, words) => { w.unspanned.push(words); return JSON.stringify(words); });
      return route.fulfill({ response: res, body });
    });
  }
  const page = await ctx.newPage();
  w.page = page;
  page.on('console', m => {
    const text = m.text();
    if (m.type() === 'warning' && text.startsWith('[dukb]') && text.includes(GUARD_LINE)) w.guardLines += 1;
    if (m.type() !== 'error') return;
    w.consoleErrors.push(text.slice(0, 300));
    if (/NotFoundError|not a child of this node/.test(text)) w.notFound.push('console: ' + text.slice(0, 200));
  });
  page.on('pageerror', e => {
    const text = String((e && (e.stack || e.message)) || e);
    w.pageErrors.push(text.slice(0, 300));
    if (/NotFoundError|not a child of this node/.test(text)) w.notFound.push('pageerror: ' + text.slice(0, 200));
  });
  return w;
}

const sleep = (page, ms) => page.waitForTimeout(ms);
/* After a press: a beat for React, then until the translator has caught up with what the press drew
   (nothing waiting to be swept, or two sweeps gone by on a page that never sits still). A slow
   machine makes this a slower walk, never a look at a page the translator has not reached yet. */
async function settle(page) {
  const before = await page.evaluate(() => (window.__walk ? window.__walk.sweeps : 0)).catch(() => 0);
  await sleep(page, 380);
  await page.waitForFunction(k => !window.__walk || !window.__walk.busy || !window.__walk.busy() || window.__walk.sweeps >= k + 2, before, { timeout: 4000 }).catch(() => {});
  await sleep(page, 40);
}
/* The translator has started on this document (or, with it off, the recorder is down). */
const started = page => page.waitForFunction(() => !!window.__walk && window.__walk.simStarted, null, { timeout: 20000 }).catch(() => {});

/* What the page looks like right now. The boundary is matched as the element RouteErrorBoundary
   draws: its h1, in a box that also holds its retry button and its link home. */
async function probe(page) {
  return page.evaluate(([boundaryWords, retryWords]) => {
    const w = window.__walk;
    const text = el => w.origText(el).replace(/\s+/g, ' ').trim();
    let boundary = false;
    for (const h of document.querySelectorAll('h1')) {
      if (text(h) !== boundaryWords || !h.parentElement) continue;
      const box = h.parentElement;
      if ([...box.querySelectorAll('button')].some(b => text(b) === retryWords) && box.querySelector('a[href="/"]')) boundary = true;
    }
    let save = null;
    try { const raw = localStorage.getItem('soccerCareerSave'); save = raw ? JSON.parse(raw) : null; } catch (e) { save = null; }
    const root = document.getElementById('root');
    /* the cost run times the page's own work, so the judge stays out of it */
    const says = w.cost ? { elements: 0, stale: [], order: [] } : w.reactSays();
    /* the career hub's own line, "Striker · Age 17 · Brazil", as the screen has it */
    let headerAge = null;
    for (const p of document.querySelectorAll('p')) {
      const m = /· Age (\d+) ·/.exec(text(p));
      if (m) { headerAge = Number(m[1]); break; }
    }
    const live = window.__dukbTranslateStats;
    return {
      headerAge,
      live: live ? { swaps: live.swaps, removed: live.removed, inserted: live.inserted, restored: live.restored, returned: live.returned || 0 } : null,
      left: says.stale.filter(s => s.left).length,
      takenBack: w.takenBack(),
      judged: says.elements,
      order: says.order.length,
      orderSample: says.order.slice(0, 4),
      boundary,
      path: location.pathname,
      h1: [...document.querySelectorAll('h1')].map(text).slice(0, 3),
      rootChars: root ? (root.innerText || '').length : -1,
      creation: !!document.getElementById('pname'),
      fonts: document.querySelectorAll('font').length,
      swapped: w.simCount, started: w.simStarted, counting: w.counting,
      lang: document.documentElement.getAttribute('lang') || '',
      marked: document.documentElement.classList.contains('translated-ltr'),
      guardOn: Node.prototype.__dukbTranslateGuard === true,
      moved: w.moved.length,
      movedByTranslator: w.moved.filter(m => m.byTranslator).length,
      stale: says.stale.length,
      staleSample: says.stale.slice(0, 6),
      save: save ? { phase: save.phase || '', age: save.age, name: save.playerName || '', nat: save.nationality || '' } : null,
    };
  }, [BOUNDARY_WORDS, RETRY_WORDS]);
}

/* The first visible element matching selector whose ORIGINAL words (or aria-label) match. It is
   scrolled into view and its centre comes back, with whether something else lies on top there. */
async function locate(page, selector, wanted, how = 'includes', nth = 0) {
  return page.evaluate(([sel, want, mode, n]) => {
    const w = window.__walk;
    const label = el => w.origText(el).replace(/\s+/g, ' ').trim() || (el.getAttribute('aria-label') || '').trim();
    const all = [...document.querySelectorAll(sel)].filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    const hits = all.filter(el => {
      if (want === null) return true;
      const o = label(el);
      if (mode === 'exact') return o === want;
      if (mode === 'starts') return o.startsWith(want);
      return o.includes(want);
    });
    const el = hits[n];
    if (!el) return { found: false, candidates: all.slice(0, 10).map(e => label(e).slice(0, 30)) };
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    window.__walkTarget = el;
    return {
      found: true, x, y, label: label(el).slice(0, 60), shown: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
      covered: !(top && (top === el || el.contains(top) || top.contains(el))),
    };
  }, [selector, wanted, how, nth]);
}
/* A real mouse press at the element's position. Only when something else lies over that point (a
   sticky bar after the scroll) does it fall back to the element's own click, and it says so. */
async function press(page, selector, wanted, how, nth) {
  const first = await locate(page, selector, wanted, how, nth);
  if (!first.found) return { ok: false, why: 'not found', candidates: first.candidates };
  if (first.disabled) return { ok: false, why: 'disabled', label: first.label };
  await sleep(page, 140); // let a smooth scroll come to rest
  const at = await locate(page, selector, wanted, how, nth);
  if (!at.found) return { ok: false, why: 'gone after the scroll' };
  if (at.covered) {
    await page.evaluate(() => { if (window.__walkTarget) window.__walkTarget.click(); });
    return { ok: true, label: at.label, shown: at.shown, by: 'its own click (covered)' };
  }
  await page.mouse.click(at.x, at.y);
  return { ok: true, label: at.label, shown: at.shown, by: 'mouse' };
}
async function pickCombo(page, mode, index, wanted) {
  const open = await press(page, '[role="combobox"]', null, 'includes', index);
  if (!open.ok) return { ok: false, why: `combobox ${index} ${open.why}` };
  try { await page.waitForSelector('[role="option"]', { timeout: 8000 }); } catch { return { ok: false, why: `no options opened for combobox ${index}` }; }
  await settle(page, mode);
  let hit = await press(page, '[role="option"]', wanted, 'exact');
  if (!hit.ok) hit = await press(page, '[role="option"]', wanted, 'includes');
  if (!hit.ok) return { ok: false, why: `option "${wanted}" ${hit.why}`, candidates: hit.candidates };
  await page.waitForSelector('[role="option"]', { state: 'detached', timeout: 4000 }).catch(() => {});
  return { ok: true, label: hit.label, shown: hit.shown };
}

/* What a select box says after a pick, two ways. "has": the pick is in the box's text, so the choice
   registered. "visible": the first line box of those words lies inside everything that clips it, so
   a person can actually read it. They differ, and that difference is the point: with the guard the
   translator's copy of the placeholder stays in the box, the box shows one line, and a pick drawn
   as a block (the nationality, with its flag) lands on a second line nobody can see. */
async function boxReads(page, index, wanted) {
  return page.evaluate(([i, want]) => {
    const trig = document.querySelectorAll('[role="combobox"]')[i];
    if (!trig) return null;
    const shown = (trig.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const tw = document.createTreeWalker(trig, NodeFilter.SHOW_TEXT);
    let node = null;
    for (let n = tw.nextNode(); n; n = tw.nextNode()) if ((n.nodeValue || '').includes(want)) { node = n; break; }
    if (!node) return { shown, has: false, visible: false };
    const range = document.createRange();
    const from = node.nodeValue.indexOf(want);
    range.setStart(node, from);
    range.setEnd(node, from + want.length);
    const r = range.getClientRects()[0];
    let visible = !!r && r.width > 1 && r.height > 1;
    for (let e = node.parentElement; e && visible; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const c = e.getBoundingClientRect();
        if (r.top < c.top - 1 || r.bottom > c.bottom + 1 || r.left < c.left - 1 || r.right > c.right + 1) visible = false;
      }
      if (e === trig) break;
    }
    return { shown, has: true, visible };
  }, [index, wanted]);
}

/* Everything a select box says, in the words React and the translator between them put there: the
   placeholder before a pick, and after it the pick alone, or the pick with the placeholder's copy
   still beside it ("Choose positionStriker (ST)"), which is what layer one alone leaves. */
async function boxWords(page, index) {
  return page.evaluate(i => {
    const trig = document.querySelectorAll('[role="combobox"]')[i];
    return trig ? window.__walk.origText(trig).replace(/\s+/g, ' ').trim() : '';
  }, index).catch(() => '');
}

/* The two patched calls, tried directly in this browser on this build, on a scratch element that is
   never in the document: a node is swapped out the way a translator swaps it, then the page asks
   for it to be removed and for something to be put in front of it. With the guard both are quiet.
   Without it both throw NotFoundError, whatever the app's own copy looks like by then, which is
   what keeps the noguard control alive after the create flow's strings get spans of their own. */
async function probeGuard(page) {
  return page.evaluate(() => {
    const out = { remove: '', insert: '' };
    const box = document.createElement('div');
    const held = document.createTextNode('held by the page');
    box.appendChild(held);
    const font = document.createElement('font');
    font.textContent = 'moved by a translator';
    box.replaceChild(font, held);
    try { box.removeChild(held); out.remove = font.parentNode === box ? 'quiet' : 'lost'; } catch (e) { out.remove = e.name; }
    const fresh = document.createElement('b');
    try { box.insertBefore(fresh, held); out.insert = fresh.parentNode === box ? 'quiet' : 'lost'; } catch (e) { out.insert = e.name; }
    return out;
  }).catch(e => ({ remove: 'no answer', insert: String(e).slice(0, 60) }));
}

/* Round 1141, the same kind of question for layer two, and this time IN the document, where the guard
   can see the swap happen (a font goes in before the node, then the node leaves). The box is marked
   translate="no" so the walk's own translator keeps out of it. Three calls, the three React makes:
   remove the node, insert in front of it, rewrite it. With layer two the copy leaves with the node,
   the new element stands in front, and the page shows 17. With layer one alone the copy stays, the
   element lands at the end and the page still shows the copy of 16, which is what the nolive control
   has to see here on every page, whatever the app's own copy looks like by then. */
async function probeLive(page) {
  return page.evaluate(async () => {
    const out = { remove: '', insert: '', write: '', undo: '' };
    /* the observer's turn: what has happened so far is on layer two's map before the next step */
    const turn = () => new Promise(r => setTimeout(r, 0));
    const box = document.createElement('div');
    box.setAttribute('translate', 'no');
    box.style.display = 'none';
    document.body.appendChild(box);
    const line = words => { const p = box.appendChild(document.createElement('p')); return [p, p.appendChild(document.createTextNode(words))]; };
    const take = node => { const font = document.createElement('font'); font.textContent = 'copy of ' + node.nodeValue; node.parentNode.insertBefore(font, node); node.parentNode.removeChild(node); return font; };
    try {
      const [p, held] = line('held by the page');
      const font = take(held);
      p.removeChild(held);
      out.remove = font.parentNode === p ? 'the copy stayed' : p.childNodes.length === 0 ? 'the copy left with it' : 'something else is there';
    } catch (e) { out.remove = e.name; }
    try {
      const [p, held] = line('tail words');
      take(held);
      const fresh = document.createElement('b');
      p.insertBefore(fresh, held);
      out.insert = p.firstChild === fresh ? 'in front' : p.lastChild === fresh ? 'at the end' : 'somewhere else';
    } catch (e) { out.insert = e.name; }
    try {
      const [p, held] = line('16');
      take(held);
      held.nodeValue = '17';
      out.write = p.textContent === '17' ? 'shows 17' : `still shows "${p.textContent}"`;
    } catch (e) { out.write = e.name; }
    try {
      /* after review, check 17: the translator takes a string, the page rewrites it (layer two puts a
         stand in there), the translator takes THAT, and then gives it back the way the real one's "show
         original" was measured to: the node into the wrapper, its saved words written, out again, in
         front of the wrapper, the wrapper gone. Then the page rewrites the string once more. Each
         step waits for the observer's turn, as it has between a translator's steps on a real page.
         Layer one alone passes this too (it gets React's own node back and heals), so this one is not
         the nolive control's: it is red on a layer two that forgets who a stand in was made for. */
      const [p, held] = line('16');
      take(held);
      await turn();
      held.nodeValue = '17';
      await turn();
      const shown = p.firstChild;
      const back = shown && shown.nodeType === 3 ? shown : held;
      const font = back === held ? shown : take(back);
      await turn();
      const saved = back === held ? '16' : back.data; // what the translator read when it took the node
      while (font.firstChild) font.removeChild(font.firstChild);
      font.appendChild(back);
      back.data = saved;
      font.removeChild(back);
      p.insertBefore(back, font);
      p.removeChild(font);
      await turn();
      held.nodeValue = '18';
      out.undo = p.textContent === '18' ? 'shows 18' : `still shows "${p.textContent}"`;
    } catch (e) { out.undo = e.name; }
    box.remove();
    return out;
  }).catch(e => ({ remove: 'no answer', insert: String(e).slice(0, 60), write: '', undo: '' }));
}

/* The next thing a player would press. An open dialog, list or menu comes first (the rules dialog a
   first visit opens, the list a select just opened). Then, in the career, the flagship walker's own
   advancing actions in its own order. Otherwise the control pressed least so far, in page order, so
   eight presses are eight different controls wherever the page has them. */
async function advance(page, actions, skipSrc, counts) {
  /* Release AQ (Round 1172): the Ballon d'Or night in Soccer Career draws Continue only after its ranked list
     has come in, about three seconds. A press made while it waits moves the career nowhere, and the undo walk
     then ran out of presses before a birthday (check 19 measured nothing). Wait for the list first. A page
     with no such night answers at once. */
  await page.waitForFunction(() => !document.querySelector('[data-award-result="waiting"]'), null, { timeout: 8000 }).catch(() => undefined);
  const pick = await page.evaluate(([acts, skipS, neverS, seen]) => {
    const w = window.__walk;
    const label = el => w.origText(el).replace(/\s+/g, ' ').trim() || (el.getAttribute('aria-label') || '').trim();
    const vis = el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const skip = skipS ? new RegExp(skipS) : null;
    const never = new RegExp(neverS, 'i');
    const overlays = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]')].filter(vis);
    const overlay = overlays[overlays.length - 1] || null;
    const scope = overlay || document.getElementById('dukb-main') || document.getElementById('root') || document.body;
    const usable = [...scope.querySelectorAll('button,[role="option"],[role="menuitem"],[role="tab"],[role="combobox"],[role="radio"],[role="switch"]')].filter(el => {
      if (!vis(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
      if (!overlay && el.closest('header,footer')) return false;
      const o = label(el);
      return !!o && !never.test(o) && !(skip && skip.test(o));
    });
    let el = null;
    if (acts) for (const a of acts) { el = usable.find(b => label(b).startsWith(a)); if (el) break; }
    if (!el && overlay) {
      const kind = overlay.getAttribute('role');
      if (kind === 'listbox' || kind === 'menu') el = usable[1] || usable[0] || null;
      else el = usable.find(b => /^(let's play|got it|start|play|continue|begin|ok|okay|done|next|close)/i.test(label(b))) || null;
    }
    if (!el) {
      /* down the page from the control pressed last (a toggle that renames itself is still that
         control), round to the top again, and among those the one pressed least */
      const last = window.__walkTarget;
      let pool = usable;
      if (last && last.isConnected && scope.contains(last)) {
        const below = usable.filter(b => b !== last && !last.contains(b) && (last.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
        pool = below.concat(usable.filter(b => !below.includes(b)));
      }
      let best = Infinity;
      for (const b of pool) { const c = seen[label(b)] || 0; if (c < best) { best = c; el = b; } }
    }
    if (!el) return { found: false, overlay: overlay ? overlay.getAttribute('role') : '' };
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    window.__walkTarget = el;
    return { found: true, key: label(el), label: label(el).slice(0, 60), overlay: overlay ? overlay.getAttribute('role') : '', options: usable.slice(0, 8).map(b => label(b).slice(0, 22)) };
  }, [actions, skipSrc, NEVER, counts]);
  if (!pick.found) {
    if (pick.overlay) { await page.keyboard.press('Escape'); return { ok: true, label: `Escape (an open ${pick.overlay} with nothing to press)`, by: 'keyboard' }; }
    return { ok: false, why: 'no usable control on the page' };
  }
  await sleep(page, 140); // let a smooth scroll come to rest
  const at = await page.evaluate(() => {
    const el = window.__walkTarget;
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, covered: !(top && (top === el || el.contains(top))) };
  });
  if (!at) return { ok: false, why: `"${pick.label}" was gone after the scroll` };
  counts[pick.key] = (counts[pick.key] || 0) + 1;
  if (at.covered) {
    await page.evaluate(() => { if (window.__walkTarget) window.__walkTarget.click(); });
    return { ok: true, label: pick.label, by: 'its own click (covered)', options: pick.options };
  }
  await page.mouse.click(at.x, at.y);
  return { ok: true, label: pick.label, by: 'mouse', options: pick.options };
}

/* ------------------------------------------------------------------ *
 * One walk. Every step is followed by a look at the page; the walk stops
 * at the boundary, or where it could not find what it came to press.
 * ------------------------------------------------------------------ */
function newRecord(route, view, mode, pass, out) {
  return {
    route, view, mode, pass, out, steps: [], boundaryAt: null, stuckAt: null, pressed: [], state: null, first: null, maxStale: 0, staleSample: [],
    /* Round 1141: every different stale text of the walk, where an element stood out of place, text
       the translator will not take again, and the hub's age line against the save */
    staleAll: new Map(), staleAt: '', maxOrder: 0, orderAll: new Map(), maxTakenBack: 0, judged: 0, maxLeft: 0,
    ageLooks: 0, ageLooksOlder: 0, ageWrong: 0, ageWrongAt: '',
    /* after review: what the walk saw after the translator undid itself (walkUndo) */
    undo: null, beforeUndo: null,
  };
}
let shotCount = 0;
async function shot(page, rec, name) {
  if (!SHOTS) return;
  if (name !== 'BOUNDARY' && name !== 'STUCK' && (rec.boundaryAt || rec.stuckAt)) return; // that walk already has its picture
  shotCount += 1;
  const file = `${rec.route === '/' ? 'home' : rec.route.slice(1)}-${rec.view}-${rec.mode}${rec.pass ? '-' + rec.pass : ''}-${name}.png`;
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: false }).catch(() => {});
}
async function step(W, rec, name, fn) {
  if (rec.boundaryAt || rec.stuckAt) return false;
  let action;
  try { action = await fn(); } catch (e) { action = { ok: false, why: 'threw: ' + String(e).split('\n')[0].slice(0, 140) }; }
  await settle(W.page, rec.mode);
  let state = null;
  for (let i = 0; i < 3 && !state; i += 1) {
    try { state = await probe(W.page); } catch { await sleep(W.page, 500); } // a reload was in flight
  }
  if (state && rec.undo && rec.undo.on) {
    /* after the translator undid itself the looks are counted apart, for checks 18 and 19 */
    const u = rec.undo;
    rec.state = state;
    u.looks += 1;
    if (state.fonts > u.fonts) u.fonts = state.fonts;
    if (state.stale > u.maxStale) u.maxStale = state.stale;
    if (state.stale > 0 && !u.staleAt) u.staleAt = name;
    for (const s of state.staleSample) u.staleAll.set(`${s.at} | ${s.react} | ${s.screen}`, { ...s, step: name });
    if (state.live) u.returned = state.live.returned;
    if (state.headerAge !== null && state.save && typeof state.save.age === 'number') {
      u.ageLooks += 1;
      if (state.save.age > u.ageAt) u.ageOlder += 1;
      if (state.headerAge !== state.save.age) {
        u.ageWrong += 1;
        if (!u.ageWrongAt) u.ageWrongAt = `at "${name}" the header said Age ${state.headerAge} and the save said ${state.save.age}`;
      }
    }
  } else if (state) {
    rec.state = state;
    if (!rec.first) rec.first = state;
    if (state.left > rec.maxLeft) rec.maxLeft = state.left;
    if (state.stale > rec.maxStale) { rec.maxStale = state.stale; rec.staleSample = state.staleSample; }
    if (state.stale > 0 && !rec.staleAt) rec.staleAt = name;
    for (const s of state.staleSample) rec.staleAll.set(`${s.at} | ${s.react} | ${s.screen}`, { ...s, step: name });
    if (state.order > rec.maxOrder) rec.maxOrder = state.order;
    for (const s of state.orderSample) rec.orderAll.set(`${s.at} | ${s.words}`, { ...s, step: name });
    if (state.takenBack > rec.maxTakenBack) rec.maxTakenBack = state.takenBack;
    if (state.judged > rec.judged) rec.judged = state.judged;
    if (state.headerAge !== null && state.save && typeof state.save.age === 'number') {
      rec.ageLooks += 1;
      if (rec.startAge !== undefined && state.save.age > rec.startAge) rec.ageLooksOlder += 1;
      if (state.headerAge !== state.save.age) {
        rec.ageWrong += 1;
        if (!rec.ageWrongAt) rec.ageWrongAt = `at "${name}" the header said Age ${state.headerAge} and the save said ${state.save.age}`;
      }
    }
  }
  const did = action && (action.label || action.why) ? String(action.label || action.why) : '';
  if (action && action.ok && action.label) rec.pressed.push(action.label);
  rec.steps.push({ name, ok: !(action && action.ok === false), did: did.slice(0, 70), by: (action && action.by) || '', boundary: !!(state && state.boundary), moved: state ? state.moved : null, stale: state ? state.stale : null, phase: state && state.save ? state.save.phase : '', age: state && state.save ? state.save.age : null });
  if (V) rec.out(`        ${state && state.boundary ? 'XX' : action && action.ok === false ? '??' : 'ok'} ${name}${did ? ' [' + did.slice(0, 40) + ']' : ''}${state ? ` moved=${state.moved} stale=${state.stale} fonts=${state.fonts}${state.save ? ` ${state.save.phase} ${state.save.age}` : ''}` : ' (no look at the page)'}`);
  if (state && state.boundary) { rec.boundaryAt = name; await shot(W.page, rec, 'BOUNDARY'); return false; }
  if (action && action.ok === false) { rec.stuckAt = `${name}: ${action.why}`; return false; }
  return true;
}

async function walkCreate(W, rec) {
  const { page } = W;
  const mode = rec.mode;
  await step(W, rec, 'the create screen draws', async () => {
    await page.waitForSelector('#pname', { timeout: 30000 });
    await started(page);
    await sleep(page, 500);
    return { ok: true };
  });
  rec.createDrawn = !!(rec.first && rec.first.creation);
  await step(W, rec, 'type the name', async () => { await page.fill('#pname', PLAYER); return { ok: true }; });
  rec.boxes = {};
  for (let i = 0; i < PICKS.length; i += 1) {
    const [what, want] = PICKS[i];
    await step(W, rec, `choose ${what} ${want}`, async () => {
      const was = await boxWords(page, i);
      const r = await pickCombo(page, mode, i, want);
      if (!r.ok) return r;
      await settle(page, mode);
      rec.boxes[what] = await boxReads(page, i, want).catch(() => null);
      if (rec.boxes[what]) { rec.boxes[what].was = was; rec.boxes[what].words = await boxWords(page, i); }
      return r;
    });
  }
  await shot(page, rec, '1-picks');
  /* The roll runs for about two seconds and the button is disabled meanwhile. Each of these waits for
     what the next step needs, by its original words, so a slow machine is a slow walk and not a red. */
  const ready = (words, ms) => page.waitForFunction(([t]) => [...document.querySelectorAll('button')].some(b => !b.disabled && window.__walk.origText(b).includes(t)), [words], { timeout: ms }).catch(() => {});
  await step(W, rec, 'Generate Starting Potential', async () => { const r = await press(page, 'button', 'Generate Starting Potential'); if (r.ok) await ready('Roll again', 15000); return r; });
  await step(W, rec, 'Roll again', async () => { const r = await press(page, 'button', 'Roll again'); if (r.ok) { await sleep(page, 600); await ready('Customize your build', 15000); } return r; });
  await step(W, rec, 'Customize your build', async () => { const r = await press(page, 'button', 'Customize your build'); if (r.ok) await ready('Lock in', 10000); return r; });
  await step(W, rec, 'Lock in build', async () => { const r = await press(page, 'button', 'Lock in'); if (r.ok) await ready('Begin Career', 10000); return r; });
  await step(W, rec, 'Begin Career', async () => {
    const r = await press(page, 'button', 'Begin Career');
    if (r.ok) { await page.waitForFunction(() => !document.getElementById('pname'), null, { timeout: 15000 }).catch(() => {}); await sleep(page, 1200); }
    return r;
  });
  const s = rec.state;
  const begun = !rec.boundaryAt && !rec.stuckAt && !!s;
  rec.reached = begun && !s.creation && s.h1.some(h => h.includes(PLAYER)) && !!s.save && s.save.name === PLAYER;
  rec.reachedDetail = begun ? `h1 ${JSON.stringify(s.h1[0] || '')}, create form ${s.creation ? 'still up' : 'gone'}, save ${s.save ? `${s.save.name}, ${s.save.nat}, ${s.save.phase}, age ${s.save.age}` : 'none'}` : (rec.boundaryAt ? `the boundary took the page at "${rec.boundaryAt}"` : `stuck at ${rec.stuckAt}`);
  await shot(page, rec, '2-begun');
  if (!rec.reached) return;
  rec.startAge = s.save.age;
  const counts = {};
  for (let i = 1; i <= CAREER_PRESSES; i += 1) {
    const ok = await step(W, rec, `career press ${i}`, async () => { const r = await advance(page, WALK.actions, WALK.skip, counts); await sleep(page, 450); return r; });
    const now = rec.state;
    if (rec.seasonAt === undefined && now && now.save && typeof now.save.age === 'number' && now.save.age >= rec.startAge + 1) {
      rec.seasonAt = i;
      rec.seasonDetail = `age ${rec.startAge} to ${now.save.age} on press ${i}, h1 ${JSON.stringify(now.h1[0] || '')}, phase ${now.save.phase}`;
      rec.hubStands = !now.boundary && now.h1.some(h => h.includes(PLAYER));
    }
    if (!ok) break;
  }
  const end = rec.state;
  if (rec.seasonDetail && end && end.save) rec.seasonDetail += `; the walk went on to age ${end.save.age}, phase ${end.save.phase}`;
  await shot(page, rec, '3-career');
  if (mode !== 'off' && CONTROL !== 'noguard') await walkUndo(W, rec, counts);
}

/* Round 1141, after review: THE UNDO, on the career the create walk has just lived. The translator gives
   back what it took (window.__walk.undo, shaped as the real one's "show original" was measured), and the
   career goes on until the save is a year older again and three looks more, or UNDO_PRESSES presses.
   Every look from here on is counted apart (rec.undo), for checks 18 and 19. Review found this on the
   real translator: after the undo every string layer two had refreshed was cut off from React, the
   header read Age 19 with the save at 20 and never healed, where layer one alone did heal. */
async function walkUndo(W, rec, counts) {
  if (rec.boundaryAt || rec.stuckAt || !rec.state || !rec.state.save) return;
  const { page } = W;
  rec.beforeUndo = rec.state;
  const u = { on: true, back: 0, copies: 0, looks: 0, presses: 0, fonts: 0, maxStale: 0, staleAt: '', staleAll: new Map(), returned: 0, ageAt: rec.state.save.age, ageLooks: 0, ageOlder: 0, ageWrong: 0, ageWrongAt: '' };
  rec.undo = u;
  await step(W, rec, 'the translator undoes itself', async () => {
    const r = await page.evaluate(kind => window.__walk.undo(kind), CONTROL === 'undocopies' ? 'copies' : 'nodes');
    u.back = r.back;
    u.copies = r.copies;
    return r.back > 0 ? { ok: true } : { ok: false, why: 'the translator had nothing on the page to give back' };
  });
  let more = 0;
  for (let i = 1; i <= UNDO_PRESSES; i += 1) {
    const ok = await step(W, rec, `after the undo, press ${i}`, async () => { const r = await advance(page, WALK.actions, WALK.skip, counts); await sleep(page, 450); return r; });
    u.presses = i;
    if (!ok) break;
    if (u.ageOlder >= 1) { more += 1; if (more >= 3) break; }
  }
  await shot(page, rec, '4-after-undo');
}

async function walkPage(W, rec) {
  const { page } = W;
  await step(W, rec, 'the page draws', async () => {
    await page.waitForFunction(() => {
      if (document.getElementById('dukb-boot')) return false;
      const root = document.getElementById('root');
      return !!root && [...root.querySelectorAll('button,a[href]')].some(b => { const r = b.getBoundingClientRect(); return r.width > 2 && r.height > 2; });
    }, null, { timeout: 30000 });
    await started(page);
    await sleep(page, 700);
    return { ok: true };
  });
  const counts = {};
  for (let i = 1; i <= PAGE_PRESSES; i += 1) {
    const ok = await step(W, rec, `press ${i}`, () => advance(page, null, null, counts));
    if (!ok) break;
  }
  if (env.SHOTS) await shot(page, rec, 'end');
}

/* Round 1141. NBA My Career, straight into The Bank. Its statement draws each figure as
   {amount >= 0 ? '+' : ''}{figure}: two strings side by side, the first of which comes and goes. When
   money comes out after money went in, the lines move down one, and a line that read "-$100k" has to
   read "+$50k": a plus sign is inserted in FRONT of a text node the translator took, and that node is
   rewritten in the same commit. Then the other way round, the sign leaves. It is the site's own case
   of all three things layer two does, and the reproduction's NotFoundError on insertBefore was here. */
const BANK_PRESSES = ['Save half', 'Take out half', 'Take it all out', 'Save it all', 'Take it all out'];
const FIGURE = /^[+-]\$\d[\d.,]*[kM]?$/;
async function walkBank(W, rec) {
  const { page } = W;
  await step(W, rec, 'the page draws', async () => {
    await page.waitForFunction(() => !document.getElementById('dukb-boot') && [...document.querySelectorAll('#root button')].some(b => b.getBoundingClientRect().width > 2), null, { timeout: 30000 });
    await started(page);
    await sleep(page, 700);
    return { ok: true };
  });
  await step(W, rec, 'answer the rules sheet', async () => {
    const r = await press(page, '[role="dialog"] button,[role="alertdialog"] button', "Let's Play", 'starts');
    if (!r.ok) return { ok: true, label: '' }; // no sheet on this visit
    await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 6000 }).catch(() => {});
    return r;
  });
  await step(W, rec, 'Enter the draft', () => press(page, 'button', 'Enter the draft', 'exact'));
  await step(W, rec, 'open The Bank', async () => {
    await page.waitForSelector('[data-career-hub-buttons] button', { timeout: 10000 }).catch(() => {});
    return press(page, '[data-career-hub-buttons] button', 'The Bank', 'includes');
  });
  /* the figure at the end of each line of the statement, as the screen has it */
  const figures = () => page.evaluate(() => [...document.querySelectorAll('div.border-b > span.shrink-0 > span.font-black')].map(s => window.__walk.origText(s).replace(/\s+/g, ' ').trim())).catch(() => []);
  const seen = [];
  let pressed = 0;
  for (const name of BANK_PRESSES) {
    const ok = await step(W, rec, `the Bank: ${name}`, () => press(page, 'button', name, 'exact'));
    if (!ok) break;
    pressed += 1;
    seen.push(await figures());
  }
  const last = seen[seen.length - 1] || [];
  const wrong = [];
  seen.forEach((lines, i) => lines.forEach(l => { if (!FIGURE.test(l)) wrong.push({ after: BANK_PRESSES[i], line: l }); }));
  rec.bank = {
    reached: pressed === BANK_PRESSES.length && last.length >= 4,
    lines: last.length, sample: last.slice(0, 5), wrong,
    detail: `${pressed} of ${BANK_PRESSES.length} presses, ${last.length} line(s) at the end: ${JSON.stringify(last.slice(0, 5))}`,
  };
  await shot(page, rec, 'bank');
}

/* What the report says happened to the player: Try this page again reloads into the same
   translated page and the same step breaks again. Only ever runs after a boundary. */
async function retryAfterBoundary(W, rec) {
  const { page } = W;
  const loaded = page.waitForEvent('load', { timeout: 20000 }).then(() => true).catch(() => false);
  const r = await press(page, 'button', RETRY_WORDS, 'exact');
  const reloaded = r.ok ? await loaded : false;
  const again = newRecord(rec.route, rec.view, rec.mode, 'retry', rec.out);
  if (reloaded) await walkCreate(W, again);
  return { pressed: r.ok, reloaded, boundaryAt: again.boundaryAt, stuckAt: again.stuckAt, reached: !!again.reached };
}

/* ------------------------------------------------------------------ *
 * The walks, and the checks on each.
 * ------------------------------------------------------------------ */
async function runWalk({ mode, view, route }, out) {
  const tag = `${route} ${view} ${mode}`;
  const check = (name, ok, detail) => checkLine(name, ok, detail, out);
  out(`\n${tag}`);
  const W = await openWalk(view, mode);
  const rec = newRecord(route, view, mode, '', out);
  let retry = null;
  try {
    await W.page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    if (route === CREATE_ROUTE) await walkCreate(W, rec);
    else if (route === BANK_ROUTE) await walkBank(W, rec);
    else await walkPage(W, rec);
    rec.movedList = await W.page.evaluate(() => (window.__walk ? window.__walk.moved.slice(0, 60) : [])).catch(() => []);
    /* Both counts are closed BEFORE the direct question: the recorder would count its two calls, and
       the guard prints its once a page line for them on a page that never needed it. */
    rec.guardLines = W.guardLines;
    rec.direct = await probeGuard(W.page);
    if (CONTROL !== 'noguard') rec.directLive = await probeLive(W.page);
    if (route === CREATE_ROUTE && rec.boundaryAt) retry = await retryAfterBoundary(W, rec);
  } catch (e) {
    if (!rec.stuckAt && !rec.boundaryAt) rec.stuckAt = 'the walk threw: ' + String(e).split('\n')[0].slice(0, 140);
  }
  if (rec.stuckAt) { await shot(W.page, rec, 'STUCK'); out(`        stuck at ${rec.stuckAt}`); }
  const last = rec.state || {};
  const first = rec.first || {};
  const row = {
    route, view, mode, steps: rec.steps.length, boundaryAt: rec.boundaryAt, stuckAt: rec.stuckAt,
    notFound: W.notFound.length, notFoundSample: W.notFound[0] || '',
    guardLines: rec.guardLines ?? W.guardLines, guardOn: first.guardOn === true,
    moved: (rec.movedList || []).length, movedByTranslator: (rec.movedList || []).filter(m => m.byTranslator).length, movedList: rec.movedList || [],
    swapped: last.swapped || 0, maxStale: rec.maxStale, staleSample: rec.staleSample,
    staleList: [...rec.staleAll.values()], staleAt: rec.staleAt, maxOrder: rec.maxOrder, orderList: [...rec.orderAll.values()],
    takenBack: rec.maxTakenBack, judged: rec.judged, live: last.live || null,
    age: { looks: rec.ageLooks, older: rec.ageLooksOlder, wrong: rec.ageWrong, wrongAt: rec.ageWrongAt },
    maxLeft: rec.maxLeft,
    undo: rec.undo ? { ...rec.undo, staleAll: undefined, staleList: [...rec.undo.staleAll.values()] } : null,
    bank: rec.bank || null, directLive: rec.directLive || null,
    pressed: rec.pressed, dbBlocked: W.dbBlocked, blocked: [...W.blocked], retry, direct: rec.direct || null, unspanned: [...W.unspanned],
    create: route === CREATE_ROUTE ? { drawn: !!rec.createDrawn, boxes: rec.boxes || {}, reached: !!rec.reached, reachedDetail: rec.reachedDetail || '', seasonAt: rec.seasonAt ?? null, seasonDetail: rec.seasonDetail || '' } : null,
    stepList: rec.steps,
  };
  await W.ctx.close();

  /* what the page was like while it was translated: the create walk ends with the translator undoing itself */
  const seen = rec.beforeUndo || last;
  if (mode === 'off') check(`1. ${tag}: the translator is off`, last.fonts === 0 && last.marked === false && first.counting === true, `${last.fonts} font element(s)`);
  else check(`1. ${tag}: the translator ran`, row.swapped > 0 && seen.lang === 'pt' && seen.marked === true, `${row.swapped} text node(s) swapped, lang="${seen.lang || ''}"`);
  if (CONTROL !== 'noguard') {
    check(`1. ${tag}: the guard is installed on the page`, row.guardOn);
    const d = rec.direct || {};
    check(`8. ${tag}: asked directly, removing a moved node is quiet and inserting before one appends`, d.remove === 'quiet' && d.insert === 'quiet', `removeChild ${d.remove || 'not asked'}, insertBefore ${d.insert || 'not asked'}`);
  }
  if (route === CREATE_ROUTE) {
    const gone = rec.boundaryAt ? `the boundary took the page at "${rec.boundaryAt}"` : rec.stuckAt ? `stuck at ${rec.stuckAt}` : '';
    const boxes = rec.boxes || {};
    const names = PICKS.map(p => p[0]);
    const held = names.filter(n => boxes[n] && boxes[n].has);
    const readable = names.filter(n => boxes[n] && boxes[n].visible);
    const hiddenToday = mode === 'off' ? [] : KNOWN_HIDDEN_PICKS;
    const expected = names.filter(n => !hiddenToday.includes(n));
    const better = hiddenToday.filter(n => readable.includes(n));
    check(`2. ${tag}: the create screen drew`, !!rec.createDrawn, rec.createDrawn ? '' : gone);
    check(`2. ${tag}: all three picks registered, ${NAT} among them`, held.length === 3, gone || names.map(n => `${n} box "${boxes[n] ? boxes[n].shown : 'not there'}"`).join(', '));
    check(`2. ${tag}: each pick can be READ in its box${hiddenToday.length ? `, bar the known hidden one (${hiddenToday.join(', ')})` : ''}`,
      held.length === 3 && readable.length === expected.length && expected.every(n => readable.includes(n)),
      better.length ? `${better.join(', ')} can be read now: take it off KNOWN_HIDDEN_PICKS in this file and correct its header` : gone || `readable: ${readable.join(', ') || 'none'}; hidden: ${names.filter(n => !readable.includes(n)).join(', ') || 'none'}`);
    check(`3. ${tag}: the create flow reached the career`, !!rec.reached, rec.reachedDetail || gone);
    check(`4. ${tag}: one season forward and the hub still stands`, rec.seasonAt !== undefined && rec.hubStands === true, rec.seasonDetail || (rec.reached ? `the save never got a year older in ${CAREER_PRESSES} presses` : 'the career was never reached'));
  }
  /* Round 1141: the page is RIGHT, not only standing. Not asked of the noguard control, whose page is gone. */
  if (CONTROL !== 'noguard') {
    const stale = row.staleList;
    check(`10. ${tag}: the page says what React holds, at every look`, rec.judged > 0 && rec.maxStale === 0,
      rec.judged === 0 ? 'no element with words of its own was found to judge' : rec.maxStale
        ? `${stale.length} different stale text(s), ${rec.maxStale} at once at most, first at "${rec.staleAt}": React ${JSON.stringify(stale[0].react)}, the screen ${JSON.stringify(stale[0].screen)}, in ${stale[0].at}`
        : `${rec.judged} element(s) with words of their own at the fullest look`);
    const d2 = rec.directLive || {};
    check(`11. ${tag}: asked directly, a string the translator took and the page then removes, inserts before or rewrites comes out right`,
      d2.remove === 'the copy left with it' && d2.insert === 'in front' && d2.write === 'shows 17',
      `removed: ${d2.remove || 'not asked'}; inserted before: ${d2.insert || 'not asked'}; rewritten 16 to 17: ${d2.write || 'not asked'}`);
    check(`12. ${tag}: no text the translator will not take again is back on the page`, rec.maxTakenBack === 0, rec.maxTakenBack ? `${rec.maxTakenBack} at once` : '');
    check(`17. ${tag}: asked directly, a string layer two had refreshed still follows the page after the translator gives it back`, d2.undo === 'shows 18', `rewritten to 17, taken again, given back, rewritten to 18: ${d2.undo || 'not asked'}`);
    if (mode === 'off') {
      const l = last.live;
      check(`9. ${tag}: on a page nobody translated layer two did nothing`, !!l && l.swaps + l.removed + l.inserted + l.restored + l.returned === 0, l ? JSON.stringify(l) : 'window.__dukbTranslateStats is not there');
    }
  }
  if (route === CREATE_ROUTE && CONTROL !== 'noguard') {
    const boxes = rec.boxes || {};
    const bad = PICKS.filter(([n, want]) => { const b = boxes[n]; return !b || !b.was || !b.words || !b.words.includes(want) || b.words.includes(b.was); });
    check(`13. ${tag}: no box holds its placeholder beside its pick`, bad.length === 0,
      PICKS.map(([n]) => `${n}: was "${boxes[n] ? boxes[n].was : ''}", now "${boxes[n] ? boxes[n].words : 'not there'}"`).join('; '));
    check(`14. ${tag}: the age in the hub's line is the age in the save`, rec.ageLooksOlder >= 1 && rec.ageWrong === 0,
      rec.ageWrong ? `${rec.ageWrong} of ${rec.ageLooks} look(s) wrong: ${rec.ageWrongAt}` : rec.ageLooksOlder ? `${rec.ageLooks} look(s) at the line, ${rec.ageLooksOlder} of them after a birthday` : `the line was looked at ${rec.ageLooks} time(s) and never after a birthday, so nothing was measured`);
    if (mode !== 'off') {
      /* after review: the translator undid itself, and the career went on */
      const u = rec.undo || { back: 0, looks: 0, presses: 0, fonts: 0, maxStale: 0, staleAll: new Map(), returned: 0, ageLooks: 0, ageOlder: 0, ageWrong: 0, never: true };
      const list = [...u.staleAll.values()];
      const followed = !last.live || u.returned > 0; // with layer two on, it must have taken nodes up again
      check(`18. ${tag}: after the translator undid itself no wrapper is left and the page says what React holds, at every look`,
        u.back > 0 && u.looks >= 2 && u.fonts === 0 && u.maxStale === 0 && followed,
        u.never ? 'the walk never got as far as the undo' : u.back === 0 ? 'the translator gave nothing back, so nothing was measured'
          : u.fonts ? `${u.fonts} font element(s) still on the page`
            : u.maxStale ? `${list.length} different stale text(s), ${u.maxStale} at once at most, first at "${u.staleAt}": React ${JSON.stringify(list[0].react)}, the screen ${JSON.stringify(list[0].screen)}, in ${list[0].at}`
              : !followed ? 'layer two took up none of the nodes that came back'
                : `${u.back} node(s) given back${last.live ? `, ${u.returned} taken up again by layer two` : ''}, ${u.looks} look(s) over ${u.presses} press(es)`);
      check(`19. ${tag}: after the undo the age in the hub's line is still the age in the save, a birthday later`, u.ageOlder >= 1 && u.ageWrong === 0,
        u.never ? 'the walk never got as far as the undo' : u.ageWrong ? `${u.ageWrong} of ${u.ageLooks} look(s) wrong: ${u.ageWrongAt}` : u.ageOlder ? `${u.ageLooks} look(s) at the line, ${u.ageOlder} of them after a birthday that came after the undo` : `the line was looked at ${u.ageLooks} time(s) in ${u.presses} press(es) and never after a birthday, so nothing was measured`);
    }
  }
  if (route === BANK_ROUTE && CONTROL !== 'noguard') {
    const b = rec.bank || {};
    check(`15. ${tag}: The Bank's statement got a line that came in and a line that went out`, !!b.reached, b.detail || (rec.stuckAt ? `stuck at ${rec.stuckAt}` : 'the statement was never reached'));
    check(`16. ${tag}: every figure in the statement has its sign in front and nothing behind`, !!b.reached && b.wrong.length === 0, b.reached ? (b.wrong.length ? `wrong: ${JSON.stringify(b.wrong.slice(0, 4))}` : `${b.lines} line(s) read: ${JSON.stringify(b.sample)}`) : '');
  }
  check(`5. ${tag}: the walk pressed at least two controls`, rec.pressed.length >= 2, `${rec.pressed.length}${rec.pressed.length ? ': ' + rec.pressed.slice(0, 9).map(p => p.slice(0, 22)).join(' > ') : ''}`);
  check(`6. ${tag}: the route error boundary never appeared`, !rec.boundaryAt, rec.boundaryAt ? `it took the page at "${rec.boundaryAt}"` : '');
  check(`7. ${tag}: no NotFoundError`, row.notFound === 0, row.notFoundSample.slice(0, 150));
  if (retry) out(`        ${RETRY_WORDS}: ${!retry.pressed ? 'the button could not be pressed' : !retry.reloaded ? 'pressed, but the page did not reload' : retry.boundaryAt ? `reloaded, translated again, and broke again at "${retry.boundaryAt}"` : `reloaded and did not break again (${retry.reached ? 'reached the career' : 'stuck at ' + retry.stuckAt})`}`);
  return row;
}

/* ------------------------------------------------------------------ *
 * COST=1 (Round 1141): what the guard costs a page nobody translated.
 * Not a gate. It prints numbers for the header above and exits 0.
 * Two measurements, three builds of the same page each (both layers,
 * layer one only, no guard at all, picked with the two switches), one
 * walk at a time, COST_REPS times each in turn:
 *   the walk   the whole create flow and CAREER_PRESSES presses of a real
 *              career, untranslated, same dice: the browser's own count of
 *              seconds spent running script and doing tasks on that page.
 *   the calls  the same page then makes the calls React makes, a great
 *              many times, on a hidden box of its own: 100,000 rewrites of
 *              a text node that is on the page, 20,000 inserts and removals
 *              of an element, 20,000 of a text node (the one kind of record
 *              the observer has to look at twice). Milliseconds for each,
 *              the observer's own turn included.
 * ------------------------------------------------------------------ */
function stress() {
  return (async () => {
    const turn = () => new Promise(r => setTimeout(r, 0));
    const host = document.createElement('div');
    host.style.display = 'none';
    document.body.appendChild(host);
    const N = 2000;
    const texts = [];
    for (let i = 0; i < N; i += 1) {
      const p = document.createElement('p');
      p.appendChild(document.createTextNode('Age '));
      const t = document.createTextNode('16');
      p.appendChild(t);
      host.appendChild(p);
      texts.push(t);
    }
    await turn();
    const t0 = performance.now();
    for (let r = 0; r < 50; r += 1) for (let i = 0; i < N; i += 1) texts[i].nodeValue = String(r + i);
    await turn();
    const t1 = performance.now();
    for (let r = 0; r < 10; r += 1) for (let i = 0; i < N; i += 1) { const p = texts[i].parentNode; const b = document.createElement('b'); p.insertBefore(b, texts[i]); p.removeChild(b); }
    await turn();
    const t2 = performance.now();
    for (let r = 0; r < 10; r += 1) for (let i = 0; i < N; i += 1) { const p = texts[i].parentNode; const x = document.createTextNode('x'); p.insertBefore(x, texts[i]); p.removeChild(x); }
    await turn();
    const t3 = performance.now();
    host.remove();
    return { writes: t1 - t0, elements: t2 - t1, textNodes: t3 - t2 };
  })();
}
async function costRun() {
  const reps = Math.max(1, Number(env.COST_REPS || 3));
  const kinds = [['both layers', {}], ['layer one only', { nolive: true }], ['no guard', { noguard: true }]];
  const got = new Map(kinds.map(([name]) => [name, []]));
  for (let rep = 0; rep < reps; rep += 1) {
    for (const [name, sw] of kinds) {
      const W = await openWalk('desktop', 'off', { ...sw, cost: true });
      const rec = newRecord(CREATE_ROUTE, 'desktop', 'off', '', () => {});
      const cdp = await W.ctx.newCDPSession(W.page);
      await cdp.send('Performance.enable');
      await W.page.goto(BASE + CREATE_ROUTE, { waitUntil: 'load', timeout: 45000 });
      await walkCreate(W, rec);
      const metrics = async () => {
        const m = (await cdp.send('Performance.getMetrics')).metrics;
        const get = n => (m.find(x => x.name === n) || { value: 0 }).value;
        return { script: get('ScriptDuration'), task: get('TaskDuration') };
      };
      const walked = await metrics();
      /* A season lived week by week: the Season Centre's running clock is the busiest stretch of the
         page. On to the bar that offers it, then COST_WEEK_MS of it at 3x, pressing whatever starts the
         next match and letting every moment play itself. Same dice, so the same season in each build. */
      const extra = {};
      const seen = () => W.page.evaluate(() => { const b = document.querySelector('[data-week-by-week]'); return !!b && b.getBoundingClientRect().width > 2; }).catch(() => false);
      for (let i = 1; i <= 14 && !(await seen()); i += 1) {
        const ok = await step(W, rec, `on to the season bar ${i}`, async () => { const r = await advance(W.page, WALK.actions, WALK.skip, extra); await sleep(W.page, 450); return r; });
        if (!ok) break;
      }
      const week = { found: await seen(), script: 0, task: 0, started: 0 };
      if (week.found) {
        const before = await metrics();
        week.started = await W.page.evaluate(async ms => {
          document.querySelector('[data-week-by-week]').click();
          const until = performance.now() + ms;
          let started = 0;
          let fast = false;
          const label = b => (b.innerText || '').replace(/\s+/g, ' ').trim();
          while (performance.now() < until) {
            await new Promise(r => setTimeout(r, 400));
            const buttons = [...document.querySelectorAll('[role="dialog"] button')].filter(b => !b.disabled && b.getBoundingClientRect().width > 2);
            if (!fast) { const f = buttons.find(b => label(b) === '3x'); if (f) { f.click(); fast = true; } }
            const let_ = buttons.find(b => /^Let it play/.test(label(b)));
            if (let_) { let_.click(); continue; }
            const kick = document.querySelector('[data-kickoff] button');
            const next = kick || [...document.querySelectorAll('[data-centre-bar] button')].find(b => /^▶/.test(label(b)) && !/Resume/.test(label(b)));
            if (next && !next.disabled) { next.click(); started += 1; }
          }
          return started;
        }, Number(env.COST_WEEK_MS || 25000)).catch(() => -1);
        const after = await metrics();
        week.script = after.script - before.script;
        week.task = after.task - before.task;
      }
      const calls = await W.page.evaluate(stress);
      const state = rec.state || {};
      got.get(name).push({
        script: walked.script, task: walked.task, steps: rec.steps.length, age: state.save ? state.save.age : null,
        weekScript: week.script, weekTask: week.task, weekStarted: week.found ? week.started : -1,
        guardOn: (rec.first || {}).guardOn === true, live: !!state.live, stuck: rec.stuckAt || rec.boundaryAt || '', ...calls,
      });
      await W.ctx.close();
    }
  }
  const mid = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const f = (n, d = 0) => n.toFixed(d);
  console.log(`\nCOST, ${reps} run(s) of each, the middle one shown (all runs in brackets). The walk: ${CREATE_ROUTE} untranslated, create flow and ${CAREER_PRESSES} career presses, 1280 by 900.`);
  console.log(`  ${'build'.padEnd(16)}${'walk script s'.padEnd(26)}${'walk tasks s'.padEnd(26)}${'week by week script s'.padEnd(26)}${'week by week tasks s'.padEnd(26)}${'100k rewrites ms'.padEnd(24)}${'20k element ms'.padEnd(24)}${'20k text node ms'.padEnd(24)}walk`);
  for (const [name] of kinds) {
    const rows = got.get(name);
    const col = (k, d) => `${f(mid(rows.map(r => r[k])), d)} [${rows.map(r => f(r[k], d)).join(' ')}]`;
    console.log(`  ${name.padEnd(16)}${col('script', 2).padEnd(26)}${col('task', 2).padEnd(26)}${col('weekScript', 2).padEnd(26)}${col('weekTask', 2).padEnd(26)}${col('writes', 0).padEnd(24)}${col('elements', 0).padEnd(24)}${col('textNodes', 0).padEnd(24)}${rows.map(r => `${r.steps} steps to age ${r.age}${r.stuck ? ' STUCK ' + r.stuck.slice(0, 30) : ''} (guard ${r.guardOn ? 'on' : 'off'}, layer two ${r.live ? 'on' : 'off'})`)[0]}; matches started week by week: ${rows.map(r => r.weekStarted).join(' ')}`);
  }
  if (OUT_JSON) { try { fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true }); fs.writeFileSync(OUT_JSON, JSON.stringify({ base: BASE, cost: Object.fromEntries(got) }, null, 1)); } catch { /* the numbers are on the screen */ } }
  console.log('playTranslatedPage: cost measured, 0 checks, 0 failed');
}
if (env.COST) { await costRun(); await stop(0); }

/* JOBS walks at a time (three by default), each in its own context with its own seeded dice, so the
   order they finish in changes nothing but the order of the lines. The tables below are in the
   fixed order of the list. */
const todo = [];
for (const mode of MODES) for (const view of VIEWS) for (const route of ROUTES) todo.push({ mode, view, route });
const JOBS = Math.max(1, Math.min(Number(env.JOBS || 3) || 1, todo.length));
const done = new Array(todo.length).fill(null);
let nextJob = 0;
async function worker() {
  for (;;) {
    const i = nextJob;
    nextJob += 1;
    if (i >= todo.length) return;
    const lines = [];
    const out = l => lines.push(l);
    try { done[i] = await runWalk(todo[i], out); } catch (e) {
      checkLine(`${todo[i].route} ${todo[i].view} ${todo[i].mode}: the walk ran`, false, String(e).split('\n')[0].slice(0, 160), out);
    }
    console.log(lines.join('\n'));
  }
}
await Promise.all(Array.from({ length: JOBS }, () => worker()));
const rows = done.filter(Boolean);

/* ------------------------------------------------------------------ *
 * The record: what every walk needed, page by page.
 * ------------------------------------------------------------------ */
const pad = (s, n) => String(s).padEnd(n);
console.log('\nEVERY WALK');
console.log(`  ${pad('page', 21)}${pad('view', 9)}${pad('text', 7)}${pad('boundary', 34)}${pad('NotFound', 10)}${pad('guard line', 12)}${pad('moved nodes', 13)}${pad('stale text', 12)}steps`);
for (const r of rows) {
  console.log(`  ${pad(r.route, 21)}${pad(r.view, 9)}${pad(r.mode, 7)}${pad(r.boundaryAt ? 'at "' + r.boundaryAt.slice(0, 26) + '"' : 'none', 34)}${pad(r.notFound, 10)}${pad(r.guardLines, 12)}${pad(`${r.moved}${r.moved ? ' (' + r.movedByTranslator + ' taken)' : ''}`, 13)}${pad(r.maxStale, 12)}${r.steps}${r.stuckAt ? '  STUCK: ' + r.stuckAt.slice(0, 60) : ''}`);
}
console.log('\nBY PAGE');
for (const route of ROUTES) {
  const mine = rows.filter(r => r.route === route);
  const broke = mine.filter(r => r.boundaryAt);
  const where = [...new Set(broke.map(r => r.boundaryAt))];
  const moved = mine.map(r => r.moved);
  console.log(`  ${pad(route, 21)}broke in ${broke.length} of ${mine.length} walk(s)${where.length ? ' (' + where.map(s => '"' + s + '"').join(', ') + ')' : ''}; the guard printed its line in ${mine.filter(r => r.guardLines > 0).length}; moved nodes per walk ${moved.join(', ')}; stale text at most ${Math.max(0, ...mine.map(r => r.maxStale))}`);
}
const creates = rows.filter(r => r.create);
if (creates.length) {
  console.log('\nWHAT THE THREE BOXES READ after the picks');
  for (const r of creates) {
    console.log(`  ${pad(r.view, 9)}${pad(r.mode, 7)}${PICKS.map(([n]) => { const b = r.create.boxes[n]; return `${n} "${b ? b.shown : ''}" ${!b ? '(no box)' : b.visible ? '(readable)' : b.has ? '(HIDDEN)' : '(not in the box)'}`; }).join(' | ')}`);
  }
}
const shapes = new Map();
for (const r of rows) for (const m of r.movedList) {
  const key = `${r.route}: ${m.op} under <${m.parent}> of ${JSON.stringify(m.node)}${m.byTranslator ? '' : ' (not a node the translator took)'}`;
  shapes.set(key, (shapes.get(key) || 0) + 1);
}
if (shapes.size) {
  console.log(`\nTHE CALLS THAT NAMED A MOVED NODE (${shapes.size} different, each one a crash without the guard)`);
  for (const [key, n] of [...shapes].slice(0, 60)) console.log(`  ${n}x ${key}`);
}
/* Round 1141: every different stale text, with React's words, the screen's words and the element, which
   is what somebody needs to find the line in the source. */
const staleKinds = new Map();
for (const r of rows) for (const s of r.staleList) {
  const key = `${r.route}: React ${JSON.stringify(s.react)} | the screen ${JSON.stringify(s.screen)} | in ${s.at}`;
  const had = staleKinds.get(key) || { n: 0, step: s.step };
  had.n += 1;
  staleKinds.set(key, had);
}
const staleRow = rows.filter(r => r.maxStale > 0).sort((a, b) => b.maxStale - a.maxStale)[0];
if (staleRow) {
  console.log(`\nSTALE TEXT: ${staleKinds.size} different across ${rows.filter(r => r.maxStale > 0).length} walk(s). Most on screen at once: ${staleRow.maxStale} on ${staleRow.route} ${staleRow.view} ${staleRow.mode}.`);
  for (const [key, v] of [...staleKinds].slice(0, 40)) console.log(`  ${v.n}x ${key} (first at "${v.step}")`);
}
const orderKinds = new Map();
for (const r of rows) for (const s of r.orderList) orderKinds.set(`${r.route}: React has ${s.react}, the screen ${s.screen}, around ${JSON.stringify(s.words)} in ${s.at}`, (orderKinds.get(`${r.route}: React has ${s.react}, the screen ${s.screen}, around ${JSON.stringify(s.words)} in ${s.at}`) || 0) + 1);
if (orderKinds.size) {
  console.log(`\nOUT OF PLACE: ${orderKinds.size} different (T is a run of words, E an element)`);
  for (const [key, n] of [...orderKinds].slice(0, 20)) console.log(`  ${n}x ${key}`);
}
const liveRows = rows.filter(r => r.live);
if (liveRows.length) {
  const sum = k => liveRows.reduce((a, r) => a + r.live[k], 0);
  console.log(`\nLAYER TWO on ${liveRows.length} page load(s): ${sum('swaps')} text node(s) seen taken, ${sum('removed')} removal(s) and ${sum('inserted')} insert(s) put through, ${sum('restored')} string(s) handed back fresh, ${sum('returned')} node(s) taken up again after the translator gave them back. Text the translator will not take again, back on the page: ${Math.max(0, ...rows.map(r => r.takenBack))}.`);
}
const undoRows = rows.filter(r => r.undo);
if (undoRows.length) {
  console.log(`\nTHE UNDO on ${undoRows.length} create walk(s): the translator gave back ${undoRows.map(r => r.undo.back).join(', ')} node(s)${undoRows.some(r => r.undo.copies) ? ' (COPIES, the undocopies control)' : ''}; then ${undoRows.map(r => r.undo.presses).join(', ')} press(es) and ${undoRows.map(r => r.undo.looks).join(', ')} look(s); stale text at most ${undoRows.map(r => r.undo.maxStale).join(', ')}; the age line wrong at ${undoRows.map(r => `${r.undo.ageWrong} of ${r.undo.ageLooks}`).join(', ')} look(s), ${undoRows.map(r => r.undo.ageOlder).join(', ')} of them after a birthday that came after the undo.`);
  const kinds = new Map();
  for (const r of undoRows) for (const s of r.undo.staleList) kinds.set(`React ${JSON.stringify(s.react)} | the screen ${JSON.stringify(s.screen)} | in ${s.at}`, s.step);
  for (const [key, at] of [...kinds].slice(0, 12)) console.log(`  after the undo: ${key} (first at "${at}")`);
}
const leftRows = rows.filter(r => r.maxLeft > 0);
if (leftRows.length) console.log(`\nA COPY LEFT in an element whose own strings have all gone: in ${leftRows.length} walk(s), ${Math.max(...leftRows.map(r => r.maxLeft))} at once at most (counted in the stale text above).`);
const dbBlocked = rows.reduce((a, r) => a + r.dbBlocked, 0);
const otherHosts = [...new Set(rows.flatMap(r => r.blocked))];
console.log(`\nnothing left this machine: ${dbBlocked} request(s) to the database host aborted, other hosts aborted [${otherHosts.join(', ')}]${SHOTS ? `, ${shotCount} screenshot(s) in ${SHOTS}` : ''}`);

const guardPages = rows.filter(r => r.guardLines > 0).length;
const movedAll = rows.reduce((a, r) => a + r.moved, 0);
if (CONTROL === 'notranslate') {
  checkLine('9. with the translator off the guard printed nothing and no call named a moved node', guardPages === 0 && movedAll === 0, `${guardPages} of ${rows.length} page(s) printed the guard's line, ${movedAll} moved node(s)`);
} else if (CONTROL !== 'noguard') {
  /* Layer one prints its line only when it had to fall back: a moved node nobody had on record. */
  console.log(`${movedAll} call(s) in all named a node its parent no longer owned, each one a crash without the guard. Layer one had to fall back, and printed its line, on ${guardPages} of ${rows.length} page load(s).`);
}

if (OUT_JSON) {
  try {
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify({ base: BASE, control: CONTROL, entry: ENTRY, seed: SEED, checks: checksRun, failed, rows }, null, 1));
  } catch (e) { console.log(`could not write ${OUT_JSON}: ${String(e).slice(0, 80)}`); }
}

console.log('');
if (CONTROL === 'noguard') {
  /* The control's own reason, and nothing else, earns exit 1. */
  const guarded = rows.filter(r => r.guardOn);
  if (guarded.length) {
    console.error(`control "noguard": the guard was installed anyway on ${guarded.length} page(s), so the switch did nothing and this run proves nothing.`);
    await stop(2);
  }
  const broke = rows.filter(r => r.boundaryAt && r.notFound > 0);
  const createRows = rows.filter(r => r.route === CREATE_ROUTE);
  const createBroke = createRows.filter(r => r.boundaryAt && r.notFound > 0);
  const atNationality = createBroke.filter(r => r.boundaryAt.startsWith('choose nationality'));
  const retried = createBroke.filter(r => r.retry && r.retry.reloaded && r.retry.boundaryAt);
  const threw = rows.filter(r => r.direct && r.direct.remove === 'NotFoundError' && r.direct.insert === 'NotFoundError');
  console.log(`${checksRun} checks, ${failed.length} failed`);
  if (!broke.length && !threw.length) {
    console.error('control "noguard": nothing broke without the guard and the two calls did not throw when asked directly. THE CONTROL DID NOT FIRE.');
    await stop(2);
  }
  console.log(`control "noguard": asked directly, removeChild and insertBefore of a moved node both threw NotFoundError on ${threw.length} of ${rows.length} page(s).`);
  console.log(`control "noguard": without the guard ${broke.length} of ${rows.length} walk(s) ended in the error boundary with a NotFoundError behind it.`);
  if (createRows.length) {
    if (createBroke.length === createRows.length && atNationality.length === createRows.length) {
      console.log(`control "noguard": the create flow broke at the nationality step in ${atNationality.length} of ${createRows.length} walk(s), and ${RETRY_WORDS} broke at the same step again in ${retried.length}. RED for its own reason, the check works.`);
    } else if (createBroke.length) {
      console.log(`control "noguard": the create flow broke in ${createBroke.length} of ${createRows.length} walk(s), at ${[...new Set(createBroke.map(r => '"' + r.boundaryAt + '"'))].join(', ')}, which is NOT only the nationality step this control was written against. Still red for its own reason, but read the walk above.`);
    } else {
      console.log('control "noguard": NOTE, the create flow did NOT break without the guard (its strings may have been given spans of their own since). The control fired on other pages only.');
    }
  }
  console.log(`playTranslatedPage: ${checksRun} checks, ${failed.length} failed (control "noguard", red on purpose)`);
  await stop(1);
}
if (CONTROL === 'nospans') {
  /* Release AN, after review: check 13 (no box holds its placeholder beside its pick) lost its only
     control when Round 1096 mended that at the source, because nolive stopped showing the symptom. This
     control serves the create screen the way it was before Round 1096 (each placeholder a bare string
     again, three edits to the served script) with layer two off, and the placeholder must then stand
     beside its pick on EVERY create walk. Exit 1 only for that; anything else is exit 2. */
  console.log(`${checksRun} checks, ${failed.length} failed`);
  const createRows = rows.filter(r => r.route === CREATE_ROUTE);
  const notServed = createRows.filter(r => PICKS.some(([n]) => !r.unspanned.includes(`Choose ${n}`)));
  if (!createRows.length || notServed.length) {
    console.error(`control "nospans": ${createRows.length ? `on ${notServed.length} of ${createRows.length} create walk(s) the served script did not hold all three placeholders in the shape this control rewrites (found: ${notServed[0].unspanned.join(', ') || 'none'})` : 'no create walk ran'}. THE CONTROL CHANGED NOTHING, so it proves nothing.`);
    await stop(2);
  }
  const withLive = rows.filter(r => r.live);
  if (withLive.length) {
    console.error(`control "nospans": layer two was running on ${withLive.length} page(s), so its switch did nothing and this run proves nothing.`);
    await stop(2);
  }
  const broke = rows.filter(r => r.boundaryAt || r.notFound > 0);
  if (broke.length) {
    console.error(`control "nospans": ${broke.length} walk(s) broke (${broke[0].view} ${broke[0].mode}${broke[0].boundaryAt ? ' at "' + broke[0].boundaryAt + '"' : ''}). Layer one is still on and must hold the page up: this is a red of another kind.`);
    await stop(2);
  }
  /* its own: 2 (a pick cannot be read in its box) and 13, and what layer one alone leaves wrong (the nolive list) */
  const own = /^(2|10|11|13|14|16|18|19)\. /;
  const other = failed.filter(f => !own.test(f));
  if (other.length) {
    console.error(`control "nospans": ${other.length} check(s) failed that have nothing to do with the placeholders or layer two, first: ${other[0].slice(0, 200)}`);
    await stop(2);
  }
  const beside = createRows.filter(r => PICKS.some(([n]) => { const b = r.create.boxes[n]; return b && b.was && b.words && b.words.includes(b.was); }));
  const thirteen = failed.filter(f => f.startsWith('13. ')).length;
  console.log(`control "nospans": three placeholders served bare on ${createRows.length} create walk(s); a placeholder beside its pick in ${beside.length} of them, check 13 red ${thirteen} time(s).`);
  if (beside.length !== createRows.length || thirteen !== createRows.length) {
    console.error('control "nospans": with the spans gone and layer two off, a placeholder did NOT stand beside its pick on every create walk. THE CONTROL DID NOT FIRE, so check 13 is not proven.');
    await stop(2);
  }
  console.log('control "nospans": the page stood and check 13 went red on every create walk. RED on purpose, the check works.');
  console.log(`playTranslatedPage: ${checksRun} checks, ${failed.length} failed (control "nospans", red on purpose)`);
  await stop(1);
}
if (CONTROL === 'nolive') {
  /* The control's own reasons, and nothing else, earn exit 1: the page is WRONG the ways Round 1140
     left it, and it still stands. Release AN: a placeholder beside its pick is no longer one of
     them (Round 1096 mends that at the source, see the header), so it is counted and not required. */
  console.log(`${checksRun} checks, ${failed.length} failed`);
  const withLive = rows.filter(r => r.live);
  if (withLive.length) {
    console.error(`control "nolive": layer two was running anyway on ${withLive.length} page(s), so the switch did nothing and this run proves nothing.`);
    await stop(2);
  }
  const broke = rows.filter(r => r.boundaryAt || r.notFound > 0);
  if (broke.length) {
    console.error(`control "nolive": ${broke.length} walk(s) broke (${broke[0].route} ${broke[0].view} ${broke[0].mode}${broke[0].boundaryAt ? ' at "' + broke[0].boundaryAt + '"' : ''}). Layer one is still on and must hold the page up: this is a red of another kind.`);
    await stop(2);
  }
  /* 18 and 19 are its own too: with layer one alone the translator's undo puts back copies React has
     removed since, and nodes holding the words it saved, which stay wrong until React's next write */
  const own = /^(10|11|13|14|16|18|19)\. /;
  const other = failed.filter(f => !own.test(f));
  if (other.length) {
    console.error(`control "nolive": ${other.length} check(s) failed that have nothing to do with layer two, first: ${other[0].slice(0, 200)}`);
    await stop(2);
  }
  const createRows = rows.filter(r => r.route === CREATE_ROUTE);
  const bankRows = rows.filter(r => r.route === BANK_ROUTE);
  const stale = createRows.filter(r => r.maxStale > 0);
  const beside = createRows.filter(r => PICKS.some(([n]) => { const b = r.create.boxes[n]; return b && b.was && b.words && b.words.includes(b.was); }));
  const frozen = createRows.filter(r => r.age.wrong > 0);
  const sign = bankRows.filter(r => r.bank && r.bank.wrong.length > 0);
  if (createRows.length) console.log(`control "nolive": on the create walk, stale text in ${stale.length} of ${createRows.length}, a placeholder beside its pick in ${beside.length}, the age line behind the save in ${frozen.length}.`);
  if (bankRows.length) console.log(`control "nolive": in The Bank a figure with its sign in the wrong place or old words in ${sign.length} of ${bankRows.length} walk(s)${sign.length ? ', for example ' + JSON.stringify(sign[0].bank.wrong[0]) : ''}.`);
  const fired = createRows.length + bankRows.length > 0
    && stale.length === createRows.length && frozen.length === createRows.length
    && sign.length === bankRows.length;
  if (!fired) {
    console.error('control "nolive": with layer two off the page was NOT wrong in every way this control was written against. THE CONTROL DID NOT FIRE.');
    await stop(2);
  }
  console.log(`control "nolive": the page stood (no boundary, no NotFoundError in ${rows.length} walk(s)) and was wrong for its own reasons. RED on purpose, the checks work.`);
  console.log(`playTranslatedPage: ${checksRun} checks, ${failed.length} failed (control "nolive", red on purpose)`);
  await stop(1);
}
if (CONTROL === 'undocopies') {
  /* The control's own reason, and nothing else, earns exit 1: the translator gave back COPIES of the nodes
     it took, which nothing can follow, so after the undo the page must stop saying what React holds
     (check 18) and the age line must fall behind the save (check 19), on every create walk, while
     everything before the undo stays green. That is what the two checks are for, seen firing. */
  console.log(`${checksRun} checks, ${failed.length} failed`);
  const own = /^(18|19)\. /;
  const other = failed.filter(f => !own.test(f));
  if (other.length) {
    console.error(`control "undocopies": ${other.length} check(s) failed that have nothing to do with the undo, first: ${other[0].slice(0, 200)}`);
    await stop(2);
  }
  const createRows = rows.filter(r => r.route === CREATE_ROUTE);
  const copied = createRows.filter(r => r.undo && r.undo.copies > 0);
  const lost = createRows.filter(r => r.undo && r.undo.maxStale > 0);
  const frozen = createRows.filter(r => r.undo && r.undo.ageWrong > 0);
  console.log(`control "undocopies": the translator gave back copies on ${copied.length} of ${createRows.length} create walk(s) (${copied.map(r => r.undo.copies).join(', ')}). After it: stale text in ${lost.length}, the age line behind the save in ${frozen.length}.`);
  const fired = createRows.length > 0 && copied.length === createRows.length && lost.length === createRows.length && frozen.length === createRows.length;
  if (!fired) {
    console.error('control "undocopies": the page was NOT wrong after an undo nothing can follow, on every create walk. THE CONTROL DID NOT FIRE.');
    await stop(2);
  }
  console.log('control "undocopies": everything before the undo was green and the two checks after it went red. RED on purpose, the checks work.');
  console.log(`playTranslatedPage: ${checksRun} checks, ${failed.length} failed (control "undocopies", red on purpose)`);
  await stop(1);
}
if (failed.length) failed.forEach(f => console.log('  - ' + f));
if (CONTROL === 'notranslate') console.log(failed.length ? 'control "notranslate": RED, and it must be green.' : 'control "notranslate": green with the translator off, zero guard lines, zero moved nodes.');
console.log(`playTranslatedPage: ${checksRun} checks, ${failed.length} failed`);
await stop(failed.length ? 1 : 0);
