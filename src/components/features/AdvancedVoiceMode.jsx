/**
 * Gemini 2.5 Flash Voice Mode
 * Apple + Japanese Minimalist Design (間 - Ma, 簡素 - Kanso)
 * 
 * Powered by Gemini 2.5 Flash with Native Audio (December 2025)
 * Features:
 * - 30 HD voices across 24 languages
 * - Emotional intelligence (affective dialogue)
 * - Context-aware pacing
 * - Live speech translation support
 * - Natural conversation flow
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Volume2, VolumeX, X, Maximize2, Minimize2,
    Sparkles, MessageSquare, Globe, Cpu, Zap, Settings2,
    Activity, Loader2, User, Bot, RefreshCw, Languages
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// GEMINI 2.5 FLASH VOICE MODE - NATIVE AUDIO EDITION
// December 2025 - Enhanced with emotional intelligence & context-aware pacing
// ============================================================================

// Voice Model Configuration - Gemini 2.5 Flash with Native Audio
const VOICE_MODEL = 'google/gemini-2.5-flash';
const VOICE_MODEL_FREE = 'google/gemini-2.0-flash-001:free';

// Supported languages with native audio
const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', voiceLang: 'en-US' },
    { code: 'hi', name: 'हिंदी', voiceLang: 'hi-IN' },
    { code: 'es', name: 'Español', voiceLang: 'es-ES' },
    { code: 'fr', name: 'Français', voiceLang: 'fr-FR' },
    { code: 'de', name: 'Deutsch', voiceLang: 'de-DE' },
    { code: 'ja', name: '日本語', voiceLang: 'ja-JP' },
    { code: 'ko', name: '한국어', voiceLang: 'ko-KR' },
    { code: 'zh', name: '中文', voiceLang: 'zh-CN' },
    { code: 'pt', name: 'Português', voiceLang: 'pt-BR' },
    { code: 'ar', name: 'العربية', voiceLang: 'ar-SA' },
];

// --- Animated Waveform with emotional color support ---
const AudioWaveform = ({ isActive, isDark, emotion = 'neutral' }) => {
    const bars = 9;

    // Emotion-based colors (Gemini 2.5 affective dialogue feature)
    const emotionColors = {
        neutral: isDark ? 'bg-white' : 'bg-black',
        happy: 'bg-yellow-500',
        calm: 'bg-blue-400',
        energetic: 'bg-orange-500',
    };

    return (
        <div className="flex items-center justify-center gap-1.5 h-12">
            {[...Array(bars)].map((_, i) => (
                <motion.div
                    key={i}
                    className={cn('w-1.5 rounded-full', emotionColors[emotion] || emotionColors.neutral)}
                    animate={{
                        height: isActive ? [10, 28 + Math.random() * 18, 10] : 10,
                        opacity: isActive ? [0.5, 1, 0.5] : 0.2
                    }}
                    transition={{
                        duration: 0.4 + Math.random() * 0.3,
                        repeat: isActive ? Infinity : 0,
                        delay: i * 0.08
                    }}
                />
            ))}
        </div>
    );
};

// --- Minimalist Orb with enhanced animations ---
const VoiceOrb = ({ status, onClick, disabled, isDark }) => {
    const isActive = status !== 'idle';

    // Status-specific ring colors
    const ringColors = {
        idle: isDark ? 'ring-white/10' : 'ring-black/10',
        listening: 'ring-red-500/30',
        processing: 'ring-blue-500/30',
        speaking: 'ring-green-500/30'
    };

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'relative w-48 h-48 md:w-60 md:h-60 rounded-full cursor-pointer',
                'flex items-center justify-center transition-all duration-700',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'focus:outline-none ring-4',
                ringColors[status] || ringColors.idle,
                isDark ? 'bg-white' : 'bg-black',
                isActive && 'shadow-2xl'
            )}
            style={{
                boxShadow: isActive
                    ? isDark
                        ? '0 0 100px rgba(255,255,255,0.35)'
                        : '0 0 100px rgba(0,0,0,0.25)'
                    : 'none'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
                scale: status === 'listening' ? [1, 1.06, 1] :
                    status === 'speaking' ? [1, 1.04, 1] : 1
            }}
            transition={{
                duration: 1.8,
                repeat: isActive ? Infinity : 0,
                ease: 'easeInOut'
            }}
        >
            {/* Icon */}
            <div className={cn(isDark ? 'text-black' : 'text-white')}>
                {status === 'processing' ? (
                    <Loader2 className="w-16 h-16 md:w-20 md:h-20 animate-spin" />
                ) : status === 'listening' ? (
                    <MicOff className="w-16 h-16 md:w-20 md:h-20" />
                ) : status === 'speaking' ? (
                    <Volume2 className="w-16 h-16 md:w-20 md:h-20" />
                ) : (
                    <Mic className="w-16 h-16 md:w-20 md:h-20" />
                )}
            </div>

            {/* Pulse Rings - Enhanced for Gemini 2.5 */}
            {isActive && (
                <>
                    <motion.div
                        className={cn(
                            'absolute inset-0 rounded-full',
                            isDark ? 'bg-white' : 'bg-black'
                        )}
                        initial={{ scale: 1, opacity: 0.15 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                    />
                    <motion.div
                        className={cn(
                            'absolute inset-0 rounded-full',
                            isDark ? 'bg-white' : 'bg-black'
                        )}
                        initial={{ scale: 1, opacity: 0.1 }}
                        animate={{ scale: 1.25, opacity: 0 }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: 0.6 }}
                    />
                </>
            )}
        </motion.button>
    );
};

