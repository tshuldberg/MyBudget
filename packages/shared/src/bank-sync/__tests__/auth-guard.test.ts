/**
 * TDD tests for bank sync auth guard middleware.
 *
 * The auth guard validates that bank sync API requests have valid
 * authentication tokens, enforces rate limits, and gates access to
 * bank sync endpoints. It sits between the HTTP handler and the
 * connector service layer.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createAuthGuard,
  validateBankSyncToken,
  checkRateLimit,
  type AuthGuardConfig,
  type AuthResult,
  type RateLimitResult,
} from '../auth-guard';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<AuthGuardConfig> = {}): AuthGuardConfig {
  return {
    tokenValidator: async (_token: string) => ({
      valid: true,
      userId: 'user-1',
      expiresAt: '2026-12-31T23:59:59Z',
    }),
    rateLimitMaxRequests: 100,
    rateLimitWindowMs: 60000, // 1 minute
    nowMs: () => Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateBankSyncToken
// ---------------------------------------------------------------------------

describe('validateBankSyncToken', () => {
  it('accepts a valid bearer token', async () => {
    const validator = async (token: string) => ({
      valid: true as const,
      userId: 'user-1',
      expiresAt: '2026-12-31T23:59:59Z',
    });

    const result = await validateBankSyncToken('Bearer valid-token-123', validator);

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe('user-1');
  });

  it('rejects missing authorization header', async () => {
    const validator = async () => ({ valid: true as const, userId: 'u', expiresAt: '' });

    const result = await validateBankSyncToken(null, validator);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('missing_token');
  });

  it('rejects non-Bearer authorization schemes', async () => {
    const validator = async () => ({ valid: true as const, userId: 'u', expiresAt: '' });

    const result = await validateBankSyncToken('Basic dXNlcjpwYXNz', validator);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('invalid_scheme');
  });

  it('rejects expired tokens', async () => {
    const validator = async () => ({
      valid: false as const,
      error: 'token_expired',
    });

    const result = await validateBankSyncToken('Bearer expired-token', validator);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('token_expired');
  });

  it('rejects invalid/malformed tokens', async () => {
    const validator = async () => ({
      valid: false as const,
      error: 'invalid_token',
    });

    const result = await validateBankSyncToken('Bearer garbage-token', validator);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('invalid_token');
  });

  it('handles validator exceptions gracefully', async () => {
    const validator = async () => {
      throw new Error('Database connection failed');
    };

    const result = await validateBankSyncToken('Bearer valid-token', validator);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('internal_error');
  });
});

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

describe('checkRateLimit', () => {
  it('allows requests within the rate limit', () => {
    const requestLog: number[] = []; // timestamps of previous requests
    const now = 1000000;

    const result = checkRateLimit('user-1', requestLog, {
      maxRequests: 100,
      windowMs: 60000,
      nowMs: now,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('blocks requests exceeding the rate limit', () => {
    // Fill up the window with 100 requests
    const now = 1000000;
    const requestLog = Array.from({ length: 100 }, (_, i) => now - i * 100);

    const result = checkRateLimit('user-1', requestLog, {
      maxRequests: 100,
      windowMs: 60000,
      nowMs: now,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('expires old requests outside the window', () => {
    const now = 1000000;
    // 100 requests all from 2 minutes ago (outside the 1-min window)
    const requestLog = Array.from({ length: 100 }, () => now - 120000);

    const result = checkRateLimit('user-1', requestLog, {
      maxRequests: 100,
      windowMs: 60000,
      nowMs: now,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('counts only requests within the sliding window', () => {
    const now = 1000000;
    const requestLog = [
      now - 120000, // outside window (expired)
      now - 30000,  // inside window
      now - 15000,  // inside window
    ];

    const result = checkRateLimit('user-1', requestLog, {
      maxRequests: 5,
      windowMs: 60000,
      nowMs: now,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 5 max - 2 in window - 1 for current = 2
  });
});

// ---------------------------------------------------------------------------
// createAuthGuard (integration)
// ---------------------------------------------------------------------------

describe('createAuthGuard', () => {
  it('allows authenticated request within rate limit', async () => {
    const guard = createAuthGuard(makeConfig());

    const result = await guard.check({
      authorizationHeader: 'Bearer valid-token',
      userId: 'user-1',
    });

    expect(result.allowed).toBe(true);
    expect(result.userId).toBe('user-1');
  });

  it('blocks unauthenticated requests', async () => {
    const guard = createAuthGuard(makeConfig());

    const result = await guard.check({
      authorizationHeader: null,
      userId: null,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing_token');
  });

  it('blocks requests with invalid tokens', async () => {
    const guard = createAuthGuard(makeConfig({
      tokenValidator: async () => ({ valid: false as const, error: 'invalid_token' }),
    }));

    const result = await guard.check({
      authorizationHeader: 'Bearer bad-token',
      userId: null,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('invalid_token');
  });

  it('tracks rate limit per user', async () => {
    const guard = createAuthGuard(makeConfig({
      rateLimitMaxRequests: 2,
      rateLimitWindowMs: 60000,
    }));

    const request = {
      authorizationHeader: 'Bearer valid-token',
      userId: 'user-1',
    };

    const r1 = await guard.check(request);
    const r2 = await guard.check(request);
    const r3 = await guard.check(request);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
    expect(r3.reason).toBe('rate_limited');
  });
});
