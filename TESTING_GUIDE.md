# 🧪 AssistMe Testing Guide

## 🚀 Application is Running!

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8001
- **API Health**: http://localhost:8001/health
- **API Docs**: http://localhost:8001/docs

---

## ✅ Testing Checklist

### 1. **Basic UI & Navigation**
- [ ] Page loads correctly
- [ ] Dark/Light theme toggle works
- [ ] Sidebar opens/closes on mobile
- [ ] Model selector dropdown works
- [ ] New chat button creates new conversation
- [ ] Conversation history displays

### 2. **Text Mode (Standard Chat)**
#### Test Steps:
1. Select a model from the dropdown (try "Google Gemini 2.0 Flash")
2. Type a message: "Hello, how are you?"
3. Press Enter or click Send button
4. Verify streaming response appears
5. Test markdown rendering: "Show me a code example in Python"
6. Test code highlighting works

**Expected Results:**
- ✅ Message appears in chat
- ✅ AI response streams in real-time
- ✅ Code blocks are syntax highlighted
- ✅ Markdown renders correctly
- ✅ Conversation saves to history

### 3. **Mic Button (Audio Transcription)**
#### Test Steps:
1. Click the microphone icon in the composer (bottom right)
2. Allow microphone access when prompted
3. Speak clearly: "This is a test message"
4. Wait for transcription to appear in input field
5. Click Send to submit

**Expected Results:**
- ✅ Mic button turns red when listening
- ✅ Speech converts to text in input field
- ✅ Can edit transcribed text before sending
- ✅ Works like speech-to-text input

**Browser Support:**
- Chrome/Edge: ✅ Full support
- Safari: ✅ Full support
- Firefox: ⚠️ May require permissions

### 4. **Voice Mode (AI Conversation)**
#### Test Steps:
1. Click "Voice mode" button in header (next to Benchmark)
2. Allow microphone access
3. Button should turn blue and show "Voice active"
4. Speak: "What's the weather like?"
5. Wait for AI to respond
6. Click again to stop voice mode

**Expected Results:**
- ✅ Button animates with pulse effect
- ✅ "Listening..." appears at bottom
- ✅ Interim transcript shows what you're saying
- ✅ AI responds with voice and text
- ✅ Continuous conversation mode
- ✅ Rich content (weather cards) may appear

**Note:** Voice mode uses WebSocket connection to backend

### 5. **Model Switching**
#### Test Steps:
1. Click model selector dropdown
2. Try different models:
   - Google Gemini 2.0 Flash (fast, multimodal)
   - Meta Llama 3.3 70B (high quality)
   - Qwen3 Coder (for coding questions)
3. Send same question to different models
4. Compare responses

**Expected Results:**
- ✅ Model switches immediately
- ✅ Different models give different responses
- ✅ Model name shows in dropdown
- ✅ Context window info displays

### 6. **Sidebar & Conversations**
#### Test Steps:
1. Create multiple conversations
2. Click on previous conversation in sidebar
3. Verify messages load correctly
4. Search conversations using search box
5. Clear history button works
6. Pin/unpin conversations (if available)

**Expected Results:**
- ✅ Conversations save automatically
- ✅ Can switch between conversations
- ✅ Search filters conversations
- ✅ Clear history removes all chats

### 7. **Mobile Responsiveness**
#### Test Steps:
1. Resize browser window to mobile size (< 768px)
2. Test hamburger menu
3. Test touch interactions
4. Test voice mode on mobile
5. Rotate device (landscape/portrait)

**Expected Results:**
- ✅ Sidebar becomes drawer
- ✅ Touch targets are large enough
- ✅ No horizontal scrolling
- ✅ Keyboard doesn't break layout
- ✅ All features work on mobile

### 8. **Benchmark Modal**
#### Test Steps:
1. Click "Benchmark" button in header
2. Modal opens with benchmark data
3. Switch between tabs (General Q&A, Coding, Creative)
4. Copy benchmark command
5. Close modal

**Expected Results:**
- ✅ Modal opens smoothly
- ✅ Tabs switch correctly
- ✅ Data displays properly
- ✅ Copy button works
- ✅ Close button/backdrop closes modal

