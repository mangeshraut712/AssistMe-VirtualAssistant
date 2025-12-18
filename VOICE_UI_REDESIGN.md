/**
 * Voice Mode - Premium Conversation UI Redesign
 * Apple-style with Shadcn UI + Framer Motion
 */

## Current Issues (from screenshot):
1. ❌ AI responses not showing - only "Speaking with Gemini" indicator
2. ❌ No real-time transcript of AI speech
3. ❌ User messages only - conversation feels one-sided  
4. ❌ Basic bubble design
5. ❌ No visual hierarchy

## New Design - Apple Intelligence Style:

### Visual Hierarchy
```
┌─────────────────────────────────────┐
│  [AI Avatar] Gemini                 │
│  ┌────────────────────────────┐     │
│  │ AI Response with          │     │
│  │ real-time streaming...    │     │
│  │ ✨ Premium quality        │     │
│  └────────────────────────────┘     │
│  🔊 Audio waveform (live)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│                 You [User Avatar]   │
│     ┌────────────────────────────┐  │
│     │ Your spoken message       │  │
│     └────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Key Features:
- **Real-time AI transcript streaming** while speaking
- **Audio waveform visualization** for AI responses
- **Glassmorphism effects** on message bubbles
- **Smooth enter/exit animations**
- **Better avatars** (gradient orbs)
- **Typing indicators** with realistic dots
- **Rich metadata** (timestamp, confidence, voice name)

### Color Palette:
- AI: Purple-blue gradient (#8B5CF6 → #6366F1)
- User: Blue gradient (#3B82F6 → #06B6D4)
- Background: Subtle gradient with blur
- Text: High contrast (WCAG AAA)

### Animations:
- Slide up + fade in for new messages
- Scale pulse while AI speaking  
- Smooth waveform bars
- Bouncing dots for listening
- Shimmer effect for streaming text
