import { z } from 'zod';
import { BillingCycle, SubscriptionStatus } from '../models/schemas';

/** Filter options for listing subscriptions. */
export const SubscriptionFilterSchema = z.object({
  status: SubscriptionStatus.optional(),
  category_id: z.string().uuid().optional(),
  billing_cycle: BillingCycle.optional(),
});

export type SubscriptionFilter = z.infer<typeof SubscriptionFilterSchema>;

/** Fields that can be updated on an existing subscription. */
export const SubscriptionUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().int().optional(),
  currency: z.string().length(3).optional(),
  billing_cycle: BillingCycle.optional(),
  custom_days: z.number().int().positive().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  next_renewal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  trial_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  url: z.string().max(500).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  notify_days: z.number().int().nonnegative().optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

export type SubscriptionUpdate = z.infer<typeof SubscriptionUpdateSchema>;
