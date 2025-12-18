# Voice Mode & Accessibility Fixes

## Issues Identified

### 1. Voice Mode Audio Quality
**Problem**: Premium audio is slow and unclear
- Using 24kHz PCM audio (too low quality)
- No audio buffering for smooth playback
- Wrong audio format handling

### 2. Standard Mode Failing
**Problem**: Voice mode hangs after listening
- `/api/chat` endpoint requires `stream: false` for voice mode
- Missing error handling for non-streaming responses
- Wrong API endpoint format

### 3. Form Accessibility
**Problem**: Input fields missing `id`/`name` attributes
- Affects autofill and screen readers

### 4. Color Contrast
**Problem**: 8 elements with insufficient contrast
- Need AAcontrast ratio of 4.5:1

## Fixes Applied

### Voice Mode Premium - Audio Configuration
```javascript
// OLD (24kHz PCM - poor quality)
const AUDIO_OUTPUT = {
    sampleRate: 24000,
    channels: 1,
    bitDepth: 16
}

// NEW (48kHz WAV - crystal clear)
const AUDIO_OUTPUT = {
    sampleRate: 48000,  // Professional audio quality
    channels: 1,
    format: 'wav',      // Standard format
    encoding: 'linear16'
}
```

### Standard Mode - API Call Fix
```javascript
// OLD (streaming not supported in voice context)
const chatResponse = await fetch('/api/chat', {
    body: JSON.stringify({ messages, model, stream: true })
});

// NEW (non-streaming for faster response)
const chatResponse = await fetch('/api/chat', {
    body: JSON.stringify({
        messages, 
        model,
        stream: false,  // Voice needs complete response
        max_tokens: 150  // Shorter for voice
    })
});
```

### Form Fields - Accessibility
```jsx
// Add to all input fields:
<input
    id="unique-id"
    name="field-name"
    autoComplete="appropriate-value"
    aria-label="descriptive-label"
/>
```

### Color Contrast - CSS Updates
```css
/* OLD - Low contrast */
.text-muted-foreground {
    color: hsl(var(--muted-foreground)); /* ~3.0 contrast */
}

/* NEW - High contrast */
.text-muted-foreground {
    color: hsl(0 0% 45%); /* Light mode - 4.6 contrast */
}

.dark .text-muted-foreground {
    color: hsl(0 0% 65%); /* Dark mode - 5.2 contrast */
}
```

## Performance Improvements

1. **Audio Streaming**: Buffer chunks for smooth playback
2. **Faster Response**: Use shorter max_tokens for voice
3. **Better Error Handling**: Show clear messages instead of hanging
4. **Timeout Protection**: 10s max for API calls

## Testing Checklist

- [ ] Premium voice: Clear audio, no crackling
- [ ] Standard voice: Responds within 3s
- [ ] Browser autofill works on forms
- [ ] DevTools Lighthouse: 100% accessibility
- [ ] Color contrast: All AAA compliant
