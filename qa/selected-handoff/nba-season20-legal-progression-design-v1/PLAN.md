# Planned NBA season-20 legal progression diagnostic

Status: SOURCE-ONLY DESIGN, execution UNRUN. This does not close the reported save issue or extend the preset twenty-row fixture qualification.

Use the actual b20 UsCareerBoard and NBA_CAREER_SPORT, following the existing market-board test mount. Start with empty storage, modern era, default PG and Point God. Click the real Enter the draft button, not the separate prospect journey. Before mounting, bind Math.random to the existing keyedRng stream for the frozen keys nba20-progression:0 through nba20-progression:7. Keep the draw cursor and full action transcript. A reload continues the cursor; only a new fresh replay restarts its seed.

The fixed budget is eight seeds, at most 512 UI actions and 21 generated season rows per seed, within the existing 240000 ms process deadline. Stop at retirement, the row/action limit or the process budget. Do not extend the budget to obtain a successful seed.

Drive only visible enabled controls, in the board's actual render order:
- [data-season-reveal] Continue; [data-career-decision-outcome] [data-decision-continue]; [data-rivalry-event] Continue.
- [data-rivalry-choice] [data-rivalry-option="0"], then its outcome Continue.
- The Is it time? card's button whose accessible name contains One more year. This does not override the hard retirement predicate.
- [data-career-event] [data-career-decision-option="0"], followed by the outcome Continue, for each actual summer card. Exceptions: nbaB_farewellTour and nbaB_retireHealthy use option 1, the actual Say nothing, just hoop and Keep going until the game says stop choices.
- [data-extension-talk] [data-ext-decline], including null-offer Play the year out. Its handler immediately calls playSeason, so re-read the saved state before pressing Play again.
- [data-fa-window] [data-fa-sign]: choose the first enabled real offer in source order. Do not negotiate. If an actual [data-market-wheel] is shown, press [data-market-skip], then [data-market-continue].
- Otherwise use the real Play the YEAR season button. Unexpected screens, no legal enabled action, failed saves or unresolved loading are retained diagnostic stops.

Never assign age, rating, health, accolades, contract years, retirement fields or history; fabricate rows; call engine start/sim/progress instead of board actions; force an offer; disable retirement; or rewind RNG to retry a result. Read storage for evidence only. All career writes must come from the real board.

Retain saved bytes, visible phase/action, RNG cursor and every generated row after each action. A played season must add exactly one row and retain the prior history prefix. Offer, reveal and other non-playing transitions must not invent a row. Capture the genuine 19-to-20 transition and next attempted season, including age, OVR, health, contract years, phase, talk and retirement state. Reload a settled boundary from untouched actual storage and compare career/history/terms, with no extra season or redrawn saved talk. Avoid claiming transient reveal or completed-summer normalization is a persistence defect.

The unchanged hard stop is OVR <=66, age >=41 or 21 played rows. Preserve every early-retirement endpoint. If no bounded seed reaches twenty real rows, report NOT_REACHED with its actual endpoints, not fixed or refuted. If one does, qualify only the observed continuation, null-offer, free-agency or retirement branch. The reporter's unavailable save and real-browser visibility remain separate limits.

