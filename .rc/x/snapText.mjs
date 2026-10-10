/* Round 1225 fixer: the list items of a saved page as plain text, one a line. Usage: node snapText.mjs <html file> */
import fs from 'node:fs';

const html = fs.readFileSync(process.argv[2], 'utf8');
const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
  .map(m => m[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim())
  .filter(Boolean);
process.stdout.write(items.join('\n') + '\n');
