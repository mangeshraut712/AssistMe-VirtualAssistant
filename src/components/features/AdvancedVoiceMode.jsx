/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ADVANCED VOICE MODE 4.0 - Human-AI Continuous Conversation System
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Architecture (2025 State-of-the-Art):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │  VAD Detection → STT → NLU/Intent → LLM → TTS → Audio Playback              │
 * │      ↑                                                    ↓                  │
 * │      └──────────── Continuous Listening Loop ←────────────┘                  │
 * └──────────────────────────────────────────────────────────────────────────────┘
 * 
 * Key Technologies:
 * 1. Voice Activity Detection (VAD) - Energy-based + RMS analysis
 * 2. Adaptive Silence Detection - Context-aware timeout
 * 3. Full-Duplex Communication - Listen while speaking (barge-in)
 * 4. Streaming TTS - Low latency audio playback
 * 5. Emotional Intelligence - Persona-based response adaptation
 * 6. Auto-Recovery - Robust error handling and reconnection
 * 
 * Modes:
 * - Standard: Web Speech API + Backend TTS (works everywhere)
 * - Gemini Live: Real-time WebSocket streaming (premium quality)
 * 
 * @version 4.0.0
 * @date December 2025
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mic, MicOff, Settings, Sparkles, Zap, Globe,
    MessageSquare, Volume2, VolumeX, RefreshCw, Waves,
    User, Bot, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Tuned for Human-Like Conversations
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Voice Activity Detection (VAD)
    VAD_THRESHOLD: 0.015,           // RMS threshold for speech detection
    VAD_SMOOTHING: 0.85,            // Smoothing factor for VAD

    // Silence Detection (Adaptive)
    SILENCE_SHORT: 1200,            // Quick phrases (< 30 chars)
    SILENCE_MEDIUM: 1800,           // Normal phrases (30-80 chars)
    SILENCE_LONG: 2500,             // Long phrases or thinking (> 80 chars)

    // Speech Recognition
    STT_CONFIDENCE_THRESHOLD: 0.7,  // Request clarification below this
    STT_LANGUAGE: 'en-US',

    // Response Generation
    THINKING_DELAY_MIN: 200,        // Natural pause before responding (ms)
    THINKING_DELAY_MAX: 600,
    MAX_RESPONSE_TOKENS: 200,       // Keep voice responses concise

    // Audio Settings
    INPUT_SAMPLE_RATE: 16000,       // Mic input sample rate
    OUTPUT_SAMPLE_RATE: 24000,      // TTS output sample rate
    AUDIO_BUFFER_SIZE: 2048,        // Lower = less latency

    // Reconnection
    MAX_RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 1500,

    // Models
    CHAT_MODEL: 'meta-llama/llama-3.3-70b-instruct:free',
    GEMINI_MODEL: 'models/gemini-2.0-flash-exp',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONAS - Emotional Intelligence System
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONAS = {
    assistant: {
        name: 'Assistant',
        description: 'Friendly & helpful',
        emoji: '🤖',
        geminiVoice: 'Puck',
        voiceSettings: { rate: 0.95, pitch: 1.0 },
        systemPrompt: `You are AssistMe, a warm and intelligent voice assistant having a natural conversation.

VOICE CONVERSATION RULES:
• Respond in 1-3 short sentences maximum
• Use natural speech patterns: "Well...", "You know...", "Actually..."
• Never use markdown, lists, bullet points, or code
• Spell out numbers: "twenty-five" not "25"
• Include brief pauses with commas
• Ask follow-up questions to stay engaged
• Sound like a helpful friend, not a robot
• Match the user's energy and tone`,
        backchannels: ['Hmm...', 'I see.', 'Got it.', 'Right.', 'Interesting...'],
    },
    professional: {
        name: 'Expert',
        description: 'Concise & authoritative',
        emoji: '💼',
        geminiVoice: 'Charon',
        voiceSettings: { rate: 0.9, pitch: 0.95 },
        systemPrompt: `You are a professional advisor providing expert guidance.

VOICE RULES:
• Maximum 2 sentences per response
• Be direct and confident
• Use precise, technical language when appropriate
• No filler words or hedging
• Maintain authority without being cold`,
        backchannels: ['Understood.', 'Noted.', 'Clear.'],
    },
    empathetic: {
        name: 'Companion',
        description: 'Warm & supportive',
        emoji: '💝',
        geminiVoice: 'Kore',
        voiceSettings: { rate: 0.85, pitch: 1.05 },
        systemPrompt: `You are a compassionate companion providing emotional support.

VOICE RULES:
• Speak softly and warmly
• Validate feelings explicitly: "That sounds really tough..."
• Use supportive phrases: "I'm here for you", "That makes sense"
• Ask gentle clarifying questions
• Never rush the conversation`,
        backchannels: ['I hear you.', 'That makes sense.', 'I understand.', 'Take your time.'],
    },
    energetic: {
        name: 'Motivator',
        description: 'Upbeat & inspiring',
        emoji: '⚡',
        geminiVoice: 'Io',
        voiceSettings: { rate: 1.1, pitch: 1.1 },
        systemPrompt: `You are an enthusiastic motivator bringing positive energy!

VOICE RULES:
• Be excited and dynamic!
• Short, punchy sentences
• Use encouraging words: "Amazing!", "You've got this!"
• Keep energy HIGH
• Inspire action and confidence`,
        backchannels: ['Awesome!', 'Love it!', 'Yes!', "Let's go!"],
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Calculate RMS (Root Mean Square) for VAD
const calculateRMS = (buffer) => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
};

// Get adaptive silence timeout based on transcript length
const getAdaptiveSilenceTimeout = (transcriptLength) => {
    if (transcriptLength < 30) return CONFIG.SILENCE_SHORT;
    if (transcriptLength < 80) return CONFIG.SILENCE_MEDIUM;
    return CONFIG.SILENCE_LONG;
};

// Natural delay for human-like response timing
const naturalDelay = () => new Promise(resolve =>
    setTimeout(resolve, CONFIG.THINKING_DELAY_MIN + Math.random() * (CONFIG.THINKING_DELAY_MAX - CONFIG.THINKING_DELAY_MIN))
);

// Text normalization for TTS
const normalizeForSpeech = (text) => {
    if (!text) return '';
    return text
        .replace(/\*\*/g, '')           // Remove markdown bold
        .replace(/\*/g, '')             // Remove markdown italic
        .replace(/`/g, '')              // Remove code ticks
        .replace(/#{1,6}\s?/g, '')      // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
        .replace(/\n+/g, '. ')          // Newlines to pauses
        .replace(/(\d+)/g, (match) => { // Spell out small numbers
            const num = parseInt(match);
            const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
            return num <= 20 ? (words[num] || match) : match;
        })
        .replace(/\s+/g, ' ')           // Normalize whitespace
        .trim();
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdvancedVoiceMode({ isOpen, onClose, backendUrl = '' }) {
    // ─────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────

    // Core state machine: idle → listening → processing → speaking → idle (loop)
    const [status, setStatus] = useState('idle');
    const [mode, setMode] = useState('standard'); // 'standard' | 'gemini-live'
    const [persona, setPersona] = useState('assistant');
    const [showSettings, setShowSettings] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Conversation state
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [conversation, setConversation] = useState([]);
    const [confidence, setConfidence] = useState(1.0);

    // Audio visualization
    const [audioLevel, setAudioLevel] = useState(0);
    const [isSpeechDetected, setIsSpeechDetected] = useState(false);

    // Error handling
    const [errorMessage, setErrorMessage] = useState('');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    // ─────────────────────────────────────────────────────────────────────────
    // REFS
    // ─────────────────────────────────────────────────────────────────────────

    const statusRef = useRef(status);
    const transcriptRef = useRef('');
    const personaRef = useRef(persona);

    // Speech Recognition
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);

    // Audio I/O
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const currentAudioRef = useRef(null);
    const nextAudioTimeRef = useRef(0);

    // WebSocket (Gemini Live)
    const wsRef = useRef(null);
    const recorderRef = useRef(null);

    // UI
    const messagesEndRef = useRef(null);
    const animationFrameRef = useRef(null);

    // ─────────────────────────────────────────────────────────────────────────
    // SYNC REFS
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { personaRef.current = persona; }, [persona]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation, aiResponse]);

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIO CONTEXT & ANALYSIS
    // ─────────────────────────────────────────────────────────────────────────

    const initAudioContext = useCallback(() => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: CONFIG.OUTPUT_SAMPLE_RATE
            });
            nextAudioTimeRef.current = audioCtxRef.current.currentTime;
        }
        return audioCtxRef.current;
    }, []);

    // Audio level monitoring for visualization
    const startAudioMonitoring = useCallback((stream) => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyserRef.current = { ctx, analyser };

        const dataArray = new Float32Array(analyser.fftSize);
        let smoothedLevel = 0;

        const updateLevel = () => {
            if (!analyserRef.current) return;
            analyser.getFloatTimeDomainData(dataArray);
            const rms = calculateRMS(dataArray);
            smoothedLevel = smoothedLevel * CONFIG.VAD_SMOOTHING + rms * (1 - CONFIG.VAD_SMOOTHING);
            setAudioLevel(Math.min(1, smoothedLevel * 10));
            setIsSpeechDetected(smoothedLevel > CONFIG.VAD_THRESHOLD);
            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
    }, []);

    const stopAudioMonitoring = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (analyserRef.current) {
            analyserRef.current.ctx.close();
            analyserRef.current = null;
        }
        setAudioLevel(0);
        setIsSpeechDetected(false);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // TTS ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    const speak = useCallback((text, onEnd) => {
        if (!synthRef.current || !text || isMuted) {
            if (onEnd) onEnd();
            return;
        }

        synthRef.current.cancel();
        const normalizedText = normalizeForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(normalizedText);

        const personaConfig = PERSONAS[personaRef.current];
        utterance.rate = personaConfig.voiceSettings.rate;
        utterance.pitch = personaConfig.voiceSettings.pitch;
        utterance.volume = 1.0;

        // Try to find a natural voice
        const voices = synthRef.current.getVoices();
        const preferredVoices = ['Samantha', 'Karen', 'Daniel', 'Google US', 'Microsoft'];
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
    }, [isMuted]);

    const stopSpeaking = useCallback(() => {
        if (synthRef.current) synthRef.current.cancel();
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => { });
            audioCtxRef.current = null;
        }
        if (statusRef.current === 'speaking') {
            setStatus('idle');
        }
    }, []);

    // Play base64 encoded audio (WAV format from backend)
    const playAudioBase64 = useCallback((base64Audio) => {
        if (isMuted) return;
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
        audio.play().catch(console.error);
    }, [isMuted]);

    // Play PCM chunk (for Gemini Live streaming)
    const playPCMChunk = useCallback((base64Data) => {
        if (isMuted) return;
        try {
            const ctx = initAudioContext();
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const int16Data = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) {
                float32Data[i] = int16Data[i] / 32768.0;
            }

            const buffer = ctx.createBuffer(1, float32Data.length, CONFIG.OUTPUT_SAMPLE_RATE);
            buffer.copyToChannel(float32Data, 0);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);

            const currentTime = ctx.currentTime;
            if (nextAudioTimeRef.current < currentTime) {
                nextAudioTimeRef.current = currentTime;
            }
            source.start(nextAudioTimeRef.current);
            nextAudioTimeRef.current += buffer.duration;
            setStatus('speaking');
        } catch (e) {
            console.error('PCM playback error:', e);
        }
    }, [initAudioContext, isMuted]);

    // ─────────────────────────────────────────────────────────────────────────
    // RESPONSE GENERATION
    // ─────────────────────────────────────────────────────────────────────────

    const generateResponse = useCallback(async (userText, history) => {
        // Try backend voice API first (premium TTS)
        try {
            const voiceResponse = await fetch(`${backendUrl}/api/tts/voice-response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    conversation_history: history.slice(-8).map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    voice: PERSONAS[personaRef.current].geminiVoice,
                    language: CONFIG.STT_LANGUAGE,
                    stt_confidence: confidence
                })
            });

            if (voiceResponse.ok) {
                const data = await voiceResponse.json();
                return {
                    text: data.response || "I'm not sure how to respond.",
                    audio: data.audio
                };
            }
        } catch (e) {
            console.log('Voice backend unavailable, using chat fallback');
        }

        // Fallback to chat API + browser TTS
        try {
            const chatResponse = await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: PERSONAS[personaRef.current].systemPrompt },
                        ...history.slice(-8).map(m => ({ role: m.role, content: m.content }))
                    ],
                    model: CONFIG.CHAT_MODEL,
                    max_tokens: CONFIG.MAX_RESPONSE_TOKENS,
                    temperature: 0.8
                })
            });

            if (!chatResponse.ok) throw new Error('Chat API failed');
            const data = await chatResponse.json();
            return { text: data.response || "I'm listening.", audio: null };
        } catch (e) {
            console.error('All APIs failed:', e);
            return { text: "I'm having trouble connecting. Please try again.", audio: null };
        }
    }, [backendUrl, confidence]);

    // ─────────────────────────────────────────────────────────────────────────
    // CONVERSATION HANDLER
    // ─────────────────────────────────────────────────────────────────────────

    const handleUserInput = useCallback(async (userText, sttConfidence = 1.0) => {
        if (!userText.trim()) return;

        setStatus('processing');
        setTranscript('');
        setInterimTranscript('');
        setConfidence(sttConfidence);
        setErrorMessage('');

        const newHistory = [...conversation, { role: 'user', content: userText }];
        setConversation(newHistory);

        // Check confidence - request clarification if too low
        if (sttConfidence < CONFIG.STT_CONFIDENCE_THRESHOLD) {
            const clarification = "I didn't quite catch that. Could you say it again?";
            setAiResponse(clarification);
            setConversation([...newHistory, { role: 'assistant', content: clarification }]);
            speak(clarification);
            return;
        }

        // Natural thinking delay
        await naturalDelay();

        // Generate response
        const { text, audio } = await generateResponse(userText, newHistory);

        setAiResponse(text);
        setConversation([...newHistory, { role: 'assistant', content: text }]);

        if (audio) {
            playAudioBase64(audio);
        } else {
            speak(text);
        }
    }, [conversation, generateResponse, speak, playAudioBase64]);

    // ─────────────────────────────────────────────────────────────────────────
    // SPEECH RECOGNITION (STT)
    // ─────────────────────────────────────────────────────────────────────────

    const startRecognition = useCallback(() => {
        if (mode !== 'standard') return;
        if (statusRef.current === 'processing' || statusRef.current === 'speaking') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage('Speech recognition not supported in this browser.');
            setStatus('error');
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = CONFIG.STT_LANGUAGE;
        recognition.maxAlternatives = 1;

        let finalTranscript = '';
        let lastConfidence = 1.0;

        recognition.onstart = () => {
            setStatus('listening');
            finalTranscript = '';
        };

        recognition.onresult = (event) => {
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript + ' ';
                    lastConfidence = result[0].confidence;
                } else {
                    interim += result[0].transcript;
                }
            }

            setTranscript(finalTranscript.trim());
            setInterimTranscript(interim);
            transcriptRef.current = finalTranscript.trim();
            setConfidence(lastConfidence);

            // Clear existing silence timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            // Adaptive silence detection
            const timeout = getAdaptiveSilenceTimeout(transcriptRef.current.length);
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
            console.error('STT error:', event.error);
            if (event.error === 'no-speech' && statusRef.current === 'listening') {
                setTimeout(() => {
                    try { recognition.start(); } catch (e) { }
                }, 100);
            }
        };

        recognitionRef.current = recognition;

        // Request microphone and start
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                startAudioMonitoring(stream);
                try { recognition.start(); } catch (e) { }
            })
            .catch((e) => {
                setErrorMessage('Microphone access denied.');
                setStatus('error');
            });
    }, [mode, handleUserInput, startAudioMonitoring, confidence]);

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        stopAudioMonitoring();
    }, [stopAudioMonitoring]);

    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI LIVE MODE
    // ─────────────────────────────────────────────────────────────────────────

    const startAudioStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: CONFIG.INPUT_SAMPLE_RATE,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: CONFIG.INPUT_SAMPLE_RATE
            });

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            startAudioMonitoring(stream);

            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(CONFIG.AUDIO_BUFFER_SIZE, 1, 1);

            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                // Full-duplex: stream even while speaking for barge-in
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
                        realtimeInput: {
                            mediaChunks: [{ mimeType: 'audio/pcm', data: base64Audio }]
                        }
                    }));
                }
            };

            recorderRef.current = { stream, audioContext, processor };
        } catch (e) {
            console.error('Microphone error:', e);
            setStatus('error');
            setErrorMessage('Microphone access denied.');
        }
    }, [startAudioMonitoring]);

    const stopAudioStream = useCallback(() => {
        if (recorderRef.current) {
            const { stream, audioContext, processor } = recorderRef.current;
            processor.disconnect();
            stream.getTracks().forEach(t => t.stop());
            audioContext.close();
            recorderRef.current = null;
        }
        stopAudioMonitoring();
    }, [stopAudioMonitoring]);

    const connectGeminiLive = useCallback(async () => {
        try {
            setStatus('processing');
            setErrorMessage('');

            // Try backend first, then direct API
            let apiKey = null;
            try {
                const keyRes = await fetch(`${backendUrl}/api/gemini/key`);
                if (keyRes.ok) {
                    const data = await keyRes.json();
                    apiKey = data.apiKey;
                }
            } catch (e) { }

            if (!apiKey) {
                try {
                    const keyRes = await fetch('/api/gemini/key');
                    if (keyRes.ok) {
                        const data = await keyRes.json();
                        apiKey = data.apiKey;
                    }
                } catch (e) { }
            }

            if (!apiKey) {
                throw new Error('Gemini API key not available. Please configure GOOGLE_API_KEY.');
            }

            stopAudioStream();

            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setStatus('listening');
                setReconnectAttempts(0);
                initAudioContext();

                ws.send(JSON.stringify({
                    setup: {
                        model: CONFIG.GEMINI_MODEL,
                        generationConfig: {
                            responseModalities: ['AUDIO', 'TEXT'],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: PERSONAS[personaRef.current].geminiVoice
                                    }
                                }
                            }
                        },
                        systemInstruction: {
                            parts: [{ text: PERSONAS[personaRef.current].systemPrompt }]
                        }
                    }
                }));

                startAudioStream();
            };

            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);

                // Handle barge-in (interruption)
                if (data.serverContent?.interrupted) {
                    stopSpeaking();
                    setAiResponse(prev => prev + ' (interrupted)');
                    setStatus('listening');
                    return;
                }

                // Handle text response
                if (data.serverContent?.modelTurn?.parts?.[0]?.text) {
                    const text = data.serverContent.modelTurn.parts[0].text;
                    setAiResponse(prev => prev + text);
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
                setErrorMessage('Connection failed.');
                stopAudioStream();

                // Auto-reconnect
                if (reconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1);
                        connectGeminiLive();
                    }, CONFIG.RECONNECT_DELAY);
                }
            };

            ws.onclose = () => {
                stopAudioStream();
                if (statusRef.current !== 'error') {
                    setStatus('idle');
                }
            };

            wsRef.current = ws;
        } catch (e) {
            setStatus('error');
            setErrorMessage(e.message);
        }
    }, [backendUrl, initAudioContext, startAudioStream, stopAudioStream, stopSpeaking, playPCMChunk, reconnectAttempts]);

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    // Auto-start based on mode
    useEffect(() => {
        if (isOpen && status === 'idle') {
            if (mode === 'standard') {
                setTimeout(startRecognition, 300);
            }
        }
    }, [isOpen, status, mode, startRecognition]);

    // Initialize when opened
    useEffect(() => {
        if (!isOpen) return;

        const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        if (!hasSpeechRecognition) {
            setStatus('error');
            setErrorMessage('Speech recognition not supported. Try Chrome or Edge.');
            return;
        }

        setStatus('idle');
        setConversation([]);
        setAiResponse('');
        setTranscript('');
        setErrorMessage('');

        if (mode === 'gemini-live') {
            connectGeminiLive();
        }

        return () => {
            stopRecognition();
            stopSpeaking();
            if (wsRef.current) wsRef.current.close();
            stopAudioStream();
        };
    }, [isOpen]);

    // Handle mode changes
    useEffect(() => {
        if (!isOpen) return;

        stopRecognition();
        stopSpeaking();
        if (wsRef.current) wsRef.current.close();
        stopAudioStream();

        setTimeout(() => {
            if (mode === 'gemini-live') {
                connectGeminiLive();
            } else {
                setStatus('idle');
            }
        }, 100);
    }, [mode]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    const getStatusColor = () => {
        if (status === 'error') return 'from-red-500 to-rose-600';
        if (status === 'speaking') return 'from-emerald-400 to-teal-500';
        if (status === 'processing') return 'from-amber-400 to-orange-500';
        if (status === 'listening') {
            return mode === 'gemini-live'
                ? 'from-purple-500 to-violet-600'
                : 'from-blue-400 to-cyan-500';
        }
        return 'from-slate-400 to-slate-500';
    };

    const getStatusText = () => {
        switch (status) {
            case 'listening': return isSpeechDetected ? 'Hearing you...' : 'Listening...';
            case 'processing': return 'Thinking...';
            case 'speaking': return 'Speaking...';
            case 'error': return errorMessage || 'Error occurred';
            default: return 'Tap to start';
        }
    };

    const handleOrbClick = () => {
        if (status === 'speaking') {
            stopSpeaking();
        } else if (status === 'error') {
            setStatus('idle');
            setErrorMessage('');
            if (mode === 'gemini-live') connectGeminiLive();
            else startRecognition();
        } else if (status === 'idle') {
            if (mode === 'standard') startRecognition();
        } else if (status === 'listening') {
            stopRecognition();
            setStatus('idle');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-gradient-to-b from-background via-background to-background/95 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Header */}
                <header className="flex items-center justify-between p-4 sm:p-6">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium",
                            "bg-muted/50 backdrop-blur-sm border border-border/50"
                        )}>
                            {mode === 'standard' ? (
                                <Globe className="w-4 h-4" />
                            ) : (
                                <Zap className="w-4 h-4 text-purple-500" />
                            )}
                            <span className="hidden sm:inline">
                                {mode === 'standard' ? 'Standard Mode' : 'Gemini Live'}
                            </span>
                        </div>

                        <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs",
                            "bg-muted/30 border border-border/30"
                        )}>
                            <span>{PERSONAS[persona].emoji}</span>
                            <span className="hidden sm:inline">{PERSONAS[persona].name}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "p-2.5 rounded-full transition-colors",
                                isMuted ? "bg-red-500/20 text-red-500" : "bg-muted/50 hover:bg-muted"
                            )}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                "p-2.5 rounded-full transition-colors",
                                showSettings ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
                            )}
                        >
                            <Settings className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="p-2.5 rounded-full bg-muted/50 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>
                </header>

                {/* Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 sm:px-6 pb-4 overflow-hidden"
                        >
                            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Voice Engine</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setMode('standard')}
                                            className={cn(
                                                "p-3 rounded-xl text-sm font-medium transition-all",
                                                mode === 'standard'
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted/50 hover:bg-muted"
                                            )}
                                        >
                                            Standard
                                        </button>
                                        <button
                                            onClick={() => setMode('gemini-live')}
                                            className={cn(
                                                "p-3 rounded-xl text-sm font-medium transition-all",
                                                mode === 'gemini-live'
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-muted/50 hover:bg-muted"
                                            )}
                                        >
                                            Gemini Live
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Persona</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {Object.entries(PERSONAS).map(([key, p]) => (
                                            <button
                                                key={key}
                                                onClick={() => setPersona(key)}
                                                className={cn(
                                                    "p-2.5 rounded-xl text-xs font-medium transition-all border",
                                                    persona === key
                                                        ? "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400"
                                                        : "border-border/50 hover:bg-muted"
                                                )}
                                            >
                                                <span className="mr-1">{p.emoji}</span>
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Orb Area */}
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div
                        className="relative cursor-pointer"
                        onClick={handleOrbClick}
                    >
                        {/* Outer Glow - Reactive to audio level */}
                        <motion.div
                            animate={{
                                scale: status === 'listening'
                                    ? 1 + audioLevel * 0.5
                                    : status === 'speaking' ? [1, 1.2, 1] : 1,
                                opacity: status === 'idle' ? 0.1 : 0.4
                            }}
                            transition={{
                                repeat: status === 'speaking' ? Infinity : 0,
                                duration: 0.5
                            }}
                            className={cn(
                                "absolute -inset-8 sm:-inset-12 rounded-full blur-3xl bg-gradient-to-br",
                                getStatusColor()
                            )}
                        />

                        {/* Audio waves visualization */}
                        {status === 'listening' && isSpeechDetected && (
                            <>
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 1, opacity: 0.5 }}
                                        animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1.5,
                                            delay: i * 0.3
                                        }}
                                        className={cn(
                                            "absolute inset-0 rounded-full border-2",
                                            mode === 'gemini-live' ? "border-purple-500" : "border-blue-500"
                                        )}
                                    />
                                ))}
                            </>
                        )}

                        {/* Core Orb */}
                        <motion.div
                            animate={{
                                scale: status === 'speaking'
                                    ? [1, 1.08, 0.96, 1.04, 1]
                                    : status === 'processing' ? [1, 0.95, 1] : 1,
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: status === 'speaking' ? 0.5 : 1.5
                            }}
                            className={cn(
                                "w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center",
                                "shadow-2xl relative z-10 bg-gradient-to-br",
                                getStatusColor()
                            )}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={status}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-white"
                                >
                                    {status === 'listening' && <Mic className="w-10 h-10 sm:w-12 sm:h-12" />}
                                    {status === 'processing' && <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />}
                                    {status === 'speaking' && <Waves className="w-10 h-10 sm:w-12 sm:h-12" />}
                                    {status === 'idle' && <MicOff className="w-8 h-8 sm:w-10 sm:h-10 opacity-70" />}
                                    {status === 'error' && <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10" />}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    {/* Status Text */}
                    <motion.div
                        key={status + aiResponse.slice(0, 20)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 text-center max-w-md px-4"
                    >
                        <h2 className="text-xl sm:text-2xl font-medium mb-2">
                            {getStatusText()}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {status === 'listening' && (transcript || interimTranscript || 'Say something...')}
                            {status === 'speaking' && 'Tap orb to stop'}
                        </p>
                    </motion.div>
                </div>

                {/* Conversation History */}
                <div className="h-1/3 max-h-72 border-t border-border/50 bg-background/80 backdrop-blur-sm overflow-y-auto p-4 sm:p-6">
                    {conversation.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                            <MessageSquare className="w-8 h-8 mb-2" />
                            <p className="text-sm">Start speaking to begin</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {conversation.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "flex gap-2",
                                        msg.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                    )}
                                    <div className={cn(
                                        "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-br-md"
                                            : "bg-muted rounded-bl-md"
                                    )}>
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                            <User className="w-3.5 h-3.5 text-primary-foreground" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {/* Streaming response */}
                            {(status === 'processing' || status === 'speaking') && aiResponse &&
                                conversation[conversation.length - 1]?.role !== 'assistant' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex gap-2 justify-start"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-muted rounded-bl-md text-sm">
                                            {aiResponse}
                                            {status === 'processing' && (
                                                <span className="inline-block w-2 h-4 bg-foreground/30 ml-1 animate-pulse" />
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
