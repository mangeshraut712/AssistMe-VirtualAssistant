const fetch = global.fetch;

const models = [
    { id: 'meta-llama/llama-4-scout', name: 'Meta Llama 4 Scout (Free)' },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Meta Llama 3.1 8B (Free)' },
    { id: 'meta-llama/llama-3.1-70b-instruct:free', name: 'Meta Llama 3.1 70B (Free)' },
    { id: 'mistralai/mistral-7b-instruct-v0.1:free', name: 'Mistral 7B Instruct (Free)' },
    { id: 'huggingface/zephyr-7b-beta:free', name: 'HuggingFace Zephyr 7B (Free)' },
    { id: 'microsoft/wizardlm-2-8x22b:free', name: 'Microsoft WizardLM 2 8x22B (Free)' }
];

const questions = [
    'What is the capital of France?',
    'Solve: 15 * 12 - 8',
    'Write a short poem about artificial intelligence.',
    'Explain quantum computing in simple terms.',
    'Who won the Nobel Prize in Physics in 2023?'
];

async function testModel(modelId, question) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://assist-me-virtual-assistant.vercel.app',
                'X-Title': 'AssistMe Virtual Assistant'
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant. Provide concise and accurate answers.' },
                    { role: 'user', content: question }
                ],
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim() || 'No response';
        return content;
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

async function testAllModels() {
    const results = [];

    for (const model of models) {
        console.log(`Testing ${model.name} (${model.id})`);

        const modelResults = { model: model.name, id: model.id, responses: [], score: 0 };

        for (const question of questions) {
            const answer = await testModel(model.id, question);
            modelResults.responses.push({ question, answer });

            // Scoring
            let qScore = 0;
            if (question.includes('capital of France') && answer.toLowerCase().includes('paris')) qScore = 1;
            else if (question.includes('15 * 12 - 8') && answer.includes('172')) qScore = 1;
            else if (question.includes('poem') && answer.length > 20) qScore = 1;
            else if (question.includes('quantum computing') && answer.length > 50 && answer.toLowerCase().includes('quantum')) qScore = 1;
            else if (question.includes('Nobel') && (answer.toLowerCase().includes('hertzberg') || answer.toLowerCase().includes('teleportation'))) qScore = 1;

            modelResults.score += qScore;
        }

        results.push(modelResults);
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
}

module.exports = async function handler(req, res) {
    const method = req.method || req.httpMethod;

    if (method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    console.log('OPENROUTER_API_KEY present:', !!process.env.OPENROUTER_API_KEY, 'length:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.length : 0);
    if (!process.env.OPENROUTER_API_KEY) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'OpenRouter API key not configured' }));
        return;
    }

    try {
        const testResults = await testAllModels();

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ results: testResults, totalModels: models.length, questionsCount: questions.length }));
    } catch (error) {
        console.error('Testing error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: error.message || 'Unknown error during testing' }));
    }
};
