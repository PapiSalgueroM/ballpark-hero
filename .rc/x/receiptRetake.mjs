/* Fix-1514 re-record: the receipt retaken from the tree as it stands, by simOneOffCups section 0.3's own formula
   (sha256 of the ledger's LF text), compared with the committed receipt. Exit 0 when identical. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const ledger = fs.readFileSync('scripts/data/cmOneOffFormats.json', 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const got = createHash('sha256').update(ledger).digest('hex');
const committed = JSON.parse(fs.readFileSync('scripts/data/cmOneOffFormats.receipt.json', 'utf8')).sha256;
console.log(`receipt retaken from the tree: ${got}; committed: ${committed}; ${got === committed ? 'identical' : 'DIFFERENT'}`);
process.exit(got === committed ? 0 : 1);
