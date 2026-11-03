import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.js'],
        clearMocks: true,
        // Use vmThreads pool so jsdom is constructed once per worker thread and
        // reused across test files via isolated VM contexts. Without this vitest
        // defaults to 'forks', which spawns a separate process per file and
        // re-initialises jsdom 17 times (~11 s of environment overhead per run).
        // Per-file test isolation is preserved; only the spawn cost is removed.
        // https://vitest.dev/guide/improving-performance#test-environments
        pool: 'vmThreads',
    },
});
