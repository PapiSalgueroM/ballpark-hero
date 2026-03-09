/**
 * Ensures the correct answer is always present in the selectable options list.
 * If the answer is missing, it is automatically appended.
 *
 * @param options  - Current list of selectable option labels (names)
 * @param answer   - The correct answer that must be selectable
 * @returns        - The options list, guaranteed to include the answer
 */
export function ensureAnswerInOptions(options: string[], answer: string): string[] {
  if (!answer) return options;
  const normalizedAnswer = answer.toLowerCase().trim();
  const exists = options.some(o => o.toLowerCase().trim() === normalizedAnswer);
  if (exists) return options;
  return [...options, answer];
}

/**
 * Generic version: ensures an item exists in an array by checking a key extractor.
 * If missing, appends the fallback item.
 *
 * @param items     - Current list of items
 * @param answer    - The value to match (e.g. a name or id)
 * @param getKey    - Function to extract the comparable key from each item
 * @param fallback  - The item to append if not found
 * @returns         - The items list, guaranteed to include the answer
 */
export function ensureAnswerInList<T>(
  items: T[],
  answer: string,
  getKey: (item: T) => string,
  fallback: T
): T[] {
  if (!answer) return items;
  const normalizedAnswer = answer.toLowerCase().trim();
  const exists = items.some(item => getKey(item).toLowerCase().trim() === normalizedAnswer);
  if (exists) return items;
  return [...items, fallback];
}
