/**
 * Seeds the database with realistic demo data on first launch.
 * Uses the same shared CRUD functions as real user actions.
 * Idempotent — checks if accounts exist before inserting.
 */
import type { DatabaseAdapter } from '@mybudget/shared';
import {
  createAccount,
  createCategoryGroup,
  createCategory,
  createTransaction,
  createSubscription,
  allocateToCategory,
  recordPriceChange,
  currentMonth,
} from '@mybudget/shared';
import { uuid } from './uuid';

// Deterministic IDs for debuggability and idempotency
const A = {
  checking: 'seed-a1',
  savings: 'seed-a2',
  creditCard: 'seed-a3',
  cash: 'seed-a4',
};

const G = {
  essentials: 'seed-g1',
  lifestyle: 'seed-g2',
  savings: 'seed-g3',
};

const C = {
  rent: 'seed-c1',
  groceries: 'seed-c2',
  utilities: 'seed-c3',
  diningOut: 'seed-c4',
  entertainment: 'seed-c5',
  shopping: 'seed-c6',
  emergencyFund: 'seed-c7',
  vacation: 'seed-c8',
};

const S = {
  netflix: 'seed-s1',
  spotify: 'seed-s2',
  icloud: 'seed-s3',
  chatgpt: 'seed-s4',
  adobe: 'seed-s5',
  hulu: 'seed-s6',
};

