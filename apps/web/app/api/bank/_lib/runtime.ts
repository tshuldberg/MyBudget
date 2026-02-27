import { getBankSyncServerRuntime } from '@mybudget/shared';

export async function getBankApiRuntime() {
  return getBankSyncServerRuntime({
    env: process.env as Record<string, string | undefined>,
  });
}
