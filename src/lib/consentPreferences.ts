import { hasRegionalAdDefault, regionalLookupPending } from '@/lib/advertisingRegion';
import { getStorageTrouble, safeLocalStorage, settlePendingSaves } from '@/lib/safeStorage';

export const CONSENT_KEY = 'cookie-consent-v2';
export const CONSENT_CHANGED_EVENT = 'dukb-consent-changed';
export const CONSENT_OPEN_EVENT = 'dukb-consent-open';
export const CONSENT_EFFECTIVE_CHANGED_EVENT = 'dukb-consent-effective-changed';
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export const AD_CONFIRMATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const ANALYTICS_READY: boolean = true;

export interface ConsentPreferences {
  version: 2;
  advertising: boolean;
  analytics: boolean;
  updatedAt: number;
  advertisingConfirmedAt?: number;
}
export interface ConsentPurposes { advertising: boolean; analytics: boolean }
let pendingWithdrawal: ConsentPurposes = { advertising: false, analytics: false };

// Latched for this document. A component remount must not resume vendor code.
export function setPendingConsentWithdrawal(purposes: ConsentPurposes): void {
  pendingWithdrawal = {
    advertising: pendingWithdrawal.advertising || purposes.advertising,
    analytics: pendingWithdrawal.analytics || purposes.analytics,
  };
}

export function getPendingConsentWithdrawal(): ConsentPurposes {
  return { ...pendingWithdrawal };
}

function storedPreferences(raw: string | null, now = Date.now()): ConsentPreferences | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 2 || typeof value.advertising !== 'boolean'
      || typeof value.analytics !== 'boolean' || typeof value.updatedAt !== 'number'
      || !Number.isFinite(value.updatedAt) || value.updatedAt < 0 || value.updatedAt > now) return null;
    const at = value.advertisingConfirmedAt;
    return { version: 2, advertising: value.advertising,
      analytics: value.analytics && value.analyticsOptIn === 1 && now - value.updatedAt < CONSENT_MAX_AGE_MS,
      updatedAt: value.updatedAt, ...(Number.isFinite(at) && at >= 0 && at <= now && { advertisingConfirmedAt: at }) };
  } catch { return null; }
}

function currentAdChoice(value: ConsentPreferences, now: number): boolean {
  return value.advertising
    ? value.advertisingConfirmedAt !== undefined && now - value.advertisingConfirmedAt < AD_CONFIRMATION_MAX_AGE_MS
    : now - (value.advertisingConfirmedAt ?? value.updatedAt) < CONSENT_MAX_AGE_MS;
}

export function parseConsentPreferences(raw: string | null, now = Date.now()): ConsentPreferences | null {
  const value = storedPreferences(raw, now);
  if (!value) return null;
  const current = currentAdChoice(value, now);
  if (!current && now - value.updatedAt >= CONSENT_MAX_AGE_MS) return null;
  return { ...value, advertising: value.advertising && current };
}

export function readConsentPreferences(): ConsentPreferences | null {
  try { return parseConsentPreferences(safeLocalStorage.getItem(CONSENT_KEY)); }
  catch { return null; }
}

export function isGlobalPrivacyControlEnabled(): boolean {
  try { return Reflect.get(navigator, 'globalPrivacyControl') === true; }
  catch { return false; }
}

export function mayUseRegionalDefault(): boolean {
  if (pendingWithdrawal.advertising || isGlobalPrivacyControlEnabled() || getStorageTrouble() !== null) return false;
  const raw = safeLocalStorage.getItem(CONSENT_KEY);
  const legacy = safeLocalStorage.getItem('cookie-consent');
  return (legacy === null || legacy === 'accepted') && (raw === null || storedPreferences(raw)?.advertising === true);
}

export function consentPrompt(): 'choices' | 'renew' | null {
  if (isGlobalPrivacyControlEnabled() || safeLocalStorage.getItem('cookie-consent') === 'essential') return null;
  if (getStorageTrouble() === null && (hasRegionalAdDefault() || regionalLookupPending())) return null;
  const raw = safeLocalStorage.getItem(CONSENT_KEY);
  const value = storedPreferences(raw);
  if (value && currentAdChoice(value, Date.now())) return null;
  return value?.advertising || (raw === null && safeLocalStorage.getItem('cookie-consent') === 'accepted') ? 'renew' : 'choices';
}