export function seedDatabase(db: DatabaseAdapter): void {
  const rows = db.query<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
  if (rows[0].count > 0) return;

  db.transaction(() => {
    // ── Accounts ──
    createAccount(db, A.checking, { name: 'Checking', type: 'checking', balance: 352480, sort_order: 0 });
    createAccount(db, A.savings, { name: 'Savings', type: 'savings', balance: 1250000, sort_order: 1 });
    createAccount(db, A.creditCard, { name: 'Credit Card', type: 'credit_card', balance: -48523, sort_order: 2 });
    createAccount(db, A.cash, { name: 'Cash', type: 'cash', balance: 8500, sort_order: 3 });

    // ── Category Groups ──
    createCategoryGroup(db, G.essentials, { name: 'Essentials', sort_order: 0 });
    createCategoryGroup(db, G.lifestyle, { name: 'Lifestyle', sort_order: 1 });
    createCategoryGroup(db, G.savings, { name: 'Savings Goals', sort_order: 2 });

    // ── Categories ──
    createCategory(db, C.rent, {
      group_id: G.essentials, name: 'Rent', emoji: '🏠',
      target_amount: 200000, target_type: 'monthly', sort_order: 0,
    });
    createCategory(db, C.groceries, {
      group_id: G.essentials, name: 'Groceries', emoji: '🛒',
      target_amount: 60000, target_type: 'monthly', sort_order: 1,
    });
    createCategory(db, C.utilities, {
      group_id: G.essentials, name: 'Utilities', emoji: '⚡',
      target_amount: 15000, target_type: 'monthly', sort_order: 2,
    });
    createCategory(db, C.diningOut, {
      group_id: G.lifestyle, name: 'Dining Out', emoji: '🍕',
      target_amount: 30000, target_type: 'monthly', sort_order: 0,
    });
    createCategory(db, C.entertainment, {
      group_id: G.lifestyle, name: 'Entertainment', emoji: '🎮',
      target_amount: 20000, target_type: 'monthly', sort_order: 1,
    });
    createCategory(db, C.shopping, {
      group_id: G.lifestyle, name: 'Shopping', emoji: '🛍️',
      sort_order: 2,
    });
    createCategory(db, C.emergencyFund, {
      group_id: G.savings, name: 'Emergency Fund', emoji: '🛟',
      target_amount: 1000000, target_type: 'savings_goal', sort_order: 0,
    });
    createCategory(db, C.vacation, {
      group_id: G.savings, name: 'Vacation', emoji: '✈️',
      target_amount: 300000, target_type: 'savings_goal', sort_order: 1,
    });

    // ── Budget Allocations (current month) ──
    const month = currentMonth();
    allocateToCategory(db, uuid(), C.rent, month, 200000);
    allocateToCategory(db, uuid(), C.groceries, month, 55000);
    allocateToCategory(db, uuid(), C.utilities, month, 15000);
    allocateToCategory(db, uuid(), C.diningOut, month, 25000);
    allocateToCategory(db, uuid(), C.entertainment, month, 20000);
    allocateToCategory(db, uuid(), C.shopping, month, 10000);
    allocateToCategory(db, uuid(), C.emergencyFund, month, 50000);
    allocateToCategory(db, uuid(), C.vacation, month, 25000);

    // ── Transactions ──
    const t1 = uuid(), t2 = uuid(), t3 = uuid(), t4 = uuid();
    const t5out = uuid(), t5in = uuid(), t6 = uuid(), t7 = uuid();

    createTransaction(db, t7, {
      account_id: A.checking, date: '2026-02-18', payee: 'Landlord',
      memo: 'Feb rent', amount: -200000, is_cleared: true,
    }, [{ id: uuid(), transaction_id: t7, category_id: C.rent, amount: -200000 }]);

    createTransaction(db, t6, {
      account_id: A.checking, date: '2026-02-19', payee: 'Chipotle',
      memo: null, amount: -1245, is_cleared: true,
    }, [{ id: uuid(), transaction_id: t6, category_id: C.diningOut, amount: -1245 }]);

    createTransaction(db, t4, {
      account_id: A.checking, date: '2026-02-20', payee: 'Shell Gas Station',
      memo: null, amount: -4800, is_cleared: false,
    }, [{ id: uuid(), transaction_id: t4, category_id: C.utilities, amount: -4800 }]);

    // Transfer: checking → savings
    createTransaction(db, t5out, {
      account_id: A.checking, date: '2026-02-20', payee: 'Transfer to Savings',
      memo: null, amount: -50000, is_cleared: true, is_transfer: true, transfer_id: t5in,
    }, []);
    createTransaction(db, t5in, {
      account_id: A.savings, date: '2026-02-20', payee: 'Transfer from Checking',
      memo: null, amount: 50000, is_cleared: true, is_transfer: true, transfer_id: t5out,
    }, []);

    createTransaction(db, t2, {
      account_id: A.checking, date: '2026-02-21', payee: 'Netflix',
      memo: null, amount: -1599, is_cleared: true,
    }, [{ id: uuid(), transaction_id: t2, category_id: C.entertainment, amount: -1599 }]);

    createTransaction(db, t3, {
      account_id: A.checking, date: '2026-02-21', payee: 'Acme Corp',
      memo: 'Paycheck', amount: 325000, is_cleared: true,
    }, []);

    createTransaction(db, t1, {
      account_id: A.checking, date: '2026-02-22', payee: 'Whole Foods',
      memo: null, amount: -8523, is_cleared: true,
    }, [{ id: uuid(), transaction_id: t1, category_id: C.groceries, amount: -8523 }]);

    // ── Subscriptions ──
    createSubscription(db, S.netflix, {
      name: 'Netflix', price: 1599, currency: 'USD', billing_cycle: 'monthly',
      status: 'active', start_date: '2024-01-15', next_renewal: '2026-03-15',
      icon: '🎬', color: '#E50914', notify_days: 1, catalog_id: 'netflix',
      category_id: C.entertainment, sort_order: 0,
    });
    createSubscription(db, S.spotify, {
      name: 'Spotify', price: 1099, currency: 'USD', billing_cycle: 'monthly',
      status: 'active', start_date: '2023-06-01', next_renewal: '2026-03-01',
      icon: '🎵', color: '#1DB954', notify_days: 1, catalog_id: 'spotify',
      category_id: C.entertainment, sort_order: 1,
    });
    createSubscription(db, S.icloud, {
      name: 'iCloud+', price: 299, currency: 'USD', billing_cycle: 'monthly',
      status: 'active', start_date: '2022-11-01', next_renewal: '2026-03-01',
      icon: '☁️', notify_days: 1, catalog_id: 'icloud', sort_order: 2,
    });
    createSubscription(db, S.chatgpt, {
      name: 'ChatGPT Plus', price: 2000, currency: 'USD', billing_cycle: 'monthly',
      status: 'active', start_date: '2025-01-01', next_renewal: '2026-03-01',
      icon: '🤖', notify_days: 1, catalog_id: 'chatgpt-plus', sort_order: 3,
    });
    createSubscription(db, S.adobe, {
      name: 'Adobe Creative Cloud', price: 5999, currency: 'USD', billing_cycle: 'monthly',
      status: 'paused', start_date: '2024-03-01', next_renewal: '2026-04-01',
      icon: '🎨', color: '#FF0000', notify_days: 1, catalog_id: 'adobe-cc',
      notes: 'Paused while on break', sort_order: 4,
    });
    createSubscription(db, S.hulu, {
      name: 'Hulu', price: 1799, currency: 'USD', billing_cycle: 'monthly',
      status: 'cancelled', start_date: '2024-06-01', next_renewal: '2026-03-01',
      cancelled_date: '2026-02-01',
      icon: '📺', notify_days: 1, catalog_id: 'hulu',
      category_id: C.entertainment, sort_order: 5,
    });

    // ── Price History (Netflix) ──
    recordPriceChange(db, uuid(), S.netflix, 999, '2024-01-15');
    recordPriceChange(db, uuid(), S.netflix, 1499, '2024-06-01');
  });
}
