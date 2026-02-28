'use server';

import { getDb } from './db';

export interface BankConnection {
  id: string;
  provider: string;
  display_name: string;
  institution_name: string | null;
  status: string;
  last_successful_sync: string | null;
  created_at: string;
}

export interface BankAccount {
  id: string;
  connection_id: string;
  name: string;
  official_name: string | null;
  type: string;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  is_active: boolean;
}

export async function fetchBankConnections(): Promise<BankConnection[]> {
  const db = getDb();
  return db.query<BankConnection>(
    `SELECT id, provider, display_name, institution_name, status, last_successful_sync, created_at
     FROM bank_connections ORDER BY created_at DESC`,
  );
}

export async function fetchBankAccounts(connectionId?: string): Promise<BankAccount[]> {
  const db = getDb();
  if (connectionId) {
    const rows = db.query<Record<string, unknown>>(
      `SELECT * FROM bank_accounts WHERE connection_id = ? AND is_active = 1 ORDER BY name`,
      [connectionId],
    );
    return rows.map(rowToBankAccount);
  }
  const rows = db.query<Record<string, unknown>>(
    `SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY name`,
  );
  return rows.map(rowToBankAccount);
}

export async function createLinkToken(userId: string): Promise<{ link_token: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/bank/link-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to create link token');
  return res.json();
}

export async function exchangePublicToken(publicToken: string, metadata: {
  institutionId?: string;
  institutionName?: string;
  accounts?: Array<{ id: string; name: string; type: string; mask: string }>;
}): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/bank/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicToken,
      institutionId: metadata.institutionId,
      institutionName: metadata.institutionName,
      syncOnConnect: true,
    }),
  });
  if (!res.ok) throw new Error('Failed to exchange token');
}

export async function disconnectBank(connectionId: string): Promise<void> {
  const db = getDb();
  db.execute(
    `UPDATE bank_connections SET status = 'disconnected', updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), connectionId],
  );
}

function rowToBankAccount(row: Record<string, unknown>): BankAccount {
  return {
    id: row.id as string,
    connection_id: row.connection_id as string,
    name: row.name as string,
    official_name: (row.official_name as string) ?? null,
    type: row.type as string,
    mask: (row.mask as string) ?? null,
    current_balance: (row.current_balance as number) ?? null,
    available_balance: (row.available_balance as number) ?? null,
    is_active: row.is_active === 1 || row.is_active === true,
  };
}
