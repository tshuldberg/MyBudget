'use server';

import { getDb } from './db';
import {
  createCategoryGroup as _createCategoryGroup,
  updateCategoryGroup as _updateCategoryGroup,
  deleteCategoryGroup as _deleteCategoryGroup,
  getCategoryGroups as _getCategoryGroups,
  getAllCategoryGroups as _getAllCategoryGroups,
  createCategory as _createCategory,
  updateCategory as _updateCategory,
  deleteCategory as _deleteCategory,
  getCategories as _getCategories,
  getCategoriesByGroup as _getCategoriesByGroup,
  getCategoryById as _getCategoryById,
} from '@mybudget/shared';
import type {
  CategoryGroup,
  CategoryGroupInsert,
  Category,
  CategoryInsert,
} from '@mybudget/shared';
import { randomUUID } from 'crypto';

// --- Category Groups ---

export async function fetchCategoryGroups(includeHidden = false): Promise<CategoryGroup[]> {
  const db = getDb();
  return includeHidden ? _getAllCategoryGroups(db) : _getCategoryGroups(db);
}

export async function createCategoryGroup(input: CategoryGroupInsert): Promise<CategoryGroup> {
  return _createCategoryGroup(getDb(), randomUUID(), input);
}

export async function updateCategoryGroup(
  id: string,
  updates: Partial<Pick<CategoryGroup, 'name' | 'sort_order' | 'is_hidden'>>,
): Promise<void> {
  _updateCategoryGroup(getDb(), id, updates);
}

export async function deleteCategoryGroup(id: string): Promise<void> {
  _deleteCategoryGroup(getDb(), id);
}

// --- Categories ---

export async function fetchCategories(): Promise<Category[]> {
  return _getCategories(getDb());
}

export async function fetchCategoriesByGroup(groupId: string): Promise<Category[]> {
  return _getCategoriesByGroup(getDb(), groupId);
}

export async function fetchCategoryById(id: string): Promise<Category | null> {
  return _getCategoryById(getDb(), id);
}

export async function createCategory(input: CategoryInsert): Promise<Category> {
  return _createCategory(getDb(), randomUUID(), input);
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, 'name' | 'emoji' | 'target_amount' | 'target_type' | 'sort_order' | 'is_hidden' | 'group_id'>>,
): Promise<void> {
  _updateCategory(getDb(), id, updates);
}

export async function deleteCategory(id: string): Promise<void> {
  _deleteCategory(getDb(), id);
}

// --- Seed defaults ---

export async function seedDefaultCategories(): Promise<void> {
  const db = getDb();
  const groups = _getCategoryGroups(db);
  if (groups.length > 0) return; // already seeded

  const essentials = _createCategoryGroup(db, randomUUID(), { name: 'Essentials' });
  const lifestyle = _createCategoryGroup(db, randomUUID(), { name: 'Lifestyle' });
  const savings = _createCategoryGroup(db, randomUUID(), { name: 'Savings Goals' });

  const cats = [
    { group_id: essentials.id, name: 'Rent / Mortgage', emoji: '🏠' },
    { group_id: essentials.id, name: 'Groceries', emoji: '🛒' },
    { group_id: essentials.id, name: 'Utilities', emoji: '💡' },
    { group_id: essentials.id, name: 'Transportation', emoji: '🚗' },
    { group_id: essentials.id, name: 'Insurance', emoji: '🛡️' },
    { group_id: lifestyle.id, name: 'Dining Out', emoji: '🍽️' },
    { group_id: lifestyle.id, name: 'Entertainment', emoji: '🎬' },
    { group_id: lifestyle.id, name: 'Shopping', emoji: '🛍️' },
    { group_id: lifestyle.id, name: 'Health & Fitness', emoji: '💪' },
    { group_id: savings.id, name: 'Emergency Fund', emoji: '🚨', target_type: 'savings_goal' as const, target_amount: 1000000 },
    { group_id: savings.id, name: 'Vacation', emoji: '✈️', target_type: 'savings_goal' as const, target_amount: 300000 },
  ];

  for (const cat of cats) {
    _createCategory(db, randomUUID(), cat);
  }
}
