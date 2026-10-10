import fs from 'node:fs';
const f = 'scripts/fixtures/managerAppealIsolation1081/manifest.json';
const OLD = '1ab749127d12f742406afe6a56eba7a082b85b7568073054b62a3e9597a31fc2';
const NEW = 'a559a6a3a7c10a8bc0a68c754805e604552c5061226c486d581019107001fa9c';
const s = fs.readFileSync(f, 'utf8');
if (s.split(OLD).length !== 2) throw new Error('old pin must be in the manifest exactly once');
fs.writeFileSync(f, s.replace(OLD, NEW));
console.log('re-pinned');
