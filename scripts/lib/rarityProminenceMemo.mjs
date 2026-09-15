/* Harness-only, fresh per invocation. Direct searches always reach the server. */
export function rarityProminenceMemo(fetcher) {
  const responses = new Map();
  const stats = { live: 0, hits: 0 };
  return {
    stats,
    async fetch(input, init) {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const keys = [...url.searchParams.keys()];
      const filters = ['club', 'nationality', 'position'];
      const prominence = request.method === 'GET' && !request.signal.aborted
        && url.pathname === '/rest/v1/player_market_values'
        && url.searchParams.get('limit') === '1000'
        && url.searchParams.get('order') === 'market_value_usd.desc,year.desc,player_name.asc'
        && filters.filter(key => url.searchParams.get(key)?.startsWith('eq.')).length === 1
        && keys.every(key => ['select', 'limit', 'order', ...filters].includes(key));
      if (!prominence) return fetcher(input, init);
      const key = JSON.stringify([request.url, [...request.headers.entries()]]);
      if (responses.has(key)) {
        stats.hits += 1;
        return responses.get(key).clone();
      }
      stats.live += 1;
      const response = await fetcher(input, init);
      if (response.ok) {
        const body = await response.clone().json().catch(() => null);
        if (Array.isArray(body)) responses.set(key, response.clone());
      }
      return response;
    },
  };
}
