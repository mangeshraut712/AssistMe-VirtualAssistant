import { describe, expect, it } from 'vitest';
import { renderGrokipediaMarkdown } from './grokipediaMarkdown';
import { isSafeHttpUrl, joinApiUrl } from './urls';

function render(html) {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host;
}

describe('renderGrokipediaMarkdown', () => {
    it('keeps emphasis and does not execute markup from the article', () => {
        const html = renderGrokipediaMarkdown(
            '## Hello <img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n**bold** and *italic*'
        );
        const host = render(html);

        expect(host.querySelector('script')).toBeNull();
        expect(host.querySelector('img')).toBeNull();
        expect(host.querySelector('h2')?.textContent).toContain('Hello');
        expect(host.querySelector('h2')?.getAttribute('onerror')).toBeNull();
        expect(host.querySelector('strong')?.textContent).toBe('bold');
        expect(host.querySelector('em')?.textContent).toBe('italic');
        expect(host.textContent).toContain('alert(1)');
    });

    it('does not let a heading break out of its attribute', () => {
        const html = renderGrokipediaMarkdown('## Hello " onclick=alert(1)');
        const host = render(html);
        const heading = host.querySelector('h2');

        expect(heading).toBeTruthy();
        expect(heading.getAttribute('onclick')).toBeNull();
        expect(heading.textContent).toContain('Hello');
    });
});

describe('isSafeHttpUrl', () => {
    it('allows http(s) and rejects other schemes', () => {
        expect(isSafeHttpUrl('https://example.com/a')).toBe(true);
        expect(isSafeHttpUrl('http://example.com')).toBe(true);
        expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeHttpUrl('data:text/html,hi')).toBe(false);
        expect(isSafeHttpUrl('not a url')).toBe(false);
    });
});

describe('joinApiUrl', () => {
    it('joins a configured backend without a double slash', () => {
        expect(joinApiUrl('', '/api/gemini/key')).toBe('/api/gemini/key');
        expect(joinApiUrl('https://api.example.com/', '/api/chat')).toBe('https://api.example.com/api/chat');
        expect(joinApiUrl('https://api.example.com', 'api/chat')).toBe('https://api.example.com/api/chat');
    });
});
