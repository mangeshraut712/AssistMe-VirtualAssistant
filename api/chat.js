export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, model } = req.body;
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error('OPENROUTER_API_KEY is missing');
            return res.status(500).json({ error: 'Server configuration error: API key missing' });
        }

        console.log(`Sending request to OpenRouter with model: ${model || 'google/gemini-2.0-flash-001:free'}`);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://assist-me-virtual-assistant.vercel.app',
                'X-Title': 'AssistMe Virtual Assistant',
            },
            body: JSON.stringify({
                model: model || 'google/gemini-2.0-flash-001:free',
                messages: messages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenRouter API error: ${response.status} ${errorText}`);
            return res.status(response.status).json({ error: `OpenRouter API error: ${errorText}` });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Internal server error:', error);
        return res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
}
