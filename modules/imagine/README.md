# 🎨 Imagine Module

**AI image generation with multiple providers and style presets**

## Features

- ✅ Multiple AI models (DALL-E 3, Flux, Stable Diffusion)
- ✅ Style presets (Photorealistic, Anime, Oil Painting, etc.)
- ✅ HD upscaling
- ✅ Aspect ratio control
- ✅ Negative prompts
- ✅ Batch generation
- ✅ Download & export

## Integration

```javascript
import Imagine from './modules/imagine/frontend/components/Imagine';

<Imagine 
  defaultModel="dall-e-3"
  enableStylePresets={true}
/>
```

## Models

| Model | Resolution | Speed | Quality |
|-------|------------|-------|---------|
| DALL-E 3 | 1024x1024 | ~5s | Excellent |
| Flux Pro | 1024x1024 | ~8s | Excellent |
| SD 3.5 | 1024x1024 | ~10s | Very Good |

## API

**POST** `/api/image/generate` - Generate image
**POST** `/api/image/upscale` - Upscale image

[See full documentation](./docs/API.md)
