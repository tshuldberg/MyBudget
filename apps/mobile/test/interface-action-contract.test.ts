import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const NOOP_HANDLER = /on(?:Press|LongPress)\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g;

function walkTsxFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTsxFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('MyBudget interface action contract', () => {
  it('does not leave mobile buttons wired to empty onPress/onLongPress handlers', () => {
    const appRoot = path.resolve(__dirname, '..');
    const files = [
      ...walkTsxFiles(path.join(appRoot, 'app')),
      ...walkTsxFiles(path.join(appRoot, 'components')),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      if (NOOP_HANDLER.test(src)) {
        offenders.push(path.relative(appRoot, file));
      }
      NOOP_HANDLER.lastIndex = 0;
    }

    expect(offenders).toEqual([]);
  });
});
