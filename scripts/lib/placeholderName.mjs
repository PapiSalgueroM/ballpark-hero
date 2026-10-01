/* Round 706. The offline scripts' copy of src/lib/placeholderName.ts: a name
   that starts with an underscore ("_ Johnston", "_ Sullivan") is a scrape
   placeholder for a first name the source never had, never a person.
   scripts/simCollegeTables.mjs fails if this and the app's copy ever disagree
   on a live name. */
export function isPlaceholderName(name) {
  return /^\s*_/.test(String(name ?? ''));
}
