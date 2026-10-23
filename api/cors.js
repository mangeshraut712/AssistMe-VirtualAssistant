const ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://assist-me-virtual-assistant.vercel.app',
    'https://mangeshraut712.github.io',
]);

const VERCEL_ORIGIN_REGEX =
    /^https:\/\/assist-me-virtual-assistant(-[a-z0-9]+)?\.vercel\.app$/;

export function normaliseOrigin(value) {
    if (!value) return null;
    const origin = String(value).trim().replace(/\/+$/, '');
    return origin || null;
}

export function resolveAllowedOrigin(origin) {
    const normalised = normaliseOrigin(origin);
    if (!normalised) return null;

    if (ALLOWED_ORIGINS.has(normalised)) return normalised;
    if (VERCEL_ORIGIN_REGEX.test(normalised)) return normalised;

    const envAppUrl = normaliseOrigin(process.env.APP_URL);
    if (envAppUrl && normalised === envAppUrl) return normalised;

    const envVercelUrl = normaliseOrigin(process.env.VERCEL_URL);
    if (envVercelUrl) {
        const candidate = envVercelUrl.startsWith('http')
            ? envVercelUrl
            : `https://${envVercelUrl}`;
        if (normalised === candidate) return normalised;
    }

    const envCustom = process.env.CORS_ALLOW_ORIGINS;
    if (envCustom) {
        for (const entry of envCustom.split(',')) {
            const configured = normaliseOrigin(entry);
            if (configured && normalised === configured) return normalised;
        }
    }

    return null;
}

export function corsHeaders(request, methods) {
    const allowedOrigin = resolveAllowedOrigin(request.headers.get('origin'));
    const headers = { Vary: 'Origin' };
    if (allowedOrigin) {
        headers['Access-Control-Allow-Origin'] = allowedOrigin;
        headers['Access-Control-Allow-Methods'] = methods;
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        headers['Access-Control-Max-Age'] = '86400';
    }
    return { allowedOrigin, headers };
}
