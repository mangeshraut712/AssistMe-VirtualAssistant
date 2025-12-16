/**
 * Advanced Voice Mode 2.0 (2025 Edition)
 * 
 * A completely reimagined voice experience focusing on:
 * 1. Continuous Conversation (Hands-free loop)
 * 2. Visual Intelligence (Dynamic Orb Animations)
 * 3. Real-time Responsiveness (Optimized TTS & State Management)
 * 4. Adaptive UI (Clean, overlay-based settings)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Settings, Sparkles, Zap, Globe, MessageSquare, Volume2, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configuration
const SILENCE_TIMEOUT = 1500; // ms to wait after speech before processing
const RECONNECT_DELAY = 1000;

// Director Prompts (Expressivity Control)
const DIRECTOR_PROMPTS = {
    friendly: "Act as a friendly, casual assistant. Speak naturally with a warm tone. Use common contractions.",
    professional: "Act as a concise, professional expert. Keep responses precise, factual, and to the point. Maintain a formal tone.",
    empathetic: "Act as a compassionate listener. Use warm, validating language. Speak softly and show emotional intelligence.",
    energetic: "Act as a high-energy, enthusiastic motivator! Speak excitedly and use dynamic phrasing to show passion."
};

export default function AdvancedVoiceMode({ isOpen, onClose, backendUrl = '' }) {
    // State Machine: 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
    const [status, setStatus] = useState('idle');
    const [mode, setMode] = useState('standard'); // 'standard' (OpenRouter) | 'gemini-live' (WebSocket)
    const [voiceStyle, setVoiceStyle] = useState('friendly'); // 'friendly' | 'professional' | 'empathetic' | 'energetic'
    const [transcript, setTranscript] = useState('');
    const [aiText, setAiText] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [conversation, setConversation] = useState([]); // [{role, content}]

    // Refs for extensive control
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);
    const statusRef = useRef(status); // Keep status in sync
    const recorderRef = useRef(null); // For Native Audio Input
    const transcriptRef = useRef(""); // Latest transcript for callbacks

    // Sync status & transcript
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

    // Audio Context for Native Streaming
    const audioCtxRef = useRef(null);
    const nextAudioTimeRef = useRef(0);
    const currentAudioRef = useRef(null); // For Standard Mode HTMLAudioElement

    // Audio Recorder (48kHz -> 16kHz PCM)
    const startAudioStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (statusRef.current !== 'listening' || mode !== 'gemini-live') return;

                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16
                const buffer = new ArrayBuffer(inputData.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // Little Endian
                }

                const base64Audio = btoa(String.fromCharCode(...new Uint8Array(buffer)));

                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        realtimeInput: {
                            mediaChunks: [{
                                mimeType: "audio/pcm",
                                data: base64Audio
                            }]
                        }
                    }));
                }
            };

            recorderRef.current = { stream, audioContext, processor };
        } catch (e) {
            console.error("Mic Error", e);
            setStatus('error');
            setAiText("Microphone access denied.");
        }
    }, [mode]);

    const stopAudioStream = useCallback(() => {
        if (recorderRef.current) {
            const { stream, audioContext, processor } = recorderRef.current;
            processor.disconnect();
            stream.getTracks().forEach(t => t.stop());
            audioContext.close();
            recorderRef.current = null;
        }
    }, []);

    // =========================================================================
    // 🔊 Audio Engine (TTS & STT)
    // =========================================================================

    // Clean text for better TTS
    const cleanTextForTTS = (text) => {
        return text.replace(/[*#`]/g, '') // Remove markdown
            .replace(/https?:\/\/\S+/g, 'a link'); // Remove URLs
    };



    // Synthesize simple UI sounds (Earcons)
    const playSound = useCallback((type) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'start') {
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'listening') {
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(500, now + 0.1);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (e) {
            // Ignore auto-play strictness errors
        }
    }, []);

    const speak = useCallback((text, onEnd) => {
        if (!synthRef.current) return;

        synthRef.current.cancel();

        // Split into sentences for better interruptibility
        const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

        let currentIndex = 0;

        const speakNext = () => {
            if (currentIndex >= sentences.length) {
                if (onEnd) onEnd();
                return;
            }

            const sentence = cleanTextForTTS(sentences[currentIndex]);
            if (!sentence.trim()) {
                currentIndex++;
                speakNext();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(sentence);
            const voices = synthRef.current.getVoices();
            const preferredVoice = voices.find(v => v.name.includes('Google US English')) ||
                voices.find(v => v.name.includes('Samantha')) ||
                voices[0];

            if (preferredVoice) utterance.voice = preferredVoice;
            utterance.rate = 1.1;
            utterance.pitch = 1.0;

            utterance.onstart = () => setStatus('speaking');
            utterance.onend = () => {
                currentIndex++;
                speakNext();
            };
            utterance.onerror = () => {
                currentIndex++;
                speakNext();
            };

            synthRef.current.speak(utterance);
        };

        speakNext();
    }, []);

    const stopSpeaking = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        if (status === 'speaking') {
            setStatus('idle');
        }
        // Stop Native Audio
        if (audioCtxRef.current) {
            audioCtxRef.current.close().then(() => {
                // Re-init on next connect
                audioCtxRef.current = null;
            });
        }
    }, [status]);

    // Play WAV/MP3 Base64 (Standard Mode)
    const playAudio = useCallback((base64Audio) => {
        if (currentAudioRef.current) currentAudioRef.current.pause();

        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        currentAudioRef.current = audio;

        audio.onplay = () => setStatus('speaking');
        audio.onended = () => {
            setStatus('idle');
            currentAudioRef.current = null;
        };
        audio.onerror = () => {
            setStatus('idle');
            currentAudioRef.current = null;
        };

        audio.play().catch(e => console.error("Audio Playback Error:", e));
    }, []);

    // Native PCM Player (16-bit, 24kHz usually)
    const playPCMChunk = useCallback((base64Data) => {
        try {
            if (!audioCtxRef.current) return;

            // 1. Decode Base64 to binary string
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // 2. Convert Int16 -> Float32
            const int16Data = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) {
                float32Data[i] = int16Data[i] / 32768.0; // Normalize to [-1, 1]
            }

            // 3. Create Audio Buffer
            const buffer = audioCtxRef.current.createBuffer(1, float32Data.length, 24000); // 24kHz is Gemini default
            buffer.copyToChannel(float32Data, 0);

            // 4. Schedule Playback
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);

            const currentTime = audioCtxRef.current.currentTime;
            // Ensure we schedule in future to prevent overlap/gaps
            if (nextAudioTimeRef.current < currentTime) {
                nextAudioTimeRef.current = currentTime;
            }

            source.start(nextAudioTimeRef.current);
            nextAudioTimeRef.current += buffer.duration;

            // UI Status
            setStatus('speaking');

            source.onended = () => {
                // If this was the last chunk... (hard to know in stream, but we can set idle if silence follows)
                // Simple logic: if queue empty, set idle? 
                // For now, rely on VAD or user interrupt. 
                // Or we can set a debounce to idle.
            };

        } catch (e) {
            console.error("Audio Decode Error", e);
        }
    }, []);

    // =========================================================================
    // 🧠 Standard Mode (OpenRouter REST)
    // =========================================================================

    const handleStandardResponse = async (userText) => {
        if (!userText.trim()) return;

        setStatus('processing');
        // Clear transcript for next turn
        setTranscript('');

        // Map visual style to Gemini Voice ID
        const VOICE_MAP = {
            friendly: "Kore",
            professional: "Charon",
            empathetic: "Erato",
            energetic: "Io"
        };

        // Optimistic update
        const newHistory = [...conversation, { role: 'user', content: userText }];
        setConversation(newHistory);

        try {
            // Updated Endpoint: Uses Backend Pipeline (LLM + Premium TTS)
            const response = await fetch(`${backendUrl}/api/tts/voice-response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    conversation_history: newHistory.slice(-6).map(m => ({
                        role: m.role || "user",
                        content: m.content || ""
                    })),
                    voice: VOICE_MAP[voiceStyle] || "Puck", // Dynamic Voice Selection
                    language: "en-US",
                    stt_confidence: 1.0
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const aiReply = data.response || "I didn't quite catch that.";
            const audioBase64 = data.audio;

            setAiText(aiReply);
            setConversation([...newHistory, { role: 'assistant', content: aiReply }]);

            if (audioBase64) {
                playAudio(audioBase64);
            } else {
                // Fallback if no audio returned
                speak(aiReply, () => setStatus('idle'));
            }

        } catch (err) {
            console.error(err);
            setAiText("Network error or quota exceeded.");
            setStatus('idle');
        }
    };

    // =========================================================================
    // ⚡ Gemini Live Mode (WebSocket)
    // =========================================================================

    const connectLive = useCallback(async () => {
        try {
            setStatus('processing');

            // 1. Fetch Key
            const res = await fetch(`${backendUrl}/api/gemini/key`);
            if (!res.ok) throw new Error('Failed to fetch Gemini API Key');
            const { apiKey } = await res.json();

            if (!apiKey) throw new Error('API Key is empty.');

            // 2. Connect WebSocket (v1alpha for Live API)
            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            stopAudioStream(); // Ensure clean slate

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setStatus('listening'); // Start "Listening" immediately for streaming

                // Initialize Audio Context for 24kHz PCM Output
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                nextAudioTimeRef.current = audioCtxRef.current.currentTime;

                // Send Setup Message
                ws.send(JSON.stringify({
                    setup: {
                        model: "models/gemini-2.0-flash-exp", // As of Dec 2025, this is the stable public endpoint for Live
                        generationConfig: {
                            responseModalities: ["AUDIO", "TEXT"],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
                        },
                        systemInstruction: {
                            parts: [{ text: `You are AssistMe. ${DIRECTOR_PROMPTS[voiceStyle]} Keep responses concise.` }]
                        }
                    }
                }));

                // Start capturing Microphone (Native Input)
                startAudioStream();
            };

            ws.onmessage = async (e) => {
                const data = JSON.parse(e.data);

                // 1. Handle Text (for UI)
                const text = data.serverContent?.modelTurn?.parts?.[0]?.text;
                if (text) {
                    setAiText(prev => prev + text); // Append streaming text
                }

                // 2. Handle Audio (Native PCM)
                const audioData = data.serverContent?.modelTurn?.parts?.[0]?.inlineData;
                if (audioData) playPCMChunk(audioData.data);

                // 3. Handle Interruption (Barge-in)
                if (data.serverContent?.interrupted) {
                    // console.log("Interrupted");
                }

                // 4. Handle Turn Completion
                if (data.serverContent?.turnComplete) {
                    // Unlike before, we don't "resume listening" because we NEVER STOPPED listening (streaming).
                    // However, we might want to update UI state if we were 'speaking'
                    // Actually, with full duplex, 'listening' is constant effectively.
                    // But for UI, let's keep 'speaking' while audio is queued.
                }
            };

            ws.onerror = (e) => {
                console.error('WS Error', e);
                setStatus('error');
                setAiText("Connection Failed.");
                stopAudioStream();
            };

            ws.onclose = () => {
                stopAudioStream();
            };

            wsRef.current = ws;
        } catch (e) {
            console.error(e);
            setStatus('error');
            setAiText(e.message);
        }
    }, [backendUrl, mode, voiceStyle, startAudioStream, stopAudioStream, playPCMChunk]);

    // =========================================================================
    // 👂 Speech Recognition Logic (The Core Loop)
    // =========================================================================

    const startRecognition = useCallback(() => {
        if (mode !== 'standard') return;
        if (statusRef.current === 'processing' || statusRef.current === 'speaking') return;

        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Speech) return;

        // Cleanup old instance
        if (recognitionRef.current) recognitionRef.current.stop();

        const recognition = new Speech();
        recognition.continuous = false; // We want to capture sentences, process, then restart
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            // Only update if not already
            if (statusRef.current === 'idle') setStatus('listening');
        };

        recognition.onresult = (e) => {
            const current = e.results[0][0].transcript;
            setTranscript(current);

            // Debounce silence to detect end of speech
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                recognition.stop(); // Stop manually to trigger processing
            }, 1000); // 1s silence = done
        };

        recognition.onend = () => {
            // Check LATEST transcript via Ref
            const finalTranscript = transcriptRef.current;

            if (statusRef.current === 'listening' && finalTranscript.trim().length > 1) {
                handleStandardResponse(finalTranscript);
            } else if (statusRef.current === 'listening') {
                // Restart
                setTimeout(() => {
                    if (statusRef.current === 'listening') recognition.start();
                }, 100);
            }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) { /* Ignore start error if already started */ }

    }, [mode]);

    // Auto-Effect: When 'idle' and Standard Mode, start listening
    useEffect(() => {
        if (isOpen && status === 'idle' && mode === 'standard') {
            startRecognition();
        }
    }, [isOpen, status, mode, startRecognition]);

    // Initial Mount & Browser Check
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setStatus('error');
            setAiText("Browser not supported. Please use Chrome, Edge, or Safari.");
            return;
        }

        if (isOpen) {
            setStatus('idle'); // Triggers loop
            if (mode === 'gemini-live') connectLive();
        }
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (synthRef.current) synthRef.current.cancel();
            if (wsRef.current) wsRef.current.close();
        };
    }, [isOpen, mode, connectLive]);

    // Auto-scroll to bottom of conversation
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation, aiText, transcript]);


    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-between overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                {/* 1. Header & Settings */}
                <div className="w-full p-6 flex items-center justify-between z-10 relative">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full backdrop-blur-md">
                        {mode === 'standard' ? <Globe className="w-4 h-4" /> : <Zap className="w-4 h-4 text-purple-500" />}
                        {mode === 'standard' ? 'OpenRouter Standard' : 'Gemini Live'}
                    </div>

                    <div className="flex gap-2">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn("p-3 rounded-full bg-muted/50 hover:bg-muted transition-colors", showSettings && "bg-primary text-primary-foreground")}
                        >
                            <Settings className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-3 rounded-full bg-muted/50 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>

                    {/* Settings Overlay - Positioned Absolute to avoid layout shift */}
                    {showSettings && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-20 right-6 w-72 bg-card border border-border shadow-2xl rounded-2xl p-4 z-50"
                        >
                            <h3 className="font-semibold mb-3 px-1">Voice Engine</h3>
                            <div className="space-y-2 mb-4">
                                <button
                                    onClick={() => { setMode('standard'); setShowSettings(false); }}
                                    className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-all", mode === 'standard' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                                >
                                    <span className="text-sm">Standard (Free)</span>
                                    {mode === 'standard' && <CheckIcon />}
                                </button>
                                <button
                                    onClick={() => { setMode('gemini-live'); setShowSettings(false); }}
                                    className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-all", mode === 'gemini-live' ? "bg-purple-600 text-white" : "hover:bg-muted")}
                                >
                                    <span className="text-sm">Gemini Live (Key)</span>
                                    {mode === 'gemini-live' && <CheckIcon />}
                                </button>
                            </div>

                            <h3 className="font-semibold mb-3 px-1">Persona (Tone)</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['friendly', 'professional', 'empathetic', 'energetic'].map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => { setVoiceStyle(style); if (mode === 'gemini-live') connectLive(); }}
                                        className={cn(
                                            "p-2 text-xs rounded-lg capitalize border transition-all",
                                            voiceStyle === style
                                                ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                : "border-border hover:bg-muted"
                                        )}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* 2. Main Visualizer (The Orb) */}
                <div className="flex-1 w-full flex flex-col items-center justify-center relative">

                    {/* Dynamic Orb Animation */}
                    <div className="relative cursor-pointer" onClick={() => {
                        if (status === 'speaking') stopSpeaking();
                        else if (status === 'error') {
                            setStatus('idle');
                            if (mode === 'gemini-live') connectLive();
                        }
                        else setStatus(status === 'idle' ? 'listening' : 'idle');
                    }}>
                        {/* Outer Glow */}
                        <motion.div
                            animate={{
                                scale: status === 'listening' ? [1, 1.2, 1] : status === 'processing' ? [1, 0.9, 1] : 1,
                                opacity: status === 'listening' ? 0.3 : 0.1
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className={cn(
                                "absolute inset-0 rounded-full blur-3xl",
                                status === 'error' ? "bg-red-500" :
                                    mode === 'gemini-live' ? "bg-purple-500" : "bg-blue-500"
                            )}
                        />

                        {/* Core Orb */}
                        <motion.div
                            animate={{
                                scale: status === 'speaking' ? [1, 1.1, 0.95, 1.05, 1] : 1,
                            }}
                            transition={{ repeat: Infinity, duration: 0.5 }} // Voice vibration effect
                            className={cn(
                                "w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500 relative z-10",
                                status === 'listening' ? "bg-white dark:bg-slate-900 border-4 border-blue-500" :
                                    status === 'processing' ? "bg-blue-100 dark:bg-slate-800 border-4 border-t-transparent border-blue-500 animate-spin" :
                                        status === 'speaking' ? "bg-blue-500 border-4 border-white" :
                                            "bg-muted border-4 border-border"
                            )}
                        >
                            {status === 'listening' && <Mic className="w-12 h-12 text-blue-500" />}
                            {status === 'processing' && <Sparkles className="w-12 h-12 text-blue-500 animate-pulse" />}
                            {status === 'speaking' && <StopCircle className="w-12 h-12 text-white animate-pulse" />}
                            {status === 'idle' && <div className="w-4 h-4 rounded-full bg-slate-400" />}
                        </motion.div>
                    </div>

                    {/* Status Label */}
                    <motion.div
                        key={status} // Animates on change
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-10 text-center space-y-2"
                    >
                        <h2 className="text-2xl font-light tracking-tight">
                            {status === 'listening' && "Listening..."}
                            {status === 'processing' && "Thinking..."}
                            {status === 'speaking' && "Tap orb to interrupt"}
                            {status === 'idle' && "Tap orb or wait..."}
                            {status === 'error' && "Connection Issue"}
                        </h2>
                        <p className="text-sm text-muted-foreground max-w-md px-4 truncate">
                            {status === 'listening' ? transcript || "Say something..." : ""}
                        </p>
                    </motion.div>
                </div>

                {/* 3. Conversation History (Scrollable Panel) */}
                <div className="w-full h-1/3 bg-background/50 border-t border-border backdrop-blur-lg overflow-y-auto p-6 space-y-4">
                    {conversation.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <MessageSquare className="w-8 h-8 mb-2" />
                            <p>Conversation empty</p>
                        </div>
                    )}

                    {conversation.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                                "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                                msg.role === 'user'
                                    ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                                    : "mr-auto bg-muted rounded-bl-sm"
                            )}
                        >
                            {msg.content}
                        </motion.div>
                    ))}

                    {/* Real-time Streaming Content Placeholder */}
                    {(status === 'processing' || status === 'speaking') && aiText && conversation[conversation.length - 1]?.role !== 'assistant' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mr-auto max-w-[80%] p-4 rounded-2xl bg-muted rounded-bl-sm text-sm">
                            {aiText}
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);
