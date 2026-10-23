import DOMPurify from 'dompurify';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function headingId(text) {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return id || 'section';
}

/**
 * Render encyclopedia markdown to HTML.
 * Model output is untrusted, so text is escaped before tags are added and
 * the result is passed through DOMPurify.
 */
export function renderGrokipediaMarkdown(content) {
    if (!content) return '';

    let html = escapeHtml(content);

    html = html.replace(/## References[\s\S]*?(?=## |$)/gi, '');
    html = html.replace(/## See Also[\s\S]*?(?=## |$)/gi, '');
    html = html.replace(/## Sources[\s\S]*?(?=## |$)/gi, '');
    html = html.replace(/## Citations[\s\S]*?(?=## |$)/gi, '');

    html = html.replace(/^## (.+)$/gm, (_match, title) => {
        const id = headingId(title);
        return `<h2 id="${id}" class="grok-h2">${title}</h2>`;
    });

    html = html.replace(/^### (.+)$/gm, (_match, title) => {
        const id = headingId(title);
        return `<h3 id="${id}" class="grok-h3">${title}</h3>`;
    });

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="grok-bold">$1</strong>');
    html = html.replace(/\*([^*]+?)\*/g, '<em class="grok-italic">$1</em>');
    html = html.replace(/\[(\d+)\]/g, '<sup class="grok-citation" title="Source $1">[$1]</sup>');
    html = html.replace(/^[•\-*]\s+(.+)$/gm, '<li class="grok-li">$1</li>');
    html = html.replace(/((?:<li class="grok-li">.*?<\/li>\s*)+)/g, '<ul class="grok-ul">$1</ul>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="grok-quote">$1</blockquote>');

    html = html.split('\n\n').map((para) => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<blockquote')) {
            return trimmed;
        }
        return `<p class="grok-p">${trimmed}</p>`;
    }).join('\n');

    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
