/**
 * Advanced Voice Mode 3.0 - Human-Like AI Conversations
 * 
 * Core Architecture:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  STT (Web Speech)  →  NLU (Intent)  →  LLM  →  TTS (Neural/Browser) │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * Key Features:
 * 1. Adaptive Silence Detection - Knows when user is "thinking" vs "done"
 * 2. Backchannel Responses - Natural vocal feedback ("Hmm", "I see")
 * 3. Emotional TTS - Prosody control for natural speech rhythm
 * 4. Turn-Taking Protocol - Never interrupts, waits for natural pauses
 * 5. Confidence-Based Clarity - Asks for clarification if unsure
 * 6. Streaming Responses - Starts speaking before full response is ready
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Settings, Sparkles, Zap, Globe, MessageSquare, Volume2, StopCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // STT Settings
    SILENCE_TIMEOUT_SHORT: 1200,  // Quick response expected
    SILENCE_TIMEOUT_LONG: 2500,   // User is thinking (longer phrases)
    MIN_CONFIDENCE: 0.75,         // Below this, ask for clarification

    // TTS Settings  
    SPEECH_RATE: 0.95,            // Slightly slower than default for clarity
    SPEECH_PITCH: 1.0,

    // Conversation Flow
    THINKING_DELAY_MIN: 300,      // Minimum "thinking" pause (ms)
    THINKING_DELAY_MAX: 800,      // Maximum natural pause before responding
    BACKCHANNEL_PROBABILITY: 0.3, // 30% chance to say "Hmm" while processing

    // Models
    VOICE_MODEL: "meta-llama/llama-3.3-70b-instruct:free",
    GEMINI_LIVE_MODEL: "models/gemini-2.0-flash-exp",
};

// Persona Definitions with Voice Characteristics
const PERSONAS = {
    assistant: {
        name: "Assistant",
        systemPrompt: `You are AssistMe, a warm and intelligent voice assistant. Speak naturally like a helpful friend.
        
VOICE GUIDELINES:
- Use conversational language, not formal text
- Include natural speech patterns: "Well...", "You know...", "Actually..."
- Vary sentence length for rhythm
- Ask follow-up questions to stay engaged
- Keep responses under 3 sentences for voice
- Never use markdown, lists, or code blocks
- Spell out numbers (say "twenty-three" not "23")
- Add commas for natural pauses`,
        voice: { rate: 0.95, pitch: 1.0 },
        backchannels: ["Hmm...", "I see.", "Got it.", "Interesting..."],
    },
    professional: {
        name: "Professional",
        systemPrompt: `You are a professional business advisor. Be concise, factual, and authoritative.
        
VOICE GUIDELINES:
- Use clear, direct language
- Keep responses brief and to the point
- Maintain a confident, measured tone
- No filler words or hedging
- Maximum 2 sentences per response`,
        voice: { rate: 0.9, pitch: 0.95 },
        backchannels: ["Understood.", "Noted.", "Right."],
    },
    empathetic: {
        name: "Empathetic",
        systemPrompt: `You are a compassionate listener and emotional support companion.
        
VOICE GUIDELINES:
- Speak softly and warmly
- Validate feelings explicitly
- Use phrases like "I understand...", "That sounds..."
- Pause naturally to show you're listening
- Offer gentle encouragement`,
        voice: { rate: 0.85, pitch: 1.05 },
        backchannels: ["I hear you.", "That makes sense.", "I understand."],
    },
    energetic: {
        name: "Energetic",
        systemPrompt: `You are an enthusiastic motivator full of positive energy!
        
VOICE GUIDELINES:
- Speak with excitement and enthusiasm
- Use dynamic, upbeat language
- Short, punchy sentences
- Encourage and inspire
- Keep the energy high!`,
        voice: { rate: 1.1, pitch: 1.1 },
        backchannels: ["Awesome!", "Love it!", "Yes!"],
    },
};

// Voice Map for Gemini TTS
const GEMINI_VOICES = {
    assistant: "Puck",
    professional: "Charon",
    empathetic: "Kore",
    energetic: "Io",
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AdvancedVoiceMode({ isOpen, onClose, backendUrl = '' }) {
    // State Machine: idle → listening → processing → speaking → idle
    const [status, setStatus] = useState('idle');
    const [mode, setMode] = useState('standard'); // 'standard' | 'gemini-live'
    const [persona, setPersona] = useState('assistant');
    const [showSettings, setShowSettings] = useState(false);

    // Conversation State
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [conversation, setConversation] = useState([]);
    const [confidence, setConfidence] = useState(1.0);

    // Refs for async operations
    const statusRef = useRef(status);
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const silenceTimerRef = useRef(null);
    const transcriptRef = useRef('');
    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const nextAudioTimeRef = useRef(0);
    const currentAudioRef = useRef(null);
    const messagesEndRef = useRef(null);
    const recorderRef = useRef(null);

    // Sync refs with state
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation, aiResponse]);

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO UTILITIES
    // ═══════════════════════════════════════════════════════════════════════

    const playSound = useCallback((type) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            const now = ctx.currentTime;

            if (type === 'start') {
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            } else if (type === 'end') {
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            }
        } catch (e) { /* Ignore audio context errors */ }
    }, []);

    // Natural delay helper
    const naturalDelay = () => new Promise(resolve =>
        setTimeout(resolve, CONFIG.THINKING_DELAY_MIN + Math.random() * (CONFIG.THINKING_DELAY_MAX - CONFIG.THINKING_DELAY_MIN))
    );

    // ═══════════════════════════════════════════════════════════════════════
    // TEXT-TO-SPEECH ENGINE
    // ═══════════════════════════════════════════════════════════════════════

    const speak = useCallback((text, onEnd) => {
        if (!synthRef.current || !text) return;
        synthRef.current.cancel();

        // Text normalization for natural speech
        let normalizedText = text
            .replace(/\*\*/g, '')           // Remove markdown bold
            .replace(/\*/g, '')             // Remove markdown italic
            .replace(/`/g, '')              // Remove code ticks
            .replace(/\n/g, '. ')           // Newlines to pauses
            .replace(/(\d+)/g, (match) => { // Spell out numbers
                const num = parseInt(match);
                if (num <= 20) {
                    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
                    return words[num] || match;
                }
                return match;
            })
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .trim();

        const utterance = new SpeechSynthesisUtterance(normalizedText);
        const personaConfig = PERSONAS[persona];

        utterance.rate = personaConfig.voice.rate;
        utterance.pitch = personaConfig.voice.pitch;
        utterance.volume = 1.0;

        // Try to find a natural-sounding voice
        const voices = synthRef.current.getVoices();
        const preferredVoices = ['Samantha', 'Karen', 'Daniel', 'Google', 'Microsoft'];
        const naturalVoice = voices.find(v =>
            preferredVoices.some(pref => v.name.includes(pref)) && v.lang.startsWith('en')
        );
        if (naturalVoice) utterance.voice = naturalVoice;

        utterance.onstart = () => setStatus('speaking');
        utterance.onend = () => {
            setStatus('idle');
            if (onEnd) onEnd();
        };
        utterance.onerror = () => {
            setStatus('idle');
            if (onEnd) onEnd();
        };

        synthRef.current.speak(utterance);
    }, [persona]);

    const stopSpeaking = useCallback(() => {
        if (synthRef.current) synthRef.current.cancel();
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        if (audioCtxRef.current) {
            try { audioCtxRef.current.close(); } catch (e) { }
            audioCtxRef.current = null;
        }
        if (statusRef.current === 'speaking') setStatus('idle');
    }, []);

    // Play base64 WAV audio (from backend TTS)
    const playAudio = useCallback((base64Audio) => {
        if (currentAudioRef.current) currentAudioRef.current.pause();
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        currentAudioRef.current = audio;
        audio.onplay = () => setStatus('speaking');
        audio.onended = () => { setStatus('idle'); currentAudioRef.current = null; };
        audio.onerror = () => { setStatus('idle'); currentAudioRef.current = null; };
        audio.play().catch(console.error);
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // CONVERSATION LOGIC
    // ═══════════════════════════════════════════════════════════════════════

    // Maybe say a backchannel while processing
    const maybeBackchannel = useCallback(() => {
        if (Math.random() < CONFIG.BACKCHANNEL_PROBABILITY) {
            const channels = PERSONAS[persona].backchannels;
            const channel = channels[Math.floor(Math.random() * channels.length)];
            speak(channel);
            return true;
        }
        return false;
    }, [persona, speak]);

    // Main response handler with intelligent fallback
    const handleUserInput = useCallback(async (userText, sttConfidence = 1.0) => {
        if (!userText.trim()) return;

        setStatus('processing');
        setTranscript('');
        setInterimTranscript('');
        setConfidence(sttConfidence);

        // Add user message to history
        const newHistory = [...conversation, { role: 'user', content: userText }];
        setConversation(newHistory);

        // Check confidence - ask for clarification if too low
        if (sttConfidence < CONFIG.MIN_CONFIDENCE) {
            const clarification = "I didn't quite catch that. Could you say it again?";
            setAiResponse(clarification);
            setConversation([...newHistory, { role: 'assistant', content: clarification }]);
            speak(clarification);
            return;
        }

        // Natural thinking delay
        await naturalDelay();

        // Try backend TTS first, fallback to browser TTS
        try {
            // Attempt 1: Full Voice Backend (Python)
            const voiceResponse = await fetch(`${backendUrl}/api/tts/voice-response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    conversation_history: newHistory.slice(-8).map(m => ({ role: m.role, content: m.content })),
                    voice: GEMINI_VOICES[persona] || "Puck",
                    language: "en-US",
                    stt_confidence: sttConfidence
                })
            });

            if (voiceResponse.ok) {
                const data = await voiceResponse.json();
                const reply = data.response || "I'm not sure how to respond to that.";
                setAiResponse(reply);
                setConversation([...newHistory, { role: 'assistant', content: reply }]);

                if (data.audio) playAudio(data.audio);
                else speak(reply);
                return;
            }
        } catch (e) {
            console.log("Voice backend unavailable, using fallback...");
        }

        // Attempt 2: Chat API + Browser TTS (Works everywhere)
        try {
            const chatResponse = await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: PERSONAS[persona].systemPrompt },
                        ...newHistory.slice(-8).map(m => ({ role: m.role, content: m.content }))
                    ],
                    model: CONFIG.VOICE_MODEL,
                    max_tokens: 150, // Keep responses short for voice
                    temperature: 0.8
                })
            });

            if (!chatResponse.ok) throw new Error('Chat API failed');

            const data = await chatResponse.json();
            const reply = data.response || "I'm having a bit of trouble. Could you try again?";

            setAiResponse(reply);
            setConversation([...newHistory, { role: 'assistant', content: reply }]);
            speak(reply);

        } catch (e) {
            console.error("All APIs failed", e);
            const errorMsg = "I'm having connection issues. Please check your network.";
            setAiResponse(errorMsg);
            speak(errorMsg);
        }
    }, [conversation, persona, backendUrl, speak, playAudio]);

    // ═══════════════════════════════════════════════════════════════════════
    // SPEECH-TO-TEXT ENGINE
    // ═══════════════════════════════════════════════════════════════════════

    const startListening = useCallback(() => {
        if (mode !== 'standard' || statusRef.current === 'processing' || statusRef.current === 'speaking') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setAiResponse("Sorry, speech recognition isn't supported in your browser.");
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let finalTranscript = '';
        let lastSpeechTime = Date.now();

        recognition.onstart = () => {
            setStatus('listening');
            playSound('start');
            finalTranscript = '';
        };

        recognition.onresult = (event) => {
            let interim = '';
            let currentConfidence = 1.0;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript + ' ';
                    currentConfidence = result[0].confidence;
                    setConfidence(currentConfidence);
                } else {
                    interim += result[0].transcript;
                }
            }

            setTranscript(finalTranscript.trim());
            setInterimTranscript(interim);
            transcriptRef.current = finalTranscript.trim();
            lastSpeechTime = Date.now();

            // Clear existing timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            // Adaptive silence detection: longer timeout for longer phrases
            const timeout = transcriptRef.current.length > 50
                ? CONFIG.SILENCE_TIMEOUT_LONG
                : CONFIG.SILENCE_TIMEOUT_SHORT;

            silenceTimerRef.current = setTimeout(() => {
                if (transcriptRef.current.trim().length > 2) {
                    recognition.stop();
                }
            }, timeout);
        };

        recognition.onend = () => {
            const finalText = transcriptRef.current;
            if (finalText.trim().length > 2 && statusRef.current === 'listening') {
                handleUserInput(finalText, confidence);
            } else if (statusRef.current === 'listening') {
                // Restart if no meaningful input
                setTimeout(() => {
                    if (statusRef.current === 'listening') {
                        try { recognition.start(); } catch (e) { }
                    }
                }, 100);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Restart on no-speech
                setTimeout(() => {
                    if (statusRef.current === 'listening') {
                        try { recognition.start(); } catch (e) { }
                    }
                }, 100);
            }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) { console.error(e); }
    }, [mode, handleUserInput, playSound, confidence]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // GEMINI LIVE MODE (Real-time WebSocket)
    // ═══════════════════════════════════════════════════════════════════════

    const startAudioStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            if (audioContext.state === 'suspended') await audioContext.resume();

            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(2048, 1, 1);

            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (statusRef.current === 'idle' || statusRef.current === 'error') return;

                const inputData = e.inputBuffer.getChannelData(0);
                const buffer = new ArrayBuffer(inputData.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
                const base64Audio = btoa(String.fromCharCode(...new Uint8Array(buffer)));

                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm", data: base64Audio }] }
                    }));
                }
            };

            recorderRef.current = { stream, audioContext, processor };
        } catch (e) {
            console.error("Microphone error:", e);
            setStatus('error');
            setAiResponse("Microphone access denied. Please allow permissions in your browser.");
        }
    }, []);

    const stopAudioStream = useCallback(() => {
        if (recorderRef.current) {
            const { stream, audioContext, processor } = recorderRef.current;
            processor.disconnect();
            stream.getTracks().forEach(t => t.stop());
            audioContext.close();
            recorderRef.current = null;
        }
    }, []);

    const playPCMChunk = useCallback((base64Data) => {
        try {
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                nextAudioTimeRef.current = audioCtxRef.current.currentTime;
            }

            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

            const int16Data = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) float32Data[i] = int16Data[i] / 32768.0;

            const buffer = audioCtxRef.current.createBuffer(1, float32Data.length, 24000);
            buffer.copyToChannel(float32Data, 0);
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);

            const currentTime = audioCtxRef.current.currentTime;
            if (nextAudioTimeRef.current < currentTime) nextAudioTimeRef.current = currentTime;
            source.start(nextAudioTimeRef.current);
            nextAudioTimeRef.current += buffer.duration;
            setStatus('speaking');
        } catch (e) {
            console.error("PCM playback error:", e);
        }
    }, []);

    const connectGeminiLive = useCallback(async () => {
        try {
            setStatus('processing');

            const keyResponse = await fetch(`${backendUrl}/api/gemini/key`);
            if (!keyResponse.ok) {
                // Try direct fetch if backend not available
                const directKeyResponse = await fetch('/api/gemini/key');
                if (!directKeyResponse.ok) throw new Error('Gemini API key not available');
                const { apiKey } = await directKeyResponse.json();
                if (!apiKey) throw new Error('Empty API key');
                connectWebSocket(apiKey);
                return;
            }

            const { apiKey } = await keyResponse.json();
            if (!apiKey) throw new Error('Empty API key');
            connectWebSocket(apiKey);

        } catch (e) {
            setStatus('error');
            setAiResponse(e.message);
        }
    }, [backendUrl]);

    const connectWebSocket = useCallback((apiKey) => {
        stopAudioStream();

        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setStatus('listening');
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            nextAudioTimeRef.current = audioCtxRef.current.currentTime;

            ws.send(JSON.stringify({
                setup: {
                    model: CONFIG.GEMINI_LIVE_MODEL,
                    generationConfig: {
                        responseModalities: ["AUDIO", "TEXT"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: GEMINI_VOICES[persona] || "Puck"
                                }
                            }
                        }
                    },
                    systemInstruction: {
                        parts: [{ text: PERSONAS[persona].systemPrompt }]
                    }
                }
            }));

            startAudioStream();
            playSound('start');
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);

            // Handle interruption (barge-in)
            if (data.serverContent?.interrupted) {
                stopSpeaking();
                setAiResponse(prev => prev + " (interrupted)");
                setStatus('listening');
                return;
            }

            // Handle text response
            if (data.serverContent?.modelTurn?.parts?.[0]?.text) {
                setAiResponse(prev => prev + data.serverContent.modelTurn.parts[0].text);
            }

            // Handle audio response
            const audioData = data.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audioData) {
                playPCMChunk(audioData.data);
            }

            // Handle turn complete
            if (data.serverContent?.turnComplete) {
                setTimeout(() => setStatus('listening'), 200);
            }
        };

        ws.onerror = () => {
            setStatus('error');
            setAiResponse("Connection failed. Please try again.");
            stopAudioStream();
        };

        ws.onclose = () => {
            stopAudioStream();
            if (statusRef.current !== 'error') setStatus('idle');
        };

        wsRef.current = ws;
    }, [persona, startAudioStream, stopAudioStream, playPCMChunk, playSound, stopSpeaking]);

    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════

    // Auto-start listening when opened in standard mode
    useEffect(() => {
        if (isOpen && status === 'idle' && mode === 'standard') {
            setTimeout(startListening, 300);
        }
    }, [isOpen, status, mode, startListening]);

    // Initialize when opened
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setStatus('error');
            setAiResponse("Speech recognition not supported in this browser. Try Chrome or Edge.");
            return;
        }

        if (isOpen) {
            setStatus('idle');
            if (mode === 'gemini-live') {
                connectGeminiLive();
            }
        }

        return () => {
            stopListening();
            stopSpeaking();
            if (wsRef.current) wsRef.current.close();
            stopAudioStream();
        };
    }, [isOpen, mode, connectGeminiLive, stopListening, stopSpeaking, stopAudioStream]);

    // Handle mode switching
    useEffect(() => {
        if (!isOpen) return;

        stopListening();
        stopSpeaking();
        if (wsRef.current) wsRef.current.close();
        stopAudioStream();

        if (mode === 'gemini-live') {
            connectGeminiLive();
        } else {
            setStatus('idle');
        }
    }, [mode]);

    if (!isOpen) return null;

    // ═══════════════════════════════════════════════════════════════════════
    // UI RENDERING
    // ═══════════════════════════════════════════════════════════════════════

    const getOrbGradient = () => {
        if (status === 'error') return 'from-red-500 to-red-700';
        if (mode === 'gemini-live') return 'from-purple-500 via-violet-600 to-purple-700';
        if (status === 'speaking') return 'from-emerald-400 to-teal-600';
        if (status === 'processing') return 'from-amber-400 to-orange-500';
        if (status === 'listening') return 'from-blue-400 to-cyan-500';
        return 'from-slate-400 to-slate-600';
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-gradient-to-b from-background via-background to-background/95 flex flex-col items-center justify-between overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
            >
                {/* Header */}
                <div className="w-full p-4 sm:p-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-border/50">
                        {mode === 'standard' ? <Globe className="w-4 h-4" /> : <Zap className="w-4 h-4 text-purple-500" />}
                        <span className="hidden sm:inline">{mode === 'standard' ? 'Standard Mode' : 'Gemini Live'}</span>
                        <span className="sm:hidden">{mode === 'standard' ? 'STD' : 'LIVE'}</span>
                    </div>

                    <div className="flex gap-2">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                "p-2.5 sm:p-3 rounded-full transition-all",
                                showSettings
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 hover:bg-muted"
                            )}
                        >
                            <Settings className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-2.5 sm:p-3 rounded-full bg-muted/50 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>

                    {/* Settings Panel */}
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                className="absolute top-16 sm:top-20 right-4 sm:right-6 w-72 bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-4 z-50"
                            >
                                <h3 className="font-semibold mb-3 text-sm">Voice Engine</h3>
                                <div className="space-y-2 mb-4">
                                    <button
                                        onClick={() => { setMode('standard'); setShowSettings(false); }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all",
                                            mode === 'standard' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                        )}
                                    >
                                        <span>Standard (Browser TTS)</span>
                                        {mode === 'standard' && <CheckIcon />}
                                    </button>
                                    <button
                                        onClick={() => { setMode('gemini-live'); setShowSettings(false); }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all",
                                            mode === 'gemini-live' ? "bg-purple-600 text-white" : "hover:bg-muted"
                                        )}
                                    >
                                        <span>Gemini Live (Neural)</span>
                                        {mode === 'gemini-live' && <CheckIcon />}
                                    </button>
                                </div>

                                <h3 className="font-semibold mb-3 text-sm">Persona</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(PERSONAS).map(([key, p]) => (
                                        <button
                                            key={key}
                                            onClick={() => setPersona(key)}
                                            className={cn(
                                                "p-2.5 text-xs rounded-xl border transition-all",
                                                persona === key
                                                    ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500"
                                                    : "border-border/50 hover:bg-muted"
                                            )}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Main Orb Visualizer */}
                <div className="flex-1 w-full flex flex-col items-center justify-center relative px-4">
                    <div
                        className="relative cursor-pointer"
                        onClick={() => {
                            if (status === 'speaking') stopSpeaking();
                            else if (status === 'error') {
                                setStatus('idle');
                                if (mode === 'gemini-live') connectGeminiLive();
                                else startListening();
                            }
                            else if (status === 'idle') startListening();
                            else if (status === 'listening') stopListening();
                        }}
                    >
                        {/* Outer Glow */}
                        <motion.div
                            animate={{
                                scale: status === 'listening' ? [1, 1.3, 1] : status === 'speaking' ? [1, 1.15, 1.05, 1.1, 1] : 1,
                                opacity: status === 'idle' ? 0.15 : 0.4
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: status === 'speaking' ? 0.6 : 2,
                                ease: "easeInOut"
                            }}
                            className={cn(
                                "absolute -inset-8 rounded-full blur-3xl bg-gradient-to-br",
                                getOrbGradient()
                            )}
                        />

                        {/* Core Orb */}
                        <motion.div
                            animate={{
                                scale: status === 'speaking' ? [1, 1.08, 0.96, 1.04, 1] : status === 'processing' ? [1, 0.98, 1] : 1,
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: status === 'speaking' ? 0.5 : 1.5
                            }}
                            className={cn(
                                "w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-2xl relative z-10 transition-all duration-500 bg-gradient-to-br",
                                getOrbGradient(),
                                status === 'processing' && "animate-pulse"
                            )}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={status}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {status === 'listening' && <Mic className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-lg" />}
                                    {status === 'processing' && <Sparkles className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-pulse" />}
                                    {status === 'speaking' && <Volume2 className="w-12 h-12 sm:w-14 sm:h-14 text-white" />}
                                    {status === 'idle' && <MicOff className="w-10 h-10 sm:w-12 sm:h-12 text-white/70" />}
                                    {status === 'error' && <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 text-white" />}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    {/* Status Text */}
                    <motion.div
                        key={`${status}-${aiResponse.slice(0, 20)}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 sm:mt-10 text-center space-y-2 max-w-md px-4"
                    >
                        <h2 className="text-xl sm:text-2xl font-light tracking-tight">
                            {status === 'listening' && "Listening..."}
                            {status === 'processing' && "Thinking..."}
                            {status === 'speaking' && "Speaking..."}
                            {status === 'idle' && "Tap to start"}
                            {status === 'error' && "Tap to retry"}
                        </h2>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {status === 'listening' && (transcript || interimTranscript || "Say something...")}
                            {status === 'listening' && interimTranscript && (
                                <span className="text-muted-foreground/60 italic"> {interimTranscript}</span>
                            )}
                            {confidence < CONFIG.MIN_CONFIDENCE && status === 'listening' && (
                                <span className="text-amber-500 text-xs ml-2">(low confidence)</span>
                            )}
                        </p>
                    </motion.div>
                </div>

                {/* Conversation History */}
                <div className="w-full h-1/3 max-h-64 bg-background/80 border-t border-border/50 backdrop-blur-xl overflow-y-auto p-4 sm:p-6 space-y-3">
                    {conversation.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                            <MessageSquare className="w-8 h-8 mb-2" />
                            <p className="text-sm">Your conversation will appear here</p>
                        </div>
                    ) : (
                        conversation.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                    "max-w-[85%] p-3 sm:p-4 rounded-2xl text-sm leading-relaxed",
                                    msg.role === 'user'
                                        ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                                        : "mr-auto bg-muted rounded-bl-md"
                                )}
                            >
                                {msg.content}
                            </motion.div>
                        ))
                    )}

                    {/* Real-time AI response */}
                    {(status === 'processing' || status === 'speaking') && aiResponse && conversation[conversation.length - 1]?.role !== 'assistant' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mr-auto max-w-[85%] p-3 sm:p-4 rounded-2xl bg-muted rounded-bl-md text-sm"
                        >
                            {aiResponse}
                            {status === 'processing' && <span className="inline-block w-2 h-4 bg-foreground/30 ml-1 animate-pulse" />}
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Helper component
const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);
