# ⚡ Quick Test Reference

## 🎯 Your App is Running!

**Frontend**: http://localhost:8080  
**Backend**: http://localhost:8001  
**API Docs**: http://localhost:8001/docs

---

## 🧪 Quick 5-Minute Test

### 1️⃣ **Text Chat** (30 seconds)
```
✓ Select "Google Gemini 2.0 Flash" model
✓ Type: "Hello, write a haiku about AI"
✓ Press Enter
✓ Watch response stream in real-time
```

### 2️⃣ **Mic Button** (30 seconds)
```
✓ Click microphone icon (bottom right)
✓ Allow mic access
✓ Say: "This is a test"
✓ See text appear in input box
✓ Click Send
```

### 3️⃣ **Voice Mode** (1 minute)
```
✓ Click "Voice mode" button (top right, blue)
✓ Allow mic access
✓ Say: "What's the weather?"
✓ Wait for AI response
✓ Click button again to stop
```

### 4️⃣ **Model Switching** (30 seconds)
```
✓ Click model dropdown
✓ Select "Meta Llama 3.3 70B"
✓ Ask same question
✓ Compare responses
```

### 5️⃣ **Theme Toggle** (15 seconds)
```
✓ Click theme icon in sidebar (bottom)
✓ Watch dark mode activate
✓ Toggle back to light
```

### 6️⃣ **Mobile View** (30 seconds)
```
✓ Resize browser to < 768px
✓ Click hamburger menu
✓ Test sidebar drawer
✓ Try voice mode on mobile
```

### 7️⃣ **Benchmark Modal** (30 seconds)
```
✓ Click "Benchmark" button
✓ Switch between tabs
✓ Copy command
✓ Close modal
```

### 8️⃣ **Conversations** (30 seconds)
```
✓ Create new chat
✓ Send message
✓ Click previous chat in sidebar
✓ Verify it loads
```

---

## 🎨 Visual Checks

✅ **Animations smooth?**  
✅ **No console errors?**  
✅ **Buttons respond to clicks?**  
✅ **Text readable in both themes?**  
✅ **Mobile layout looks good?**  
✅ **Icons display correctly?**

---

## 🐛 Common Issues & Fixes

### ❌ "Backend offline"
```bash
# Restart backend
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### ❌ Voice mode not working
- Check browser console for errors
- Verify mic permissions granted
- Try refreshing page
- Check WebSocket connection in DevTools

### ❌ Models not responding
- Verify API key in secrets.env
- Check internet connection
- Try different model
- Check OpenRouter status

### ❌ Page not loading
```bash
# Restart frontend
cd frontend
python3 -m http.server 8080
```

---

## 🎯 Success Indicators

Your app is working if you see:

✅ Green "Connected to backend" message  
✅ Models load in dropdown  
✅ Messages stream smoothly  
✅ Voice mode button pulses when active  
✅ Theme switches instantly  
✅ No red errors in console  
✅ Conversations save automatically  
✅ Mobile view is responsive  

---

## 📱 Device Testing Matrix

| Device | Browser | Text | Mic | Voice | Theme |
|--------|---------|------|-----|-------|-------|
| Desktop | Chrome | ✅ | ✅ | ✅ | ✅ |
| Desktop | Safari | ✅ | ✅ | ⚠️ | ✅ |
| Desktop | Firefox | ✅ | ⚠️ | ⚠️ | ✅ |
| Desktop | Edge | ✅ | ✅ | ✅ | ✅ |
| iPhone | Safari | ✅ | ✅ | ✅ | ✅ |
| Android | Chrome | ✅ | ✅ | ✅ | ✅ |
| iPad | Safari | ✅ | ✅ | ✅ | ✅ |

Legend: ✅ Full support | ⚠️ Limited support | ❌ Not supported

---

## 🚀 Advanced Features to Test

### Code Generation
```
Prompt: "Write a Python function to reverse a string"
Expected: Syntax-highlighted code block
```

### Markdown Rendering
```
Prompt: "Show me markdown examples"
Expected: Headers, lists, bold, italic render correctly
```

### Long Conversations
```
Test: Send 10+ messages
Expected: Smooth scrolling, no lag
```

### Rapid Model Switching
```
Test: Switch models 5 times quickly
Expected: No errors, smooth transitions
```

---

## 📊 Performance Benchmarks

**Good Performance:**
- Page load: < 2s
- Message send: < 500ms
- Streaming start: < 1s
- Model switch: Instant
- Theme toggle: < 200ms

**Check DevTools:**
- Console: No errors
- Network: API calls succeed
- Performance: No memory leaks

---

## 🎉 You're All Set!

If all tests pass, your AssistMe app is **production-ready**! 🚀

**Need help?** Check TESTING_GUIDE.md for detailed instructions.
