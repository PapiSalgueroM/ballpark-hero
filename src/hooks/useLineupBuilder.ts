import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { localEvaluateSoccerXI } from '@/lib/localLineupEval';
import { getRandomTeamAssignments, clubs as ALL_CLUBS, nations as ALL_NATIONS, clubEraClubs, clubYearClubs } from '@/data/lineupTeams';
import { askValidator, type ValidatorAnswer } from '@/lib/validatorClient';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import type { Formation, FilledSlot, GamePhase, AIVerdict, PickMeta, TeamAssignment, DraftChoice } from '@/types/lineupBuilder';
import { FORMATIONS, lastRecordedYear, recordedYearsLabel } from '@/types/lineupBuilder';
import { checkLineupPick, gradeFit, SLOT_ALLOWED_BY_ROLE } from '@/lib/positionFit';
import type { Position } from '@/types/game';
import { normalizePosition } from '@/lib/squadDeal';
import { BUILD_XI_DRAFT_KEY, clubPickVerifies, isCurrentBuildXiDraft, recordedPickVerifies, writeBuildXiDraft } from '@/lib/buildXiDraft';
import { loadBuildXiDraft, type BuildXiResult } from '@/lib/buildXiResult';
import { recheckStorageWrites, safeSetItem } from '@/lib/safeStorage';
import type { SeasonReport, WorldXiSeasonApproach } from '@/lib/worldXi';
import { buildXiAlreadyPicked, buildXiExclusions, buildXiNamesake, buildXiReviewedName } from '@/lib/buildXiPlayers';
import { normalizeName } from '@/lib/playerSearch';
import { verifiedPositionFallback } from '@/data/verifiedSoccerPositions';

/* The project URL and public key are hardcoded on purpose: CLAUDE.md records
   that Lovable injects VITE_SUPABASE_* pointing at a DELETED project, so these
   must never be read from the environment. */
const SUPABASE_REST = "https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y";

/* ROUND 493: the verified history the position gate was throwing away.
   checkLineupPick has always been able to take it and this caller never passed
   it, while World XI passes it at worldXi.ts:131, so the same shared rule
   answered two different ways depending on which game asked and Build Your XI
   was the strict one for no reason. Measured over the 134 curated players and
   all 15 slot roles: 94 of 945 player-and-slot pairs were being refused when the
   history allows them, all of it real football (Amad Diallo at right wing-back,
   Alex Baena at CAM, Anthony Gordon at striker).

   The guard is World XI's, copied rather than invented: the curated row is only
   believed when its PRIMARY matches the position on the row the player picked.
   player_verified_positions is keyed by name and a name is not a person, so a
   same-named player in a different role must earn nothing from it. The
   goalkeeper boundary needs no guard here because fitsAllowed puts it above
   both widening paths. */
/* Round 825 review: since this round the read also runs for a pick the plain
   rule takes as next door, which is a common pick (a right back at left back),
   and it used to have no time limit. A slow table could hold such a pick
   with nothing on screen. Past this many milliseconds the read gives up and
   the plain rule answers, exactly as a failed read always has. */
export const HISTORY_WAIT_MS = 4000;