### 9. **Theme Toggle**
#### Test Steps:
1. Click theme toggle in sidebar footer
2. Verify dark mode activates
3. Check all UI elements update
4. Reload page - theme persists
5. Toggle back to light mode

**Expected Results:**
- ✅ Smooth transition between themes
- ✅ All colors update correctly
- ✅ Theme preference saves
- ✅ Code blocks readable in both themes

### 10. **Error Handling**
#### Test Steps:
1. Disconnect internet
2. Try sending message
3. Reconnect internet
4. Try again
5. Test with invalid API key (if applicable)

**Expected Results:**
- ✅ Error messages display clearly
- ✅ App doesn't crash
- ✅ Graceful offline mode
- ✅ Retry mechanism works

---

## 🐛 Known Issues & Limitations

### Voice Mode
- **Redis Warning**: Voice sessions won't persist without Redis (not critical)
- **Browser Support**: Best in Chrome/Edge, limited in Firefox
- **Mock STT**: Currently using mock speech-to-text (not real API)

### API Limitations
- **Rate Limiting**: OpenRouter has rate limits
- **Model Availability**: Some models may be temporarily unavailable
- **Streaming**: Requires stable internet connection

### Mobile
- **iOS Safari**: May need 16px font to prevent zoom
- **Android Chrome**: Pull-to-refresh disabled for better UX
- **Keyboard**: Layout adjusts when keyboard appears

---

## 🔧 Troubleshooting

### Backend Not Starting
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Not Loading
```bash
cd frontend
python3 -m http.server 8080
```

### Voice Mode Not Working
1. Check microphone permissions in browser
2. Verify WebSocket connection in DevTools
3. Check backend logs for errors
4. Try refreshing the page

### Models Not Responding
1. Check API key in `secrets.env`
2. Verify internet connection
3. Check OpenRouter status
4. Try different model

### CORS Errors
1. Ensure backend is running on port 8001
2. Check `API_BASE` in frontend code
3. Verify CORS settings in backend

---

## 📊 Performance Metrics

### Expected Performance:
- **First Paint**: < 1s
- **Time to Interactive**: < 2s
- **Streaming Latency**: < 500ms
- **Voice Mode Latency**: < 1s
- **Model Switch**: Instant

### Monitoring:
- Check browser DevTools Console for errors
- Network tab for API calls
- Performance tab for bottlenecks

---

## 🎯 Advanced Testing

### 1. **Stress Testing**
- Send 10+ messages rapidly
- Switch models frequently
- Open multiple tabs
- Test with long conversations (50+ messages)

### 2. **Edge Cases**
- Very long messages (5000+ characters)
- Special characters and emojis
- Code blocks with syntax errors
- Multiple languages

### 3. **Accessibility**
- Keyboard navigation only
- Screen reader compatibility
- High contrast mode
- Reduced motion preference

---

## ✨ Feature Showcase

### Try These Prompts:

**For Text Mode:**
- "Write a Python function to calculate fibonacci numbers"
- "Explain quantum computing in simple terms"
- "Create a responsive navbar in React"

**For Voice Mode:**
- "What's the weather like in Pune?"
- "Show me a map of Pimpri Chinchwad"
- "Tell me about your capabilities"

**For Code Generation:**
- "Create a REST API with FastAPI"
- "Build a todo app in React"
- "Write unit tests for this function"

---

## 📝 Reporting Issues

If you find bugs:
1. Note the browser and OS
2. Describe steps to reproduce
3. Include console errors
4. Screenshot if visual issue
5. Check if it happens in incognito mode

---

## 🎉 Success Criteria

Your app is working correctly if:
- ✅ All 10 test categories pass
- ✅ No console errors on load
- ✅ Smooth animations and transitions
- ✅ Responsive on all screen sizes
- ✅ Voice mode connects successfully
- ✅ Models respond within 2 seconds
- ✅ Theme toggle works perfectly
- ✅ Conversations save and load

---

**Happy Testing! 🚀**
