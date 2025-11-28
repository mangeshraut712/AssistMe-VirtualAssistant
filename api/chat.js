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
                stream: true, // Enable streaming
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenRouter API error: ${response.status} ${errorText}`);
            return res.status(response.status).json({ error: `OpenRouter API error: ${errorText}` });
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Pipe the response stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                // Transform OpenRouter stream format to our frontend format if needed
                // OpenRouter returns standard OpenAI format: data: {"choices":[{"delta":{"content":"..."}}]}
                // Our frontend expects: data: {"content":"..."}

                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                const content = data.choices[0].delta.content;
                                res.write(`data: ${JSON.stringify({ content })}\n\n`);
                            }
                        } catch (e) {
                            console.warn('Error parsing chunk:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream error:', error);
            res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
        } finally {
            res.end();
        }
    } catch (error) {
        console.error('Internal server error:', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: `Internal server error: ${error.message}` });
        }
    }
}
