// Runner only (harness-integrity review of Release BA): apply one declared mutation, exactly once, to a copy of the tree.
// usage: node mutReview.mjs <tree dir> <label|labelboth|loanrevert|loanfallback>
// Exits 2 with ABORT when an anchor does not stand exactly once, so an abort can never read as a control that fired.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [dir, mode] = process.argv.slice(2);
const NL = String.fromCharCode(10);
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const FILTERED = '        const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name) && projectLeagueApps(state.overall, c.tier, c.name, 0).min >= 20);';
const UNFILTERED = '        const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name));';
const PUSH_END = ['        offers.push({ club, contractYears: 1, wage: state.weeklyWage, transferFee: 0, isLoan: true });', '      }', '    } else {'].join(NL);
const FALLBACK = ['        offers.push({ club, contractYears: 1, wage: state.weeklyWage, transferFee: 0, isLoan: true });', '      }',
  '      if (!offers.length) { const fallback = getClubsByTier(clubs, currentClubTier + 1).filter(c => !exclude.has(c.name)); if (fallback.length) offers.push({ club: pickAcrossLeagues(fallback), contractYears: 1, wage: state.weeklyWage, transferFee: 0, isLoan: true }); }',
  '    } else {'].join(NL);
const rows = {
  label: [{ file: 'src/components/game/ReportSiteIssue.tsx', from: ['        Report a problem', '      </button>'].join(NL), to: ['        Send us feedback', '      </button>'].join(NL) }],
  labelboth: [
    { file: 'src/components/game/ReportSiteIssue.tsx', from: ['        Report a problem', '      </button>'].join(NL), to: ['        Send us feedback', '      </button>'].join(NL) },
    { file: 'src/components/RouteErrorBoundary.tsx', from: 'The Report a problem button is at the bottom', to: 'The Send us feedback button is at the bottom' }],
  loanrevert: [{ file: ENGINE, from: FILTERED, to: UNFILTERED }],
  loanfallback: [{ file: ENGINE, from: PUSH_END, to: FALLBACK }],
};
if (!rows[mode]) { console.log(`ABORT unknown mode ${mode}`); process.exit(2); }
for (const r of rows[mode]) {
  const p = path.join(dir, r.file), text = fs.readFileSync(p, 'utf8').split('\r\n').join(NL);
  const n = text.split(r.from).length - 1;
  if (n !== 1) { console.log(`ABORT ${r.file}: anchor count ${n}`); process.exit(2); }
  const out = text.replace(r.from, r.to);
  if (out === text) { console.log(`ABORT ${r.file}: changed nothing`); process.exit(2); }
  fs.writeFileSync(p, out);
  console.log(`mutation ${mode} applied to ${r.file}: ${sha(text)} -> ${sha(out)}`);
}
