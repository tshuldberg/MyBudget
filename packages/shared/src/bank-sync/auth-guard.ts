/**
 * Bank sync auth guard middleware.
 *
 * Validates authentication tokens, enforces rate limits, and gates access
 * to bank sync endpoints. Sits between the HTTP handler and the connector
 * service layer.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenValidationSuccess = {
  valid: true;
  userId: string;
  expiresAt: string;
};

export type TokenValidationFailure = {
  valid: false;
  error: string;
};

export type TokenValidationResult = TokenValidationSuccess | TokenValidationFailure;

export type TokenValidator = (token: string) => Promise<TokenValidationResult>;

export interface AuthGuardConfig {
  tokenValidator: TokenValidator;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  nowMs: () => number;
}

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  nowMs: number;
}

export interface GuardCheckRequest {
  authorizationHeader: string | null;
  userId: string | null;
}

export interface GuardCheckResult {
  allowed: boolean;
  userId?: string;
  reason?: string;
}

export interface AuthGuard {
  check(request: GuardCheckRequest): Promise<GuardCheckResult>;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Validate a Bearer token from an Authorization header.
 */
export async function validateBankSyncToken(
  authorizationHeader: string | null | undefined,
  validator: TokenValidator,
): Promise<AuthResult> {
  if (!authorizationHeader) {
    return { authenticated: false, error: 'missing_token' };
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'invalid_scheme' };
  }

  const token = authorizationHeader.slice(7);

  try {
    const result = await validator(token);

    if (result.valid) {
      return { authenticated: true, userId: result.userId };
    }

    return { authenticated: false, error: result.error };
  } catch {
    return { authenticated: false, error: 'internal_error' };
  }
}

/**
 * Check if a request is within the rate limit.
 * Uses a sliding window algorithm based on request timestamps.
 */
export function checkRateLimit(
  _userId: string,
  requestLog: number[],
  options: RateLimitOptions,
): RateLimitResult {
  const { maxRequests, windowMs, nowMs } = options;
  const windowStart = nowMs - windowMs;

  // Count requests within the sliding window
  const recentRequests = requestLog.filter((ts) => ts > windowStart);
  const count = recentRequests.length;

  if (count >= maxRequests) {
    // Find when the oldest request in the window will expire
    const oldestInWindow = Math.min(...recentRequests);
    const retryAfterMs = (oldestInWindow + windowMs) - nowMs;

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  // Current request counts as 1, so remaining = max - count - 1
  return {
    allowed: true,
    remaining: maxRequests - count - 1,
  };
}

/**
 * Create an auth guard that combines token validation and rate limiting.
 */
export function createAuthGuard(config: AuthGuardConfig): AuthGuard {
  const userRequestLogs = new Map<string, number[]>();

  return {
    async check(request: GuardCheckRequest): Promise<GuardCheckResult> {
      // Validate token
      const authResult = await validateBankSyncToken(
        request.authorizationHeader,
        config.tokenValidator,
      );

      if (!authResult.authenticated) {
        return {
          allowed: false,
          reason: authResult.error,
        };
      }

      const userId = authResult.userId!;

      // Check rate limit
      const log = userRequestLogs.get(userId) ?? [];
      const now = config.nowMs();

      const rateLimitResult = checkRateLimit(userId, log, {
        maxRequests: config.rateLimitMaxRequests,
        windowMs: config.rateLimitWindowMs,
        nowMs: now,
      });

      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          userId,
          reason: 'rate_limited',
        };
      }

      // Record this request
      log.push(now);
      userRequestLogs.set(userId, log);

      return {
        allowed: true,
        userId,
      };
    },
  };
}