export function getEffectiveConsent(): ConsentPurposes {
  const value = readConsentPreferences();
  const legacyDenial = safeLocalStorage.getItem('cookie-consent') === 'essential';
  return {
    advertising: !pendingWithdrawal.advertising && !legacyDenial && (value?.advertising === true || (hasRegionalAdDefault() && mayUseRegionalDefault())) && !isGlobalPrivacyControlEnabled(),
    analytics: !pendingWithdrawal.analytics && !legacyDenial && ANALYTICS_READY && value?.analytics === true,
  };
}

export function migrateConsentPreferences(): 'accepted' | 'essential' | null {
  const legacy = safeLocalStorage.getItem('cookie-consent');
  if (legacy === 'essential') {
    safeLocalStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
  }
  // Never turn the old bundled grant into permission for separate purposes.
  if (legacy !== null && (legacy !== 'accepted' || safeLocalStorage.getItem(CONSENT_KEY) !== null)) safeLocalStorage.removeItem('cookie-consent');
  return legacy === 'accepted' || legacy === 'essential' ? legacy : null;
}

function writeConsentPreferences(purposes: ConsentPurposes, analyticsUpdatedAt = Date.now()): ConsentPreferences {
  const next: ConsentPreferences = {
    version: 2,
    advertising: !pendingWithdrawal.advertising && purposes.advertising && !isGlobalPrivacyControlEnabled(),
    analytics: !pendingWithdrawal.analytics && ANALYTICS_READY && purposes.analytics,
    updatedAt: analyticsUpdatedAt,
    advertisingConfirmedAt: Date.now(),
  };
  // Removing the previous choice first frees space and prevents a durable old
  // grant surviving a replacement refused by a full store. The existing seam
  // still keeps the new explicit choice for this visit if storage is blocked.
  safeLocalStorage.removeItem(CONSENT_KEY);
  safeLocalStorage.setItem(CONSENT_KEY, JSON.stringify(next.analytics ? { ...next, analyticsOptIn: 1 } : next));
  safeLocalStorage.removeItem('cookie-consent');
  return next;
}

export function saveConsentPreferences(purposes: ConsentPurposes): ConsentPreferences {
  const next = writeConsentPreferences(purposes);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  return next;
}

export function saveAdvertisingChoice(advertising: boolean): void {
  const previous = storedPreferences(safeLocalStorage.getItem(CONSENT_KEY));
  writeConsentPreferences({ advertising, analytics: previous?.analytics ?? false }, previous?.updatedAt);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

export function enforceGlobalPrivacyControl(): void {
  const saved = storedPreferences(safeLocalStorage.getItem(CONSENT_KEY));
  if (isGlobalPrivacyControlEnabled() && saved?.advertising) {
    writeConsentPreferences({ advertising: false, analytics: saved.analytics }, saved.updatedAt);
  }
}

export function synchronizeConsentStorageEvent(event: StorageEvent): void {
  const keys = event.key === null ? [CONSENT_KEY, 'cookie-consent'] : [event.key];
  for (const key of keys) {
    if (key !== CONSENT_KEY && key !== 'cookie-consent') continue;
    let latest = event.newValue;
    try { if (getStorageTrouble() !== 'blocked') latest = window.localStorage.getItem(key); }
    catch { /* An unreadable store uses the incoming denial or choice for this visit. */ }
    // Replace only the consent overlay, including a stale kept grant. Never
    // clear safeStorage or touch another game's refused save.
    if (latest === null) safeLocalStorage.removeItem(key);
    else safeLocalStorage.setItem(key, latest);
  }
}
export function canReloadAfterWithdrawal(revoked: ConsentPurposes): boolean {
  if (!settlePendingSaves()) return false;
  if (getStorageTrouble() === 'blocked') return false;
  try {
    // A full store's safe seam can shadow a refused removal or write. Only the
    // actual browser record tells us what the next template would receive.
    const raw = window.localStorage.getItem(CONSENT_KEY);
    const durable = parseConsentPreferences(raw);
    if (revoked.advertising && hasRegionalAdDefault() && !isGlobalPrivacyControlEnabled() &&
      (raw === null || storedPreferences(raw)?.advertising)) return false;
    return !durable || ((!revoked.advertising || !durable.advertising)
      && (!revoked.analytics || !ANALYTICS_READY || !durable.analytics));
  } catch { return false; }
}

export function openConsentChoices(opener?: HTMLElement): void {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT, { detail: { opener } }));
}
