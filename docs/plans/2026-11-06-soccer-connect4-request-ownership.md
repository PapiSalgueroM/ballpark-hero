# PL-05: Soccer Connect4 pending request ownership

The master acceptance is that duplicate and interrupted actions preserve balances and produce one coherent resulting state. This bounded slice protects the existing Soccer Connect4 client from a validator response that belongs to a previous board or mode. The full master card remains partial.

## Behavior and design

The hook latches a private opaque Symbol token synchronously before starting validation. This consumes no random draw. A second API call before React commits sees the owner and makes no second request. resetGame and switchMode invalidate the owner and release busy state before performing the unchanged reset/generator operations.

After an awaited response body, in catch, and in finally, the action checks its own token. A stale action returns false without mutating the current board, pending cell, turn, error, daily log or busy state. Only the owning finally clears the token and busy state.

The hook's internal boolean reports whether the awaiting Page still owns input cleanup. It does not report match validity. Current valid, invalid, unverified and network paths retain normal cleanup. Stale/non-owned/duplicate-pending actions return false. FootballConnect4.tsx clears its player input only for that owned receipt. No second Page epoch is needed.

The endpoint, payload and validator truth handling are unchanged. Every error remains fail closed. No new player data, generated criteria, board config, storage schema, engine logic, scoring, random draw, auth boundary or other sport's hook changes.

## Regression and causal checks

The final275-line test pins the actual Hook, daily core, baked catalog/generator/firstDraw, Page, Board, autocomplete and search code. Its fictional validator/search transport and external shell/auth/completion boundaries do not replace the board engine. The unit clock is2026-11-06T12:00:00Z; all raw state, HTML, input/focus, requests, daily actions, storage and random tape are retained. Same-configuration re-deals are genuine calls to the existing API.

The six original failures are C4_OWNER_RESET, C4_OWNER_DAILY, C4_OWNER_REFUSAL, C4_OWNER_NEWER, C4_OWNER_PAGE and C4_OWNER_DUPLICATE. The six complete preservation cases are VALID, INVALID, UNVERIFIED, CONTRADICTORY, BUSY and NETWORK. Final original run42180255576 retains the complete original RAW SHA e0a49982e80210b878b1a23156a8c3966f40ce00d3ae49653ae0671e5092d48b and all22 existing reason-shape passes.

Fixed run42180853993 passes12 new plus22 existing tests,44 frames and the exact six complete original preservation cases. Fixed RAW SHA9109bcf79649a72de8e16364ca45b5ca05129fe33ab097e0ba88910b360df823. It includes late stale catch, current successful cleanup and current invalid cleanup, not only stale success.

Control run42181991093 executes12 actual arms and144 rows, with22 expected business failures and122 passes. Arms are fixed, complete original, reset invalidation removed, mode invalidation removed, entry latch removed, post-body ownership removed, catch ownership removed, finally ownership removed, unconditional Page cleanup, current invalid cleanup false, current success cleanup false, restored. Red counts are0/6/1/4/1/5/1/1/1/1/1/0. All72 whole preservation cases hold, and fixed/restored RAW is identical. Each control proves its source actually changed before running. Every original source/index/lock/installed version is restored.

## Production build and native qualification

