import 'server-only';
import { getSquareClient } from './client';
import { getCafeTimezone } from '../env';

/**
 * The seller-defined custom fields on Square's Customer Directory — "Lead
 * Source" and "Created On", created in the Square Dashboard. Their keys are
 * account-generated (`square:<uuid>`) and their selection options are UUIDs,
 * so nothing is hard-coded: the definitions are fetched and cached, fields
 * are found by NAME, and option names map to ids at the moment of use.
 *
 * Custom fields are decoration on a profile, never the profile itself —
 * the seeding below fails soft so a Dashboard change can't break sign-up.
 */

const FIELD_NAMES = {
  leadSource: 'Lead Source',
  createdOn: 'Created On',
} as const;

/** The Lead Source option this site stamps on customers it creates. */
const WEBSITE_SOURCE = 'Website';

interface SelectionField {
  key: string;
  options: Array<{ id: string; name: string }>;
}

interface DirectoryFields {
  leadSource: SelectionField | null;
  createdOn: { key: string } | null;
}

/** Selection schema as Square serialises it; anything else parses to null. */
function toSelectionField(key: string, schema: unknown): SelectionField | null {
  const s = schema as { items?: { names?: string[]; enum?: string[] } } | null;
  const names = s?.items?.names ?? [];
  const ids = s?.items?.enum ?? [];
  if (names.length === 0 || names.length !== ids.length) return null;
  return { key, options: names.map((name, i) => ({ id: ids[i], name })) };
}

let cache: { fields: DirectoryFields; at: number } | null = null;
const CACHE_TTL_MS = 10 * 60_000;

/** The directory's custom fields, by name, cached for ten minutes. */
async function getDirectoryFields(): Promise<DirectoryFields> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.fields;

  const fields: DirectoryFields = { leadSource: null, createdOn: null };
  const page = await getSquareClient().customers.customAttributeDefinitions.list({});
  for await (const definition of page) {
    const key = definition.key;
    if (!key) continue;
    if (definition.name === FIELD_NAMES.leadSource) {
      fields.leadSource = toSelectionField(key, definition.schema);
    } else if (definition.name === FIELD_NAMES.createdOn) {
      fields.createdOn = { key };
    }
  }

  cache = { fields, at: Date.now() };
  return fields;
}

async function upsertValue(customerId: string, key: string, value: unknown): Promise<void> {
  await getSquareClient().customers.customAttributes.upsert({
    customerId,
    key,
    customAttribute: { value },
  });
}

/** Today where the café is, as Square's Date type wants it (YYYY-MM-DD). */
function cafeToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: getCafeTimezone() }).format(new Date());
}

/**
 * Stamps a customer the site just created: Lead Source = Website, Created On =
 * today. Best-effort by design — the profile exists either way, and a missing
 * or renamed Dashboard field must not fail a sign-up.
 */
export async function seedNewCustomerFields(customerId: string): Promise<void> {
  try {
    const { leadSource, createdOn } = await getDirectoryFields();

    const websiteOption = leadSource?.options.find((o) => o.name === WEBSITE_SOURCE);
    if (leadSource && websiteOption) {
      await upsertValue(customerId, leadSource.key, [websiteOption.id]);
    }
    if (createdOn) {
      await upsertValue(customerId, createdOn.key, cafeToday());
    }
  } catch (err) {
    console.error('customer custom field seed failed', err);
  }
}
