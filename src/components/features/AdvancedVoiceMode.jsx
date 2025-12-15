/**
 * Gemini 2.0 Flash Voice Mode
 * Apple + Japanese Minimalist Design (間 - Ma, 簡素 - Kanso)
 * Clean White/Black Theme with Real AI Conversations
 * 
 * Uses google/gemini-2.0-flash-001:free through OpenRouter for voice chat
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Volume2, VolumeX, X, Maximize2, Minimize2,
    Sparkles, MessageSquare, Globe, Cpu, Zap, Settings2,
    Activity, Loader2, User, Bot, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// GEMINI 2.0 FLASH VOICE MODE - REAL AI CONVERSATIONS
// ============================================================================

// Voice Model Configuration
const VOICE_MODEL = 'google/gemini-2.0-flash-001:free';

// --- Animated Waveform ---
const AudioWaveform = ({ isActive, isDark }) => {
    const bars = 7;
    return (
        <div className="flex items-center justify-center gap-1.5 h-10">
            {[...Array(bars)].map((_, i) => (
                <motion.div
                    key={i}
                    className={cn('w-1 rounded-full', isDark ? 'bg-white' : 'bg-black')}
                    animate={{
                        height: isActive ? [8, 24 + Math.random() * 16, 8] : 8,
                        opacity: isActive ? [0.4, 1, 0.4] : 0.2
                    }}
                    transition={{
                        duration: 0.5 + Math.random() * 0.3,
                        repeat: isActive ? Infinity : 0,
                        delay: i * 0.1
                    }}
                />
            ))}
        </div>
    );
};

// --- Minimalist Orb ---
const VoiceOrb = ({ status, onClick, disabled, isDark }) => {
    const isActive = status !== 'idle';

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'relative w-44 h-44 md:w-56 md:h-56 rounded-full cursor-pointer',
                'flex items-center justify-center transition-all duration-700',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'focus:outline-none focus-visible:ring-2',
                isDark
                    ? 'bg-white focus-visible:ring-white/30'
                    : 'bg-black focus-visible:ring-black/20',
                isActive && 'shadow-2xl'
            )}
            style={{
                boxShadow: isActive
                    ? isDark
                        ? '0 0 80px rgba(255,255,255,0.3)'
                        : '0 0 80px rgba(0,0,0,0.2)'
                    : 'none'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
                scale: status === 'listening' ? [1, 1.05, 1] :
                    status === 'speaking' ? [1, 1.03, 1] : 1
            }}
            transition={{
                duration: 2,
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

            {/* Pulse Rings */}
            {isActive && (
                <>
                    <motion.div
                        className={cn(
                            'absolute inset-0 rounded-full',
                            isDark ? 'bg-white' : 'bg-black'
                        )}
                        initial={{ scale: 1, opacity: 0.15 }}
                        animate={{ scale: 1.4, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                        className={cn(
                            'absolute inset-0 rounded-full',
                            isDark ? 'bg-white' : 'bg-black'
                        )}
                        initial={{ scale: 1, opacity: 0.1 }}
                        animate={{ scale: 1.2, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                </>
            )}
        </motion.button>
    );
};

// --- Status Label ---
const StatusLabel = ({ status, isDark }) => {
    const labels = {
        idle: 'Tap to speak',
        listening: 'Listening...',
        processing: 'Gemini is thinking...',
        speaking: 'Speaking...'
    };

    return (
        <motion.span
            key={status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
                'text-sm font-medium tracking-wide',
                isDark ? 'text-white/60' : 'text-black/60'
            )}
        >
            {labels[status] || labels.idle}
        </motion.span>
    );
};

// --- Conversation Message ---
const Message = ({ message, isDark }) => {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-3 max-w-md', isUser ? 'ml-auto flex-row-reverse' : '')}
        >
            <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                isDark
                    ? isUser ? 'bg-white/10' : 'bg-white/5'
                    : isUser ? 'bg-black/10' : 'bg-black/5'
            )}>
                {isUser
                    ? <User className={cn('w-3.5 h-3.5', isDark ? 'text-white/70' : 'text-black/70')} />
                    : <Sparkles className={cn('w-3.5 h-3.5', isDark ? 'text-white/70' : 'text-black/70')} />
                }
            </div>
            <div className={cn(
                'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                isDark
                    ? isUser ? 'bg-white text-black' : 'bg-white/10 text-white/90'
                    : isUser ? 'bg-black text-white' : 'bg-black/5 text-black/90',
                isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
            )}>
                {message.content.length > 250 ? message.content.slice(0, 250) + '...' : message.content}
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

    // Initialize Speech Recognition
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
        recognition.lang = settings?.language === 'hi' ? 'hi-IN' : 'en-US';

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
                // Process after user stops speaking
                timeoutRef.current = setTimeout(() => processTranscript(final.trim()), 1200);
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
    }, [isOpen, settings?.language]);

    // Send message to Gemini 2.0 Flash via OpenRouter
    const sendToGemini = async (text, conversationHistory) => {
        // Build messages with conversation context
        const messages = [
            {
                role: 'system',
                content: `You are a helpful voice assistant powered by Gemini 2.0 Flash. 
Provide concise, natural, and conversational responses suitable for voice interaction. 
Keep your answers brief (1-3 sentences) and to the point, as they will be spoken aloud.
Be friendly, helpful, and engaging. Respond in ${settings?.language === 'hi' ? 'Hindi' : 'English'}.`
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
                model: VOICE_MODEL, // Explicitly use Gemini 2.0 Flash
                preferred_language: settings?.language || 'en'
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
            // Send to Gemini 2.0 Flash
            const response = await sendToGemini(text, conversationRef.current);

            if (response) {
                const assistantMsg = { role: 'assistant', content: response, timestamp: Date.now() };
                setConversation(prev => [...prev, assistantMsg]);

                // Speak the response
                await speak(response);
            } else {
                throw new Error('No response from Gemini');
            }
        } catch (err) {
            console.error('Voice processing error:', err);
            setError(err.message);
            setStatus('idle');

            // Restart listening after error
            setTimeout(() => {
                if (!cleanupRef.current) startListening();
            }, 1000);
        }

        setTranscript('');
        setInterimTranscript('');
    }, [status, settings]);

    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if (!synthRef.current) { setStatus('idle'); resolve(); return; }

            synthRef.current.cancel();
            setStatus('speaking');

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = settings?.language === 'hi' ? 'hi-IN' : 'en-US';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            // Try to find a good voice
            const voices = synthRef.current.getVoices();
            const preferredVoices = [
                'Google US English',
                'Google UK English Female',
                'Samantha',
                'Karen',
                'Daniel',
                'Google हिन्दी'
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
                selectedVoice = voices.find(v => v.lang.startsWith(utterance.lang)) || voices[0];
            }

            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onend = () => {
                setStatus('idle');
                resolve();
                // Auto-restart listening after speaking
                setTimeout(() => {
                    if (!cleanupRef.current) startListening();
                }, 500);
            };

            utterance.onerror = (e) => {
                console.error('Speech error:', e);
                setStatus('idle');
                resolve();
                setTimeout(() => {
                    if (!cleanupRef.current) startListening();
                }, 500);
            };

            synthRef.current.speak(utterance);
        });
    }, [settings?.language]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && status !== 'processing' && status !== 'speaking') {
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Already started or other error
            }
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
                {/* Header - Minimal */}
                <header className={cn(
                    'flex items-center justify-between px-6 py-4',
                    isDark ? 'border-b border-white/5' : 'border-b border-black/5'
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'w-2 h-2 rounded-full',
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
                            Gemini 2.0 Flash
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
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

                {/* Main - Centered Orb */}
                <main className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                    {/* Error Display */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm',
                                    isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'
                                )}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Status */}
                    <AnimatePresence mode="wait">
                        <StatusLabel key={status} status={status} isDark={isDark} />
                    </AnimatePresence>

                    {/* Orb */}
                    <VoiceOrb
                        status={status}
                        onClick={status === 'speaking' ? stopSpeaking : toggleListening}
                        disabled={status === 'processing'}
                        isDark={isDark}
                    />

                    {/* Waveform */}
                    <div className="h-10">
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
                            Tap the circle to start a conversation with Gemini
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
                            <div className="p-4 max-h-48 overflow-y-auto space-y-3">
                                {conversation.slice(-6).map((msg, idx) => (
                                    <Message key={idx} message={msg} isDark={isDark} />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <footer className={cn(
                    'px-6 py-3 flex justify-center items-center text-xs',
                    isDark ? 'text-white/20 border-t border-white/5' : 'text-black/20 border-t border-black/5'
                )}>
                    <span className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {settings?.language === 'hi' ? 'हिंदी' : 'EN'}
                        </span>
                        <span>•</span>
                        <span>Gemini 2.0 Flash via OpenRouter</span>
                    </span>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
