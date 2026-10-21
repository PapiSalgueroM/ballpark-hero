import { getStorageTrouble, safeLocalStorage, settlePendingSaves } from '@/lib/safeStorage';

export const CONSENT_KEY = 'cookie-consent-v2';
export const CONSENT_CHANGED_EVENT = 'dukb-consent-changed';
export const CONSENT_OPEN_EVENT = 'dukb-consent-open';
export const CONSENT_EFFECTIVE_CHANGED_EVENT = 'dukb-consent-effective-changed';
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
// Enable only after automatic history/form collection is verified in the GA account.
export const ANALYTICS_READY: boolean = false;

export interface ConsentPreferences {
  version: 2;
  advertising: boolean;
  analytics: boolean;
  updatedAt: number;
}
export interface ConsentPurposes { advertising: boolean; analytics: boolean }

export function parseConsentPreferences(raw: string | null, now = Date.now()): ConsentPreferences | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 2 || typeof value.advertising !== 'boolean'
      || typeof value.analytics !== 'boolean' || typeof value.updatedAt !== 'number'
      || !Number.isFinite(value.updatedAt) || value.updatedAt < 0 || value.updatedAt > now
      || now - value.updatedAt >= CONSENT_MAX_AGE_MS) return null;
    return { version: 2, advertising: value.advertising, analytics: value.analytics, updatedAt: value.updatedAt };
  } catch { return null; }
}

export function readConsentPreferences(): ConsentPreferences | null {
  try { return parseConsentPreferences(safeLocalStorage.getItem(CONSENT_KEY)); }
  catch { return null; }
}

export function isGlobalPrivacyControlEnabled(): boolean {
  try { return Reflect.get(navigator, 'globalPrivacyControl') === true; }
  catch { return false; }
}

export function getEffectiveConsent(): ConsentPurposes {
  const value = readConsentPreferences();
  const legacyDenial = safeLocalStorage.getItem('cookie-consent') === 'essential';
  return {
    advertising: !legacyDenial && value?.advertising === true && !isGlobalPrivacyControlEnabled(),
    analytics: ANALYTICS_READY && value?.analytics === true,
  };
}

export function migrateConsentPreferences(): 'accepted' | 'essential' | null {
  const legacy = safeLocalStorage.getItem('cookie-consent');
  if (legacy === 'essential') {
    safeLocalStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
  }
  // Never turn the old bundled grant into permission for separate purposes.
  if (legacy !== null) safeLocalStorage.removeItem('cookie-consent');
  return legacy === 'accepted' || legacy === 'essential' ? legacy : null;
}

function writeConsentPreferences(purposes: ConsentPurposes): ConsentPreferences {
  const next: ConsentPreferences = {
    version: 2,
    advertising: purposes.advertising && !isGlobalPrivacyControlEnabled(),
    analytics: ANALYTICS_READY && purposes.analytics,
    updatedAt: Date.now(),
  };
  // Removing the previous choice first frees space and prevents a durable old
  // grant surviving a replacement refused by a full store. The existing seam
  // still keeps the new explicit choice for this visit if storage is blocked.
  safeLocalStorage.removeItem(CONSENT_KEY);
  safeLocalStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  safeLocalStorage.removeItem('cookie-consent');
  return next;
}

export function saveConsentPreferences(purposes: ConsentPurposes): ConsentPreferences {
  const next = writeConsentPreferences(purposes);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  return next;
}

export function enforceGlobalPrivacyControl(): void {
  const saved = readConsentPreferences();
  if (isGlobalPrivacyControlEnabled() && saved?.advertising) {
    writeConsentPreferences({ advertising: false, analytics: saved.analytics });
  }
}

export function synchronizeConsentStorageEvent(_event: StorageEvent): void {}

export function canReloadAfterWithdrawal(revoked: ConsentPurposes): boolean {
  if (!settlePendingSaves()) return false;
  if (getStorageTrouble() === 'blocked') return false;
  try {
    // A full store's safe seam can shadow a refused removal or write. Only the
    // actual browser record tells us what the next template would receive.
    const durable = parseConsentPreferences(window.localStorage.getItem(CONSENT_KEY));
    return !durable || ((!revoked.advertising || !durable.advertising || isGlobalPrivacyControlEnabled())
      && (!revoked.analytics || !ANALYTICS_READY || !durable.analytics));
  } catch { return false; }
}

export function openConsentChoices(opener?: HTMLElement): void {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT, { detail: { opener } }));
}