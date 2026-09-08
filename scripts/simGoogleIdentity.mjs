/* Google popup sign in harness.

   Google used to leave the site through Supabase's hosted OAuth redirect,
   which exposed the backend project address. The replacement stays on the
   site, uses Google's official rendered popup button, and exchanges the ID
   token directly with Supabase. Google's separate Branding setting controls
   the public support email and must be verified before this button ships.

   The rendered component test proves the full browser boundary: the public
   client ID, popup mode, provider button, SHA-256 nonce pairing, ID token
   exchange, success close, and recoverable failure. These controls run that
   same test against changed copies and must make its own assertion fail:

     GOOGLE_IDENTITY_CONTROL=oauth   restores Google signInWithOAuth
     GOOGLE_IDENTITY_CONTROL=nonce   gives Google the raw nonce
     GOOGLE_IDENTITY_CONTROL=button  removes renderButton
     GOOGLE_IDENTITY_CONTROL=stale   strands an already loaded script
     GOOGLE_IDENTITY_CONTROL=timeout removes the bounded load timeout
     GOOGLE_IDENTITY_CONTROL=a11y    hides loading and failure announcements
     GOOGLE_IDENTITY_CONTROL=gate    exposes the unfinished public branding
     GOOGLE_IDENTITY_CONTROL=privacy disconnects public sign-in claims from the gate

   Run: node scripts/simGoogleIdentity.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GOOGLE_IDENTITY_CONTROL || '';
const TEST = 'src/components/auth/AuthModal.google.test.tsx';
const MODAL = 'src/components/auth/AuthModal.tsx';
const IDENTITY = 'src/lib/googleIdentity.ts';
const PROVIDERS = 'src/lib/authProviders.ts';
const PRIVACY = 'src/pages/PrivacyPolicy.tsx';
const TERMS = 'src/pages/TermsOfService.tsx';
const GAME_CONTENT_DIR = 'src/data/gameContent';
const PUBLIC_AUTH_SNAPSHOTS = ['public/privacy/index.html', 'public/terms/index.html'];
const knownControls = ['oauth', 'nonce', 'button', 'stale', 'timeout', 'a11y', 'gate', 'privacy'];
const abort = message => { console.error(message); process.exit(1); };

function replaceOnce(source, needle, replacement, label) {
  const matches = source.split(needle).length - 1;
  if (matches !== 1) abort(`control cannot run: expected one ${label} target, found ${matches}`);
  const changed = source.replace(needle, replacement);
  if (changed === source) abort(`control cannot run: ${label} bytes did not change`);
  return changed;
}

if (CONTROL && !knownControls.includes(CONTROL)) {
  abort(`unknown control "${CONTROL}" (${knownControls.join(', ')})`);
}

const stripComments = source => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const stripSnapshotComments = source => source.replace(/<!--[\s\S]*?-->/g, '');
const modalCode = stripComments(fs.readFileSync(path.join(ROOT, MODAL), 'utf8'));
const identityCode = stripComments(fs.readFileSync(path.join(ROOT, IDENTITY), 'utf8'));
const providerSource = fs.readFileSync(path.join(ROOT, PROVIDERS), 'utf8');
const privacySource = stripComments(fs.readFileSync(path.join(ROOT, PRIVACY), 'utf8'));
const termsSource = stripComments(fs.readFileSync(path.join(ROOT, TERMS), 'utf8'));
const gameContentSources = new Map(
  fs.readdirSync(path.join(ROOT, GAME_CONTENT_DIR))
    .filter(file => file.endsWith('.ts'))
    .map(file => [file, stripComments(fs.readFileSync(path.join(ROOT, GAME_CONTENT_DIR, file), 'utf8'))]),
);
const publicAuthSnapshots = new Map(
  PUBLIC_AUTH_SNAPSHOTS.map(file => [file, stripSnapshotComments(fs.readFileSync(path.join(ROOT, file), 'utf8'))]),
);

const PRIVACY_ACCOUNT_GATE = "password{OAUTH_PROVIDERS.google ? ', or sign in with Google' : ''}.";
const PRIVACY_SUPABASE_GATE = "email/password{OAUTH_PROVIDERS.google ? ' and Google sign-in' : ''}";
const TERMS_ACCOUNT_GATE = "password{OAUTH_PROVIDERS.google ? ' or sign in with Google' : ''}.";
const GOOGLE_IMPORT = /import\s*\{\s*OAUTH_PROVIDERS\s*\}\s*from\s*['"]@\/lib\/authProviders['"]/;
const GOOGLE_BULLET_GATE = /\{OAUTH_PROVIDERS\.google\s*&&\s*\(\s*<li><strong>Google Sign-In:<\/strong>[\s\S]*?<\/li>\s*\)\}/;
const UNGATED_PROVIDER_PROMISE = /sign(?:ing)? in with (?:email (?:or|and) )?Google|email or Google|Google sign-in/i;

function publicClaimFindings(privacyCode, termsCode, contentSources, authSnapshots) {
  const findings = [];
  if (!GOOGLE_IMPORT.test(privacyCode)) findings.push('privacy policy does not import the Google release gate');
  if (!privacyCode.includes(PRIVACY_ACCOUNT_GATE)) findings.push('privacy Account data claim is not tied to the Google release gate');
  if (!privacyCode.includes(PRIVACY_SUPABASE_GATE)) findings.push('privacy Supabase claim is not tied to the Google release gate');
  if (!GOOGLE_BULLET_GATE.test(privacyCode)) findings.push('privacy Google Sign-In disclosure is not tied to the Google release gate');
  if (!GOOGLE_IMPORT.test(termsCode)) findings.push('terms do not import the Google release gate');
  if (!termsCode.includes(TERMS_ACCOUNT_GATE)) findings.push('terms account claim is not tied to the Google release gate');
  const ungatedFiles = [...contentSources]
    .filter(([, source]) => UNGATED_PROVIDER_PROMISE.test(source))
    .map(([file]) => file);
  if (ungatedFiles.length) findings.push(`game copy promises unavailable Google sign in: ${ungatedFiles.join(', ')}`);
  const staleSnapshots = [...authSnapshots]
    .filter(([, source]) => UNGATED_PROVIDER_PROMISE.test(source))
    .map(([file]) => file);
  if (staleSnapshots.length) findings.push(`shipped snapshots promise unavailable Google sign in: ${staleSnapshots.join(', ')}`);
  return findings;
}

if (CONTROL === 'gate') {
  const target = 'google: false,';
  const count = providerSource.split(target).length - 1;
  if (count !== 1) abort(`control cannot run: expected one Google release gate, found ${count}`);
  const exposed = providerSource.replace(target, 'google: true,');
  if (exposed === providerSource) abort('control cannot run: Google release gate bytes did not change');
  if (/google\s*:\s*false/.test(stripComments(exposed))) {
    abort('control did not remove the Google release gate');
  }
  console.log('NEGATIVE CONTROL ON: Google is visible before its public branding is approved');
  console.log('control "gate": the production visibility guard went red, the check works');
  process.exit(0);
}

if (CONTROL === 'privacy') {
  let controlledPrivacy = fs.readFileSync(path.join(ROOT, PRIVACY), 'utf8');
  let controlledTerms = fs.readFileSync(path.join(ROOT, TERMS), 'utf8');
  const controlledContent = new Map(gameContentSources);
  const controlledSnapshots = new Map(publicAuthSnapshots);
  controlledPrivacy = replaceOnce(
    controlledPrivacy,
    "import { OAUTH_PROVIDERS } from '@/lib/authProviders';",
    "import { OAUTH_PROVIDERS as HIDDEN_PROVIDERS } from '@/lib/authProviders';",
    'privacy release gate import',
  );
  controlledPrivacy = replaceOnce(controlledPrivacy, PRIVACY_ACCOUNT_GATE, 'password, or sign in with Google.', 'privacy account gate');
  controlledPrivacy = replaceOnce(controlledPrivacy, PRIVACY_SUPABASE_GATE, 'email/password and Google sign-in', 'privacy Supabase gate');
  controlledPrivacy = replaceOnce(controlledPrivacy, '{OAUTH_PROVIDERS.google && (', '{true && (', 'privacy Google disclosure gate');
  controlledTerms = replaceOnce(
    controlledTerms,
    "import { OAUTH_PROVIDERS } from '@/lib/authProviders';",
    "import { OAUTH_PROVIDERS as HIDDEN_PROVIDERS } from '@/lib/authProviders';",
    'terms release gate import',
  );
  controlledTerms = replaceOnce(controlledTerms, TERMS_ACCOUNT_GATE, 'password or sign in with Google.', 'terms account gate');
  controlledContent.set(
    'moreSports.ts',
    replaceOnce(
      controlledContent.get('moreSports.ts'),
      'Signing in is optional',
      'Signing in with email or Google is optional',
      'provider-neutral game copy',
    ),
  );
  controlledSnapshots.set(
    'public/privacy/index.html',
    replaceOnce(
      controlledSnapshots.get('public/privacy/index.html'),
      'email address and password.',
      'email address and password, or sign in with Google.',
      'crawler-visible Google promise',
    ),
  );
  const findings = publicClaimFindings(
    stripComments(controlledPrivacy),
    stripComments(controlledTerms),
    controlledContent,
    controlledSnapshots,
  );
  const expected = [
    'privacy policy does not import the Google release gate',
    'privacy Account data claim is not tied to the Google release gate',
    'privacy Supabase claim is not tied to the Google release gate',
    'privacy Google Sign-In disclosure is not tied to the Google release gate',
    'terms do not import the Google release gate',
    'terms account claim is not tied to the Google release gate',
  ];
  for (const finding of expected) {
    if (!findings.includes(finding)) abort(`control did not trigger: ${finding}`);
  }
  if (!findings.some(finding => finding.includes('moreSports.ts'))) {
    abort('control did not trigger the provider-neutral game copy check');
  }
  if (!findings.some(finding => finding.includes('public/privacy/index.html'))) {
    abort('control did not trigger the crawler-visible snapshot check');
  }
  console.log('NEGATIVE CONTROL ON: public copy promises Google sign in without its release gate');
  console.log('control "privacy": every public claim guard went red, the check works');
  process.exit(0);
}

if (!/google\s*:\s*false/.test(stripComments(providerSource))) {
  abort('Google is publicly visible while its Cloud Branding still exposes a personal support email');
}

const publicClaimErrors = publicClaimFindings(privacySource, termsSource, gameContentSources, publicAuthSnapshots);
if (publicClaimErrors.length) abort(publicClaimErrors.join('\n'));

if (/signInWithOAuth\s*\(\s*\{\s*provider:\s*['"]google['"]/.test(modalCode)) {
  abort('Google uses signInWithOAuth again, so the hosted redirect and Developer Information screen are back');
}
if (!/signInWithOAuth\s*\(\s*\{\s*provider:\s*['"]apple['"]/.test(modalCode)) {
  abort('the Google change removed Apple OAuth instead of leaving that provider intact');
}
if (!/signInWithIdToken\s*\(\s*\{\s*provider:\s*['"]google['"][\s\S]{0,180}?token,[\s\S]{0,180}?nonce,/.test(modalCode)) {
  abort('the Google credential is not exchanged through signInWithIdToken with its raw nonce');
}
if (!identityCode.includes("'https://accounts.google.com/gsi/client'")) {
  abort('the official Google Identity Services browser library is not loaded');
}
if (!/getRandomValues\s*\(\s*new Uint8Array\(32\)\s*\)/.test(identityCode)) {
  abort('the nonce is not generated from 32 cryptographically random bytes');
}
if (!/crypto\.subtle\.digest\(\s*['"]SHA-256['"]\s*,\s*encodedNonce\s*\)/.test(identityCode)) {
  abort('the nonce is not hashed with SHA-256 before it reaches Google');
}
if (!/initialize\s*\(\s*\{[\s\S]{0,320}?nonce:\s*hashedNonce,[\s\S]{0,160}?ux_mode:\s*['"]popup['"]/.test(identityCode)) {
  abort('Google is not initialized in popup mode with the hashed nonce');
}
if (!/renderButton\s*\(\s*container\s*,\s*\{/.test(identityCode)) {
  abort('Google does not render its official provider button');
}
if (/client[_-]?secret/i.test(modalCode + identityCode)) {
  abort('a Google client secret appears in browser source');
}

let tempDir = null;
let environment = {};
if (CONTROL) {
  tempDir = fs.mkdtempSync(path.join(ROOT, 'src', '.google-control-'));
  let controlledModal = fs.readFileSync(path.join(ROOT, MODAL), 'utf8');
  let controlledIdentity = fs.readFileSync(path.join(ROOT, IDENTITY), 'utf8');

  controlledModal = replaceOnce(
    controlledModal,
    "import { renderGoogleIdentityButton } from '@/lib/googleIdentity';",
    "import { renderGoogleIdentityButton } from './googleIdentity';",
    'controlled helper import',
  );

  if (CONTROL === 'oauth') {
    controlledModal = replaceOnce(
      controlledModal,
      'supabase.auth.signInWithIdToken({',
      'supabase.auth.signInWithOAuth({',
      'Google ID token exchange',
    );
    console.log('NEGATIVE CONTROL ON: Google uses the hosted OAuth redirect again');
  } else if (CONTROL === 'nonce') {
    controlledIdentity = replaceOnce(
      controlledIdentity,
      '    nonce: hashedNonce,',
      '    nonce: rawNonce,',
      'hashed Google nonce',
    );
    console.log('NEGATIVE CONTROL ON: Google receives the raw nonce instead of its SHA-256 hash');
  } else if (CONTROL === 'button') {
    controlledIdentity = replaceOnce(
      controlledIdentity,
      '  googleIdentity.renderButton(container, {',
      '  void ({',
      'official rendered button',
    );
    console.log('NEGATIVE CONTROL ON: the official rendered Google button is removed');
  } else if (CONTROL === 'stale') {
    controlledIdentity = replaceOnce(
      controlledIdentity,
      '      else fail();',
      "      else { window.clearTimeout(timeoutId); reject(new Error('Google sign in could not load')); }",
      'stale loaded script cleanup',
    );
    console.log('NEGATIVE CONTROL ON: a loaded script with no Google API is left in the page');
  } else if (CONTROL === 'timeout') {
    controlledIdentity = replaceOnce(
      controlledIdentity,
      '    timeoutId = window.setTimeout(fail, GOOGLE_IDENTITY_LOAD_TIMEOUT_MS);',
      '    timeoutId = 0;',
      'bounded Google script timeout',
    );
    console.log('NEGATIVE CONTROL ON: a silent Google script load can spin forever');
  } else if (CONTROL === 'a11y') {
    controlledModal = replaceOnce(
      controlledModal,
      'role="status" aria-live="polite"',
      'aria-live="off"',
      'Google loading status announcement',
    );
    controlledModal = replaceOnce(
      controlledModal,
      'role="alert"',
      'role="presentation"',
      'Google failure alert announcement',
    );
    console.log('NEGATIVE CONTROL ON: Google loading and failure states are silent');
  }

  const modalCopy = path.join(tempDir, 'AuthModal.tsx');
  fs.writeFileSync(modalCopy, controlledModal);
  fs.writeFileSync(path.join(tempDir, 'googleIdentity.ts'), controlledIdentity);
  environment = { AUTH_MODAL_COMPONENT: modalCopy.replaceAll('\\', '/') };
}

let result;
try {
  result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST, '--reporter=verbose'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, ...environment, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
} finally {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
}

const out = (result.stdout || '') + (result.stderr || '');
if (!out.includes(path.basename(TEST))) abort('vitest did not report the Google auth test, so nothing was checked:\n' + out.slice(-2000));
if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) {
  abort('the real test or controlled copy did not load:\n' + out.slice(-2000));
}

if (!CONTROL) {
  if (result.status !== 0 || !/Tests\s+4 passed/.test(out)) {
    abort('Google popup sign in regression is red:\n' + out.slice(-2600));
  }
  console.log('Google popup sign in: 4 of 4 rendered checks green');
  console.log('Google uses GIS plus signInWithIdToken, and no client secret ships');
  console.log('Nonce pairing, phone width, retries, timeouts, and announcements are covered');
  console.log('Production release gate: Google stays hidden until its public branding is approved');
  console.log('Privacy, terms, and game copy follow the same Google release gate');
  process.exit(0);
}

if (result.status === 0 || !/AssertionError|TestingLibraryElementError|expected/.test(out)) {
  abort(`control "${CONTROL}" did not fail a behavior assertion:\n` + out.slice(-2600));
}
console.log(`control "${CONTROL}": the rendered auth test went red, the check works`);
