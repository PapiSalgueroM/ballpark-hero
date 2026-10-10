// Reviewer probe for Round 1214: the DEFAULT PATH of the one edited file. Every generator on main calls
// ratingOf(usd), gbpM and usdOfEur from scripts/lib/cmValueCurve.mjs. This loads the module as the base
// ships it and as the head ships it and holds them to the same answer over a fleet of inputs.
// usage: node revFleet.mjs <path to the base's cmValueCurve.mjs>     (the head's is read from the checkout)
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const head = await import(pathToFileURL(path.resolve('scripts/lib/cmValueCurve.mjs')).href);

let seed = 1214;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const inputs = [];
for (let usd = 0; usd <= 300000; usd += 1) inputs.push(usd);
for (let i = 0; i < 2000000; i += 1) {
  const v = 10 ** (3 + rnd() * 7);
  inputs.push(i % 2 ? v : Math.round(v));
}
const specials = [null, undefined, 0, -1, -0, NaN, Infinity, -Infinity, '5000000', '', 'abc', true, false, 1e-9, 0.5, 2 ** 53, [], {}, [7000000], 215999999, 216000000, 216000001, 1e12];

const same = (a, b) => Object.is(a, b);
const tryIt = (fn, ...args) => { try { return { v: fn(...args) }; } catch (e) { return { threw: String(e.message).slice(0, 80) }; } };
const eq = (a, b) => ('threw' in a) === ('threw' in b) && ('threw' in a ? true : same(a.v, b.v));
const diffs = { ratingOf: 0, gbpM1: 0, gbpM2: 0, usdOfEur: 0 };
const first = [];
let checked = 0;
for (const x of [...inputs, ...specials]) {
  checked += 1;
  const pairs = [
    ['ratingOf', tryIt(base.ratingOf, x), tryIt(head.ratingOf, x)],
    ['gbpM1', tryIt(base.gbpM, x), tryIt(head.gbpM, x)],
    ['gbpM2', tryIt(base.gbpM, x, 2), tryIt(head.gbpM, x, 2)],
    ['usdOfEur', tryIt(base.usdOfEur, x), tryIt(head.usdOfEur, x)],
  ];
  for (const [name, a, b] of pairs) {
    if (!eq(a, b)) { diffs[name] += 1; if (first.length < 8) first.push(`${name}(${String(x)}): base ${JSON.stringify(a)}, head ${JSON.stringify(b)}`); }
  }
}
// the head's valueRatingOf is the base's ratingOf too
let valueDiff = 0;
for (const x of inputs) if (!same(base.ratingOf(x), head.valueRatingOf(x))) valueDiff += 1;

const baseNames = Object.keys(base).sort();
const headNames = Object.keys(head).sort();
const gone = baseNames.filter(n => !headNames.includes(n));
const constMoved = baseNames.filter(n => typeof base[n] !== 'function' && JSON.stringify(base[n]) !== JSON.stringify(head[n]));
console.log(`base exports ${baseNames.length}: ${baseNames.join(', ')}`);
console.log(`head exports ${headNames.length}; added: ${headNames.filter(n => !baseNames.includes(n)).join(', ')}`);
console.log(`exports the head lost: ${gone.length} ${gone.join(', ')}; constants that moved: ${constMoved.length} ${constMoved.join(', ')}`);
console.log(`inputs checked ${checked} (${inputs.length} dollar values, ${specials.length} odd ones); answers apart: ${JSON.stringify(diffs)}; valueRatingOf apart from the base's ratingOf: ${valueDiff}`);
first.forEach(l => console.log('   ' + l));

// what a second argument does now (the base ignored it): said out loud, not judged
const two = [[5000000, undefined], [5000000, 0], [5000000, 26], [5000000, 26, 'CB']].map(args => `ratingOf(${args.map(String).join(', ')}): base ${JSON.stringify(tryIt(base.ratingOf, ...args))}, head ${JSON.stringify(tryIt(head.ratingOf, ...args))}`);
two.forEach(l => console.log('   NOTE ' + l));

const total = Object.values(diffs).reduce((s, n) => s + n, 0) + valueDiff + gone.length + constMoved.length;
console.log(total ? `revFleet: ${total} DIFFERENCE(S) on the default path` : `revFleet: SAME. The one argument path of the edited library answers as the base's over ${checked} inputs.`);
process.exit(total ? 1 : 0);
