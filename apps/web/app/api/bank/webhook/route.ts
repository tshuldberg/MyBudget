import { NextRequest, NextResponse } from 'next/server';
import {
  BANK_SYNC_IMPLEMENTED_PROVIDERS,
  BANK_SYNC_PROVIDERS,
  type BankSyncProvider,
} from '@mybudget/shared';
import { getBankApiRuntime } from '../_lib/runtime';

export const runtime = 'nodejs';

function parseProvider(value: unknown): {
  provider?: BankSyncProvider;
  error?: string;
} {
  if (value === undefined || value === null) {
    return { provider: 'plaid' };
  }
  if (typeof value !== 'string') {
    return { error: 'Field "provider" must be a string when provided.' };
  }
  const normalized = value.trim().toLowerCase();
  if (!BANK_SYNC_PROVIDERS.includes(normalized as BankSyncProvider)) {
    return { error: `Unsupported provider "${normalized}".` };
  }
  if (!BANK_SYNC_IMPLEMENTED_PROVIDERS.includes(normalized as BankSyncProvider)) {
    return {
      error: `Provider "${normalized}" is not enabled in this build. Enabled providers: ${BANK_SYNC_IMPLEMENTED_PROVIDERS.join(', ')}.`,
    };
  }
  return { provider: normalized as BankSyncProvider };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseEventPayload(rawBody: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawBody);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function deriveEventId(payload: Record<string, unknown>, request: NextRequest): string {
  return (
    asString(payload.event_id)
    ?? asString(payload.webhook_id)
    ?? asString(payload.id)
    ?? request.headers.get('x-webhook-id')
    ?? `evt-${Date.now()}`
  );
}

function deriveEventType(payload: Record<string, unknown>, request: NextRequest): string {
  const direct = asString(payload.event_type);
  if (direct) return direct;

  const webhookType = asString(payload.webhook_type);
  const webhookCode = asString(payload.webhook_code);
  if (webhookType && webhookCode) {
    return `${webhookType}.${webhookCode}`;
  }
  if (webhookType) return webhookType;
  if (webhookCode) return webhookCode;

  return request.headers.get('x-webhook-event') ?? 'unknown';
}

function toHeaderObject(request: NextRequest): Record<string, string | undefined> {
  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  return fallback;
}

function toErrorResponse(error: unknown, fallback: string): NextResponse {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes('No bank sync provider registered for') ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = parseEventPayload(rawBody);

  const providerResult = parseProvider(
    request.nextUrl.searchParams.get('provider')
    ?? payload.provider
    ?? process.env.BANK_SYNC_DEFAULT_PROVIDER,
  );
  if (!providerResult.provider) {
    return NextResponse.json(
      { error: providerResult.error ?? 'Invalid provider.' },
      { status: 400 },
    );
  }
  const provider = providerResult.provider;
  const eventId = deriveEventId(payload, request);
  const eventType = deriveEventType(payload, request);
  const connectionExternalId =
    asString(payload.connectionExternalId)
    ?? asString(payload.connection_external_id)
    ?? asString(payload.item_id)
    ?? undefined;

  const syncOnWebhook = asBool(
    payload.syncOnWebhook ?? process.env.BANK_SYNC_SYNC_ON_WEBHOOK,
    false,
  );

  try {
    const runtimeInstance = await getBankApiRuntime();
    const result = await runtimeInstance.connector.ingestWebhook({
      provider,
      eventId,
      eventType,
      headers: toHeaderObject(request),
      payload: rawBody,
      connectionExternalId,
    });

    let syncSummary: Record<string, unknown> | undefined;
    if (result.accepted && syncOnWebhook && connectionExternalId) {
      try {
        const syncResult = await runtimeInstance.connector.syncConnection({
          provider,
          connectionExternalId,
        });
        syncSummary = {
          added: syncResult.added.length,
          modified: syncResult.modified.length,
          removed: syncResult.removedProviderTransactionIds.length,
          nextCursor: syncResult.nextCursor,
        };
      } catch (error) {
        syncSummary = {
          error: error instanceof Error ? error.message : 'Webhook sync failed.',
        };
      }
    }

    return NextResponse.json(
      {
        accepted: result.accepted,
        verification: result.verification,
        eventId,
        eventType,
        provider,
        syncSummary,
      },
      { status: result.accepted ? 200 : 401 },
    );
  } catch (error) {
    return toErrorResponse(error, 'Failed to process webhook.');
  }
}