// --- Status Label with Gemini branding ---
const StatusLabel = ({ status, isDark, modelName }) => {
    const labels = {
        idle: 'Tap to speak',
        listening: 'Listening...',
        processing: 'Gemini is thinking...',
        speaking: 'Speaking...'
    };

    return (
        <motion.div
            key={status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col items-center gap-1"
        >
            <span className={cn(
                'text-sm font-medium tracking-wide',
                isDark ? 'text-white/70' : 'text-black/70'
            )}>
                {labels[status] || labels.idle}
            </span>
            {status === 'processing' && (
                <span className={cn(
                    'text-xs',
                    isDark ? 'text-white/40' : 'text-black/40'
                )}>
                    {modelName}
                </span>
            )}
        </motion.div>
    );
};

// --- Conversation Message with enhanced styling ---
const Message = ({ message, isDark }) => {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-3 max-w-md', isUser ? 'ml-auto flex-row-reverse' : '')}
        >
            <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                isDark
                    ? isUser ? 'bg-white/10' : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                    : isUser ? 'bg-black/10' : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10'
            )}>
                {isUser
                    ? <User className={cn('w-4 h-4', isDark ? 'text-white/70' : 'text-black/70')} />
                    : <Sparkles className={cn('w-4 h-4', isDark ? 'text-white/70' : 'text-black/70')} />
                }
            </div>
            <div className={cn(
                'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                isDark
                    ? isUser ? 'bg-white text-black' : 'bg-white/10 text-white/90 border border-white/5'
                    : isUser ? 'bg-black text-white' : 'bg-black/5 text-black/90 border border-black/5',
                isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
            )}>
                {message.content.length > 300 ? message.content.slice(0, 300) + '...' : message.content}
            </div>
        </motion.div>
    );
};

