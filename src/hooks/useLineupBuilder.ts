import { useState, useCallback, useMemo, useEffect } from 'react';
import { localEvaluateSoccerXI } from '@/lib/localLineupEval';
import { getRandomTeamAssignments, clubs as ALL_CLUBS, nations as ALL_NATIONS } from '@/data/lineupTeams';
import type { Formation, FilledSlot, GamePhase, AIVerdict, PickMeta, TeamAssignment } from '@/types/lineupBuilder';
import { FORMATIONS } from '@/types/lineupBuilder';
import { checkLineupPick } from '@/lib/positionFit';
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
async function verifiedSecondaries(name: string, primary: Position | null): Promise<Position[]> {
  if (!name || !primary) return [];
  try {
    /* Read with a plain fetch, the way this file already reaches the edge
       functions below. The typed client refuses the table outright:
       player_verified_positions exists in the database and is absent from the
       generated types, so `supabase.from` rejects the name at compile time.
       Regenerating those types is a change to a 200-plus table file and is not
       this round's business. */
    const res = await fetch(
      `${SUPABASE_REST}/player_verified_positions?select=primary_position,secondary_positions&player_name=ilike.${encodeURIComponent(name)}&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
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
  }
}
import { useGameCompletion } from '@/hooks/useGameCompletion';

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
  /* Round 413: remembered for the session once the day allowance is spent. */
  const [checkingDown, setCheckingDown] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTeamIndex, setSpinTeamIndex] = useState(0);

  const positions = useMemo(() => (formation ? FORMATIONS[formation] : []), [formation]);

  const filledCount = filledSlots.size;
  const currentTeam = useMemo(() => teamAssignments[filledCount] ?? null, [teamAssignments, filledCount]);

  const selectFormation = useCallback((f: Formation) => {
    setFormation(f);
    setTeamAssignments(getRandomTeamAssignments(11));
    setPhase('building');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setVerdict(null);
    setValidationError(null);
  }, []);

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
  }, [filledCount, startSpin]);

  const submitPlayer = useCallback(
    async (inputName: string, pickMeta?: PickMeta) => {
      let playerName = inputName;
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
         property holds. */
      if (!positionCheck.ok) {
        const primary = pickMeta?.rawPosition ? normalizePosition(pickMeta.rawPosition.trim()) : null;
        const played = await verifiedSecondaries(playerName.trim(), primary);
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
      if (!positionCheck.ok) {
        setValidationError(positionCheck.reason ?? 'That player does not fit this position.');
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      try {
        const resp = await fetch(
          `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/validate-player`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
            },
            body: JSON.stringify({
              playerName: playerName.trim(),
              teamName: currentTeam.name,
              isNation: currentTeam.isNation,
              /* Round 315: the slot's role rides along, so the validator can
                 refuse a keeper at CM (the owner's ter Stegen report). */
              position: position.role,
            }),
          }
        );

        if (!resp.ok) {
          // A rate limit or server error body has no verdict in it. Without
          // this guard the code below read `valid` off an error object and
          // told the player his TRUE answer was wrong ("hasn't played for"),
          // when the honest message is that nothing was checked at all.
          setValidationError("Couldn't verify that answer. Try again in a second.");
          setIsValidating(false);
          return;
        }

        const result = await resp.json();

        /* Round 413: a refusal now says which it was. Answer checking runs on
           a free daily allowance, and once it is spent every guess came back
           "try again in a second" until midnight, so a player kept retrying a
           wall. The validator returns exhausted on a spent allowance; that
           message is the honest one and it is remembered for the session, so
           the page stops inviting a retry that cannot succeed. Either way
           nothing unverified is accepted and no answer is marked wrong. */
        if (result.unverified) {
          if (result.exhausted) {
            setCheckingDown(true);
            setValidationError('Answer checking has used up its allowance for today. Your lineup is saved; come back tomorrow.');
          } else {
            setValidationError(result.reason || "Couldn't verify that answer. Try again in a second.");
          }
          setIsValidating(false);
          return;
        }

        if (!result.valid) {
          setValidationError(result.reason || `${playerName} hasn't played for ${currentTeam.name}`);
          setIsValidating(false);
          return;
        }

        if (result.fullName && typeof result.fullName === 'string') {
          playerName = result.fullName;
        }
      } catch {
        // FAIL CLOSED (July 2026 P1 rule: never accept-on-error). A network
        // or quota failure is a free retry, not a free pass.
        setValidationError("Couldn't verify that answer. Try again in a second.");
        setIsValidating(false);
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
        ...(pickMeta ? { pick: pickMeta } : {}),
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
    setFormation(null);
    setPhase('formation');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setVerdict(null);
    setValidationError(null);
    setIsSpinning(false);
  }, []);

  useGameCompletion('build-your-xi', phase === 'result', verdict ? 500 : 0);

  return {
    formation, phase, selectedPositionIndex, currentTeam, positions,
    filledSlots, filledSlotsArray, filledCount, verdict, isEvaluating,
    isValidating, validationError, checkingDown, isSpinning, spinTeamIndex, setSpinTeamIndex,
    selectFormation, selectPosition, submitPlayer, evaluateTeam, resetGame,
    startSpin, finishSpin, rerollTeam, teamAssignments,
  };
}
