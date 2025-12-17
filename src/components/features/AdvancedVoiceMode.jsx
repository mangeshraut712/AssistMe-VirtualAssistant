/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE MODE 6.0 - Modern, Compact, Feature-Rich
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Clean modern UI for mobile and desktop
 * - Collapsible settings panel
 * - Conversation display
 * - Gemini Premium + OpenRouter Standard support
 * - Real-time audio visualization
 * - Better error handling
 * 
 * @version 6.0.0
 * @date December 2025
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mic, MicOff, Settings, Volume2, VolumeX,
    MessageSquare, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    SILENCE_TIMEOUT: 1500,
    MIN_TRANSCRIPT_LENGTH: 3,

    // Models
    GEMINI_MODEL: 'google/gemini-2.5-flash',  // OpenRouter Gemini
    PREMIUM_MODEL: 'gemini-2.5-flash-native-audio-dialog', // Native Gemini (unlimited)

    // TTS
    TTS_ENDPOINT: '/api/tts',
};

// Languages
const LANGUAGES = {
    'en-US': { name: 'English', flag: '🇺🇸', code: 'en-US' },
    'hi-IN': { name: 'हिंदी', flag: '🇮🇳', code: 'hi-IN' },
    'mr-IN': { name: 'मराठी', flag: '🇮🇳', code: 'mr-IN' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdvancedVoiceMode({ isOpen, onClose }) {
    // State
    const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking, error
    const [conversation, setConversation] = useState([]);
    const [transcript, setTranscript] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [language, setLanguage] = useState('en-US');
    const [ttsMode, setTtsMode] = useState('premium'); // premium or standard
    const [audioLevel, setAudioLevel] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    // Refs
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const conversationEndRef = useRef(null);

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
        recognition.lang = language;

        recognition.onstart = () => {
            console.log('[Voice] Started listening');
            setStatus('listening');
            setTranscript('');
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

            setTranscript(interimTranscript || finalTranscript);

            // Reset silence timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            silenceTimerRef.current = setTimeout(() => {
                if (finalTranscript.trim().length >= CONFIG.MIN_TRANSCRIPT_LENGTH) {
                    recognition.stop();
                    processUserInput(finalTranscript.trim());
                }
            }, CONFIG.SILENCE_TIMEOUT);
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
            if (status === 'listening' && !isProcessingRef.current) {
                // Auto-restart if still in listening mode
                setTimeout(() => recognition.start(), 100);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [language, status]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // AI PROCESSING
    // ─────────────────────────────────────────────────────────────────────────

    const processUserInput = useCallback(async (text) => {
        if (!text || isProcessingRef.current) return;

        isProcessingRef.current = true;
        setStatus('processing');

        // Add user message to conversation
        setConversation(prev => [...prev, { role: 'user', content: text }]);
        setTranscript('');

        try {
            // Use Gemini via OpenRouter for standard, native Gemini for premium
            const model = ttsMode === 'premium' ? CONFIG.PREMIUM_MODEL : CONFIG.GEMINI_MODEL;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a helpful voice assistant. Keep responses SHORT (1-2 sentences max). No markdown. Respond in ${LANGUAGES[language].name}.`
                        },
                        ...conversation.map(msg => ({ role: msg.role, content: msg.content })),
                        { role: 'user', content: text }
                    ],
                }),
            });

            if (!response.ok) {
                throw new Error(`AI error: ${response.status}`);
            }

            const data = await response.json();
            const aiMessage = data.choices[0]?.message?.content || 'Sorry, I could not respond.';

            // Add AI response to conversation
            setConversation(prev => [...prev, { role: 'assistant', content: aiMessage }]);

            // Speak the response
            await speak(aiMessage);

        } catch (error) {
            console.error('[Voice] AI error:', error);
            setErrorMessage('Failed to process request');
            setStatus('error');
        } finally {
            isProcessingRef.current = false;
            if (status !== 'error') {
                setStatus('idle');
                setTimeout(startListening, 500);
            }
        }
    }, [conversation, language, ttsMode, startListening]);

    // ─────────────────────────────────────────────────────────────────────────
    // TEXT TO SPEECH
    // ─────────────────────────────────────────────────────────────────────────

    const speak = useCallback(async (text) => {
        if (!text || isMuted) return;

        setStatus('speaking');

        try {
            if (ttsMode === 'premium') {
                // Use Gemini TTS via backend
                const response = await fetch(CONFIG.TTS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        language: language,
                        model: 'native',
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.audio) {
                        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
                        await audio.play();
                        await new Promise(resolve => {
                            audio.onended = resolve;
                        });
                    }
                }
            } else {
                // Use browser TTS
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = language;
                utterance.rate = 0.95;
                window.speechSynthesis.speak(utterance);
                await new Promise(resolve => {
                    utterance.onend = resolve;
                });
            }
        } catch (error) {
            console.error('[Voice] TTS error:', error);
        } finally {
            setStatus('idle');
        }
    }, [isMuted, language, ttsMode]);

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen) return;

        // Auto-scroll conversation
        setTimeout(() => {
            conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [conversation, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        // Reset and start
        setStatus('idle');
        setConversation([]);
        setTranscript('');
        setErrorMessage('');

        return () => {
            stopListening();
            window.speechSynthesis?.cancel();
        };
    }, [isOpen, stopListening]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    const getStatusColor = () => {
        switch (status) {
            case 'listening': return 'from-blue-500 to-cyan-500';
            case 'processing': return 'from-amber-500 to-orange-500';
            case 'speaking': return 'from-emerald-500 to-teal-500';
            case 'error': return 'from-red-500 to-rose-500';
            default: return 'from-neutral-400 to-neutral-500';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'listening': return 'Listening...';
            case 'processing': return 'Thinking...';
            case 'speaking': return 'Speaking...';
            case 'error': return errorMessage;
            default: return 'Tap to speak';
        }
    };

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

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-gradient-to-b from-white via-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-950 dark:to-black flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs sm:text-sm font-semibold">
                            <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Voice Mode</span>
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            {LANGUAGES[language].flag} {LANGUAGES[language].name}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "p-2 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center",
                                isMuted ? "bg-red-500/20 text-red-500" : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            )}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                "p-2 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center",
                                showSettings ? "bg-purple-500 text-white" : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            )}
                        >
                            <Settings className="w-5 h-5" />
                        </motion.button>
                        {conversation.length > 0 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setConversation([])}
                                className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-red-500 hover:text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                            >
                                <Trash2 className="w-5 h-5" />
                            </motion.button>
                        )}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-red-500 hover:text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>
                </header>

                {/* Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-b border-neutral-200 dark:border-neutral-800"
                        >
                            <div className="p-4 sm:p-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl space-y-4">
                                {/* TTS Mode */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 text-neutral-900 dark:text-white">Voice Quality</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'premium', name: 'Premium', desc: 'Gemini Native (Unlimited)' },
                                            { key: 'standard', name: 'Standard', desc: 'Browser TTS (Fast)' }
                                        ].map(mode => (
                                            <button
                                                key={mode.key}
                                                onClick={() => setTtsMode(mode.key)}
                                                className={cn(
                                                    "px-3 py-2 rounded-lg text-left transition-all border-2",
                                                    ttsMode === mode.key
                                                        ? "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-400"
                                                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                )}
                                            >
                                                <div className="text-sm font-semibold">{mode.name}</div>
                                                <div className="text-xs opacity-70">{mode.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Language */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 text-neutral-900 dark:text-white">Language</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(LANGUAGES).map(([code, lang]) => (
                                            <button
                                                key={code}
                                                onClick={() => setLanguage(code)}
                                                className={cn(
                                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all border-2",
                                                    language === code
                                                        ? "bg-green-500/20 border-green-500 text-green-600 dark:text-green-400"
                                                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                )}
                                            >
                                                {lang.flag} {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Conversation Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-4">
                    {conversation.length === 0 && (
                        <div className="text-center py-12">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
                            <p className="text-neutral-500 dark:text-neutral-400">Start speaking to begin conversation</p>
                        </div>
                    )}

                    {conversation.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex",
                                msg.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl",
                                msg.role === 'user'
                                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            )}>
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
                            <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl bg-purple-500/20 border-2 border-purple-500 border-dashed text-purple-600 dark:text-purple-400">
                                <p className="text-sm sm:text-base">{transcript}</p>
                            </div>
                        </motion.div>
                    )}

                    <div ref={conversationEndRef} />
                </div>

                {/* Orb and Status */}
                <div className="pb-safe px-4 py-6 sm:px-6 sm:py-8 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex flex-col items-center gap-4">
                        {/* Main Orb */}
                        <motion.button
                            onClick={handleOrbClick}
                            whileTap={{ scale: 0.95 }}
                            className="relative"
                        >
                            <motion.div
                                className={cn(
                                    "w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br shadow-2xl flex items-center justify-center",
                                    getStatusColor()
                                )}
                                animate={{
                                    scale: status === 'listening' ? [1, 1.05, 1] : 1,
                                }}
                                transition={{
                                    repeat: status === 'listening' ? Infinity : 0,
                                    duration: 1.5,
                                }}
                            >
                                {status === 'listening' ? (
                                    <Mic className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                                ) : (
                                    <MicOff className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                                )}
                            </motion.div>
                        </motion.button>

                        {/* Status Text */}
                        <div className="text-center">
                            <p className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-white">
                                {getStatusText()}
                            </p>
                            {status === 'listening' && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                    Speak now...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
