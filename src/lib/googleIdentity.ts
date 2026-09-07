const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_IDENTITY_LOAD_TIMEOUT_MS = 10_000;

/**
 * OAuth client IDs are public browser identifiers, not secrets. This is the
 * same web client already enabled for the live Supabase Google provider.
 */
export const GOOGLE_WEB_CLIENT_ID = '999216565849-a179eijdh6d5mndlao0vg32llu2e2j7s.apps.googleusercontent.com';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  initialize: (configuration: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce: string;
    ux_mode: 'popup';
  }) => void;
  renderButton: (container: HTMLElement, options: {
    type: 'standard';
    theme: 'outline';
    size: 'large';
    text: 'continue_with';
    shape: 'rectangular';
    logo_alignment: 'left';
    width: number;
  }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentityApi;
      };
    };
  }
}

let googleIdentityPromise: Promise<GoogleIdentityApi> | null = null;

function currentGoogleIdentity(): GoogleIdentityApi | null {
  return window.google?.accounts?.id ?? null;
}

/** Loads Google's official browser library once and returns its button API. */
function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  const ready = currentGoogleIdentity();
  if (ready) return Promise.resolve(ready);
  if (googleIdentityPromise) return googleIdentityPromise;

  googleIdentityPromise = new Promise<GoogleIdentityApi>((resolve, reject) => {
    let script: HTMLScriptElement;
    let settled = false;
    let timeoutId = 0;

    const cleanUpListeners = () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener('load', finish);
      script.removeEventListener('error', fail);
    };
    const succeed = (api: GoogleIdentityApi) => {
      if (settled) return;
      settled = true;
      cleanUpListeners();
      resolve(api);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanUpListeners();
      script.remove();
      reject(new Error('Google sign in could not load'));
    };
    const finish = () => {
      const api = currentGoogleIdentity();
      if (api) succeed(api);
      else fail();
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`);
    if (existing) {
      script = existing;
    } else {
      script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
    }

    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    timeoutId = window.setTimeout(fail, GOOGLE_IDENTITY_LOAD_TIMEOUT_MS);
    if (!existing) document.head.appendChild(script);
  }).catch(error => {
    googleIdentityPromise = null;
    throw error;
  });

  return googleIdentityPromise;
}

async function createNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const rawNonce = btoa(String.fromCharCode(...bytes));
  const encodedNonce = new TextEncoder().encode(rawNonce);
  const digest = await crypto.subtle.digest('SHA-256', encodedNonce);
  const hashedNonce = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return { rawNonce, hashedNonce };
}

/**
 * Renders the provider-owned popup button. Google receives only the hash,
 * while Supabase receives the raw nonce alongside the returned ID token.
 */
export async function renderGoogleIdentityButton(
  container: HTMLElement,
  onCredential: (token: string | null, rawNonce: string) => void,
): Promise<void> {
  const [googleIdentity, { rawNonce, hashedNonce }] = await Promise.all([
    loadGoogleIdentity(),
    createNonce(),
  ]);

  googleIdentity.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    callback: response => onCredential(response.credential ?? null, rawNonce),
    nonce: hashedNonce,
    ux_mode: 'popup',
  });

  const measuredWidth = Math.floor(container.getBoundingClientRect().width);
  const width = Math.min(400, Math.max(240, measuredWidth || 320));
  googleIdentity.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width,
  });
}