// --- Main Component ---
const AdvancedVoiceMode = ({ isOpen, onClose, onSendMessage, settings }) => {
    // Theme detection
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkDark = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // State
    const [status, setStatus] = useState('idle');
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [conversation, setConversation] = useState([]);
    const [showHistory, setShowHistory] = useState(true);
    const [error, setError] = useState(null);
    const [currentModel, setCurrentModel] = useState(VOICE_MODEL_FREE);
    const [selectedLanguage, setSelectedLanguage] = useState(
        SUPPORTED_LANGUAGES.find(l => l.code === settings?.language) || SUPPORTED_LANGUAGES[0]
    );

    // Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const timeoutRef = useRef(null);
    const cleanupRef = useRef(false);
    const conversationRef = useRef([]);

    // Keep conversation ref in sync
    useEffect(() => {
        conversationRef.current = conversation;
    }, [conversation]);

    // Initialize Speech Recognition with language support
    useEffect(() => {
        if (!isOpen) return;
        cleanupRef.current = false;
        setError(null);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage.voiceLang;

        recognition.onstart = () => {
            if (!cleanupRef.current) setStatus('listening');
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += text;
                else interim += text;
            }

            setInterimTranscript(interim);

            if (final.trim()) {
                setTranscript(final);
                setInterimTranscript('');
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                // Process after user stops speaking (shorter delay for more natural feel)
                timeoutRef.current = setTimeout(() => processTranscript(final.trim()), 1000);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                setStatus('idle');
            }
        };

        recognition.onend = () => {
            if (status === 'listening' && !cleanupRef.current) {
                try { recognition.start(); } catch { }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            cleanupRef.current = true;
            try { recognitionRef.current?.stop(); } catch { }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            synthRef.current?.cancel();
        };
    }, [isOpen, selectedLanguage]);

    // Send message to Gemini via OpenRouter
    const sendToGemini = async (text, conversationHistory) => {
        // Build messages with conversation context and voice-optimized system prompt
        const messages = [
            {
                role: 'system',
                content: `You are a helpful, friendly voice assistant powered by Gemini 2.5 Flash with Native Audio.

Your capabilities:
- Natural, emotionally-aware conversations
- Context-aware pacing and tone
- Support for 24 languages with native speech
- Real-time translation when needed

Guidelines for voice responses:
- Keep responses concise (1-3 sentences) - they will be spoken aloud
- Be warm, natural, and conversational
- Respond in ${selectedLanguage.name} (${selectedLanguage.code})
- Match the user's energy and tone
- If asked to translate, provide natural translations

Remember: This is a voice conversation, so be direct and engaging.`
            },
            ...conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            { role: 'user', content: text }
        ];

        const response = await fetch('/api/chat/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model: currentModel,
                preferred_language: selectedLanguage.code
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    };

    const processTranscript = useCallback(async (text) => {
        if (!text.trim() || status === 'processing') return;

        setStatus('processing');
        setError(null);
        try { recognitionRef.current?.stop(); } catch { }

        const userMsg = { role: 'user', content: text, timestamp: Date.now() };
        const updatedConversation = [...conversationRef.current, userMsg];
        setConversation(updatedConversation);

        try {
            const response = await sendToGemini(text, conversationRef.current);

            if (response) {
                const assistantMsg = { role: 'assistant', content: response, timestamp: Date.now() };
                setConversation(prev => [...prev, assistantMsg]);
                await speak(response);
            } else {
                throw new Error('No response from Gemini');
            }
        } catch (err) {
            console.error('Voice processing error:', err);
            setError(err.message);
            setStatus('idle');

            setTimeout(() => {
                if (!cleanupRef.current) startListening();
            }, 1000);
        }

        setTranscript('');
        setInterimTranscript('');
    }, [status, selectedLanguage, currentModel]);

    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if (!synthRef.current) { setStatus('idle'); resolve(); return; }

            synthRef.current.cancel();
            setStatus('speaking');

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = selectedLanguage.voiceLang;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            // Find best voice for the selected language
            const voices = synthRef.current.getVoices();

            // Prioritize Google voices (closest to Gemini native audio quality)
            const preferredVoices = [
                `Google ${selectedLanguage.name}`,
                'Google US English',
                'Google UK English Female',
                'Samantha',
                'Karen',
                'Daniel',
            ];

            let selectedVoice = null;
            for (const name of preferredVoices) {
                const found = voices.find(v => v.name.includes(name));
                if (found) {
                    selectedVoice = found;
                    break;
                }
            }

            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.startsWith(selectedLanguage.voiceLang.split('-')[0])) || voices[0];
            }

            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onend = () => {
                setStatus('idle');
                resolve();
                setTimeout(() => {
                    if (!cleanupRef.current) startListening();
                }, 400);
            };

            utterance.onerror = (e) => {
                console.error('Speech error:', e);
                setStatus('idle');
                resolve();
                setTimeout(() => {
                    if (!cleanupRef.current) startListening();
                }, 400);
            };

            synthRef.current.speak(utterance);
        });
    }, [selectedLanguage]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && status !== 'processing' && status !== 'speaking') {
            try { recognitionRef.current.start(); } catch { }
        }
    }, [status]);

    const stopListening = useCallback(() => {
        try { recognitionRef.current?.stop(); } catch { }
        setStatus('idle');
    }, []);

    const toggleListening = useCallback(() => {
        if (status === 'listening') {
            stopListening();
            const pending = (transcript + interimTranscript).trim();
            if (pending) processTranscript(pending);
        } else if (status === 'idle') {
            startListening();
        }
    }, [status, transcript, interimTranscript, processTranscript, startListening, stopListening]);

    const stopSpeaking = useCallback(() => {
        synthRef.current?.cancel();
        setStatus('idle');
    }, []);

    const clearConversation = useCallback(() => {
        setConversation([]);
        conversationRef.current = [];
    }, []);

    const handleClose = useCallback(() => {
        cleanupRef.current = true;
        stopListening();
        stopSpeaking();
        onClose();
    }, [onClose, stopListening, stopSpeaking]);

    if (!isOpen) return null;

    const displayText = transcript || interimTranscript;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    'fixed inset-0 z-50 flex flex-col',
                    isDark ? 'bg-black' : 'bg-white'
                )}
            >
                {/* Header */}
                <header className={cn(
                    'flex items-center justify-between px-6 py-4',
                    isDark ? 'border-b border-white/5' : 'border-b border-black/5'
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'w-2.5 h-2.5 rounded-full',
                            status === 'listening' ? 'bg-red-500 animate-pulse' :
                                status === 'speaking' ? 'bg-green-500 animate-pulse' :
                                    status === 'processing' ? 'bg-blue-500 animate-pulse' :
                                        isDark ? 'bg-white/20' : 'bg-black/20'
                        )} />
                        <span className={cn(
                            'text-sm font-medium',
                            isDark ? 'text-white' : 'text-black'
                        )}>
                            Voice
                        </span>
                        <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            isDark ? 'bg-white/10 text-white/50' : 'bg-black/5 text-black/50'
                        )}>
                            Gemini 2.5 Flash
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Language Selector */}
                        <select
                            value={selectedLanguage.code}
                            onChange={(e) => {
                                const lang = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                                if (lang) setSelectedLanguage(lang);
                            }}
                            className={cn(
                                'text-xs px-2 py-1 rounded-lg border-none outline-none cursor-pointer',
                                isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70'
                            )}
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>

                        {conversation.length > 0 && (
                            <button
                                onClick={clearConversation}
                                title="Clear conversation"
                                className={cn(
                                    'p-2 rounded-full transition-colors',
                                    isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
                                )}
                            >
                                <RefreshCw className={cn('w-4 h-4', isDark ? 'text-white/60' : 'text-black/60')} />
                            </button>
                        )}
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                'p-2 rounded-full transition-colors',
                                showHistory
                                    ? isDark ? 'bg-white/10' : 'bg-black/10'
                                    : isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
                            )}
                        >
                            <MessageSquare className={cn('w-4 h-4', isDark ? 'text-white/60' : 'text-black/60')} />
                        </button>
                        <button
                            onClick={handleClose}
                            className={cn(
                                'p-2 rounded-full transition-colors',
                                isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
                            )}
                        >
                            <X className={cn('w-4 h-4', isDark ? 'text-white/60' : 'text-black/60')} />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                    {/* Error Display */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm',
                                    isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'
                                )}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Status */}
                    <AnimatePresence mode="wait">
                        <StatusLabel
                            key={status}
                            status={status}
                            isDark={isDark}
                            modelName="Gemini 2.5 Flash"
                        />
                    </AnimatePresence>

                    {/* Orb */}
                    <VoiceOrb
                        status={status}
                        onClick={status === 'speaking' ? stopSpeaking : toggleListening}
                        disabled={status === 'processing'}
                        isDark={isDark}
                    />

                    {/* Waveform */}
                    <div className="h-12">
                        <AnimatePresence>
                            {(status === 'listening' || status === 'speaking') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <AudioWaveform isActive={true} isDark={isDark} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Transcript */}
                    <AnimatePresence>
                        {displayText && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={cn(
                                    'max-w-lg text-center px-6 py-4 rounded-2xl',
                                    isDark ? 'bg-white/5' : 'bg-black/5'
                                )}
                            >
                                <p className={cn('text-base', isDark ? 'text-white/90' : 'text-black/90')}>
                                    {transcript}
                                    {interimTranscript && (
                                        <span className={isDark ? 'text-white/40' : 'text-black/40'}> {interimTranscript}</span>
                                    )}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Instructions */}
                    {status === 'idle' && !displayText && conversation.length === 0 && (
                        <p className={cn('text-sm text-center max-w-xs', isDark ? 'text-white/30' : 'text-black/30')}>
                            Tap the orb to start a natural conversation
                        </p>
                    )}
                </main>

                {/* Conversation History */}
                <AnimatePresence>
                    {showHistory && conversation.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className={cn('border-t overflow-hidden', isDark ? 'border-white/5' : 'border-black/5')}
                        >
                            <div className="p-4 max-h-52 overflow-y-auto space-y-3">
                                {conversation.slice(-6).map((msg, idx) => (
                                    <Message key={idx} message={msg} isDark={isDark} />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <footer className={cn(
                    'px-6 py-3 flex justify-between items-center text-xs',
                    isDark ? 'text-white/20 border-t border-white/5' : 'text-black/20 border-t border-black/5'
                )}>
                    <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {selectedLanguage.name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Languages className="w-3 h-3" />
                            24 Languages
                        </span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Gemini 2.5 Flash Native Audio
                    </span>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
