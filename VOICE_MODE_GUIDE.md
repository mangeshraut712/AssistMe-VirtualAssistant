# 🎙️ Voice Mode Guide - ChatGPT/Gemini Live Style

## 📍 Location & Layout

The voice mode button is now positioned **between the mic button and send button** in the composer area (bottom of screen).

```
[Mic Button] [Voice Mode Button] [Send Button]
     🎤            ⭕                  ↑
```

---

## 🎯 Three Different Buttons Explained

### 1️⃣ **Mic Button** (Left) 🎤
- **Icon**: Microphone
- **Function**: Audio transcription (speech-to-text)
- **How it works**:
  - Click → Speak → Text appears in input box
  - You can edit the text before sending
  - One-time transcription
- **Use case**: When you want to dictate text instead of typing

### 2️⃣ **Voice Mode Button** (Middle) ⭕
- **Icon**: Circle-dot (inactive) / Stop-circle (active)
- **Function**: Continuous AI conversation (like ChatGPT/Gemini Live)
- **How it works**:
  - Click → Starts listening continuously
  - Speak naturally → AI responds with voice + text
  - Conversation flows like talking to a person
  - Click again to stop
- **Use case**: When you want a hands-free conversation with AI

### 3️⃣ **Send Button** (Right) ↑
- **Icon**: Arrow up
- **Function**: Send typed message
- **How it works**:
  - Type message → Click to send
  - Or press Enter to send
- **Use case**: Standard text chat

---

## 🎨 Voice Mode Visual States

### **Inactive State** (Default)
```
Icon: ⭕ (circle-dot)
Color: Gray
Tooltip: "Voice conversation mode (like ChatGPT/Gemini Live)"
```

### **Active State** (Listening)
```
Icon: ⏹️ (stop-circle)
Color: Blue with pulsing animation
Tooltip: "Stop voice conversation"
Effect: Glowing pulse effect
```

### **Hover State**
```
Background: Light gray
Color: Blue
Effect: Smooth transition
```

---

## 🚀 How to Use Voice Mode

### **Step-by-Step:**

1. **Activate Voice Mode**
   - Click the middle button (circle-dot icon)
   - Grant microphone permission if prompted
   - Button turns blue and starts pulsing
   - Toast message: "🎙️ Voice mode active - Speak naturally"

2. **Start Conversation**
   - Speak naturally (no need to hold button)
   - You'll see "Listening..." at the bottom
   - Interim transcript shows what you're saying
   - AI processes and responds

3. **Continuous Conversation**
   - Keep talking - it's continuous
   - AI will respond after you finish speaking
   - No need to click button again
   - Like talking to ChatGPT Voice or Gemini Live

4. **Stop Voice Mode**
   - Click the button again (now showing stop icon)
   - Recording stops
   - Button returns to circle-dot icon
   - Toast message: "Voice mode stopped"

---

## 🎯 Voice Mode vs Mic Button

| Feature | Mic Button 🎤 | Voice Mode ⭕ |
|---------|--------------|--------------|
| **Type** | One-time transcription | Continuous conversation |
| **Interaction** | Click → Speak → Edit → Send | Click → Speak → AI responds |
| **Duration** | Single utterance | Until you stop it |
| **Output** | Text in input box | AI response (voice + text) |
| **Use Case** | Dictation | Conversation |
| **Like** | Google Voice Typing | ChatGPT Voice Mode |

---

## 🎨 Visual Feedback

### **When Voice Mode is Active:**
- ✅ Button glows blue
- ✅ Pulsing animation (2s cycle)
- ✅ Icon changes to stop-circle
- ✅ "Listening..." appears at bottom center
- ✅ Interim transcript shows your speech
- ✅ Rich content may appear (weather, maps)

### **When Recording:**
- ✅ Icon pulses and scales
- ✅ Smooth opacity animation
- ✅ Box shadow expands and fades

---

## 🔧 Technical Details

### **Backend Connection:**
- Uses WebSocket for real-time audio streaming
- Endpoint: `ws://localhost:8001/voice/stream/{client_id}`
- Sends audio chunks every 100ms
- Receives transcriptions and AI responses

### **Audio Format:**
- Codec: Opus (WebM container)
- Sample rate: Browser default (usually 48kHz)
- Channels: Mono
- Chunk size: 100ms intervals

### **Browser Support:**
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Best experience |
| Edge | ✅ Full | Chromium-based |
| Safari | ✅ Full | iOS & macOS |
| Firefox | ⚠️ Limited | May need permissions |

---

## 🐛 Troubleshooting

### **Voice Mode Button Not Visible?**
- Check if you're in the composer area (bottom of screen)
- Look between mic button and send button
- Refresh the page

### **Button Doesn't Respond?**
- Check browser console for errors
- Verify microphone permissions
- Ensure backend is running (localhost:8001)
- Check WebSocket connection in DevTools

### **No Audio Recording?**
- Grant microphone permission
- Check if another app is using mic
- Try different browser
- Restart browser

### **Backend Connection Failed?**
```
Error: "Voice system not connected"
Solution:
1. Check backend is running: curl http://localhost:8001/health
2. Verify CORS settings include localhost:8080
3. Check WebSocket endpoint: ws://localhost:8001/voice/stream/...
4. Restart backend server
```

### **Interim Transcript Not Showing?**
- Check if "Listening..." appears
- Speak clearly and loudly
- Check browser console for WebSocket messages
- Verify audio is being captured (check DevTools)

---

## 🎯 Best Practices

### **For Best Results:**
1. **Speak Clearly** - Enunciate words
2. **Reduce Background Noise** - Quiet environment
3. **Use Good Mic** - Built-in or external
4. **Stable Connection** - Good internet speed
5. **Close Other Apps** - Free up resources

### **When to Use Voice Mode:**
- ✅ Long conversations
- ✅ Hands-free operation
- ✅ Brainstorming sessions
- ✅ Quick questions
- ✅ Accessibility needs

### **When to Use Mic Button:**
- ✅ Quick dictation
- ✅ Want to edit before sending
- ✅ Precise text input
- ✅ One-time transcription

---

## 🎨 Keyboard Shortcuts

- **Alt + V** - Toggle voice mode on/off
- **Enter** - Send message (text mode)
- **Shift + Enter** - New line (text mode)

---

## 📊 Performance Metrics

**Expected Latency:**
- Voice activation: < 500ms
- Audio streaming: Real-time
- Transcription: < 1s
- AI response: 1-3s
- Total round-trip: 2-4s

---

## 🎉 Success Indicators

Voice mode is working correctly if:
- ✅ Button turns blue when clicked
- ✅ Pulsing animation visible
- ✅ "Listening..." appears
- ✅ Interim transcript shows
- ✅ AI responds with text
- ✅ Can stop by clicking again
- ✅ No console errors

---

## 🚀 Advanced Features

### **Rich Content Responses:**
Voice mode can trigger rich content like:
- 🌤️ Weather cards (say "What's the weather?")
- 🗺️ Maps (say "Show me a map of...")
- 📊 Charts and graphs
- 🎵 Music controls
- 📷 Image displays

### **Context Awareness:**
- Remembers conversation history
- Understands follow-up questions
- Maintains context across turns
- Can reference previous messages

---

**Enjoy your ChatGPT/Gemini Live style voice conversations! 🎙️✨**
