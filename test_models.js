const { execSync } = require('child_process');

const models = [
    'meta-llama/llama-4-scout',
    'meta-llama/meta-llama-3.1-405b-instruct:free',
    'microsoft/wizardlm-2-8x22b:free',
    'huggingface/zephyr-7b-beta:free',
    'openai/gpt-3.5-turbo:free'
];

const questions = [
    'What is the capital of France?',
    'Solve: 15 * 12 - 8',
    'Write a short poem about artificial intelligence.',
    'Explain quantum computing in simple terms.',
    'Who won the Nobel Prize in Physics in 2023?'
];

async function testModel(model, question) {
    try {
        const data = JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You are a helpful assistant. Provide concise and accurate answers.' },
                { role: 'user', content: question }
            ],
            max_tokens: 200
        });

        const command = `curl -s -X POST "https://openrouter.ai/api/v1/chat/completions" -H "Content-Type: application/json" -H "Authorization: Bearer $OPENROUTER_API_KEY" -H "HTTP-Referer: https://assist-me-virtual-assistant.vercel.app" -H "X-Title: AssistMe Virtual Assistant" -d '${data}'`;

        const output = execSync(command, { encoding: 'utf-8' });
        const responseData = JSON.parse(output);

        const content = responseData?.choices?.[0]?.message?.content?.trim() || 'No response';
        return content;
    } catch (error) {
        const errorMessage = error.stderr || error.message;
        if (errorMessage.includes('401')) {
            return 'Error: HTTP 401 Unauthorized';
        }
        return `Error: ${errorMessage}`;
    }
}

async function testAll() {
    for (const model of models) {
        console.log(`\n=== Testing Model: ${model} ===\n`);

        const results = [];

        for (const question of questions) {
            console.log(`Question: ${question}`);
            const answer = await testModel(model, question);
            console.log(`Answer: ${answer}\n`);
            results.push({ question, answer });
        }

        // Simple scoring
        let score = 0;
        for (const { question, answer } of results) {
            let qScore = 0;

            // Question 1: Capital of France
            if (question.includes('capital of France')) {
                if (answer.toLowerCase().includes('paris')) qScore = 1;
            }

            // Question 2: Math
            if (question.includes('15 * 12 - 8')) {
                if (answer.includes('172')) qScore = 1;
            }

            // Question 3: Poem
            if (question.includes('poem about artificial intelligence')) {
                if (answer.length > 20 && (answer.includes('\n') || answer.split(' ').length > 10)) qScore = 1;
            }

            // Question 4: Quantum
            if (question.includes('quantum computing')) {
                if (answer.length > 50 && answer.toLowerCase().includes('quantum')) qScore = 1;
            }

            // Question 5: Nobel
            if (question.includes('Nobel Prize in Physics in 2023')) {
                if (answer.toLowerCase().includes('izaak walton hertzberg') || answer.toLowerCase().includes('hertzberg') || answer.toLowerCase().includes('2001') || answer.toLowerCase().includes('teleportation')) qScore = 1; // Approximate check
            }

            score += qScore;
        }

        console.log(`Model ${model} score: ${score}/${questions.length}`);
    }
}

testAll().catch(console.error);
