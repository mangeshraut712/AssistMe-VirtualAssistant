# 🛠️ AI Studio Module

**Model playground for prompt engineering and testing**

## Features

- ✅ Multi-model comparison
- ✅ Parameter tuning (temperature, top_p, max_tokens)
- ✅ Prompt templates
- ✅ Response history
- ✅ A/B testing
- ✅ Cost estimation
- ✅ Export results

## Integration

```javascript
import AIStudio from './modules/ai-studio/frontend/components/AIStudio';

<AIStudio 
  models={['gemini-2.5-flash', 'gpt-4', 'claude-3.5-sonnet']}
  enableComparison={true}
/>
```

## Parameters

- **Temperature**: 0.0 - 2.0 (creativity)
- **Top P**: 0.0 - 1.0 (nucleus sampling)
- **Max Tokens**: 1 - 8192
- **Frequency Penalty**: -2.0 - 2.0
- **Presence Penalty**: -2.0 - 2.0

## API

**POST** `/api/studio/complete` - Single model
**POST** `/api/studio/compare` - Multi-model comparison

[See full documentation](./docs/API.md)
