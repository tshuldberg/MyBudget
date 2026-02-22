/**
 * Category group and category CRUD operations.
 * Category groups hold categories (the envelopes).
 */

import type { DatabaseAdapter } from './migrations';
import type {
  CategoryGroup,
  CategoryGroupInsert,
  Category,
  CategoryInsert,
} from '../models/schemas';

// --- Category Groups ---

export function createCategoryGroup(
  db: DatabaseAdapter,
  id: string,
  input: CategoryGroupInsert,
): CategoryGroup {
  const now = new Date().toISOString();
  const sortOrder = input.sort_order ?? 0;
  const isHidden = input.is_hidden ?? false;

  db.execute(
    `INSERT INTO category_groups (id, name, sort_order, is_hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.name, sortOrder, isHidden ? 1 : 0, now, now],
  );

  return {
    id,
    name: input.name,
    sort_order: sortOrder,
    is_hidden: isHidden,
    created_at: now,
    updated_at: now,
  };
}

export function updateCategoryGroup(
  db: DatabaseAdapter,
  id: string,
  updates: Partial<Pick<CategoryGroup, 'name' | 'sort_order' | 'is_hidden'>>,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sort_order);
  }
  if (updates.is_hidden !== undefined) {
    fields.push('is_hidden = ?');
    values.push(updates.is_hidden ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.execute(
    `UPDATE category_groups SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteCategoryGroup(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM category_groups WHERE id = ?`, [id]);
}

export function getCategoryGroups(db: DatabaseAdapter): CategoryGroup[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM category_groups WHERE is_hidden = 0 ORDER BY sort_order, name`,
  );
  return rows.map(rowToCategoryGroup);
}

export function getAllCategoryGroups(db: DatabaseAdapter): CategoryGroup[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM category_groups ORDER BY sort_order, name`,
  );
  return rows.map(rowToCategoryGroup);
}

// --- Categories ---

export function createCategory(
  db: DatabaseAdapter,
  id: string,
  input: CategoryInsert,
): Category {
  const now = new Date().toISOString();
  const emoji = input.emoji ?? null;
  const targetAmount = input.target_amount ?? null;
  const targetType = input.target_type ?? null;
  const sortOrder = input.sort_order ?? 0;
  const isHidden = input.is_hidden ?? false;

  db.execute(
    `INSERT INTO categories (id, group_id, name, emoji, target_amount, target_type, sort_order, is_hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.group_id, input.name, emoji, targetAmount, targetType, sortOrder, isHidden ? 1 : 0, now, now],
  );

  return {
    id,
    group_id: input.group_id,
    name: input.name,
    emoji,
    target_amount: targetAmount,
    target_type: targetType,
    sort_order: sortOrder,
    is_hidden: isHidden,
    created_at: now,
    updated_at: now,
  };
}

export function updateCategory(
  db: DatabaseAdapter,
  id: string,
  updates: Partial<Pick<Category, 'name' | 'emoji' | 'target_amount' | 'target_type' | 'sort_order' | 'is_hidden' | 'group_id'>>,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.emoji !== undefined) {
    fields.push('emoji = ?');
    values.push(updates.emoji);
  }
  if (updates.target_amount !== undefined) {
    fields.push('target_amount = ?');
    values.push(updates.target_amount);
  }
  if (updates.target_type !== undefined) {
    fields.push('target_type = ?');
    values.push(updates.target_type);
  }
  if (updates.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sort_order);
  }
  if (updates.is_hidden !== undefined) {
    fields.push('is_hidden = ?');
    values.push(updates.is_hidden ? 1 : 0);
  }
  if (updates.group_id !== undefined) {
    fields.push('group_id = ?');
    values.push(updates.group_id);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.execute(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteCategory(db: DatabaseAdapter, id: string): void {
  db.execute(`DELETE FROM categories WHERE id = ?`, [id]);
}

export function getCategories(db: DatabaseAdapter): Category[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM categories WHERE is_hidden = 0 ORDER BY sort_order, name`,
  );
  return rows.map(rowToCategory);
}

export function getCategoriesByGroup(db: DatabaseAdapter, groupId: string): Category[] {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM categories WHERE group_id = ? AND is_hidden = 0 ORDER BY sort_order, name`,
    [groupId],
  );
  return rows.map(rowToCategory);
}

export function getCategoryById(db: DatabaseAdapter, id: string): Category | null {
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM categories WHERE id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  return rowToCategory(rows[0]);
}

// --- Row mappers ---

function rowToCategoryGroup(row: Record<string, unknown>): CategoryGroup {
  return {
    id: row.id as string,
    name: row.name as string,
    sort_order: row.sort_order as number,
    is_hidden: row.is_hidden === 1 || row.is_hidden === true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    group_id: row.group_id as string,
    name: row.name as string,
    emoji: (row.emoji as string) ?? null,
    target_amount: (row.target_amount as number) ?? null,
    target_type: (row.target_type as Category['target_type']) ?? null,
    sort_order: row.sort_order as number,
    is_hidden: row.is_hidden === 1 || row.is_hidden === true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
