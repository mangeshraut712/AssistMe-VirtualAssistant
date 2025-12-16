/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE MODE 5.1 - Fast & Responsive Human-AI Conversation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * FIXES:
 * - Removed artificial thinking delays for faster response
 * - Improved speech recognition reliability
 * - Better state management
 * - Fixed initial start issues
 * - Shows transcript while listening
 * 
 * @version 5.1.0
 * @date December 2025
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mic, MicOff, Settings, Sparkles, Globe,
    MessageSquare, Volume2, VolumeX, RefreshCw, Waves,
    User, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Optimized for Speed
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Faster silence detection
    SILENCE_TIMEOUT: 1500,
    MIN_TRANSCRIPT_LENGTH: 3,

    // No artificial delays!
    RESTART_DELAY: 300,

    // Use fast Gemini model (FREE!)
    CHAT_MODEL: 'google/gemini-2.0-flash-exp:free',
};

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

const LANGUAGES = {
    'en-US': { name: 'English', nativeName: 'English', flag: '🇺🇸' },
    'hi-IN': { name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
    'mr-IN': { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONAS = {
    default: {
        name: 'AssistMe',
        emoji: '🎙️',
        rate: 0.95,
        pitch: 1.0,
        systemPrompt: `You are AssistMe, a friendly multilingual voice assistant.

RULES:
- Keep responses SHORT (1-2 sentences max)
- Sound natural and conversational
- No markdown, no lists, no formatting - this is spoken dialogue
- Respond in the SAME LANGUAGE the user speaks to you
- If user speaks Marathi, respond in Marathi
- If user speaks Hindi, respond in Hindi
- If user speaks English, respond in English`,
    },
    friendly: {
        name: 'Buddy',
        emoji: '😊',
        rate: 1.0,
        pitch: 1.05,
        systemPrompt: `You are Buddy, a super friendly multilingual assistant!
Keep it SHORT (1-2 sentences). Be casual and warm. No formatting.
Respond in the same language the user speaks.`,
    },
    professional: {
        name: 'Expert',
        emoji: '💼',
        rate: 0.9,
        pitch: 0.95,
        systemPrompt: `You are Expert, a professional multilingual advisor.
Be direct and brief (1-2 sentences max). No formatting.
Respond in the same language the user speaks.`,
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const normalizeForSpeech = (text) => {
    if (!text) return '';
    return text
        .replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')
        .replace(/#{1,6}\s?/g, '').replace(/\n+/g, '. ')
        .replace(/•|-\s/g, '').replace(/\d+\.\s/g, '')
        .replace(/\s+/g, ' ').trim();
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdvancedVoiceMode({ isOpen, onClose, backendUrl = '' }) {
    // State
    const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking, error
    const [persona, setPersona] = useState('default');
    const [language, setLanguage] = useState('en-US'); // Speech recognition language
    const [showSettings, setShowSettings] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Conversation
    const [transcript, setTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [conversation, setConversation] = useState([]);

    // Audio
    const [audioLevel, setAudioLevel] = useState(0);

    // Error
    const [errorMessage, setErrorMessage] = useState('');

    // Refs
    const statusRef = useRef('idle');
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const synthRef = useRef(null);
    const streamRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const isProcessingRef = useRef(false);
    const messagesEndRef = useRef(null);

    // Initialize synth
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
            // Pre-load voices
            synthRef.current?.getVoices();
        }
    }, []);

    // Sync status ref
    useEffect(() => {
        statusRef.current = status;
        console.log('[VoiceMode] Status:', status);
    }, [status]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation, aiResponse]);

    // ─────────────────────────────────────────────────────────────────────────
    // TEXT TO SPEECH - Hybrid: Backend for Indian languages, Browser for English
    // ─────────────────────────────────────────────────────────────────────────

    // Check if language is Indian (needs backend TTS)
    const isIndicLanguage = (lang) => ['hi-IN', 'mr-IN', 'ta-IN', 'te-IN', 'bn-BD'].includes(lang);

    // Try backend TTS (Gemini 2.5 Flash TTS - supports Indian languages)
    const speakWithBackend = useCallback(async (text, langCode, onEnd) => {
        try {
            console.log('[TTS] Trying backend TTS for:', langCode);

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice: 'Puck',
                    auto_emotion: true,
                })
            });

            if (!response.ok) {
                console.log('[TTS] Backend failed, status:', response.status);
                return false;
            }

            const data = await response.json();
            if (!data.success || !data.audio) {
                console.log('[TTS] No audio in response');
                return false;
            }

            // Play the audio
            console.log('[TTS] Playing backend audio');
            setStatus('speaking');

            const audioData = `data:audio/wav;base64,${data.audio}`;
            const audio = new Audio(audioData);

            audio.onended = () => {
                console.log('[TTS] Backend audio ended');
                setStatus('idle');
                if (onEnd) onEnd();
            };

            audio.onerror = (e) => {
                console.error('[TTS] Audio playback error:', e);
                setStatus('idle');
                if (onEnd) onEnd();
            };

            await audio.play();
            return true;

        } catch (e) {
            console.error('[TTS] Backend error:', e);
            return false;
        }
    }, []);

    // Browser TTS (for English)
    const speakWithBrowser = useCallback((text, onEnd) => {
        if (!synthRef.current) {
            if (onEnd) onEnd();
            return;
        }

        synthRef.current.cancel();
        const cleanText = normalizeForSpeech(text);
        if (!cleanText) {
            if (onEnd) onEnd();
            return;
        }

        console.log('[TTS] Browser TTS:', cleanText.substring(0, 50) + '...');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const personaConfig = PERSONAS[persona] || PERSONAS.default;

        utterance.rate = personaConfig.rate;
        utterance.pitch = personaConfig.pitch;
        utterance.volume = 1.0;

        // Find best voice for the language
        const voices = synthRef.current.getVoices();
        const langPrefix = language.split('-')[0];

        let voice = voices.find(v => v.lang.startsWith(langPrefix));
        if (!voice && language !== 'en-US') {
            // Fallback to English if no voice for selected language
            voice = voices.find(v => v.lang.startsWith('en'));
        }
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
            setStatus('speaking');
        };

        utterance.onend = () => {
            setStatus('idle');
            if (onEnd) onEnd();
        };

        utterance.onerror = () => {
            setStatus('idle');
            if (onEnd) onEnd();
        };

        synthRef.current.speak(utterance);
    }, [persona, language]);

    // Main speak function - hybrid approach
    const speak = useCallback(async (text, onEnd) => {
        if (!text || isMuted) {
            console.log('[TTS] Skipping - muted or no text');
            if (onEnd) onEnd();
            return;
        }

        // For Indian languages, try backend TTS first
        if (isIndicLanguage(language)) {
            const success = await speakWithBackend(text, language, onEnd);
            if (success) return;

            // If backend fails, show text (browser can't speak Indic well)
            console.log('[TTS] Backend unavailable, showing text only');
            setStatus('idle');
            if (onEnd) onEnd();
            return;
        }

        // For English, use browser TTS
        speakWithBrowser(text, onEnd);
    }, [isMuted, language, speakWithBackend, speakWithBrowser]);

    const stopSpeaking = useCallback(() => {
        synthRef.current?.cancel();
        if (statusRef.current === 'speaking') {
            setStatus('idle');
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIO MONITORING
    // ─────────────────────────────────────────────────────────────────────────

    const startAudioMonitoring = useCallback((stream) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = { ctx, analyser };

            const dataArray = new Float32Array(analyser.fftSize);
            let smoothed = 0;

            const update = () => {
                if (!analyserRef.current) return;
                analyser.getFloatTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
                const rms = Math.sqrt(sum / dataArray.length);
                smoothed = smoothed * 0.8 + rms * 0.2;
                setAudioLevel(Math.min(1, smoothed * 15));
                animationFrameRef.current = requestAnimationFrame(update);
            };
            update();
        } catch (e) {
            console.error('[Audio] Monitoring error:', e);
        }
    }, []);

    const stopAudioMonitoring = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (analyserRef.current) {
            try { analyserRef.current.ctx.close(); } catch (e) { }
            analyserRef.current = null;
        }
        setAudioLevel(0);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // AI RESPONSE - No artificial delays!
    // ─────────────────────────────────────────────────────────────────────────

    const generateResponse = useCallback(async (userText) => {
        console.log('[AI] Generating response for:', userText);

        const personaConfig = PERSONAS[persona] || PERSONAS.default;

        try {
            const response = await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: personaConfig.systemPrompt },
                        ...conversation.slice(-6).map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userText }
                    ],
                    model: CONFIG.CHAT_MODEL,
                    max_tokens: 100, // Keep short for fast response
                    temperature: 0.8,
                })
            });

            if (!response.ok) {
                console.error('[AI] API error:', response.status);
                throw new Error('API failed');
            }

            const data = await response.json();
            return data.response || "I'm sorry, I didn't catch that.";

        } catch (e) {
            console.error('[AI] Error:', e);
            return "Sorry, I'm having connection issues.";
        }
    }, [conversation, persona]);

    // ─────────────────────────────────────────────────────────────────────────
    // PROCESS USER INPUT
    // ─────────────────────────────────────────────────────────────────────────

    const processUserInput = useCallback(async (userText) => {
        if (!userText.trim() || userText.length < CONFIG.MIN_TRANSCRIPT_LENGTH) {
            console.log('[Process] Text too short, ignoring');
            return;
        }

        if (isProcessingRef.current) {
            console.log('[Process] Already processing, ignoring');
            return;
        }

        console.log('[Process] Processing:', userText);
        isProcessingRef.current = true;
        setStatus('processing');
        setTranscript('');

        // Add user message
        const newConversation = [...conversation, { role: 'user', content: userText }];
        setConversation(newConversation);

        // Generate and speak response
        const response = await generateResponse(userText);

        console.log('[Process] Got response:', response.substring(0, 50) + '...');

        setAiResponse(response);
        setConversation([...newConversation, { role: 'assistant', content: response }]);

        // Speak the response
        speak(response, () => {
            console.log('[Process] Done speaking, restarting listening');
            isProcessingRef.current = false;
            // Auto-restart listening after AI speaks
            setTimeout(() => {
                if (statusRef.current === 'idle') {
                    startListening();
                }
            }, CONFIG.RESTART_DELAY);
        });
    }, [conversation, generateResponse, speak]);

    // ─────────────────────────────────────────────────────────────────────────
    // SPEECH RECOGNITION
    // ─────────────────────────────────────────────────────────────────────────

    const startListening = useCallback(async () => {
        // Don't start if already listening or processing
        if (statusRef.current !== 'idle') {
            console.log('[STT] Not idle, cannot start. Current status:', statusRef.current);
            return;
        }

        console.log('[STT] Starting listening...');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage('Speech recognition not supported.');
            setStatus('error');
            return;
        }

        // Get microphone
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            streamRef.current = stream;
            startAudioMonitoring(stream);
            console.log('[STT] Microphone ready');
        } catch (e) {
            console.error('[STT] Microphone error:', e);
            setErrorMessage('Microphone access denied.');
            setStatus('error');
            return;
        }

        // Setup recognition
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        let currentTranscript = '';

        recognition.onstart = () => {
            console.log('[STT] Recognition started');
            setStatus('listening');
            currentTranscript = '';
            setTranscript('');
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript + ' ';
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                currentTranscript += final;
            }

            const displayText = (currentTranscript + interim).trim();
            setTranscript(displayText);
            console.log('[STT] Transcript:', displayText);

            // Reset silence timer on any input
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            // Set silence timer - will trigger processing when user stops speaking
            silenceTimerRef.current = setTimeout(() => {
                const finalText = currentTranscript.trim();
                if (finalText.length >= CONFIG.MIN_TRANSCRIPT_LENGTH) {
                    console.log('[STT] Silence detected, stopping recognition');
                    recognition.stop();
                }
            }, CONFIG.SILENCE_TIMEOUT);
        };

        recognition.onend = () => {
            console.log('[STT] Recognition ended');

            // Clear any pending timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }

            const finalText = currentTranscript.trim();

            if (finalText.length >= CONFIG.MIN_TRANSCRIPT_LENGTH && !isProcessingRef.current) {
                // Process the transcript
                processUserInput(finalText);
            } else if (statusRef.current === 'listening' && !isProcessingRef.current) {
                // No valid input, restart listening
                console.log('[STT] No valid input, restarting...');
                setTimeout(() => {
                    if (statusRef.current === 'listening') {
                        try { recognition.start(); } catch (e) { console.log('[STT] Restart failed:', e); }
                    }
                }, 100);
            }
        };

        recognition.onerror = (event) => {
            console.log('[STT] Error:', event.error);

            if (event.error === 'no-speech') {
                // Just restart if no speech detected
                setTimeout(() => {
                    if (statusRef.current === 'listening' && !isProcessingRef.current) {
                        try { recognition.start(); } catch (e) { }
                    }
                }, 100);
            } else if (event.error !== 'aborted') {
                setErrorMessage('Speech recognition error: ' + event.error);
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e) {
            console.error('[STT] Start error:', e);
        }
    }, [startAudioMonitoring, processUserInput]);

    const stopListening = useCallback(() => {
        console.log('[STT] Stopping...');

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
            recognitionRef.current = null;
        }

        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        stopAudioMonitoring();
    }, [stopAudioMonitoring]);

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    // Start listening when opened
    useEffect(() => {
        if (!isOpen) return;

        console.log('[Lifecycle] Voice mode opened');

        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setStatus('error');
            setErrorMessage('Speech recognition not supported. Use Chrome or Edge.');
            return;
        }

        // Reset state
        setStatus('idle');
        setConversation([]);
        setAiResponse('');
        setTranscript('');
        setErrorMessage('');
        isProcessingRef.current = false;

        // Auto-start listening after a brief delay
        const timer = setTimeout(() => {
            console.log('[Lifecycle] Auto-starting listening');
            startListening();
        }, 500);

        return () => {
            clearTimeout(timer);
            stopListening();
            stopSpeaking();
        };
    }, [isOpen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening();
            stopSpeaking();
        };
    }, [stopListening, stopSpeaking]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    const getOrbColor = () => {
        switch (status) {
            case 'error': return 'from-red-500 to-rose-600';
            case 'speaking': return 'from-emerald-400 to-teal-500';
            case 'processing': return 'from-amber-400 to-orange-500';
            case 'listening': return 'from-blue-400 to-cyan-500';
            default: return 'from-slate-400 to-slate-500';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'listening': return audioLevel > 0.1 ? 'Hearing you...' : 'Listening...';
            case 'processing': return 'Thinking...';
            case 'speaking': return 'Speaking...';
            case 'error': return errorMessage || 'Error';
            default: return 'Tap to start';
        }
    };

    const handleOrbClick = () => {
        console.log('[UI] Orb clicked, status:', status);

        switch (status) {
            case 'speaking':
                stopSpeaking();
                break;
            case 'error':
                setStatus('idle');
                setErrorMessage('');
                setTimeout(startListening, 100);
                break;
            case 'idle':
                startListening();
                break;
            case 'listening':
                stopListening();
                setStatus('idle');
                break;
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
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-muted/50 border border-border/50">
                            <Globe className="w-4 h-4" />
                            <span>Voice Mode</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted/30 border border-border/30">
                            <span>{LANGUAGES[language]?.flag}</span>
                            <span className="hidden sm:inline">{LANGUAGES[language]?.nativeName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted/30 border border-border/30">
                            <span>{PERSONAS[persona]?.emoji}</span>
                            <span className="hidden sm:inline">{PERSONAS[persona]?.name}</span>
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

                {/* Settings */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 sm:px-6 pb-4 overflow-hidden"
                        >
                            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 space-y-4">
                                {/* Language */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Language</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {Object.entries(LANGUAGES).map(([code, lang]) => (
                                            <button
                                                key={code}
                                                onClick={() => setLanguage(code)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                                                    language === code
                                                        ? "bg-green-500/20 border-green-500 text-green-600 dark:text-green-400"
                                                        : "border-border/50 hover:bg-muted"
                                                )}
                                            >
                                                <span className="mr-1">{lang.flag}</span>
                                                {lang.nativeName}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Persona */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-2">Voice Persona</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {Object.entries(PERSONAS).map(([key, p]) => (
                                            <button
                                                key={key}
                                                onClick={() => setPersona(key)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
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

                {/* Main Orb */}
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div className="relative cursor-pointer" onClick={handleOrbClick}>
                        {/* Outer Glow */}
                        <motion.div
                            animate={{
                                scale: status === 'listening' ? 1 + audioLevel * 0.5 : status === 'speaking' ? [1, 1.2, 1] : 1,
                                opacity: status === 'idle' ? 0.1 : 0.4
                            }}
                            transition={{ repeat: status === 'speaking' ? Infinity : 0, duration: 0.5 }}
                            className={cn("absolute -inset-10 sm:-inset-14 rounded-full blur-3xl bg-gradient-to-br", getOrbColor())}
                        />

                        {/* Core Orb */}
                        <motion.div
                            animate={{
                                scale: status === 'speaking' ? [1, 1.08, 0.96, 1.04, 1] : status === 'processing' ? [1, 0.95, 1] : 1,
                            }}
                            transition={{ repeat: Infinity, duration: status === 'speaking' ? 0.5 : 1.5 }}
                            className={cn(
                                "w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-2xl relative z-10 bg-gradient-to-br",
                                getOrbColor()
                            )}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={status}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="text-white"
                                >
                                    {status === 'listening' && <Mic className="w-12 h-12 sm:w-14 sm:h-14" />}
                                    {status === 'processing' && <Sparkles className="w-12 h-12 sm:w-14 sm:h-14 animate-pulse" />}
                                    {status === 'speaking' && <Waves className="w-12 h-12 sm:w-14 sm:h-14" />}
                                    {status === 'idle' && <MicOff className="w-10 h-10 sm:w-12 sm:h-12 opacity-70" />}
                                    {status === 'error' && <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12" />}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    {/* Status */}
                    <motion.div
                        key={status}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 text-center max-w-md px-4"
                    >
                        <h2 className="text-xl sm:text-2xl font-medium mb-2">
                            {getStatusText()}
                        </h2>
                        {/* Show transcript while listening */}
                        {status === 'listening' && (
                            <p className="text-sm text-muted-foreground min-h-[1.5rem]">
                                {transcript || 'Say something...'}
                            </p>
                        )}
                        {status === 'speaking' && (
                            <p className="text-sm text-muted-foreground">Tap orb to stop</p>
                        )}
                    </motion.div>
                </div>

                {/* Conversation */}
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
                                    className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}
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

                            {/* Show AI response while processing */}
                            {status === 'processing' && aiResponse && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-start">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-muted rounded-bl-md text-sm">
                                        {aiResponse}
                                        <span className="inline-block w-2 h-4 bg-foreground/30 ml-1 animate-pulse" />
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
