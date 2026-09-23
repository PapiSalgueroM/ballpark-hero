/**
 * The Higher or Lower fence, one engine with the sport injected.
 *
 * Round 663. Six games on this site ask the same question in different clothes:
 * two players, which one has more of a number. cfb, hockey, mlb, nba, nfl and
 * tennis each keep their own hand typed file, and the fault Round 662 found in
 * the hockey one is a fault any of them can have, so the checks live here once
 * and each sport is a config rather than a copy. Round 426 is the counter
 * example this exists to avoid: the same roster refill bug had to be fixed
 * twice because two sports were written as two copies of one idea.
 *
 * WHAT A SPORT MUST SAY (see SPORTS in scripts/simHigherLowerFacts.mjs):
 *   key, label   what to call it in the output
 *   file         the shipped data module, relative to the repo root
 *   exportName   the array it exports
 *   metric       the numeric field the game compares
 *   asOf         the field naming the season or year the metric runs through
 *   record       the verification record, or null when the sport has none yet
 *   unverifiedMarker  the asOf value meaning "nobody could check this"
 *   cannotBeChecked   (player) => boolean, the sport's own rule for a row its
 *                     source cannot cover, for example a goalie in a skater table
 *
 * THE CHECK THAT MATTERS IS ORDERING, not the values. A wrong number is only
 * harmful in this game when it reorders a pair, so section 3 counts inverted
 * matchups and says how many questions would mark a correct answer wrong. On
 * hockey that was 52 of 903 before Round 662 and on the NBA 33 of 2,278 before
 * Round 663.
 *
 * TWO KINDS OF ROW A RECORD MAY HOLD BACK FROM ITS SOURCE, both first class
 * here because both are real and both would otherwise be "tidied" into a bug:
 *   heldFromFile  the source is WRONG or absent for this row and the file is
 *                 right. nhl_player_stats truncates pre 1967-68 careers and
 *                 reports Gordie Howe with 349 against a real 1,850;
 *                 nba_player_stats omits pre 1965-66 careers altogether, so
 *                 Wilt Chamberlain and eleven others are simply not in it.
 *   unverified    nobody could check it at all, so the shipped value stands and
 *                 says so on screen. nhl_player_stats holds no goalie.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

/** Load the shipped module the way the game reads it, not as text. */
export async function loadSport(root, cfg, sourceOverride) {
  const source = sourceOverride ?? fs.readFileSync(path.join(root, cfg.file), 'utf8').replaceAll('\r\n', '\n');
  const tmp = path.join(process.env.TEMP || process.env.TMP || root, `hlfence-${cfg.key}-${process.pid}`);
  fs.mkdirSync(tmp, { recursive: true });
  const entry = path.join(tmp, 'entry.ts');
  fs.writeFileSync(entry, source.replace(/from '@\/[^']*'/g, "from './missing'"), 'utf8');
  const outfile = path.join(tmp, 'bundle.cjs');
  await build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile, logLevel: 'error' });
  const mod = await import(`file://${outfile}`).then(m => m.default ?? m);
  fs.rmSync(tmp, { recursive: true, force: true });
  return mod[cfg.exportName];
}

export function readSource(root, cfg) {
  return fs.readFileSync(path.join(root, cfg.file), 'utf8').replaceAll('\r\n', '\n');
}

/**
 * Every rewrite asserts its anchor exactly once or the caller stops. A control
 * that matches nothing leaves a harness green for the wrong reason, which is
 * the failure this repo keeps relearning.
 */
export function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    throw new Error(`${why}: anchor appears ${n} times, so the rewrite would not change exactly one thing`);
  }
  return src.replace(anchor, replacement);
}

/**
 * Run the six checks for one sport. Returns what happened; printing is the
 * caller's job, so the same engine serves a single sport run and the suite.
 */
