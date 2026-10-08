import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { localEvaluateSoccerXI } from '@/lib/localLineupEval';
import { getRandomTeamAssignments, clubs as ALL_CLUBS, nations as ALL_NATIONS, CLUB_TABLE_NAMES } from '@/data/lineupTeams';
import { askValidator, type ValidatorAnswer } from '@/lib/validatorClient';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import type { Formation, FilledSlot, GamePhase, AIVerdict, PickMeta, TeamAssignment } from '@/types/lineupBuilder';
import { FORMATIONS } from '@/types/lineupBuilder';
import { checkLineupPick, gradeFit, SLOT_ALLOWED_BY_ROLE } from '@/lib/positionFit';
import type { Position } from '@/types/game';
import { normalizePosition } from '@/lib/squadDeal';

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

async function verifiedSecondaries(name: string, primary: Position | null): Promise<Position[]> {
  if (!name || !primary) return [];
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
    if (!res.ok) return [];
    const rows = (await res.json()) as { primary_position: string | null; secondary_positions: unknown }[];
    const row = rows[0];
    if (!row?.primary_position) return [];
    if (normalizePosition(String(row.primary_position).trim()) !== primary) return [];
    const raw = Array.isArray(row.secondary_positions)
      ? row.secondary_positions
      : String(row.secondary_positions ?? '').split(/[;,/]/);
    return raw.map((x) => String(x).trim()).filter(Boolean) as Position[];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
import { useGameCompletion } from '@/hooks/useGameCompletion';

/* ROUND 1138: a club slot pick that our own row settles, with no request.

   The row the scoped list returned is AT this club (the list is filtered to
   the club's stored names, and one row is one man in one season), and the
   browser's position rule above has really ruled on it. Such a pick used to
   cost one edge call and, for half the position and slot pairs, a wait on a
   language model that could run past thirty seconds.

   Never true for a nation. Never true without a position the browser knows:
   checkLineupPick answers ok WITHOUT judging when the row has no position or
   a spelling the map does not hold, and that pick must go to the validator as
   it always has. Never true for a club label with no stored names, which is
   how the validator's own records pass reads the same table (an unknown club
   matches nothing there). A season at two clubs is stored "A / B", and the
   validator splits it the same way.

   What this gives up, said plainly: a club pick from the list is now settled
   by the browser's fit rule alone (the game's declared rule since Round 442),
   so the validator's own position map and any refusal it once stored for a
   club pick no longer bind. A nation pick is still judged by the validator. */
export function clubPickVerifies(team: TeamAssignment, slotRole: Position, pick: PickMeta | undefined): boolean {
  if (team.isNation || !pick?.club || !pick.rawPosition) return false;
  if (!SLOT_ALLOWED_BY_ROLE[slotRole]) return false;
  if (!normalizePosition(pick.rawPosition.trim())) return false;
  const stored = CLUB_TABLE_NAMES[team.name];
  if (!stored) return false;
  return pick.club.split(' / ').map((part) => part.trim()).some((part) => stored.includes(part));
}

/* The one line a pick that could not be checked shows. Nothing here says
   "saved" (this game saves nothing) and nothing says "hasn't played for":
   that line is for a refusal the validator really made. */
function unverifiedLine(answer: Extract<ValidatorAnswer, { kind: 'unverified' }>): string {
  if (answer.exhausted) {
    return 'Answer checking has used up its allowance for today, so this pick was not counted. Try another player or reroll the team.';
  }
  if (answer.why === 'timeout') return 'That check took too long, so this pick was not counted. Try again or pick someone else.';
  return answer.reason || "Couldn't verify that answer. Try again in a second.";
}

export function useLineupBuilder() {
  const [formation, setFormation] = useState<Formation | null>(null);
  const [phase, setPhase] = useState<GamePhase>('formation');
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null);
  const [filledSlots, setFilledSlots] = useState<Map<number, FilledSlot>>(new Map());
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [verdict, setVerdict] = useState<AIVerdict | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTeamIndex, setSpinTeamIndex] = useState(0);
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

  const positions = useMemo(() => (formation ? FORMATIONS[formation] : []), [formation]);

  const filledCount = filledSlots.size;
  const currentTeam = useMemo(() => teamAssignments[filledCount] ?? null, [teamAssignments, filledCount]);

  const selectFormation = useCallback((f: Formation) => {
    cancelValidation();
    setFormation(f);
    setTeamAssignments(getRandomTeamAssignments(11));
    setPhase('building');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setVerdict(null);
    setValidationError(null);
  }, [cancelValidation]);

  const selectPosition = useCallback((index: number) => {
    if (filledSlots.has(index)) return;
    setSelectedPositionIndex(index);
    setValidationError(null);
  }, [filledSlots]);

  const startSpin = useCallback(() => {
    setIsSpinning(true);
    setSpinTeamIndex(0);
  }, []);

  const finishSpin = useCallback(() => {
    setIsSpinning(false);
  }, []);

  const rerollTeam = useCallback(() => {
    cancelValidation();
    setTeamAssignments((prev) => {
      const usedNames = new Set(prev.filter((_, i) => i !== filledCount).map((t) => t.name));
      const all = [
        ...ALL_CLUBS.map((name) => ({ name, isNation: false })),
        ...ALL_NATIONS.map((name) => ({ name, isNation: true })),
      ];
      const available = all.filter((t) => !usedNames.has(t.name));
      const pick = available[Math.floor(Math.random() * available.length)];
      if (!pick) return prev;
      const next = [...prev];
      next[filledCount] = pick;
      return next;
    });
    setSelectedPositionIndex(null);
    setValidationError(null);
    startSpin();
  }, [filledCount, startSpin, cancelValidation]);

  const submitPlayer = useCallback(
    async (inputName: string, pickMeta?: PickMeta) => {
      let playerName = inputName;
      const run = pickRun.current; // Round 1138: which pick this is, see cancelValidation
      if (selectedPositionIndex === null || !currentTeam) return;
      const position = positions[selectedPositionIndex];
      if (!position) return;

      const trimmedName = playerName.trim().toLowerCase();
      const isDuplicate = Array.from(filledSlots.values()).some(
        (slot) => slot.playerName.toLowerCase() === trimmedName
      );
      if (isDuplicate) {
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
        played = await verifiedSecondaries(playerName.trim(), primary);
      }
      if (!positionCheck.ok) {
        played = await verifiedSecondaries(playerName.trim(), primary);
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
        setValidationError(positionCheck.reason ?? 'That player does not fit this position.');
        return;
      }

      /* ROUND 1138: the validator's client. The July 2026 rule is the whole of
         it: a check that cannot be made is a pick that was not counted, never
         an accept. The old branch read `valid` by truthiness off whatever came
         back, had no time limit, and on a spent allowance took the search box
         away for the session and said the lineup was saved, which nothing is.
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
        setIsValidating(true);
        const call = new AbortController();
        validatorCall.current = call;
        const answer = await askValidator(
          `${SUPABASE_URL}/functions/v1/validate-player`,
          {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({
              playerName: typed,
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
        if (answer.fullName) playerName = answer.fullName;
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

      setFilledSlots((prev) => {
        const next = new Map(prev);
        next.set(selectedPositionIndex, slot);
        return next;
      });

      setSelectedPositionIndex(null);
      setIsValidating(false);

      if (filledCount + 1 >= 11) {
        setPhase('reviewing');
      } else {
        startSpin();
      }
    },
    [selectedPositionIndex, currentTeam, positions, filledCount, startSpin]
  );

  const filledSlotsArray = useMemo(() => {
    return Array.from(filledSlots.entries())
      .sort(([a], [b]) => a - b)
      .map(([, slot]) => slot);
  }, [filledSlots]);

  const evaluateTeam = useCallback(async () => {
    if (filledSlotsArray.length !== 11) return;
    setIsEvaluating(true);
    try {
      const resp = await fetch(
        `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/evaluate-lineup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
          },
          body: JSON.stringify({ formation, players: filledSlotsArray }),
        }
      );
      const data = await resp.json();
      
      if (!resp.ok) {
        // AI referee down/out of quota -> offline judge, never a dead-end
        const local = await localEvaluateSoccerXI(filledSlotsArray.map(s => s.playerName));
        setVerdict(local);
        setPhase('result');
        return;
      }
      
      if (!data.rating || !data.analysis) {
        setVerdict({
          rating: data.rating || 'Mid-Table 😐',
          headline: data.headline || 'Squad evaluated',
          analysis: data.analysis || 'Your squad has been evaluated.',
        });
      } else {
        setVerdict(data);
      }
      setPhase('result');
    } catch (err) {
      console.error('Evaluation error:', err);
      try {
        const local = await localEvaluateSoccerXI(filledSlotsArray.map(s => s.playerName));
        setVerdict(local);
      } catch {
        setVerdict({ rating: 'Error', headline: 'Could not evaluate', analysis: 'Network error. Please check your connection and try again.' });
      }
      setPhase('result');
    } finally {
      setIsEvaluating(false);
    }
  }, [filledSlotsArray, formation]);

  const resetGame = useCallback(() => {
    cancelValidation();
    setFormation(null);
    setPhase('formation');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setVerdict(null);
    setValidationError(null);
    setIsSpinning(false);
  }, [cancelValidation]);

  useGameCompletion('build-your-xi', phase === 'result', verdict ? 500 : 0);

  return {
    formation, phase, selectedPositionIndex, currentTeam, positions,
    filledSlots, filledSlotsArray, filledCount, verdict, isEvaluating,
    isValidating, validationError, isSpinning, spinTeamIndex, setSpinTeamIndex,
    /* Round 1138: never true any more. An allowance answer blocks the one
       pick and keeps the search box, so nothing sets this. The key stays
       because src/pages/LineupBuilder.tsx still reads it (the allowance
       paragraph and the condition on the box); the Build Your XI screens pass
       deletes both of those and then this line. */
    checkingDown: false,
    selectFormation, selectPosition, submitPlayer, evaluateTeam, resetGame,
    startSpin, finishSpin, rerollTeam, teamAssignments, cancelValidation,
  };
}
