/**
 * Server-only database singleton.
 * All other action files import getDb() from here.
 * NOT a server action itself - just a shared utility for other actions.
 */

import { getDb as _getDb } from '../../lib/db';
import type { DatabaseAdapter } from '@mybudget/shared';

export function getDb(): DatabaseAdapter {
  return _getDb();
}
