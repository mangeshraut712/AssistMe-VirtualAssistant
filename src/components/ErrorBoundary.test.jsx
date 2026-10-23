import { describe, expect, it } from 'vitest';
import { appHomeHref } from './ErrorBoundary';

describe('appHomeHref', () => {
    it('keeps the GitHub Pages base path when returning home', () => {
        expect(appHomeHref('/AssistMe-VirtualAssistant')).toBe('/AssistMe-VirtualAssistant/');
        expect(appHomeHref('/AssistMe-VirtualAssistant/')).toBe('/AssistMe-VirtualAssistant/');
        expect(appHomeHref('')).toBe('/');
    });
});
