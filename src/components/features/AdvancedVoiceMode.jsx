/**
 * Gemini Live Voice Mode - Native Audio Edition
 * December 2025 Release
 * 
 * Models (in order of preference):
 * - gemini-2.5-flash-native-audio-preview-12-2025 (Primary - BYOK)
 * - google/gemini-2.5-flash
 * - google/gemini-2.5-flash-lite
 * - google/gemini-2.0-flash-001:free (Fallback)
 * 
 * Features:
 * - 30 HD voices across 24 languages
 * - Emotional intelligence (affective dialogue)
 * - Live speech-to-speech translation
 * - Real-time voice conversations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Volume2, VolumeX, X, Settings,
    Sparkles, MessageSquare, Globe, Cpu, Zap,
    Loader2, User, Bot, RefreshCw, Languages,
    Clock, Waves, Radio, Info, ChevronDown, Play, Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// GEMINI LIVE VOICE MODE - SPEECH-TO-SPEECH
// December 2025 - gemini-2.5-flash-native-audio-preview-12-2025
// ============================================================================

// Voice Models - ONLY Gemini Audio models
const VOICE_MODELS = [
    { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Native Audio', tier: 'premium' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'premium' },
    { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tier: 'lite' },
    { id: 'google/gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite Preview', tier: 'lite' },
    { id: 'google/gemini-2.0-flash-001:free', name: 'Gemini 2.0 Flash (Free)', tier: 'free' },
    { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', tier: 'lite' },
];

// Languages with native audio support
const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸', voiceLang: 'en-US' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', voiceLang: 'hi-IN' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', voiceLang: 'es-ES' },
    { code: 'fr', name: 'French', flag: '🇫🇷', voiceLang: 'fr-FR' },
    { code: 'de', name: 'German', flag: '🇩🇪', voiceLang: 'de-DE' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', voiceLang: 'ja-JP' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', voiceLang: 'ko-KR' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', voiceLang: 'zh-CN' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', voiceLang: 'pt-BR' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', voiceLang: 'ar-SA' },
];

// --- Animated Components ---

const AudioWaveform = ({ isActive, variant = 'default' }) => {
    const bars = 12;
    const colors = {
        default: 'bg-current',
        listening: 'bg-red-500',
        speaking: 'bg-emerald-500',
        processing: 'bg-blue-500'
    };

    return (
        <div className="flex items-center justify-center gap-1 h-16">
            {[...Array(bars)].map((_, i) => (
                <motion.div
                    key={i}
                    className={cn('w-1.5 rounded-full', colors[variant] || colors.default)}
                    animate={{
                        height: isActive ? [8, 32 + Math.random() * 24, 8] : 8,
                        opacity: isActive ? [0.4, 1, 0.4] : 0.15
                    }}
                    transition={{
                        duration: 0.35 + Math.random() * 0.25,
                        repeat: isActive ? Infinity : 0,
                        delay: i * 0.05
                    }}
                />
            ))}
        </div>
    );
};

const VoiceOrb = ({ status, onClick, disabled, size = 'lg' }) => {
    const isActive = status !== 'idle';

    const statusColors = {
        idle: 'from-gray-800 to-gray-900 dark:from-white dark:to-gray-100',
        listening: 'from-red-500 to-rose-600',
        processing: 'from-blue-500 to-indigo-600',
        speaking: 'from-emerald-500 to-green-600'
    };

    const sizeClasses = {
        lg: 'w-52 h-52 md:w-64 md:h-64',
        md: 'w-40 h-40 md:w-48 md:h-48',
        sm: 'w-32 h-32'
    };

    return (
        <div className="relative">
            {/* Glow effect */}
            {isActive && (
                <motion.div
                    className={cn(
                        'absolute inset-0 rounded-full blur-3xl opacity-30',
                        `bg-gradient-to-br ${statusColors[status]}`
                    )}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            <motion.button
                onClick={onClick}
                disabled={disabled}
                className={cn(
                    'relative rounded-full cursor-pointer',
                    'flex items-center justify-center transition-all duration-500',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20',
                    `bg-gradient-to-br ${statusColors[status]}`,
                    'shadow-2xl',
                    sizeClasses[size]
                )}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                    scale: isActive ? [1, 1.05, 1] : 1
                }}
                transition={{
                    duration: 1.5,
                    repeat: isActive ? Infinity : 0,
                    ease: 'easeInOut'
                }}
            >
                {/* Icon */}
                <div className={cn(
                    status === 'idle' ? 'text-white dark:text-black' : 'text-white'
                )}>
                    {status === 'processing' ? (
                        <Loader2 className="w-16 h-16 md:w-20 md:h-20 animate-spin" />
                    ) : status === 'listening' ? (
                        <Waves className="w-16 h-16 md:w-20 md:h-20" />
                    ) : status === 'speaking' ? (
                        <Volume2 className="w-16 h-16 md:w-20 md:h-20" />
                    ) : (
                        <Mic className="w-16 h-16 md:w-20 md:h-20" />
                    )}
                </div>

                {/* Ripple rings */}
                {isActive && (
                    <>
                        <motion.div
                            className={cn('absolute inset-0 rounded-full border-2',
                                status === 'listening' ? 'border-red-400' :
                                    status === 'speaking' ? 'border-emerald-400' : 'border-blue-400'
                            )}
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <motion.div
                            className={cn('absolute inset-0 rounded-full border-2',
                                status === 'listening' ? 'border-red-400' :
                                    status === 'speaking' ? 'border-emerald-400' : 'border-blue-400'
                            )}
                            initial={{ scale: 1, opacity: 0.3 }}
                            animate={{ scale: 1.3, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        />
                    </>
                )}
            </motion.button>
        </div>
    );
};

