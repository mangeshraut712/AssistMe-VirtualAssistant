# 📚 Grokipedia Module

**Semantic search knowledge base with RAG (Retrieval-Augmented Generation)**

## Features

- ✅ Vector embeddings for semantic search
- ✅ Custom data ingestion (JSON, MD, TXT)
- ✅ Context injection into chat
- ✅ Relevance scoring
- ✅ Source attribution
- ✅ Real-time indexing

## Integration

```javascript
import Grokipedia from './modules/grokipedia/frontend/components/Grokipedia';

<Grokipedia 
  dataPath="/api/knowledge/grokipedia.json"
  topK={3}
/>
```

## Data Format

```json
{
  "articles": [
    {
      "title": "Example Article",
      "content": "Article content...",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

## API

**POST** `/api/knowledge/search` - Semantic search
**POST** `/api/knowledge/ingest` - Add documents
**GET** `/api/knowledge/status` - Index stats

[See full documentation](./docs/API.md)
