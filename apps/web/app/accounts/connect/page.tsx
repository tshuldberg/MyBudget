'use client';

import { ArrowLeft, Shield, Key, Server } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function ConnectBankPage() {
  return (
    <div className="fade-in">
      <PageHeader
        title="Connect Bank Account"
        subtitle="Securely sync transactions via Plaid"
        actions={
          <Link href="/accounts">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} /> Back to Accounts
            </Button>
          </Link>
        }
      />

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <Shield size={24} color="var(--color-teal)" />
            <div>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 4 }}>
                Privacy-First Bank Sync
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                MyBudget uses Plaid to securely connect to your bank. Transactions are imported
                directly to your local database. No data is stored in the cloud.
              </p>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-background)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)',
            }}
          >
            <h4
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--color-amber)',
                marginBottom: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <Key size={16} /> Setup Required
            </h4>

            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              Bank sync requires Plaid API credentials. To enable this feature:
            </p>

            <ol
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
                paddingLeft: 'var(--spacing-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
              }}
            >
              <li>
                Sign up for a Plaid account at{' '}
                <a
                  href="https://plaid.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-teal)' }}
                >
                  plaid.com
                </a>
              </li>
              <li>Create a new application in the Plaid Dashboard</li>
              <li>Copy your Client ID and Secret</li>
              <li>
                Add the following environment variables:
              </li>
            </ol>

            <pre
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                marginTop: 'var(--spacing-md)',
                overflowX: 'auto',
              }}
            >
              {`PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox  # or development / production`}
            </pre>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <Server size={24} color="var(--text-muted)" />
            <div>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 4 }}>
                How It Works
              </h3>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Once configured, you will be able to link bank accounts through Plaid Link.
                Transactions sync automatically on a schedule, or you can trigger a manual sync
                at any time. All data remains in your local SQLite database.
              </p>
            </div>
          </div>

          <Button disabled style={{ alignSelf: 'flex-start' }}>
            Connect via Plaid (Not Configured)
          </Button>
        </div>
      </Card>
    </div>
  );
}