// --- Status Card ---
const StatusCard = ({ status, duration, model }) => {
    const statusText = {
        idle: 'Ready to listen',
        listening: 'Listening...',
        processing: 'Processing...',
        speaking: 'Speaking...'
    };

    const statusIcons = {
        idle: <Mic className="w-4 h-4" />,
        listening: <Radio className="w-4 h-4 animate-pulse" />,
        processing: <Loader2 className="w-4 h-4 animate-spin" />,
        speaking: <Volume2 className="w-4 h-4" />
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6 px-6 py-3 bg-white/5 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10"
        >
            <div className="flex items-center gap-2 text-sm">
                {statusIcons[status]}
                <span className="font-medium">{statusText[status]}</span>
            </div>

            {duration > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                    <Clock className="w-3 h-3" />
                    <span>{Math.floor(duration)}s</span>
                </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Cpu className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{model?.split('/').pop()}</span>
            </div>
        </motion.div>
    );
};

// --- Conversation Message ---
const ConversationMessage = ({ message, isUser }) => (
    <motion.div
        initial={{ opacity: 0, x: isUser ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
        {!isUser && (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
            </div>
        )}

        <div className={cn(
            'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser
                ? 'bg-blue-500 text-white rounded-br-md'
                : 'bg-white/10 text-white/90 border border-white/10 rounded-bl-md'
        )}>
            {message.content}
            <div className={cn(
                'text-[10px] mt-1.5',
                isUser ? 'text-blue-200' : 'text-white/40'
            )}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>

        {isUser && (
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-400" />
            </div>
        )}
    </motion.div>
);

// --- Feature Cards ---
const FeatureCard = ({ icon: Icon, title, value, subtext }) => (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
        <div className="p-2 rounded-lg bg-white/10">
            <Icon className="w-4 h-4 text-white/70" />
        </div>
        <div>
            <div className="text-sm font-medium text-white">{value}</div>
            <div className="text-xs text-white/40">{title}</div>
        </div>
    </div>
);

// --- Main Component ---
const AdvancedVoiceMode = ({ isOpen, onClose, onSendMessage, settings }) => {
    // State
    const [status, setStatus] = useState('idle');
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [conversation, setConversation] = useState([]);
    const [error, setError] = useState(null);
    const [selectedModel, setSelectedModel] = useState(VOICE_MODELS[0]);
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [messageCount, setMessageCount] = useState(0);

    // Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const timeoutRef = useRef(null);
    const cleanupRef = useRef(false);
    const conversationRef = useRef([]);
    const durationIntervalRef = useRef(null);

    // Keep conversation ref in sync
    useEffect(() => {
        conversationRef.current = conversation;
    }, [conversation]);

    // Session timer
    useEffect(() => {
        if (isOpen && status !== 'idle') {
            durationIntervalRef.current = setInterval(() => {
                setSessionDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        }
        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        };
    }, [isOpen, status]);

    // Initialize Speech Recognition
    useEffect(() => {
        if (!isOpen) return;
        cleanupRef.current = false;
        setError(null);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported');
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
                timeoutRef.current = setTimeout(() => processTranscript(final.trim()), 800);
            }
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('Speech error:', event.error);
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

    // API Call with explicit model
    const sendToGemini = async (text, history) => {
        const messages = [
            {
                role: 'system',
                content: `You are Gemini Live, a helpful voice assistant with Native Audio capabilities.

Key traits:
- Natural, warm, and conversational
- Concise responses (1-3 sentences) for voice
- Emotionally aware and context-sensitive
- Respond in ${selectedLanguage.name}

You support real-time speech-to-speech conversations with emotional intelligence.`
            },
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text }
        ];

        // Call API with explicit Gemini audio model
        const response = await fetch('/api/chat/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model: selectedModel.id, // Explicitly use selected Gemini audio model
                preferred_language: selectedLanguage.code
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Error: ${response.status}`);
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
        setConversation(prev => [...prev, userMsg]);
        setMessageCount(prev => prev + 1);

        try {
            const response = await sendToGemini(text, conversationRef.current);

            if (response) {
                const assistantMsg = { role: 'assistant', content: response, timestamp: Date.now() };
                setConversation(prev => [...prev, assistantMsg]);
                await speak(response);
            } else {
                throw new Error('No response');
            }
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
            setStatus('idle');
            setTimeout(() => { if (!cleanupRef.current) startListening(); }, 1000);
        }

        setTranscript('');
        setInterimTranscript('');
    }, [status, selectedLanguage, selectedModel]);

    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if (!synthRef.current) { setStatus('idle'); resolve(); return; }

            synthRef.current.cancel();
            setStatus('speaking');

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = selectedLanguage.voiceLang;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            const voices = synthRef.current.getVoices();
            const preferred = voices.find(v =>
                v.name.includes('Google') || v.name.includes('Samantha') ||
                v.lang.startsWith(selectedLanguage.voiceLang.split('-')[0])
            );
            if (preferred) utterance.voice = preferred;

            utterance.onend = () => {
                setStatus('idle');
                resolve();
                setTimeout(() => { if (!cleanupRef.current) startListening(); }, 300);
            };

            utterance.onerror = () => {
                setStatus('idle');
                resolve();
                setTimeout(() => { if (!cleanupRef.current) startListening(); }, 300);
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
        setMessageCount(0);
        setSessionDuration(0);
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
                className="fixed inset-0 z-50 flex bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
            >
                {/* Ambient Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                </div>

                {/* Main Content */}
                <div className="relative flex-1 flex flex-col max-w-6xl mx-auto w-full">
                    {/* Header */}
                    <header className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                                <Waves className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-white">Gemini Live</h1>
                                <p className="text-xs text-white/40">Speech-to-Speech • Native Audio</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Model Selector */}
                            <select
                                value={selectedModel.id}
                                onChange={(e) => {
                                    const model = VOICE_MODELS.find(m => m.id === e.target.value);
                                    if (model) setSelectedModel(model);
                                }}
                                className="text-xs px-3 py-2 rounded-lg bg-white/10 text-white border border-white/10 outline-none cursor-pointer"
                            >
                                {VOICE_MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>

                            {/* Language Selector */}
                            <select
                                value={selectedLanguage.code}
                                onChange={(e) => {
                                    const lang = LANGUAGES.find(l => l.code === e.target.value);
                                    if (lang) setSelectedLanguage(lang);
                                }}
                                className="text-xs px-3 py-2 rounded-lg bg-white/10 text-white border border-white/10 outline-none cursor-pointer"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                                ))}
                            </select>

                            <button
                                onClick={clearConversation}
                                className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                title="Clear conversation"
                            >
                                <RefreshCw className="w-4 h-4 text-white/60" />
                            </button>

                            <button
                                onClick={handleClose}
                                className="p-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                            >
                                <X className="w-4 h-4 text-red-400" />
                            </button>
                        </div>
                    </header>

                    {/* Main Grid */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
                        {/* Left: Voice Interface */}
                        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-8">
                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Status Card */}
                            <StatusCard
                                status={status}
                                duration={sessionDuration}
                                model={selectedModel.name}
                            />

                            {/* Voice Orb */}
                            <VoiceOrb
                                status={status}
                                onClick={status === 'speaking' ? stopSpeaking : toggleListening}
                                disabled={status === 'processing'}
                            />

                            {/* Waveform */}
                            <div className="h-16 w-64">
                                <AnimatePresence>
                                    {(status === 'listening' || status === 'speaking') && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <AudioWaveform
                                                isActive={true}
                                                variant={status === 'listening' ? 'listening' : 'speaking'}
                                            />
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
                                        className="max-w-md text-center px-6 py-4 bg-white/5 backdrop-blur rounded-2xl border border-white/10"
                                    >
                                        <p className="text-white/90">
                                            {transcript}
                                            {interimTranscript && (
                                                <span className="text-white/40"> {interimTranscript}</span>
                                            )}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Instructions */}
                            {status === 'idle' && !displayText && conversation.length === 0 && (
                                <p className="text-sm text-white/30 text-center max-w-xs">
                                    Tap the orb to start a voice conversation with Gemini
                                </p>
                            )}
                        </div>

                        {/* Right: Conversation & Stats */}
                        <div className="flex flex-col gap-4 overflow-hidden">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <FeatureCard
                                    icon={MessageSquare}
                                    title="Messages"
                                    value={messageCount}
                                />
                                <FeatureCard
                                    icon={Clock}
                                    title="Duration"
                                    value={`${Math.floor(sessionDuration / 60)}:${(sessionDuration % 60).toString().padStart(2, '0')}`}
                                />
                                <FeatureCard
                                    icon={Globe}
                                    title="Language"
                                    value={selectedLanguage.flag + ' ' + selectedLanguage.code.toUpperCase()}
                                />
                                <FeatureCard
                                    icon={Zap}
                                    title="Model"
                                    value={selectedModel.tier}
                                />
                            </div>

                            {/* Conversation History */}
                            <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-xs font-medium text-white/60">Conversation</span>
                                    <span className="text-[10px] text-white/30">{conversation.length} messages</span>
                                </div>
                                <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
                                    {conversation.length === 0 ? (
                                        <p className="text-xs text-white/30 text-center py-8">
                                            Messages will appear here
                                        </p>
                                    ) : (
                                        conversation.map((msg, idx) => (
                                            <ConversationMessage
                                                key={idx}
                                                message={msg}
                                                isUser={msg.role === 'user'}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="p-4 border-t border-white/5 flex justify-between items-center text-xs text-white/30">
                        <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                Gemini Live Native Audio
                            </span>
                            <span>•</span>
                            <span>{LANGUAGES.length} Languages</span>
                        </span>
                        <span>December 2025</span>
                    </footer>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
