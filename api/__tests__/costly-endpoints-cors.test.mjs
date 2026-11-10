import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('cost-bearing endpoints use the shared origin allowlist', () => {
  for (const rel of ['tts.js', 'images/generate.js']) {
    it(`${rel} does not send a wildcard CORS origin`, () => {
      const src = readFileSync(join(root, rel), 'utf8');
      expect(src).toContain('resolveAllowedOrigin');
      expect(src).not.toMatch(/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*/);
    });
  }
});
