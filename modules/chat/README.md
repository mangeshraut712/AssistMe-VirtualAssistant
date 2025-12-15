# 💬 Chat Module

**Real-time AI chat with streaming, multi-model support, and conversation history**

## Features

- ✅ Real-time streaming responses
- ✅ Multi-model support (Gemini, Claude, GPT, Llama)
- ✅ Conversation history & persistence
- ✅ Multi-language support (24 languages)
- ✅ RAG integration for knowledge base
- ✅ Markdown rendering
- ✅ Code syntax highlighting
- ✅ Export conversations

## Integration

```javascript
import Chat from './modules/chat/frontend/components/Chat';

<Chat 
  apiEndpoint="/api/chat"
  enableStreaming={true}
  enableHistory={true}
/>
```

## API

**POST** `/api/chat/text` - Non-streaming chat
**POST** `/api/chat/stream` - Streaming chat

## Models

- Gemini 2.5 Flash (Primary)
- Claude 3.5 Sonnet
- GPT-4 Turbo
- Llama 3.3 70B

[See full documentation](./docs/API.md)
