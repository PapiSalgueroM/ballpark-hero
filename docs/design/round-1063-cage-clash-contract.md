# Round1063: Cage Clash design contract

Anthony explicitly asked for pixel sports visuals and playable MMA grappling.
This is hands-on arcade combat, separate from the promotion management game.
Design decisions are authorized by his standing full autonomy instruction.

Objective: beat a fictional CPU fighter through distance, timing and grappling.
Core loop: move into range, strike or guard, clinch/take down, gain position,
submit or escape. Stamina and CPU style change the best next action.
Three45-second arcade rounds, breaks continue only on explicit input.
Health depletion gives KO; actual submission progress gives Submission;
otherwise earned round points decide the winner. Fictional arcade rules.

Controls: touch and keyboard. Movement/guard held, actions can be tapped/held,
cooldowns enforce costs. Keyboard arrows/A,D move, Space guard, J punch,
K heavy, L kick, U grapple, I submit, O escape; P pause/Escape pause.
All44px controls. Clear contextual disabled actions and short current-state
tip. Canvas original pixel art at320x180, scaled nearest-neighbor; visible
health/stamina/timer and grappling/submission status outside canvas.
Setup shows rules plus worked example, reopened with question button.
Focus lost/hidden page/help automatically pauses; no input held on resume.
No screen scroll jumps. Complete main play/action region fits320x780,
390x844 and1280x720 in light/dark, mouse/touch/keyboard, reduced motion.
Reduced motion keeps informative poses without decorative shake/flashing.

Engine API (src/lib/cageClash.ts):
CageStyle='balanced'|'striker'|'grappler'.
CageAction='jab'|'power'|'kick'|'grapple'|'submit'|'escape'.
CageInput={move:-1|0|1,guard:boolean,action:CageAction|null}.
CageFighter={x,health,stamina,style,action,actionTicks,hits,takedowns,
damageDealt,blocked,controlTicks,submission,cooldown,posture}, numeric except style/action/posture.
CageFight={seed,tick,cpuInput:CageInput,groundLevel:0|1|2,roundStart:{player:number,cpu:number},phase:'fight'|'break'|'finished',
position:'standing'|'clinch'|'ground',top:'player'|'cpu'|null,
round:1|2|3,remainingTicks,player:CageFighter,cpu:CageFighter,
roundCards:{player:number,cpu:number}[],message:string,
result:null|{winner:'player'|'cpu'|'draw',method:'KO'|'Submission'|'Decision',
score:number}}.
createCageFight(playerStyle,cpuStyle,seed): CageFight.
stepCageFight(state,input): CageFight, pure one50ms step, CPU included.
continueCageRound(state): CageFight, valid only at break.
cageClashScore(state): number, terminal score bounded0..100.
CAGE_TICK_MS=50, CAGE_ROUND_TICKS=900.
canCageAction(state,action,side): boolean and cageActionLabel(state,action,side): string are exported for contextual UI. Pose action also accepts idle/move/guard. Ground top jab=strike, power=postured heavy, kick=posture, grapple=pass, submit=hold, escape=stand. Bottom jab=strike, power disabled, kick=regain guard, grapple=sweep, submit=guard submission, escape=stand. If interface additions are needed, message root and Astra before changes.
No premature fixed module-scope evaluation of imported engine values.

Mechanics: bounded distance/collision, guard reduces strike damage/costs stamina,
attack cooldown/cost/no phantom out-of-range hits; strike/ground actual poses.
Grapple close enough enters clinch; grapple from clinch attempts takedown.
Ground top/bottom and positional advantage matter. Submission builds real
progress while applying a held action and can be resisted/escaped. Posture,
ground strike/pass/sweep/escape are contextual actions, no automatic free win.
CPU uses actual same legal inputs/costs, responds to range/guard/style.
Positions use normalized0..100 coordinates, bounded10..90 with a minimum6
separation. CPU intent lasts8 ticks so held guarding is visible and consistent.
Deterministic seeded randomness, finite rounds, no duplicate terminal actions.

Score: earned0..100. Win50, winning finish15, damage contribution up to20,
defense/control contribution up to15; draw outcome25, loss outcome0.
No quit/refresh award. Use existing useGameCompletion('cage-clash',...)
once per new finish, show same score. Pure short fight refresh resets;
no in-progress save schema or producer records are changed.

Data: original archetypes and procedural art only. No real fight outcomes,
athletes, quotations or branded assets. No external images or new dependencies.
Setup adds balanced/striker/grappler choices for player and CPU; remix rounds.
No daily mode; this is an action game. Difficulty fixed and comparable.

Verification: deterministic/mechanical outcomes, held vs blank-input strategy
distributions, stamina/guard/range/takedown/escape/submission/terminal controls.
Effective source mutations must change real engine code and fail intended
assertions. Mounted lifecycle: clock/cleanup, keyboard/pointer release, hidden
page/help pause, double completion, CPU action after resume, no stale input.
Native actual keyboard/touch paths to standing/clinch/ground/top/bottom/
submission/result. Four viewports/themes, reduced motion, all action boxes,
focus and no-scroll. Remote CI only. Build then all16 built readers; remote
generators regenerate route, catalog counts/search/SEO/home template/sitemap.
No weakening existing guards. Preserve original boxing and promoter sources.
