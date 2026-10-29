// Release BI, part five (Round BIK): used by x/contCmp1508.sh only. Prints a simManagerWorldContinuity log with the
// checkout path and the stack's line numbers normalised (Round 1508's own comparison, finish-1508.md r1508-g8: "no
// difference once the checkout path and the stack's line number are normalised"). Usage: node contNorm1508.mjs <log>
import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const out = text
  .replace(/file:\/\/\/?[^\s()]*?\/(scripts|src|node_modules)\//g, 'file://R/$1/')
  .replace(/(^|[\s(])\/[^\s()]*?\/(scripts|src|node_modules|\.tmp-fx)\//g, '$1R/$2/')
  .replace(/\.(mjs|cjs|js|ts|tsx):\d+:(\d+)/g, '.$1:LINE:$2')
  .replace(/\.(mjs|cjs|js|ts|tsx):\d+\b/g, '.$1:LINE');
process.stdout.write(out);
