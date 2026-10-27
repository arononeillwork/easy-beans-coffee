import 'server-only';
import { randomUUID } from 'node:crypto';
import { getSiteUrl, getWebsiteServicePricing } from '../env';
import { getLocationId, getSquareClient } from '../square/client';
import { getProject, updateProject, type ProjectRow } from './projectRepo';

/**
 * The website build-out is its own purchase: a Square quick-pay link for one
 * fixed-price service, apart from the café's catalog and the collection-order
 * checkout. Paid is read back from the Square order (a tender on it), the same
 * test `orders/orderSync.ts` uses, whenever the studio page is opened.
 */

export function priceFor(mode: ProjectRow['mode']): number {
  const pricing = getWebsiteServicePricing();
  return mode === 'redesign' ? pricing.redesignCents : pricing.newSiteCents;
}

export function serviceName(mode: ProjectRow['mode']): string {
  return mode === 'redesign' ? 'Website redesign — build & launch' : 'New website — build & launch';
}

export async function createPurchaseLink(project: ProjectRow, version: number): Promise<string> {
  // A link already made for this same version is reused rather than duplicated.
  if (project.square_payment_link_url && project.chosen_version === version && !project.paid_at) {
    return project.square_payment_link_url;
  }

  const { currency } = getWebsiteServicePricing();
  const cents = priceFor(project.mode);
  const response = await getSquareClient().checkout.paymentLinks.create({
    idempotencyKey: randomUUID(),
    quickPay: {
      name: `${serviceName(project.mode)} (draft v${version})`,
      priceMoney: { amount: BigInt(cents), currency },
      locationId: getLocationId(),
    },
    description: `Website studio project ${project.id}, version ${version}`,
    checkoutOptions: {
      redirectUrl: `${getSiteUrl()}/admin/website?project=${project.id}&paid=1`,
      askForShippingAddress: false,
    },
  });

  const link = response.paymentLink;
  if (!link?.url || !link.orderId) throw new Error('Square did not return a payment link');

  await updateProject(project.id, {
    chosen_version: version,
    price_cents: cents,
    currency,
    square_payment_link_id: link.id ?? null,
    square_payment_link_url: link.url,
    square_order_id: link.orderId,
  });
  return link.url;
}

/** Marks the project paid once Square shows a tender. Returns the fresh row. */
export async function refreshPurchase(project: ProjectRow): Promise<ProjectRow> {
  if (project.paid_at || !project.square_order_id) return project;
  try {
    const { order } = await getSquareClient().orders.get({ orderId: project.square_order_id });
    if (order?.state !== 'CANCELED' && order?.tenders?.length) {
      await updateProject(project.id, { paid_at: new Date().toISOString() });
      return (await getProject(project.id)) ?? project;
    }
  } catch (err) {
    console.error('website purchase check failed', { projectId: project.id, err });
  }
  return project;
}
