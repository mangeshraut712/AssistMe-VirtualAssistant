const REFERER = process.env.APP_URL || 'https://assist-me-virtual-assistant.vercel.app';
const TITLE = 'AssistMe Virtual Assistant';

const parseJSONBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e6) {
            req.socket.destroy();
            reject(new Error('Payload too large'));
        }
    });
    req.on('end', () => {
        if (!body) {
            resolve({});
            return;
        }
        try {
            resolve(JSON.parse(body));
        } catch (error) {
            reject(new Error('Invalid JSON payload'));
        }
    });
    req.on('error', (error) => reject(error));
});

module.exports = async function handler(req, res) {
    const method = req.method || req.httpMethod || 'GET';

    if (method === 'OPTIONS') {
        res.statusCode = 200;
        res.setHeader('Allow', 'POST,OPTIONS');
        res.end();
        return;
    }

    if (method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Allow', 'POST');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    let body;
    try {
        body = await parseJSONBody(req);
    } catch (error) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error.message }));
        return;
    }

    const {
        model = 'meta-llama/llama-4-scout',
        messages,
        temperature = 0.7,
        maxTokens = 1024
    } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Request must include a non-empty messages array.' }));
        return;
    }

    // API CALL TO OPENROUTER - WORKING CONFIRMED FROM DASHBOARD ACTIVITY
    console.log('Chat API called with prompt:', messages[messages.length - 1]?.content);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': REFERER,
                'X-Title': TITLE
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens: maxTokens
            })
        });

        const data = await response.json();

        if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                error: data?.error || data,
                status: response.status
            }));
            return;
        }

        const text = data?.choices?.[0]?.message?.content ?? '';

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            text,
            usage: data?.usage,
            model: data?.model
        }));

    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error.message || 'Unknown error calling OpenRouter.' }));
    }

    // OLD MOCK CODE (commented out - real API working)
/+++++++ REPLACE
    /*
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': REFERER,
                'X-Title': TITLE
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens: maxTokens
            })
        });

        const data = await response.json();

        if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                error: data?.error || data,
                status: response.status
            }));
            return;
        }

        const text = data?.choices?.[0]?.message?.content ?? '';

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            text,
            usage: data?.usage,
            model: data?.model
        }));
    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error.message || 'Unknown error calling OpenRouter.' }));
    }
    */
};
