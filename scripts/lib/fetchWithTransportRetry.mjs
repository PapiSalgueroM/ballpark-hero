/* Retry only thrown transport failures. An HTTP response is an answer. */
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function fetchWithTransportRetry(request, { delay = wait } = {}) {
  let error = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return { response: await request(), error: null };
    } catch (caught) {
      error = caught;
      if (attempt < 3) await delay(200 * attempt);
    }
  }
  return { response: null, error };
}