export function checkSport(cfg, players, record) {
  const out = { lines: [], red: new Set(), checks: 0, failures: 0 };
  let section = 0;
  const fail = (m) => { out.checks++; out.failures++; out.red.add(section); out.lines.push(`   FAIL ${m}`); };
  const ok = (m) => { out.checks++; out.lines.push(`   ok   ${m}`); };

  const verified = record.players || {};
  const held = record.heldFromFile || {};
  const unverified = record.unverified || [];
  const UNV = new Set(unverified);
  const metric = cfg.metric;
  const asOf = cfg.asOf;
  const truth = (n) => (verified[n] ? verified[n].points : (held[n] ? held[n].points : null));
  const truthAsOf = (n) => (verified[n] ? verified[n].lastSeason : (held[n] ? held[n].lastSeason : null));

  section = 1;
  out.lines.push(`1) ${cfg.label}: the record is well formed and covers exactly the shipped players`);
  {
    let bad = 0;
    for (const [name, v] of Object.entries(verified)) {
      if (typeof v.points !== 'number' || !v.lastSeason) { fail(`record entry ${name} is not a value plus a season`); bad++; }
    }
    const names = new Set(players.map(p => p.name));
    const covered = new Set([...Object.keys(verified), ...Object.keys(held), ...unverified]);
    const missing = [...names].filter(n => !covered.has(n));
    const extra = [...covered].filter(n => !names.has(n));
    if (missing.length) { fail(`${missing.length} shipped player(s) the record does not hold: ${missing.slice(0, 6).join(', ')}`); bad++; }
    if (extra.length) { fail(`${extra.length} record entr(ies) the file no longer ships: ${extra.slice(0, 6).join(', ')}`); bad++; }
    const overlap = Object.keys(verified).filter(n => UNV.has(n) || n in held);
    if (overlap.length) { fail(`${overlap.join(', ')} is both verified and not`); bad++; }
    if (!record.read || !record.source) { fail('the record does not say when it was read or what from'); bad++; }
    if (!bad) ok(`${Object.keys(verified).length} verified, ${Object.keys(held).length} held from the file, ${unverified.length} unverified, together exactly the ${names.size} shipped players, read ${record.read} from ${record.source}`);
  }

  section = 2;
  out.lines.push(`2) ${cfg.label}: every verified player matches the record`);
  {
    let bad = 0, n = 0;
    for (const p of players) {
      if (UNV.has(p.name) || p.name in held) continue;
      n++;
      const want = verified[p.name];
      if (!want) { fail(`${p.name} has no verified entry`); bad++; continue; }
      if (p[metric] !== want.points) { fail(`${p.name} ships ${p[metric]} against a verified ${want.points}`); bad++; }
      if (String(p[asOf]) !== String(want.lastSeason)) { fail(`${p.name} ships ${asOf} ${p[asOf]} against a verified ${want.lastSeason}`); bad++; }
    }
    if (!bad) ok(`${n} players agree with the record on ${metric} and ${asOf}`);
  }

  section = 3;
  out.lines.push(`3) ${cfg.label}: no pair is ordered against the record, which is the whole game`);
  {
    const s = players.filter(p => !UNV.has(p.name));
    const unheld = s.filter(p => truth(p.name) === null);
    if (unheld.length) fail(`${unheld.length} player(s) the record does not hold, so their ordering cannot be judged`);
    let bad = 0, pairs = 0;
    const examples = [];
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
      const a = s[i], b = s[j];
      const ta = truth(a.name), tb = truth(b.name);
      if (ta === null || tb === null || ta === tb) continue;
      pairs++;
      if (Math.sign(a[metric] - b[metric]) !== Math.sign(ta - tb)) {
        bad++;
        if (examples.length < 4) examples.push(`${a.name} vs ${b.name}: the game says ${a[metric] > b[metric] ? a.name : b.name}, the record says ${ta > tb ? a.name : b.name}`);
      }
    }
    if (bad) fail(`${bad} of ${pairs} matchups mark the correct answer wrong. ${examples.join('; ')}`);
    else ok(`all ${pairs} matchups between the ${s.length} players agree with the record`);
  }

  section = 4;
  out.lines.push(`4) ${cfg.label}: every player says what its number runs through`);
  {
    const nolast = players.filter(p => p[asOf] === undefined || p[asOf] === null || p[asOf] === '');
    if (nolast.length) fail(`${nolast.length} player(s) ship a career total with no ${asOf}: ${nolast.slice(0, 6).map(p => p.name).join(', ')}`);
    else ok(`${players.length} players each name the ${asOf} their ${metric} runs through`);
  }

  section = 5;
  out.lines.push(`5) ${cfg.label}: rows nobody could check say so, rather than passing as checked`);
  {
    let bad = 0;
    for (const name of unverified) {
      const p = players.find(x => x.name === name);
      if (!p) { fail(`${name} is recorded unverified but no longer ships`); bad++; continue; }
      if (String(p[asOf]) !== cfg.unverifiedMarker) { fail(`${name} is recorded unverified but ships ${asOf} ${p[asOf]}, which reads as a checked fact`); bad++; }
    }
    if (cfg.cannotBeChecked) {
      const should = players.filter(cfg.cannotBeChecked).map(p => p.name);
      const unflagged = should.filter(n => !UNV.has(n));
      if (unflagged.length) { fail(`${unflagged.join(', ')} cannot be covered by ${record.source} but is not flagged unverified`); bad++; }
    }
    if (!bad) ok(unverified.length ? `${unverified.length} row(s) flagged unverified and left exactly as they shipped` : 'no row claims to be unverified, and none needs to be');
  }

  section = 6;
  out.lines.push(`6) ${cfg.label}: rows held from the file keep the file's value, not the source's`);
  {
    let bad = 0;
    for (const [name, want] of Object.entries(held)) {
      const p = players.find(x => x.name === name);
      if (!p) { fail(`${name} is recorded as held from the file but no longer ships`); bad++; continue; }
      if (p[metric] !== want.points) { fail(`${name} ships ${p[metric]}, expected the file's ${want.points}: ${want.why || 'the source is wrong or absent for this row'}`); bad++; }
      if (!want.why) { fail(`${name} is held from the file with no reason recorded, so nobody can tell whether it still applies`); bad++; }
    }
    if (!bad) ok(Object.keys(held).length ? `${Object.keys(held).length} row(s) held from the file, each with the reason the source cannot be trusted for it` : 'nothing is held back from the source');
  }

  return out;
}
