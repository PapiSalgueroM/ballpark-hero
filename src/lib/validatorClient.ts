/* Round 1138. One reader for a validator's answer, and one way to ask.

   Written for Build Your XI and named for every validator client on the
   site: seven sibling hooks still read `valid` by truthiness, and they bind
   this file in a later round. The rule it stands for is the July 2026 one:
   a validator that cannot verify is a no penalty retry, never an accept.
   There is exactly one way out of this file that says `valid`: a response
   that was ok, parsed as JSON, did not say `unverified`, and carried the
   boolean `true` in `valid`. Everything else is a refusal the validator
   really made, or unverified.

   Pure: no React, no supabase import. The caller builds the URL and the
   headers from '@/integrations/supabase/client'. */

export type ValidatorAnswer =
  | { kind: 'valid'; fullName?: string }
  | { kind: 'refused'; reason?: string }
  | {
      kind: 'unverified';
      /** status: the response was not ok. shape: the body was not a verdict.
          server: the validator itself said it could not verify. network: the
          request never came back. timeout: it took longer than the wait.
          cancelled: the caller gave up on it. */
      why: 'status' | 'shape' | 'server' | 'network' | 'timeout' | 'cancelled';
      /** True only when the validator said its day allowance is spent. */
      exhausted: boolean;
      reason?: string;
    };

/* Longest wait for one answer, in milliseconds. Where 15000 comes from (no
   live measurement, production is off limits to a build round): an answer
   from our own records is two or three reads; a model answer is one call, and
   on a per minute refusal the function sleeps 3 seconds and calls once more
   (supabase/functions/validate-player). A scout watched a pick hang past 30
   seconds with the box disabled. 15 seconds covers two model calls and the
   sleep, and ends the hang. The lead can tune it from the function's logged
   run times. */
export const VALIDATOR_WAIT_MS = 15000;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Reads one answer. `ok` is the response's own ok flag; `body` is the parsed JSON, or null when there is none. */
export function readValidatorAnswer(ok: boolean, body: unknown): ValidatorAnswer {
  // 1. An error status has no verdict in it, whatever its body says.
  if (!ok) return { kind: 'unverified', why: 'status', exhausted: false };
  // 2. A verdict is a plain object.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { kind: 'unverified', why: 'shape', exhausted: false };
  }
  const answer = body as Record<string, unknown>;
  // 3. Checked BEFORE `valid`: a body carrying both flags is unverified.
  if (answer.unverified === true) {
    const reason = text(answer.reason);
    return { kind: 'unverified', why: 'server', exhausted: answer.exhausted === true, ...(reason ? { reason } : {}) };
  }
  // 4. The only way in: the boolean true, nothing truthy.
  if (answer.valid === true) {
    const fullName = text(answer.fullName);
    return { kind: 'valid', ...(fullName ? { fullName } : {}) };
  }
  // 5. A refusal the validator really made.
  if (answer.valid === false) {
    const reason = text(answer.reason);
    return { kind: 'refused', ...(reason ? { reason } : {}) };
  }
  // 6. {}, valid: "true", valid: 1, an error body with a 200.
  return { kind: 'unverified', why: 'shape', exhausted: false };
}

/**
 * POSTs one question to a validator and reads the answer. Never throws and
 * never waits longer than `waitMs`: a slow answer is aborted and comes back
 * unverified with why `timeout`; a caller that aborts `opts.signal` gets why
 * `cancelled`.
 */
export async function askValidator(
  url: string,
  init: { headers: Record<string, string>; body: string },
  opts: { waitMs?: number; signal?: AbortSignal } = {},
): Promise<ValidatorAnswer> {
  const call = new AbortController();
  let timedOut = false;
  let cancelled = false;
  let arrived = false;
  const cancel = () => { cancelled = true; call.abort(); };
  if (opts.signal?.aborted) cancel();
  opts.signal?.addEventListener('abort', cancel);
  const timer = setTimeout(() => { timedOut = true; call.abort(); }, opts.waitMs ?? VALIDATOR_WAIT_MS);
  try {
    const resp = await fetch(url, { method: 'POST', headers: init.headers, body: init.body, signal: call.signal });
    arrived = true;
    if (!resp.ok) return readValidatorAnswer(false, null);
    const body: unknown = await resp.json();
    return readValidatorAnswer(true, body);
  } catch {
    // FAIL CLOSED (July 2026 P1 rule: never accept on an error).
    const why = timedOut ? 'timeout' : cancelled ? 'cancelled' : arrived ? 'shape' : 'network';
    return { kind: 'unverified', why, exhausted: false };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', cancel);
  }
}