async function verifiedSecondaries(name: string, primary: Position | null, club: string | null | undefined): Promise<Position[]> {
  if (!name || !primary) return [];
  const fallback = verifiedPositionFallback(name, primary, club);
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), HISTORY_WAIT_MS);
  try {
    /* Read with a plain fetch, the way this file already reaches the edge
       functions below. The typed client refuses the table outright:
       player_verified_positions exists in the database and is absent from the
       generated types, so `supabase.from` rejects the name at compile time.
       Regenerating those types is a change to a 200-plus table file and is not
       this round's business. */
    const res = await fetch(
      `${SUPABASE_REST}/player_verified_positions?select=primary_position,secondary_positions&player_name=ilike.${encodeURIComponent(name)}&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }, signal: stop.signal },
    );
    if (!res.ok) return fallback;
    const rows = (await res.json()) as { primary_position: string | null; secondary_positions: unknown }[];
    const row = rows[0];
    if (!row?.primary_position || normalizePosition(String(row.primary_position).trim()) !== primary) return fallback;
    const raw = Array.isArray(row.secondary_positions)
      ? row.secondary_positions
      : String(row.secondary_positions ?? '').split(/[;,/]/);
    const positions = raw.map((x) => String(x).trim()).filter(Boolean) as Position[];
    return [...new Set([...positions, ...fallback])];
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
import { useGameCompletion } from '@/hooks/useGameCompletion';

export { clubPickVerifies };

function unverifiedLine(answer: Extract<ValidatorAnswer, { kind: 'unverified' }>): string {
  if (answer.exhausted) {
    return 'Answer checking has used up its allowance for today, so this pick was not counted. Try another player or reroll the team.';
  }
  if (answer.why === 'timeout') return 'That check took too long, so this pick was not counted. Try again or pick someone else.';
  return answer.reason || "Couldn't verify that answer. Try again in a second.";
}

const STALE_DRAFT_MESSAGE = 'Your lineup changed in another tab. Reload to continue that draft.';

export function useLineupBuilder() {
  const [saved] = useState(loadBuildXiDraft);
  const [formation, setFormation] = useState<Formation | null>(saved.draft?.formation ?? null);
  const [phase, setPhase] = useState<GamePhase>(() => {
    if (saved.result) return 'result';
    if (!saved.draft) return 'formation';
    return saved.draft.slots.length === 11 ? 'reviewing' : 'building';
  });
  const [draftChoice, setDraftChoice] = useState<DraftChoice>(saved.draft?.draftChoice ?? { mode: 'mixed' });
  const [seasonApproach, setSeasonApproach] = useState<WorldXiSeasonApproach>(saved.draft?.seasonApproach ?? 'balanced');
  const savedApproach = useMemo(() => seasonApproach === 'balanced' ? {} : { seasonApproach }, [seasonApproach]);
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null);
  const [filledSlots, setFilledSlots] = useState(() => new Map<number, FilledSlot>(saved.draft?.slots));
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>(saved.draft?.teamAssignments ?? []);
  const [result, setResult] = useState<BuildXiResult | null>(saved.result);
  const verdict = result?.verdict ?? null;
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTeamIndex, setSpinTeamIndex] = useState(0);
  const storedDraft = useRef(saved.raw);
  const previousDraft = useRef(saved.draft ? JSON.stringify(saved.draft) : null);
  // Picks and rerolls save first so a conflict leaves the visible draft intact.
  const persistDraft = useCallback((draft: string | null) => {
    if (!writeBuildXiDraft(storedDraft.current, draft)) return false;
    storedDraft.current = draft;
    previousDraft.current = draft;
    return true;
  }, []);
  useLayoutEffect(() => {
    if (phase === 'result') return;
    const draft = formation && (phase === 'building' || phase === 'reviewing')
      ? JSON.stringify({ formation, draftChoice, teamAssignments, slots: [...filledSlots], ...savedApproach }) : null;
    if (draft !== previousDraft.current && !persistDraft(draft)) previousDraft.current = draft;
  }, [formation, phase, draftChoice, teamAssignments, filledSlots, persistDraft, savedApproach]);
  /* Round 1138: the validator call in flight, so a reroll, a new formation, a
     reset, leaving the page or a Cancel button can give up on it. A cancelled
     call ends as unverified: nothing filled, no message, not busy. pickRun
     counts the times the player gave up, so a pick that was still reading the
     position history when he did (no validator call yet to abort) is dropped
     too, instead of landing under the team he just rerolled away. Giving up
     clears the busy flag here and now, and a pick that was given up never
     touches the game's state again, so it cannot clear the flag of the pick
     that follows it. */
  const validatorCall = useRef<AbortController | null>(null);
  const pickRun = useRef(0);
  const cancelValidation = useCallback(() => {
    pickRun.current += 1;
    validatorCall.current?.abort();
    setIsValidating(false);
  }, []);
  useEffect(() => cancelValidation, [cancelValidation]);

  const evaluationRun = useRef(0);
  const activeEvaluation = useRef(false);
  const settled = useRef(!!saved.result);
  const cancelEvaluation = useCallback(() => {
    evaluationRun.current += 1;
    activeEvaluation.current = false;
    setIsEvaluating(false);
  }, []);
  useEffect(() => () => { evaluationRun.current += 1; }, []);

  const positions = useMemo(() => (formation ? FORMATIONS[formation] : []), [formation]);

  const filledCount = filledSlots.size;
  const replacingSlot = phase === 'reviewing' && selectedPositionIndex !== null ? filledSlots.get(selectedPositionIndex) : undefined;
  const currentTeam = useMemo(() => replacingSlot
    ? { name: replacingSlot.assignedTeam, isNation: replacingSlot.isNation }
    : teamAssignments[filledCount] ?? null, [replacingSlot, teamAssignments, filledCount]);

  const selectFormation = useCallback((f: Formation, choice: DraftChoice = { mode: 'mixed' }) => {
    if (choice.mode !== 'mixed' && (!Number.isInteger(choice.year) || choice.year < 2004 || lastRecordedYear(choice) > 2026)) return;
    cancelValidation();
    cancelEvaluation();
    const selectedDraft: DraftChoice = choice.mode === 'mixed' ? { mode: 'mixed' } : { mode: choice.mode, year: choice.year };
    setDraftChoice(selectedDraft);
    setSeasonApproach('balanced');
    settled.current = false;
    setFormation(f);
    setTeamAssignments(selectedDraft.mode === 'mixed' ? getRandomTeamAssignments(11)
      : [...(selectedDraft.mode === 'club-era' ? clubEraClubs : clubYearClubs)]
        .sort(() => Math.random() - 0.5).slice(0, 11).map(name => ({ name, isNation: false })));
    setPhase('building');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setResult(null);
    setValidationError(null);
  }, [cancelValidation, cancelEvaluation]);

  const selectPosition = useCallback((index: number) => {
    if (phase !== 'building' || filledSlots.has(index)) return;
    setSelectedPositionIndex(index);
    setValidationError(null);
  }, [filledSlots, phase]);

  const replacePick = useCallback((index: number) => {
    if (phase !== 'reviewing' || !filledSlots.has(index)) return false;
    cancelValidation();
    cancelEvaluation();
    if (!isCurrentBuildXiDraft(storedDraft.current)) {
      setValidationError(STALE_DRAFT_MESSAGE);
      return false;
    }
    setSelectedPositionIndex(index);
    setValidationError(null);
    return true;
  }, [phase, filledSlots, cancelValidation, cancelEvaluation]);

  const cancelReplacement = useCallback(() => {
    cancelValidation();
    setSelectedPositionIndex(null);
    setValidationError(null);
  }, [cancelValidation]);

  const startSpin = useCallback(() => {
    setIsSpinning(true);
    setSpinTeamIndex(0);
  }, []);

  const finishSpin = useCallback(() => {
    setIsSpinning(false);
  }, []);

  const rerollTeam = useCallback(() => {
    if (phase !== 'building') return;
    cancelValidation();
    if (!isCurrentBuildXiDraft(storedDraft.current)) {
      setValidationError(STALE_DRAFT_MESSAGE);
      return;
    }
    const usedNames = new Set(teamAssignments.filter((_, i) => i !== filledCount).map(t => t.name));
    const all = draftChoice.mode !== 'mixed'
      ? (draftChoice.mode === 'club-era' ? clubEraClubs : clubYearClubs).map(name => ({ name, isNation: false }))
      : [
          ...ALL_CLUBS.map(name => ({ name, isNation: false })),
          ...ALL_NATIONS.map(name => ({ name, isNation: true })),
        ];
    const available = all.filter(t => !usedNames.has(t.name)
      && (draftChoice.mode === 'mixed' || t.name !== teamAssignments[filledCount]?.name));
    const pick = available[Math.floor(Math.random() * available.length)];
    if (pick) {
      const next = [...teamAssignments];
      next[filledCount] = pick;
      const draft = JSON.stringify({ formation, draftChoice, teamAssignments: next, slots: [...filledSlots], ...savedApproach });
      if (!persistDraft(draft)) {
        setValidationError(STALE_DRAFT_MESSAGE);
        return;
      }
      setTeamAssignments(next);
    }
    setSelectedPositionIndex(null);
    setValidationError(null);
    startSpin();
  }, [phase, filledCount, startSpin, cancelValidation, draftChoice, teamAssignments, formation, filledSlots, persistDraft, savedApproach]);

  const undoLastPick = useCallback(() => {
    if (filledCount === 0 || (phase !== 'building' && phase !== 'reviewing')) return false;
    cancelValidation();
    cancelEvaluation();
    if (!isCurrentBuildXiDraft(storedDraft.current)) {
      setValidationError(STALE_DRAFT_MESSAGE);
      return false;
    }
    const remaining = new Map(filledSlots);
    const lastSlotIndex = [...remaining.keys()][filledCount - 1];
    remaining.delete(lastSlotIndex);
    setFilledSlots(remaining);
    setPhase('building');
    setSelectedPositionIndex(lastSlotIndex);
    setIsSpinning(false);
    setValidationError(null);
    return true;
  }, [filledCount, phase, filledSlots, cancelValidation, cancelEvaluation]);

  const submitPlayer = useCallback(
    async (inputName: string, pickMeta?: PickMeta) => {
      let playerName = inputName;
      if (selectedPositionIndex === null || !currentTeam) return;
      if (replacingSlot) cancelValidation();
      const run = pickRun.current; // Round 1138: which pick this is, see cancelValidation
      if (!isCurrentBuildXiDraft(storedDraft.current)) {
        setValidationError(STALE_DRAFT_MESSAGE);
        return;
      }
      const position = positions[selectedPositionIndex];
      if (!position) return;
      if (draftChoice.mode !== 'mixed'
        && !recordedPickVerifies(currentTeam, position.role, pickMeta, draftChoice)) {
        setValidationError(`Choose a matching ${currentTeam.name} record from ${recordedYearsLabel(draftChoice)} with a known position.`);
        return;
      }

      const exclusions = buildXiExclusions(Array.from(filledSlots.values())
        .filter(slot => draftChoice.mode !== 'club-era' || slot !== replacingSlot));
      if (buildXiAlreadyPicked(exclusions, playerName, pickMeta)) {
        setValidationError(`${playerName.trim()} is already in your lineup!`);
        return;
      }

      /* Round 442: the position gate, on the row the player picked, before any
         network call. The owner put ter Stegen at CM and the game took him,
         because the only position rule Build Your XI had was a sentence in the
         validate-player prompt asking a language model not to allow it. A
         prompt is a request. This is the same shared rule World XI uses and the
         same deterministic shape the NBA lineup builder has had since it stopped
         double-judging picks. Refusing here costs nothing: no guess is burned,
         no request is spent, the slot stays open. */
      let positionCheck = checkLineupPick(
        playerName.trim(),
        position.role,
        position.label,
        pickMeta?.rawPosition,
        normalizePosition,
      );
      /* The history is only looked up when the plain rule is about to REFUSE,
         so an ordinary pick still costs no request at all and the Round 442
         property holds.
         Round 825: and when the plain rule takes him only as next door to the
         slot, because role fit charges next door and his history may cover
         the slot outright. Still one read of the curated table, no AI call,
         and a pick in his own position still costs no request. */
      const primary = pickMeta?.rawPosition ? normalizePosition(pickMeta.rawPosition.trim()) : null;
      let played: Position[] = [];
      if (positionCheck.ok && primary && gradeFit([primary], SLOT_ALLOWED_BY_ROLE[position.role]) === 'family') {
        /* Busy from here, not from the validator call below: this pick is
           going through either way, and without the flag the spinner stayed
           off and the search box stayed live while the read ran, so a second
           pick could be sent into the same slot (review, Round 825). */
        setIsValidating(true);
        setValidationError(null);
        played = await verifiedSecondaries(playerName.trim(), primary, pickMeta?.club);
      }
      if (!positionCheck.ok) {
        setIsValidating(true);
        played = await verifiedSecondaries(playerName.trim(), primary, pickMeta?.club);
        if (played.length > 0) {
          positionCheck = checkLineupPick(
            playerName.trim(),
            position.role,
            position.label,
            pickMeta?.rawPosition,
            normalizePosition,
            played,
          );
        }
      }
      /* Round 1138: a pick the player gave up on while the history was read (a
         reroll, a new formation, a reset). Nothing is said, filled or asked. */
      if (run !== pickRun.current) return;
      if (!positionCheck.ok) {
        setIsValidating(false);
        setValidationError(positionCheck.reason ?? 'That player does not fit this position.');
        return;
      }

      /* ROUND 1138: the validator's client. The July 2026 rule is the whole of
         it: a check that cannot be made is a pick that was not counted, never
         an accept. The old branch read `valid` by truthiness off whatever came
         back, had no time limit, and on a spent allowance took the search box
         away for the session.
         Now an exhausted allowance, a body that is not a verdict, a failed
         status, a timeout and a network error each leave this ONE pick
         uncounted: no slot filled, the same team, the same slot still open,
         the box still there, and the line clears on the next pick or reroll. */
      const typed = playerName.trim();
      setValidationError(null);
      if (clubPickVerifies(currentTeam, position.role, pickMeta)) {
        // Our own record settles it: no request, no model, nothing to wait for.
        playerName = pickMeta?.rawName?.trim() || typed;
      } else {
        const reviewed = buildXiNamesake(typed, pickMeta);
        if (reviewed && !reviewed.person) {
          setIsValidating(false);
          setValidationError('Could not identify this player. Try another record or reroll the team.');
          return;
        }
        setIsValidating(true);
        const call = new AbortController();
        validatorCall.current = call;
        const answer = await askValidator(
          `${SUPABASE_URL}/functions/v1/validate-player`,
          {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({
              playerName: reviewed?.person ?? typed,
              teamName: currentTeam.name,
              isNation: currentTeam.isNation,
              /* Round 315: the slot's role rides along, so the validator can
                 refuse a keeper at CM (the owner's ter Stegen report). */
              position: position.role,
            }),
          },
          { signal: call.signal },
        );
        if (validatorCall.current === call) validatorCall.current = null;
        /* The player gave up on this pick while it was checked (that is what
           aborts the call), or in the same instant the answer landed: giving
           up wins. Nothing is filled, no line is shown, and the busy flag was
           already cleared by the cancel. */
        if (run !== pickRun.current) return;
        if (answer.kind !== 'valid') {
          setIsValidating(false);
          if (answer.kind === 'refused') setValidationError(answer.reason || `${typed} hasn't played for ${currentTeam.name}`);
          else if (answer.why !== 'cancelled') setValidationError(unverifiedLine(answer));
          return;
        }
        if (reviewed?.person) {
          if (normalizeName(answer.fullName) !== normalizeName(reviewed.person)) {
            setIsValidating(false);
            setValidationError('Could not verify the selected player. Try again or pick someone else.');
            return;
          }
        } else if (answer.fullName) {
          playerName = answer.fullName;
        }
      }

      if (buildXiAlreadyPicked(exclusions, playerName, pickMeta)) {
        setIsValidating(false);
        setValidationError(`${playerName.trim()} is already in your lineup!`);
        return;
      }

      const slot: FilledSlot = {
        ...position,
        playerName: playerName.trim(),
        assignedTeam: currentTeam.name,
        isNation: currentTeam.isNation,
        /* Carried on the slot, not in a name-keyed side map: the line above can
           rename this pick to the validator's fullName and a name lookup would
           then miss him. */
        ...(pickMeta ? { pick: played.length > 0 ? { ...pickMeta, played } : pickMeta } : {}),
      };

      const next = new Map(filledSlots);
      next.set(selectedPositionIndex, slot);
      const draft = JSON.stringify({ formation, draftChoice, teamAssignments, slots: [...next], ...savedApproach });
      if (!persistDraft(draft)) {
        setIsValidating(false);
        setValidationError(STALE_DRAFT_MESSAGE);
        return;
      }
      setFilledSlots(next);

      setSelectedPositionIndex(null);
      setIsValidating(false);

      if (replacingSlot) return;
      if (filledCount + 1 >= 11) {
        setPhase('reviewing');
      } else {
        startSpin();
      }
    },
    [selectedPositionIndex, currentTeam, positions, filledSlots, filledCount, startSpin, draftChoice, replacingSlot, cancelValidation, formation, teamAssignments, persistDraft, savedApproach]
  );

  const filledSlotsArray = useMemo(() => {
    return Array.from(filledSlots.entries())
      .sort(([a], [b]) => a - b)
      .map(([, slot]) => slot);
  }, [filledSlots]);

  const chooseSeasonApproach = useCallback((next: WorldXiSeasonApproach) => {
    if (phase !== 'reviewing' || replacingSlot || activeEvaluation.current || settled.current || next === seasonApproach) return;
    if (!isCurrentBuildXiDraft(storedDraft.current)) { setValidationError(STALE_DRAFT_MESSAGE); return; }
    const raw = JSON.stringify({ formation, draftChoice, teamAssignments, slots: [...filledSlots], ...(next === 'balanced' ? {} : { seasonApproach: next }) });
    if (recheckStorageWrites() === 'full' || !safeSetItem(BUILD_XI_DRAFT_KEY, raw)) {
      setValidationError('Free up browser storage and try choosing your league approach again.');
      return;
    }
    storedDraft.current = previousDraft.current = raw;
    setSeasonApproach(next);
    setValidationError(null);
  }, [phase, replacingSlot, seasonApproach, formation, draftChoice, teamAssignments, filledSlots]);

  const finishDraft = useCallback((verdict: AIVerdict, season: SeasonReport | null) => {
    if (settled.current) return;
    if (!isCurrentBuildXiDraft(storedDraft.current)) {
      setValidationError(STALE_DRAFT_MESSAGE);
      return;
    }
    const result = { verdict, season };
    const raw = JSON.stringify({ version: 2, draft: { formation, draftChoice, teamAssignments, slots: [...filledSlots], ...savedApproach }, result });
    if (recheckStorageWrites() === 'full' || !safeSetItem(BUILD_XI_DRAFT_KEY, raw)) {
      setValidationError('Your XI is still in review. Free up browser storage and submit again to save the result.');
      return;
    }
    storedDraft.current = raw;
    previousDraft.current = raw;
    settled.current = true;
    setResult(result);
    setValidationError(null);
    setPhase('result');
  }, [formation, draftChoice, teamAssignments, filledSlots, savedApproach]);

  const completeRecordedYearDraft = useCallback((nextVerdict: AIVerdict, season: SeasonReport | null = null) => {
    if (draftChoice.mode === 'mixed' || phase !== 'reviewing' || replacingSlot || filledSlotsArray.length !== 11
      || filledSlotsArray.some((slot, index) =>
        buildXiAlreadyPicked(buildXiExclusions(filledSlotsArray.slice(0, index)), slot.playerName, slot.pick))
      || filledSlotsArray.some(slot => !recordedPickVerifies(
        { name: slot.assignedTeam, isNation: slot.isNation }, slot.role, slot.pick, draftChoice,
      ))) return;
    cancelEvaluation();
    finishDraft(nextVerdict, season);
  }, [draftChoice, phase, replacingSlot, filledSlotsArray, cancelEvaluation, finishDraft]);

  const evaluateTeam = useCallback(async (season: SeasonReport | null = null) => {
    if (draftChoice.mode !== 'mixed' || phase !== 'reviewing' || replacingSlot || activeEvaluation.current || settled.current) return;
    if (filledSlotsArray.length !== 11) return;
    if (!isCurrentBuildXiDraft(storedDraft.current)) {
      setValidationError(STALE_DRAFT_MESSAGE);
      return;
    }
    const run = ++evaluationRun.current;
    activeEvaluation.current = true;
    setIsEvaluating(true);
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/evaluate-lineup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            formation,
            players: filledSlotsArray.map(slot => ({
              ...slot,
              playerName: buildXiReviewedName(slot.playerName, slot.pick) ?? slot.playerName,
            })),
          }),
        }
      );
      if (run !== evaluationRun.current) return;
      if (!resp.ok) throw new Error('Scouting report unavailable');
      const data = await resp.json();
      if (run !== evaluationRun.current) return;
      const text = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value : fallback;
      finishDraft({
        rating: text(data.rating, 'Mid-Table 😐'), headline: text(data.headline, 'Squad evaluated'),
        analysis: text(data.analysis, 'Your squad has been evaluated.'),
      }, season);
    } catch {
      if (run !== evaluationRun.current) return;
      try {
        const local = await localEvaluateSoccerXI(filledSlotsArray);
        if (run === evaluationRun.current) finishDraft(local, season);
      } catch {
        if (run === evaluationRun.current) setValidationError('Could not evaluate your XI. Your picks are saved. Try submitting again.');
      }
    } finally {
      if (run === evaluationRun.current) {
        activeEvaluation.current = false;
        setIsEvaluating(false);
      }
    }
  }, [filledSlotsArray, formation, draftChoice, phase, replacingSlot, finishDraft]);

  const resetGame = useCallback(() => {
    if (!persistDraft(null)) {
      setValidationError(STALE_DRAFT_MESSAGE);
      return;
    }
    cancelValidation();
    cancelEvaluation();
    setFormation(null);
    setSeasonApproach('balanced');
    settled.current = false;
    setPhase('formation');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setResult(null);
    setValidationError(null);
    setIsSpinning(false);
  }, [cancelValidation, cancelEvaluation, persistDraft]);

  useGameCompletion('build-your-xi', phase === 'result', verdict ? 500 : 0);

  return {
    formation, phase, draftChoice, seasonApproach, chooseSeasonApproach, selectedPositionIndex, currentTeam, positions,
    filledSlots, filledSlotsArray, filledCount, verdict, savedSeason: result?.season ?? null, isEvaluating,
    isValidating, validationError, isSpinning, spinTeamIndex, setSpinTeamIndex,
    /* Round 1138: never true any more. An allowance answer blocks the one
       pick and keeps the search box, so nothing sets this. The key stays
       because src/pages/LineupBuilder.tsx still reads it (the allowance
       paragraph and the condition on the box); the Build Your XI screens pass
       deletes both of those and then this line. */
    checkingDown: false,
    selectFormation, selectPosition, submitPlayer, evaluateTeam, completeRecordedYearDraft, resetGame, undoLastPick,
    replacingSlot, replacePick, cancelReplacement,
    startSpin, finishSpin, rerollTeam, teamAssignments, cancelValidation,
  };
}
