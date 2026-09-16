/* Each invocation reads live pages. The existing id primary key supplies order. */
export function stintPageUrl(origin, columns, afterId) {
  const cursor = afterId === null ? '' : `&id=gt.${afterId}`;
  return `${origin}/rest/v1/soccer_player_club_stints?select=id,${columns}&order=id.asc&limit=1000${cursor}`;
}

export async function* stintPages(readPage) {
  let afterId = null;
  for (let batch = 0; batch < 200; batch += 1) {
    const page = await readPage(afterId);
    if (!Array.isArray(page) || page.length > 1000) throw new Error('Invalid stint page');
    let previous = afterId;
    for (const row of page) {
      if (!Number.isSafeInteger(row.id) || (previous !== null && row.id <= previous)) {
        throw new Error('Stint ids must advance strictly on every page');
      }
      previous = row.id;
    }
    if (page.length) yield page;
    if (page.length < 1000) return;
    afterId = page[page.length - 1].id;
  }
  throw new Error('Stint scan reached its 200-page limit before completion');
}
