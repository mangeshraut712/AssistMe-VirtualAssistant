import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatFileSize, formatRelativeTime, retry, storage } from './utils';

describe('formatRelativeTime', () => {
    const NOW = new Date('2024-06-15T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const secondsAgo = s => new Date(NOW.getTime() - s * 1000);

    it('uses singular/plural minutes and hours at the documented thresholds', () => {
        expect(formatRelativeTime(secondsAgo(0))).toBe('just now');
        expect(formatRelativeTime(secondsAgo(59))).toBe('just now');
        expect(formatRelativeTime(secondsAgo(60))).toBe('1 minute ago');
        expect(formatRelativeTime(secondsAgo(119))).toBe('1 minute ago');
        expect(formatRelativeTime(secondsAgo(120))).toBe('2 minutes ago');
        expect(formatRelativeTime(secondsAgo(3599))).toBe('59 minutes ago');
        expect(formatRelativeTime(secondsAgo(3600))).toBe('1 hour ago');
        expect(formatRelativeTime(secondsAgo(86399))).toBe('23 hours ago');
    });

    it('covers the yesterday/days/weeks windows without gaps or overlaps', () => {
        expect(formatRelativeTime(secondsAgo(86400))).toBe('yesterday');
        expect(formatRelativeTime(secondsAgo(172799))).toBe('yesterday');
        expect(formatRelativeTime(secondsAgo(172800))).toBe('2 days ago');
        expect(formatRelativeTime(secondsAgo(604799))).toBe('6 days ago');
        expect(formatRelativeTime(secondsAgo(604800))).toBe('1 week ago');
        expect(formatRelativeTime(secondsAgo(1209600))).toBe('2 weeks ago');
        expect(formatRelativeTime(secondsAgo(2591999))).toBe('4 weeks ago');
    });

    it('falls back to a date string, including the year only when it differs from now', () => {
        const sameYear = secondsAgo(2592000); // 2024-05-16
        const formatted = formatRelativeTime(sameYear);
        expect(formatted).toBe(
            sameYear.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        expect(formatted).not.toContain('2024');

        // Local noon, so the expected calendar day holds in every timezone.
        expect(formatRelativeTime(new Date(2023, 5, 1, 12))).toBe('Jun 1, 2023');
    });
});

describe('formatFileSize', () => {
    it('picks the unit at 1024 boundaries and trims to two decimals', () => {
        expect(formatFileSize(0)).toBe('0 Bytes');
        expect(formatFileSize(1023)).toBe('1023 Bytes');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(1.5 * 1024 ** 2)).toBe('1.5 MB');
        expect(formatFileSize(1.5 * 1024 ** 3)).toBe('1.5 GB');
    });
});

describe('retry', () => {
    it('stops at the first success and returns its value', async () => {
        let attempt = 0;
        const fn = vi.fn(async () => {
            attempt += 1;
            if (attempt < 3) throw new Error('boom');
            return 'ok';
        });

        await expect(retry(fn, { maxRetries: 5, delay: 1 })).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('makes exactly maxRetries attempts and rethrows the last error', async () => {
        const lastErr = new Error('always fails');
        const fn = vi.fn(async () => {
            throw lastErr;
        });

        await expect(retry(fn, { maxRetries: 2, delay: 1 })).rejects.toBe(lastErr);
        expect(fn).toHaveBeenCalledTimes(2);
    });
});

describe('storage', () => {
    it('round-trips JSON and falls back to the default for missing or corrupt entries', () => {
        expect(storage.set('k', { a: 1 })).toBe(true);
        expect(storage.get('k')).toEqual({ a: 1 });

        localStorage.setItem('corrupt', '{not json');
        expect(storage.get('corrupt', 'fallback')).toBe('fallback');
        expect(storage.get('missing', 'fallback')).toBe('fallback');

        expect(storage.remove('k')).toBe(true);
        expect(storage.get('k', 'gone')).toBe('gone');
    });
});
