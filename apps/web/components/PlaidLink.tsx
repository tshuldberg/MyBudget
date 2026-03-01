'use client';

import { useState, useCallback } from 'react';
import { Button } from './ui/Button';
import { Landmark, Loader2 } from 'lucide-react';
import { createLinkToken, exchangePublicToken } from '../app/actions/bank-sync';

interface Props {
  onSuccess: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  label?: string;
}

/**
 * Plaid Link integration component.
 * Opens the Plaid Link modal for bank account connection.
 * Falls back gracefully when Plaid is not configured.
 */
export function PlaidLink({
  onSuccess,
  variant = 'primary',
  size = 'md',
  label = 'Connect Bank Account',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { link_token } = await createLinkToken('local-user');

      // Check if Plaid Link script is available
      const Plaid = (window as unknown as Record<string, unknown>).Plaid as {
        create: (config: Record<string, unknown>) => { open: () => void };
      } | undefined;

      if (!Plaid) {
        setError('Plaid Link is not loaded. Add the Plaid Link script to your page.');
        return;
      }

      const handler = Plaid.create({
        token: link_token,
        onSuccess: async (publicToken: string, metadata: Record<string, unknown>) => {
          try {
            const institution = metadata.institution as { institution_id?: string; name?: string } | undefined;
            const accounts = metadata.accounts as Array<{ id: string; name: string; type: string; mask: string }> | undefined;
            await exchangePublicToken(publicToken, {
              institutionId: institution?.institution_id,
              institutionName: institution?.name,
              accounts,
            });
            onSuccess();
          } catch {
            setError('Failed to connect account. Please try again.');
          }
        },
        onExit: () => {
          setLoading(false);
        },
      });

      handler.open();
    } catch {
      setError('Bank sync is not configured. Add Plaid API credentials to enable this feature.');
      setLoading(false);
    }
  }, [onSuccess]);

  return (
    <div>
      <Button variant={variant} size={size} onClick={handleConnect} disabled={loading}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Landmark size={16} />}
        {label}
      </Button>
      {error && (
        <p style={{
          marginTop: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-coral)',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
