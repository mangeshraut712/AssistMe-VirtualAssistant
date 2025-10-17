const { Buffer } = require('node:buffer');

const REFERER = process.env.APP_URL || 'https://assist-me-virtual-assistant.vercel.app';
const TITLE = 'AssistMe Virtual Assistant';

const parseJSONBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) {
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

    if (!process.env.OPENROUTER_API_KEY) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'OpenRouter API key is not configured.' }));
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

    const { audioBase64, mimeType = 'audio/webm', model = 'openai/whisper-large-v3' } = body || {};

    if (!audioBase64) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'audioBase64 is required.' }));
        return;
    }

    try {
        const buffer = Buffer.from(audioBase64, 'base64');
        const extension = mimeType.split('/')[1] || 'webm';
        const fileName = `recording-${Date.now()}.${extension}`;
        const formData = new FormData();

        formData.append('model', model);
        formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

        const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': REFERER,
                'X-Title': TITLE
            },
            body: formData
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

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            text: data?.text || data?.output_text || '',
            model: data?.model,
            raw: data
        }));
    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error.message || 'Unknown error calling OpenRouter transcription.' }));
    }
};
