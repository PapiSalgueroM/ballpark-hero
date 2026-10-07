/** Group a displayed number without changing its sign or precision. */
export function formatNumber(value: number | string): string {
  const text = String(value);
  const parts = /^([+-]?)(\d+)(\.\d+)?$/.exec(text);
  if (!parts) return text;
  return parts[1] + parts[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[3] ?? '');
}
