import { z } from 'zod';

export const BillingCycleSchema = z.enum([
  'weekly',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'custom',
]);

export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const CatalogCategorySchema = z.enum([
  'entertainment',
  'productivity',
  'health',
  'shopping',
  'news',
  'finance',
  'utilities',
  'other',
]);

export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;

export const CancellationDifficultySchema = z.enum([
  'easy',
  'medium',
  'hard',
  'impossible',
]);

export type CancellationDifficulty = z.infer<typeof CancellationDifficultySchema>;

export const CatalogEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be kebab-case'),
  name: z.string().min(1),
  defaultPrice: z.number().int().nonnegative(),
  billingCycle: BillingCycleSchema,
  category: CatalogCategorySchema,
  iconKey: z.string().min(1),
  url: z.string().url().optional(),
  cancellationUrl: z.string().url().optional(),
  cancellationDifficulty: CancellationDifficultySchema.optional(),
  cancellationNotes: z.string().optional(),
});

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
