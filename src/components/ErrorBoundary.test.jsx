import { describe, expect, it } from 'vitest';
import { appHomeHref } from './ErrorBoundary';

describe('appHomeHref', () => {
    it('keeps the GitHub Pages base path when returning home', () => {
        expect(appHomeHref('/AssistMe-VirtualAssistant')).toBe('/AssistMe-VirtualAssistant/');
        expect(appHomeHref('/AssistMe-VirtualAssistant/')).toBe('/AssistMe-VirtualAssistant/');
        expect(appHomeHref('')).toBe('/');
        expect(appHomeHref('https://evil.example')).toBe('/');
        expect(appHomeHref('//evil.example')).toBe('/');
        expect(appHomeHref('javascript:alert(1)')).toBe('/');
        expect(appHomeHref('/ok\n/next')).toBe('/');
    });
});
