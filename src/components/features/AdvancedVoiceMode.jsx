/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE MODE 7.0 - Premium Redesign
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Distinct Premium vs Standard visual experiences
 * - Premium: Immersive dark mode with neural orb animations
 * - Standard: Clean, fast, browser-based TTS
 * - Simplified settings (no language options)
 * - Clean conversation display (filters internal thoughts)
 * - Real-time audio visualization
 * 
 * @version 7.0.0
 * @date December 2025
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mic, MicOff, Volume2, VolumeX, Trash2,
    Sparkles, Zap, Brain, AudioWaveform
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    SILENCE_TIMEOUT: 1500,
    MIN_TRANSCRIPT_LENGTH: 3,

    // Models for Standard Mode (via OpenRouter)
    STANDARD_MODEL: 'x-ai/grok-3-mini-beta',  // Fast, conversational
    STANDARD_FALLBACK: 'google/gemini-2.0-flash-001',

    // Models for Premium Mode (via Gemini Live API - native audio)
    PREMIUM_MODEL: 'gemini-2.5-flash-native-audio-preview-12-2025',

    // Audio configuration for Gemini Live native audio output
    AUDIO_OUTPUT: {
        sampleRate: 24000,
        channels: 1,
        bitDepth: 16
    },

    // Endpoints
    CHAT_ENDPOINT: '/api/chat',
    TTS_ENDPOINT: '/api/tts/synthesize',
    GEMINI_WS_URL: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent',

    // Voice-specific system prompts
    PREMIUM_SYSTEM_PROMPT: `You are a warm, intelligent AI assistant with a natural conversational style.
Speak with genuine emotion, warmth, and enthusiasm.
Keep responses concise (1-3 sentences for simple queries, longer for complex ones).
Use natural speech patterns - contractions, casual phrasing, occasional filler words.
Never prefix responses with thoughts like "Thinking..." or "Providing...".
Engage like a knowledgeable friend having a real conversation.`,

    STANDARD_SYSTEM_PROMPT: `You are a helpful, friendly voice assistant.
Keep responses clear, concise, and conversational - optimized for text-to-speech.
Use simple sentence structures that sound natural when spoken aloud.
Avoid markdown formatting, bullet points, or code blocks - speak in natural paragraphs.
Limit responses to 2-4 sentences unless the user asks for detailed information.
Be warm but efficient.`
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean response text by removing internal thought markers and AI meta-commentary
 */
