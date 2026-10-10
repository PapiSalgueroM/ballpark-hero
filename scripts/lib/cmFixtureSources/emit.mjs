/**
 * Round 1213: the exact bytes of a ledger's three files. The same input gives the
 * same bytes on any machine: LF line ends, no clock, no locale.
 *
 * THE DATA FILE IS WRITTEN WITH UNQUOTED KEYS ON PURPOSE. scripts/simLiveScores.mjs
 * lets a publisher's address into the browser bundle only as the value of a
 * source entry shaped  url: "https://..."  and a JSON style "url": does not
 * match that rule. The fence is right and stays as it is; the file fits it.
 */
import { DIGEST_FIELDS, fencedReason } from './build.mjs';

const q = s => JSON.stringify(s);

export function dataFileText(league, ledger, receipt) {
  const [a, b] = receipt.sources;
  const lines = [
    `/** Round 1213: the real 2026-27 ${receipt.leagueName} matchday order and home/away venues.`,
    ` * Read ${receipt.readOn} from ${a.label} (${a.kind}) and ${b.label} (${b.kind}): two independent`,
    ` * sources that agree on all ${receipt.validation.matches} fixtures, matchday, home club and away club.`,
    receipt.asFirstPublished
      ? ' * Matchdays and venues are those of the list as first published (one source is a release day copy).'
      : ' * Matchdays and venues are as both sources showed them that day; no release day copy was read.',
    ` * Acquisition evidence: scripts/data/${league.file}.receipt.json.`,
    ' * Written by scripts/genCmLeagueFixtures.mjs and frozen in scripts/data/cmLeagueFixtures.frozen.json:',
    ' * never edit it by hand. No dates, kickoffs or match results are imported.',
    ' */',
    `export const ${league.exportName} = {`,
    `  schemaVersion: ${ledger.schemaVersion},`,
    `  key: ${q(ledger.key)},`,
    `  leagueId: ${q(ledger.leagueId)},`,
    `  seasonStartYear: ${ledger.seasonStartYear},`,
    `  coverage: ${q(ledger.coverage)},`,
    '  clubs: [',
    ...ledger.clubs.map(c => `    ${q(c)},`),
    '  ],',
    '  rounds: [',
    ...ledger.rounds.map(r => `    [${r.map(([h, aw]) => `[${q(h)}, ${q(aw)}]`).join(', ')}],`),
    '  ],',
    '  sources: [',
    ...ledger.sources.map(s => `    { label: ${q(s.label)}, url: ${q(s.url)} },`),
    '  ],',
    '} as const;',
    '',
  ];
  return lines.join('\n');
}

/** The receipt as JSON a person can read: two space indent, but a source row a line. */
export function receiptText(receipt) {
  const tokens = [];
  const shell = {
    ...receipt,
    sources: receipt.sources.map(s => {
      tokens.push(s.rows);
      return { ...s, rows: `@@ROWS${tokens.length - 1}@@` };
    }),
  };
  let text = JSON.stringify(shell, null, 2);
  tokens.forEach((rows, i) => {
    const block = `[\n${rows.map(r => `        ${JSON.stringify(r)}`).join(',\n')}\n      ]`;
    text = text.replace(`"@@ROWS${i}@@"`, () => block);
  });
  return `${text}\n`;
}

export const FROZEN_ABOUT = [
  'Round 1213. One line a Club Manager real fixture ledger: the SHA256 of its canonical JSON.',
  `The canonical JSON is JSON.stringify of exactly these fields in this order: ${DIGEST_FIELDS.join(', ')}.`,
  'The sources of a ledger are NOT in the digest, so a dead link can be repaired without a new key.',
  'A save that holds a key reads that ledger on every load, so once a key has shipped its line never changes:',
  'a correction ships under a new key beside the old one. scripts/simCmLeagueFixtures.mjs holds every line.',
];

export function frozenText(frozen) {
  const ledgers = Object.fromEntries(Object.entries(frozen.ledgers).sort(([a], [b]) => (a < b ? -1 : 1)));
  return `${JSON.stringify({ schemaVersion: 1, about: FROZEN_ABOUT, digestOf: DIGEST_FIELDS, ledgers }, null, 2)}\n`;
}

/** The last look before anything is written: no long dash and no fenced product name in any byte. */
export function refuseText(name, text) {
  const why = fencedReason(text);
  return why ? `${name} ${why}` : null;
}
