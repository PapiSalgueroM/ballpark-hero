import { loadSupabase } from '@/integrations/supabase/loadClient';
import { browserStorage } from '@/lib/brokenSaveRecovery';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave, SOCCER_CAREER_SAVE_VERSION } from '@/lib/soccerCareerSave';
import { isSoccerCareerSaveKey, replaceSoccerCareerSave } from '@/lib/soccerCareerSaveReplacement';
import type { CareerState } from '@/lib/soccerCareerEngine';

export type AccountCareerSave = { slot: number; revision: string; raw: string; savedAt: string };
export type AccountCareerSummary = { playerName: string; club: string; age: number };

const TABLE = 'soccer_career_account_saves';
const MAX_BYTES = 2_000_000;
const isSlotNumber = (slot: number) => Number.isInteger(slot) && slot >= 1 && slot <= 3;

function readCareer(raw: string): CareerState | null {
  if (raw.length > MAX_BYTES || new TextEncoder().encode(raw).byteLength > MAX_BYTES) return null;
  try {
    const parsed = parseSoccerCareerSave(raw);
    return isSoccerCareerSave(parsed) ? parsed as CareerState : null;
  } catch { return null; }
}

export function summarizeAccountCareer(raw: string): AccountCareerSummary | null {
  const career = readCareer(raw);
  return career ? { playerName: career.playerName, club: career.currentClub, age: career.age } : null;
}

async function clientFor(userId: string) {
  const client = await loadSupabase();
  const { data, error } = await client.auth.getSession();
  const user = data.session?.user;
  if (error || !user || user.id !== userId || user.is_anonymous) throw new Error('Account changed');
  return client;
}

export async function readSoccerCareerAccountSaves(userId: string): Promise<AccountCareerSave[]> {
  const client = await clientFor(userId);
  const { data, error } = await client.from(TABLE).select('slot,revision,save_text,saved_at').eq('user_id', userId).order('slot');
  if (error || !data) throw new Error('Could not read account saves');
  return data.map(row => ({ slot: row.slot, revision: row.revision, raw: row.save_text, savedAt: row.saved_at }));
}

export async function writeSoccerCareerAccountSave(
  userId: string, slotNumber: number, expectedRevision: string | null, raw: string,
): Promise<'saved' | 'changed' | 'failed'> {
  if (!isSlotNumber(slotNumber) || !readCareer(raw)) return 'failed';
  try {
    const client = await clientFor(userId);
    const table = client.from(TABLE);
    const query = expectedRevision === null
      ? table.insert({ user_id: userId, slot: slotNumber, save_text: raw })
      : table.update({ save_text: raw }).eq('user_id', userId).eq('slot', slotNumber).eq('revision', expectedRevision);
    const { data, error } = await query.select('revision').maybeSingle();
    if (error?.code === '23505' && expectedRevision === null) return 'changed';
    if (error) return 'failed';
    return data?.revision ? 'saved' : 'changed';
  } catch { return 'failed'; }
}

export async function deleteSoccerCareerAccountSave(
  userId: string, slotNumber: number, expectedRevision: string,
): Promise<'removed' | 'changed' | 'failed'> {
  if (!isSlotNumber(slotNumber)) return 'failed';
  try {
    const client = await clientFor(userId);
    const { data, error } = await client.from(TABLE).delete().eq('user_id', userId).eq('slot', slotNumber)
      .eq('revision', expectedRevision).select('revision').maybeSingle();
    if (error) return 'failed';
    return data?.revision ? 'removed' : 'changed';
  } catch { return 'failed'; }
}

export function readSoccerCareerAccountLocal(saveKey: string): { raw: string | null; summary: AccountCareerSummary | null } | null {
  const storage = browserStorage();
  if (!storage || !isSoccerCareerSaveKey(saveKey)) return null;
  try {
    const raw = storage.getItem(saveKey);
    return { raw, summary: raw === null ? null : summarizeAccountCareer(raw) };
  } catch { return null; }
}

export function restoreSoccerCareerAccountSave(
  saveKey: string, expectedLocal: string | null, raw: string,
): 'restored' | 'changed' | 'failed' | 'current' {
  const storage = browserStorage();
  if (!storage || !isSoccerCareerSaveKey(saveKey)) return 'failed';
  try {
    if (storage.getItem(saveKey) !== expectedLocal) return 'changed';
    const career = readCareer(raw);
    if (!career) return 'failed';
    const restored = JSON.stringify({ ...JSON.parse(raw), restoredFromAccount: true });
    if (expectedLocal === raw || expectedLocal === restored) return 'current';
    if (expectedLocal !== null && expectedLocal === serializeSoccerCareerSave({ ...career, restoredFromAccount: true }, SOCCER_CAREER_SAVE_VERSION)) return 'current';
    return replaceSoccerCareerSave(storage, saveKey, expectedLocal, restored);
  } catch { return 'failed'; }
}
