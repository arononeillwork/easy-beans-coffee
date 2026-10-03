import 'server-only';
import { z } from 'zod';

/** Shape of what the browser may send — IDs and quantities only, never prices. */
export const checkoutRequestSchema = z.object({
  lines: z
    .array(
      z.object({
        variationId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(20),
        modifierIds: z.array(z.string().min(1).max(64)).max(20),
        /** Free text for the barista, e.g. the vessel. Square caps line notes at 500. */
        note: z.string().trim().max(120).optional(),
      }),
    )
    .min(1)
    .max(50),
  pickup: z.object({
    type: z.enum(['ASAP', 'SCHEDULED']),
    at: z.iso.datetime({ offset: true }).optional(),
  }),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.email().optional(),
    note: z.string().trim().max(240).optional(),
  }),
  lang: z.enum(['en', 'es']),
  /** Subscriber 10% code. Validated server-side; an unknown one is ignored. */
  offerCode: z.string().trim().max(32).optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
