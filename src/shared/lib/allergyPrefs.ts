import { ALLERGEN_IDS, type AllergenId } from '@/i18n/allergens';

/**
 * The visitor's declared allergies, kept on their own device.
 *
 * This is a convenience preference, not a medical record and not an order
 * field: nothing here reaches a server, and the counter is always told in
 * person — the copy beside the control says so. Stored as allergen ids from
 * the same table the education cards use, so a label rename never corrupts a
 * saved preference.
 */
const KEY = 'ebc:allergies';

export function loadAllergies(): AllergenId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Unknown ids (an old key, a typo'd hand-edit) are dropped, not kept.
    return ALLERGEN_IDS.filter((id) => parsed.includes(id));
  } catch {
    return [];
  }
}

export function saveAllergies(ids: AllergenId[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage full or blocked: the selection still works for this visit.
  }
}