- Final original run42180255576 produced the six predicted ownership failures and preserved six existing behavior cases plus22 existing reason-shape tests. All original producer refreshes retained the exact212344-byte RAW SHA256 e0a49982e80210b878b1a23156a8c3966f40ce00d3ae49653ae0671e5092d48b.
- Fixed run42180853993 passed34 tests,44 RAW frames and all six complete preservation vectors. Fixed365602-byte RAW SHA2569109bcf79649a72de8e16364ca45b5ca05129fe33ab097e0ba88910b360df823. Current invalid, unverified, contradictory, busy and network paths retain their input cleanup and fail-closed behavior.
- Control run42181991093 produced144 actual rows over12 arms:122 passes and22 named business failures. Red counts0/6/1/4/1/5/1/1/1/1/1/0. All72 complete preservation vectors held; fixed and restored RAW bodies were identical. Every fault changed the pinned executable source; final source, index, locks,521 installed versions and zero-byte offline receipt were restored.
- Primary run42182482124 passed proper app types,34 tests, normal850-file build,19 output readers, all16 unchanged weight caps,37 legacy browser checks and the native ownership journeys. Its overall result remains historically red: the unchanged product-name guard rejected an accidental phrase formed by the owned QA helper's first comment. It did not fail on product code. Original helper80a6bd9ac8b9dc1381a12802bfdfc6ded0628e89 changed only its first comment to321ed6de1abe594254b472ef0040424f1b06c09d; every byte after the first newline is identical. The guard and its banned list were not changed.
- Primary native proof used the actual built App at320x568,390x844 and1280x900 with bounded fictional search/validator transport. It recorded1030 checks,171 frames,63 trusted actions,36 layouts and9 native PNGs. An actual pending guess A was invalidated by a native Unlimited re-deal, guess B began, A's completed old response left B's board/input/busy state untouched, then B placed exactly one canonical blue chip. Root and peer viewed all9 PNGs and audited raw references. No App, DOM, save, clock or RNG override, no foreign request forwarded. Native RNG counts and identical-board replay are unclaimed; the same-configuration reset and API duplicate are unit-owned checks.
- The older37-check,5-scenario browser fence is supplemental. It uses its historical mocked record and consent setup; it is not credited as native no-injection proof.
- Clean run42183951914 passed proper types, normal build, all4654 source/public/script rows and every byte of850 built files against primary's actual tar, with the QA helper absent. It also freshly passed the unchanged product-name guard on clean source. No units,19 readers,16 caps,legacy fence or native journeys were rerun in that join.
- Corrected-helper closure run42184410397 succeeded at7cbedbbd0a375a570b13c28079825c4089e98d3c, tree18c795fb0be527b83635e393031eb8eaea12a2c8, workflow554b830e283d27070b57df98db578c62eba0fe58. It freshly passed the unchanged product-name guard0cc180c43c692ed65fb067e7f187826806845798 with helper321 present, proved the header-only inverse,4654 source rows,850 actual build bodies,521 installed versions and all source/lock/offline holds, and separately verified271 native raw references plus the successful primary stages. Artifact13487600026:662487 bytes,SHA25661222fe5e0dcfadedbda0b6c2131bd5afe5759386d8e09682f6d37332a911232. This closes the twentieth reader obligation by a fresh unchanged fence, not by changing the historically red primary result or rerunning its19 successful readers.

Primary artifact13486287954:12732354 bytes,SHA256 cc187c517485e48f5a2ccb758fb14a8ee6724bfb3293fff7698fe67337f32c17; actual dist.tgz SHA25688e7cfd4239dbebd41a2461e1630878c78c5b6693f79bc3405a32ae7aca7e5e9. Clean artifact13486444346:658312 bytes,SHA256 b66634c683ac52c3fc7b764308deb521d251d5dc0284fff46a8a402db49621f0. All316 primary ZIP bodies and850 tar bodies were independently checked. Physical evidence is retained outside the repo under C:/Users/antho/dukb-handoff/2026-11-05/soccer-connect4-request-ownership/.


## Caller and visual limits

The original CI AST parsed2526 source files, found the Page as the only production caller, and reported no production unresolved loaders or parse errors. Whole-repo git grep reported no scripts call. Existing dailySaveParity/noDoubleRecord test consumers await or ignore the return. Other four US-sport hooks are distinct and held. This does not claim a transitive call graph.

Native journey coverage is actual A/reroll/B ownership and a single canonical B chip. API duplicate and same-configuration reset are unit coverage, not a native double-click or native same-board claim. No cancellation/unmount, cross-tab or server-authority guarantee is added. All fictional fixtures are test-only.

Inherited32px mode buttons and narrow grid cells retain exact App dimensions. Native checks require visibility, clipping, center hit and actual trusted actuation; input/options require44px. Full-board fit on phones and44px mode/grid compliance remain separate UI work. Root and peer reviewed9 native PNGs.

## Product delivery

Clean draft base: PR518, head48292d2e65c4d4a8b2f568133ec73b43249105cc, treef5cc967c435a6faf85e2f30100e08bbb76927739. Product files are Hook971dbdfa5a0e3c5adf749f9f301cc0fd994a178f, Page634f94cea7810cfd678c3a4a6f470c3039773882, test1156a83c6966f4c55bef0ed4c7f7a3288f4e87eb and this plan, PROJECT-STATE and WORKBOARD. No remote-only helper, controller or QA workflow ships in the clean PR. Final source receipt must compare every4654 source/public/script blob to actual clean build tree4a276be226b6eeaf9f0da189a7c080f2666d45eb; only docs may change after that build. No generated patches.

Master provenance: C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt,409 cards,444117 bytes,SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a, PL-05 lines6917-6927. Local App/Git/runtime and release remain held. All qualification runs remotely with locked dependencies; no merge/publish. Companion-owned Career/Club Manager/Team-picker/K League/guide files remain untouched.