const cleanResponseText = (text) => {
    if (!text) return '';

    const cleaned = text
        // Remove **bold markers** like **Thinking...**, **Providing a Response**, etc.
        .replace(/\*\*[^*]+\*\*\s*/g, '')
        // Remove lines that look like internal thoughts
        .split('\n')
        .filter(line => {
            const trimmed = line.trim().toLowerCase();
            // Skip lines that start with common AI thinking patterns
            if (trimmed.startsWith("i've processed")) return false;
            if (trimmed.startsWith("i've tackled")) return false;
            if (trimmed.startsWith("i aimed to")) return false;
            if (trimmed.startsWith("my aim is")) return false;
            if (trimmed.startsWith("my focus is")) return false;
            if (trimmed.startsWith("i've begun")) return false;
            if (trimmed.startsWith("keeping it")) return false;
            if (trimmed.startsWith("i'm thinking")) return false;
            if (trimmed.startsWith("let me think")) return false;
            return true;
        })
        .join('\n')
        // Clean up extra whitespace
        .replace(/^\s*\n+/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return cleaned;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdvancedVoiceMode({ isOpen, onClose }) {
    // State
    const [status, setStatus] = useState('idle');
    const [conversation, setConversation] = useState([]);
    const [transcript, setTranscript] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isPremium, setIsPremium] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);

    // Refs
    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const conversationEndRef = useRef(null);
    const processRef = useRef(null);
    const wsRef = useRef(null);

    // ─────────────────────────────────────────────────────────────────────────
    // SPEECH TO TEXT
    // ─────────────────────────────────────────────────────────────────────────

    const startListening = useCallback(() => {
        if (typeof window === 'undefined' || isProcessingRef.current) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage('Speech recognition not supported');
            setStatus('error');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = async () => {
            console.log('[Voice] Started listening');
            setStatus('listening');
            setTranscript('');

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                analyser.fftSize = 64;
                source.connect(analyser);

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const updateLevel = () => {
                    if (status !== 'listening' && status !== 'speaking') {
                        setAudioLevel(0);
                        return;
                    }
                    analyser.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                    setAudioLevel(average / 255);
                    requestAnimationFrame(updateLevel);
                };
                updateLevel();
            } catch (err) {
                console.warn('[Voice] Could not start audio visualization:', err);
            }
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            const currentText = finalTranscript || interimTranscript;
            setTranscript(currentText);

            if (finalTranscript.trim().length >= CONFIG.MIN_TRANSCRIPT_LENGTH) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                recognition.stop();
                if (processRef.current) processRef.current(finalTranscript.trim());
            }
        };

        recognition.onerror = (event) => {
            console.error('[Voice] Recognition error:', event.error);
            if (event.error !== 'no-speech') {
                setErrorMessage(`Error: ${event.error}`);
                setStatus('error');
            }
        };

        recognition.onend = () => {
            console.log('[Voice] Recognition ended');
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [status]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioLevel(0);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIO PLAYBACK
    // ─────────────────────────────────────────────────────────────────────────

    const playPCMAudio = useCallback(async (base64Data) => {
        if (!base64Data || isMuted) return;

        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: CONFIG.AUDIO_OUTPUT.sampleRate
            });

            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }

            const audioBuffer = audioCtx.createBuffer(
                CONFIG.AUDIO_OUTPUT.channels,
                float32Array.length,
                CONFIG.AUDIO_OUTPUT.sampleRate
            );
            audioBuffer.getChannelData(0).set(float32Array);

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);

            return new Promise((resolve) => {
                source.onended = () => {
                    audioCtx.close();
                    resolve();
                };
                source.start(0);
            });
        } catch (error) {
            console.error('[Voice] PCM audio error:', error);
        }
    }, [isMuted]);

    const speak = useCallback(async (text) => {
        if (!text || isMuted) return;

        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);

        await new Promise((resolve) => {
            utterance.onend = resolve;
            utterance.onerror = resolve;
            setTimeout(resolve, 15000);
        });
    }, [isMuted]);

    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI LIVE API (PREMIUM)
    // ─────────────────────────────────────────────────────────────────────────

    const connectToGeminiLive = useCallback((text) => {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    const keyResponse = await fetch('/api/gemini/key');
                    if (!keyResponse.ok) throw new Error('Failed to get API key');
                    const { apiKey } = await keyResponse.json();
                    if (!apiKey) throw new Error('API key not configured');

                    const wsUrl = `${CONFIG.GEMINI_WS_URL}?key=${apiKey}`;
                    const ws = new WebSocket(wsUrl);
                    wsRef.current = ws;

                    let isSetupComplete = false;
                    let accumulatedText = '';
                    const audioChunks = [];
                    let timeoutId = null;

                    const cleanup = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        if (ws.readyState === WebSocket.OPEN) ws.close();
                        wsRef.current = null;
                    };

                    timeoutId = setTimeout(() => {
                        cleanup();
                        reject(new Error('Response timeout'));
                    }, 45000);

                    ws.onopen = () => {
                        ws.send(JSON.stringify({
                            setup: {
                                model: `models/${CONFIG.PREMIUM_MODEL}`,
                                generation_config: {
                                    response_modalities: ['AUDIO'],
                                    speech_config: {
                                        voice_config: {
                                            prebuilt_voice_config: {
                                                voice_name: 'Kore'  // Natural, warm voice
                                            }
                                        }
                                    }
                                },
                                system_instruction: {
                                    parts: [{ text: CONFIG.PREMIUM_SYSTEM_PROMPT }]
                                }
                            }
                        }));
                    };

                    ws.onmessage = async (event) => {
                        try {
                            let textData;
                            if (event.data instanceof Blob) {
                                textData = await event.data.text();
                            } else {
                                textData = event.data;
                            }

                            const data = JSON.parse(textData);

                            if (data.setupComplete) {
                                isSetupComplete = true;
                                ws.send(JSON.stringify({
                                    clientContent: {
                                        turns: [{ role: 'user', parts: [{ text }] }],
                                        turnComplete: true
                                    }
                                }));
                                return;
                            }

                            if (data.serverContent) {
                                const serverContent = data.serverContent;

                                if (serverContent.interrupted) {
                                    audioChunks.length = 0;
                                    return;
                                }

                                if (serverContent.modelTurn?.parts) {
                                    for (const part of serverContent.modelTurn.parts) {
                                        if (part.text) accumulatedText += part.text;
                                        if (part.inlineData?.data) audioChunks.push(part.inlineData.data);
                                    }
                                }

                                if (serverContent.outputAudioTranscription?.text) {
                                    accumulatedText += serverContent.outputAudioTranscription.text;
                                }

                                if (serverContent.turnComplete) {
                                    if (timeoutId) clearTimeout(timeoutId);

                                    const cleanText = cleanResponseText(accumulatedText);
                                    if (cleanText) {
                                        setConversation(prev => [...prev, {
                                            role: 'assistant',
                                            content: cleanText
                                        }]);
                                    }

                                    if (audioChunks.length > 0) {
                                        setStatus('speaking');
                                        for (const chunk of audioChunks) {
                                            await playPCMAudio(chunk);
                                        }
                                    } else if (cleanText) {
                                        setStatus('speaking');
                                        await speak(cleanText);
                                    }

                                    cleanup();
                                    resolve({ text: cleanText, audioCount: audioChunks.length });
                                    return;
                                }
                            }

                            if (data.error) {
                                cleanup();
                                reject(new Error(data.error.message || 'API error'));
                            }
                        } catch (parseError) {
                            console.error('[Voice] Parse error:', parseError);
                        }
                    };

                    ws.onerror = () => {
                        cleanup();
                        reject(new Error('Connection failed'));
                    };

                    ws.onclose = (event) => {
                        if (event.code === 1011) {
                            const msg = event.reason || 'Server error';
                            reject(new Error(msg.includes('quota') ? 'Quota exceeded' : msg));
                        } else if (!isSetupComplete && event.code !== 1000) {
                            reject(new Error('Connection closed'));
                        }
                    };
                } catch (error) {
                    reject(error);
                }
            })().catch(reject);
        });
    }, [playPCMAudio, speak]);

    // ─────────────────────────────────────────────────────────────────────────
    // PROCESSING
    // ─────────────────────────────────────────────────────────────────────────

    const processStandard = useCallback(async (text) => {
        // Build conversation history for context
        const conversationHistory = conversation.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Add system message for voice-optimized responses
        const messagesWithSystem = [
            { role: 'system', content: CONFIG.STANDARD_SYSTEM_PROMPT },
            ...conversationHistory,
            { role: 'user', content: text }
        ];

        try {
            const chatResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesWithSystem,
                    model: CONFIG.STANDARD_MODEL,
                    temperature: 0.7,
                    max_tokens: 300  // Keep responses concise for voice
                }),
            });

            if (!chatResponse.ok) {
                throw new Error(`API error: ${chatResponse.status}`);
            }

            const data = await chatResponse.json();

            if (data.response) {
                const cleanText = cleanResponseText(data.response);
                setConversation(p => [...p, { role: 'assistant', content: cleanText }]);
                setStatus('speaking');
                await speak(cleanText);
            } else if (data.error) {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('[Voice] Standard mode error:', err);
            // Try fallback model
            const fallbackResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesWithSystem,
                    model: CONFIG.STANDARD_FALLBACK,
                    temperature: 0.7,
                    max_tokens: 300
                }),
            });

            const fallbackData = await fallbackResponse.json();
            if (fallbackData.response) {
                const cleanText = cleanResponseText(fallbackData.response);
                setConversation(p => [...p, { role: 'assistant', content: cleanText }]);
                setStatus('speaking');
                await speak(cleanText);
            } else {
                throw new Error('Both models failed');
            }
        }
    }, [conversation, speak]);

    const processPremium = useCallback(async (text) => {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
                const statusRes = await fetch('/api/gemini/status', {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!statusRes.ok) {
                    throw new Error(`Status check failed: ${statusRes.status}`);
                }

                const statusData = await statusRes.json();

                if (!statusData.available) {
                    setErrorMessage('Premium unavailable. Using standard mode.');
                    setTimeout(() => setErrorMessage(''), 3000);
                    await processStandard(text);
                    return;
                }
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                console.error('[Voice] Status check failed:', fetchErr.message);
                // If status check fails, fall back to standard mode
                setErrorMessage('Server unavailable. Using browser voice.');
                setTimeout(() => setErrorMessage(''), 3000);
                await processStandard(text);
                return;
            }

            await connectToGeminiLive(text);
        } catch (err) {
            console.error('[Voice] Premium error:', err.message);
            setErrorMessage('Falling back to standard mode.');
            setTimeout(() => setErrorMessage(''), 3000);
            await processStandard(text);
        }
    }, [processStandard, connectToGeminiLive]);


    const processUserInput = useCallback(async (text) => {
        if (!text || isProcessingRef.current) return;
        isProcessingRef.current = true;
        setStatus('processing');
        setConversation(p => [...p, { role: 'user', content: text }]);
        setTranscript('');

        try {
            if (isPremium) await processPremium(text);
            else await processStandard(text);
        } catch (error) {
            setErrorMessage(error.message);
            setStatus('error');
        } finally {
            isProcessingRef.current = false;
            setStatus('idle');
            setTimeout(() => {
                if (status !== 'error') startListening();
            }, 500);
        }
    }, [isPremium, startListening, status, processPremium, processStandard]);

    useEffect(() => {
        processRef.current = processUserInput;
    }, [processUserInput]);

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen) return;
        setTimeout(() => {
            conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [conversation, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        setStatus('idle');
        setConversation([]);
        setTranscript('');
        setErrorMessage('');

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'm' && e.ctrlKey) setIsMuted(prev => !prev);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            stopListening();
            window.speechSynthesis?.cancel();
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, stopListening, onClose]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    const handleOrbClick = () => {
        if (status === 'idle' || status === 'error') {
            setStatus('listening');
            setErrorMessage('');
            startListening();
        } else if (status === 'listening') {
            stopListening();
            setStatus('idle');
        } else if (status === 'speaking') {
            window.speechSynthesis?.cancel();
            setStatus('idle');
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'listening': return 'Listening...';
            case 'processing': return isPremium ? 'Neural Processing...' : 'Thinking...';
            case 'speaking': return isPremium ? 'Speaking with Gemini' : 'Responding...';
            case 'error': return errorMessage || 'Error occurred';
            default: return isPremium ? 'Tap to activate' : 'Tap to speak';
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER - PREMIUM MODE
    // ─────────────────────────────────────────────────────────────────────────

    if (isPremium) {
        return (
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-black transition-colors duration-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Subtle Premium Accent Glow (theme-aware) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {/* Top-right violet glow */}
                        <motion.div
                            className="absolute w-[600px] h-[600px] rounded-full"
                            style={{
                                top: '-200px',
                                right: '-200px',
                            }}
                            animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.08, 0.12, 0.08],
                            }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-500/30 via-indigo-500/20 to-transparent dark:from-violet-600/20 dark:via-indigo-600/15 dark:to-transparent" />
                        </motion.div>
                        {/* Bottom-left blue glow */}
                        <motion.div
                            className="absolute w-[500px] h-[500px] rounded-full"
                            style={{
                                bottom: '-150px',
                                left: '-150px',
                            }}
                            animate={{
                                scale: [1.1, 1, 1.1],
                                opacity: [0.06, 0.1, 0.06],
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500/25 via-cyan-500/15 to-transparent dark:from-blue-600/15 dark:via-cyan-600/10 dark:to-transparent" />
                        </motion.div>
                        {/* Center shimmer effect */}
                        <motion.div
                            className="absolute w-[400px] h-[400px] rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            animate={{
                                scale: [0.9, 1.1, 0.9],
                                opacity: [0.02, 0.05, 0.02],
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-r from-violet-400/20 via-pink-400/10 to-indigo-400/20 dark:from-violet-500/10 dark:via-pink-500/5 dark:to-indigo-500/10 blur-2xl" />
                        </motion.div>
                    </div>

                    {/* Header */}
                    <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 border-b border-gray-100 dark:border-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-violet-500/25">
                                <Sparkles className="w-4 h-4" />
                                <span>Premium AI</span>
                            </div>
                            <button
                                onClick={() => setIsPremium(false)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Switch to Standard
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsMuted(!isMuted)}
                                className={cn(
                                    "p-3 rounded-full transition-all",
                                    isMuted
                                        ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                                )}
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </motion.button>
                            {conversation.length > 0 && (
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setConversation([])}
                                    className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-all border border-gray-200 dark:border-gray-700"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </motion.button>
                            )}
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </header>

                    {/* Conversation Area */}
                    <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                        {conversation.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/20 to-indigo-500/20 dark:from-violet-500/10 dark:to-indigo-500/10 blur-xl" />
                                    <Brain className="relative w-20 h-20 text-violet-500 dark:text-violet-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Gemini Live Voice</h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                    Experience natural AI conversation with native audio synthesis.
                                    Tap the orb to begin.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {conversation.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[85%] sm:max-w-[70%] px-5 py-3 rounded-2xl",
                                            msg.role === 'user'
                                                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                                                : "bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                                        )}
                                    >
                                        <p className="text-sm sm:text-base leading-relaxed">{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}

                            {transcript && status === 'listening' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex justify-end"
                                >
                                    <div className="max-w-[85%] px-5 py-3 rounded-2xl bg-violet-100 dark:bg-violet-500/20 border-2 border-violet-400 dark:border-violet-500/50 border-dashed">
                                        <p className="text-sm text-violet-700 dark:text-violet-300">{transcript}</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div ref={conversationEndRef} />
                    </div>

                    {/* Neural Orb */}
                    <div className="relative z-10 pb-safe px-4 py-8 sm:px-6 sm:py-12 border-t border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/50">
                        <div className="flex flex-col items-center gap-6">
                            <motion.button
                                onClick={handleOrbClick}
                                whileTap={{ scale: 0.95 }}
                                className="relative"
                            >
                                {/* Outer glow rings */}
                                {(status === 'listening' || status === 'speaking') && (
                                    <>
                                        <motion.div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                width: '200px',
                                                height: '200px',
                                                left: '-36px',
                                                top: '-36px',
                                            }}
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [0.5, 0.2, 0.5],
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            <div className="w-full h-full rounded-full bg-gradient-to-r from-violet-500/40 via-indigo-500/30 to-blue-500/40" />
                                        </motion.div>
                                        <motion.div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                width: '250px',
                                                height: '250px',
                                                left: '-61px',
                                                top: '-61px',
                                            }}
                                            animate={{
                                                scale: [1.2, 1, 1.2],
                                                opacity: [0.3, 0.5, 0.3],
                                            }}
                                            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                                        >
                                            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500/30 via-cyan-500/20 to-teal-500/30" />
                                        </motion.div>
                                    </>
                                )}

                                {/* Main Orb */}
                                <motion.div
                                    className={cn(
                                        "relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden shadow-2xl",
                                        status === 'listening'
                                            ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500"
                                            : status === 'speaking'
                                                ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
                                                : status === 'processing'
                                                    ? "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
                                                    : "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800"
                                    )}
                                    style={{
                                        boxShadow: status === 'listening'
                                            ? '0 0 60px rgba(139,92,246,0.4), 0 0 100px rgba(99,102,241,0.2)'
                                            : status === 'speaking'
                                                ? '0 0 60px rgba(16,185,129,0.4), 0 0 100px rgba(20,184,166,0.2)'
                                                : '0 10px 40px rgba(0,0,0,0.15)',
                                    }}
                                    animate={{
                                        scale: status === 'listening' ? (1 + audioLevel * 0.3) : 1,
                                    }}
                                >
                                    {/* Inner gradient overlay */}
                                    <div
                                        className="absolute inset-0 rounded-full opacity-50"
                                        style={{
                                            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
                                        }}
                                    />

                                    {/* Icon */}
                                    {status === 'listening' ? (
                                        <AudioWaveform className="w-14 h-14 text-white relative z-10" />
                                    ) : status === 'speaking' ? (
                                        <Volume2 className="w-14 h-14 text-white relative z-10 animate-pulse" />
                                    ) : status === 'processing' ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Zap className="w-14 h-14 text-white relative z-10" />
                                        </motion.div>
                                    ) : (
                                        <Mic className="w-14 h-14 text-white relative z-10" />
                                    )}
                                </motion.div>
                            </motion.button>

                            {/* Status */}
                            <div className="text-center">
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{getStatusText()}</p>
                                {status === 'listening' && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Speak naturally...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER - STANDARD MODE
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-white dark:bg-black flex flex-col transition-colors duration-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold">
                            <Mic className="w-4 h-4" />
                            <span>Standard</span>
                        </div>
                        <button
                            onClick={() => setIsPremium(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:opacity-90 transition-opacity"
                        >
                            <Sparkles className="w-3 h-3" />
                            Upgrade to Premium
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "p-3 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center",
                                isMuted
                                    ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                            )}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </motion.button>
                        {conversation.length > 0 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setConversation([])}
                                className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                <Trash2 className="w-5 h-5" />
                            </motion.button>
                        )}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>
                </header>

                {/* Conversation Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    {conversation.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Mic className="w-10 h-10 text-gray-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                Standard Voice Mode
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                Fast, browser-based voice interaction. Tap the button below to start.
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {conversation.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}
                            >
                                <div
                                    className={cn(
                                        "max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl",
                                        msg.role === 'user'
                                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                    )}
                                >
                                    <p className="text-sm sm:text-base">{msg.content}</p>
                                </div>
                            </motion.div>
                        ))}

                        {transcript && status === 'listening' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-end"
                            >
                                <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-gray-200 dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 border-dashed">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{transcript}</p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div ref={conversationEndRef} />
                </div>

                {/* Simple Orb */}
                <div className="pb-safe px-4 py-8 sm:px-6 sm:py-10 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col items-center gap-4">
                        <motion.button
                            onClick={handleOrbClick}
                            whileTap={{ scale: 0.95 }}
                            className="relative"
                        >
                            {/* Pulse */}
                            {status === 'listening' && (
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-blue-500"
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.3, 0, 0.3],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    style={{ width: '128px', height: '128px' }}
                                />
                            )}

                            <motion.div
                                className={cn(
                                    "w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-xl",
                                    status === 'listening'
                                        ? "bg-blue-500"
                                        : status === 'speaking'
                                            ? "bg-green-500"
                                            : status === 'processing'
                                                ? "bg-amber-500"
                                                : "bg-gray-400 dark:bg-gray-600"
                                )}
                                animate={{
                                    scale: status === 'listening' ? (1 + audioLevel * 0.2) : 1,
                                }}
                            >
                                {status === 'listening' ? (
                                    <Mic className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                                ) : status === 'speaking' ? (
                                    <Volume2 className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-pulse" />
                                ) : (
                                    <MicOff className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                                )}
                            </motion.div>
                        </motion.button>

                        <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {getStatusText()}
                            </p>
                            {status === 'listening' && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Speak clearly...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
