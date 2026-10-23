/**
 * Allow only http(s) URLs before they are used as link targets.
 * javascript:, data:, and other schemes are rejected.
 */
export function isSafeHttpUrl(value) {
    if (typeof value !== 'string') return false;
    const candidate = value.trim();
    if (!candidate) return false;
    try {
        const url = new URL(candidate);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function joinApiUrl(baseUrl, path) {
    const base = String(baseUrl || '').replace(/\/+$/, '');
    const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${path || ''}`;
    return `${base}${suffix}`;
}
