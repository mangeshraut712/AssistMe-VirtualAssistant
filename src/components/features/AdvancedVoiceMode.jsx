/**
 * Gemini Live Voice Mode - Japanese Minimalist Design
 * December 2025 Release
 * 
 * Design: Apple + Japanese (間 Ma, 簡素 Kanso) 
 * Theme: Solid White/Black backgrounds
 * 
 * Models (ONLY Gemini audio):
 * - gemini-2.5-flash-native-audio-preview-12-2025 (Primary)
 * - google/gemini-2.5-flash, google/gemini-2.0-flash-001:free (Fallbacks)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Volume2, X, Sparkles, MessageSquare, Globe, Cpu,
    Loader2, User, Bot, RefreshCw, Clock, Waves, Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// GEMINI LIVE - APPLE JAPANESE MINIMALIST DESIGN
// Solid White (Light) / Solid Black (Dark) Theme
// ============================================================================

// Voice Models - ONLY Gemini Audio
const VOICE_MODELS = [
    { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Native Audio', short: '2.5 Native' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', short: '2.5 Flash' },
    { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', short: '2.5 Lite' },
    { id: 'google/gemini-2.0-flash-001:free', name: 'Gemini 2.0 Flash (Free)', short: '2.0 Free' },
    { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', short: '2.0 Lite' },
];

// Languages
const LANGUAGES = [
    { code: 'en', name: 'English', voiceLang: 'en-US' },
    { code: 'hi', name: 'हिंदी', voiceLang: 'hi-IN' },
    { code: 'es', name: 'Español', voiceLang: 'es-ES' },
    { code: 'fr', name: 'Français', voiceLang: 'fr-FR' },
    { code: 'de', name: 'Deutsch', voiceLang: 'de-DE' },
    { code: 'ja', name: '日本語', voiceLang: 'ja-JP' },
    { code: 'ko', name: '한국어', voiceLang: 'ko-KR' },
    { code: 'zh', name: '中文', voiceLang: 'zh-CN' },
];

// --- Minimal Waveform ---
const Waveform = ({ isActive, isDark }) => (
    <div className="flex items-center justify-center gap-1 h-10">
        {[...Array(7)].map((_, i) => (
            <motion.div
                key={i}
                className={cn('w-1 rounded-full', isDark ? 'bg-white' : 'bg-black')}
                animate={{
                    height: isActive ? [8, 28 + Math.random() * 12, 8] : 8,
                    opacity: isActive ? [0.4, 1, 0.4] : 0.15
                }}
                transition={{
                    duration: 0.4 + Math.random() * 0.2,
                    repeat: isActive ? Infinity : 0,
                    delay: i * 0.08
                }}
            />
        ))}
    </div>
);

// --- Minimal Orb (Apple Style) ---
const Orb = ({ status, onClick, disabled, isDark }) => {
    const isActive = status !== 'idle';

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'relative w-48 h-48 md:w-56 md:h-56 rounded-full',
                'flex items-center justify-center transition-all duration-500',
                'disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none',
                isDark ? 'bg-white' : 'bg-black',
                isActive && (isDark ? 'shadow-[0_0_60px_rgba(255,255,255,0.3)]' : 'shadow-[0_0_60px_rgba(0,0,0,0.2)]')
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{ scale: isActive ? [1, 1.04, 1] : 1 }}
            transition={{ duration: 1.8, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
        >
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

            {/* Pulse rings */}
            {isActive && (
                <>
                    <motion.div
                        className={cn('absolute inset-0 rounded-full', isDark ? 'bg-white' : 'bg-black')}
                        initial={{ scale: 1, opacity: 0.15 }}
                        animate={{ scale: 1.4, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                        className={cn('absolute inset-0 rounded-full', isDark ? 'bg-white' : 'bg-black')}
                        initial={{ scale: 1, opacity: 0.1 }}
                        animate={{ scale: 1.2, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    />
                </>
            )}
        </motion.button>
    );
};

// --- Message Bubble ---
const Message = ({ message, isDark }) => {
    const isUser = message.role === 'user';
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}
        >
            {!isUser && (
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                    isDark ? 'bg-white/10' : 'bg-black/5'
                )}>
                    <Sparkles className={cn('w-3.5 h-3.5', isDark ? 'text-white/70' : 'text-black/70')} />
                </div>
            )}
            <div className={cn(
                'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                isDark
                    ? isUser ? 'bg-white text-black' : 'bg-white/10 text-white/90'
                    : isUser ? 'bg-black text-white' : 'bg-black/5 text-black/90',
                isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
            )}>
                {message.content}
            </div>
            {isUser && (
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                    isDark ? 'bg-white/10' : 'bg-black/5'
                )}>
                    <User className={cn('w-3.5 h-3.5', isDark ? 'text-white/70' : 'text-black/70')} />
                </div>
            )}
        </motion.div>
    );
};

// --- Stat Pill ---
const StatPill = ({ icon: Icon, value, isDark }) => (
    <div className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
        isDark ? 'bg-white/5 text-white/50' : 'bg-black/5 text-black/50'
    )}>
        <Icon className="w-3 h-3" />
        <span>{value}</span>
    </div>
);

// --- Main Component ---
const AdvancedVoiceMode = ({ isOpen, onClose, onSendMessage, settings }) => {
    // Theme
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const check = () => setIsDark(document.documentElement.classList.contains('dark'));
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // State
    const [status, setStatus] = useState('idle');
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [conversation, setConversation] = useState([]);
    const [error, setError] = useState(null);
    const [selectedModel, setSelectedModel] = useState(VOICE_MODELS[0]);
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
    const [duration, setDuration] = useState(0);

    // Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const timeoutRef = useRef(null);
    const cleanupRef = useRef(false);
    const conversationRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => { conversationRef.current = conversation; }, [conversation]);

    // Duration timer
    useEffect(() => {
        if (isOpen && status !== 'idle') {
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isOpen, status]);

    // Speech Recognition
    useEffect(() => {
        if (!isOpen) return;
        cleanupRef.current = false;
        setError(null);

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setError('Speech recognition not supported'); return; }

        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = selectedLanguage.voiceLang;

        rec.onstart = () => { if (!cleanupRef.current) setStatus('listening'); };
        rec.onresult = (e) => {
            let interim = '', final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const text = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += text;
                else interim += text;
            }
            setInterimTranscript(interim);
            if (final.trim()) {
                setTranscript(final);
                setInterimTranscript('');
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => process(final.trim()), 800);
            }
        };
        rec.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') setStatus('idle'); };
        rec.onend = () => { if (status === 'listening' && !cleanupRef.current) try { rec.start(); } catch { } };

        recognitionRef.current = rec;
        return () => {
            cleanupRef.current = true;
            try { recognitionRef.current?.stop(); } catch { }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            synthRef.current?.cancel();
        };
    }, [isOpen, selectedLanguage]);

    // API call with explicit Gemini model
    const callAPI = async (text, history) => {
        const res = await fetch('/api/chat/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: `You are Gemini Live, a helpful voice assistant. Be concise (1-2 sentences), warm, and natural. Respond in ${selectedLanguage.name}.` },
                    ...history.map(m => ({ role: m.role, content: m.content })),
                    { role: 'user', content: text }
                ],
                model: selectedModel.id, // Explicit Gemini audio model
                preferred_language: selectedLanguage.code
            })
        });
        if (!res.ok) throw new Error('API Error');
        return (await res.json()).response;
    };

    const process = useCallback(async (text) => {
        if (!text.trim() || status === 'processing') return;
        setStatus('processing');
        setError(null);
        try { recognitionRef.current?.stop(); } catch { }

        setConversation(prev => [...prev, { role: 'user', content: text, ts: Date.now() }]);

        try {
            const response = await callAPI(text, conversationRef.current);
            if (response) {
                setConversation(prev => [...prev, { role: 'assistant', content: response, ts: Date.now() }]);
                await speak(response);
            }
        } catch (err) {
            setError(err.message);
            setStatus('idle');
            setTimeout(() => { if (!cleanupRef.current) startListen(); }, 1000);
        }
        setTranscript('');
        setInterimTranscript('');
    }, [status, selectedLanguage, selectedModel]);

    const speak = useCallback((text) => {
        return new Promise((resolve) => {
            if (!synthRef.current) { setStatus('idle'); resolve(); return; }
            synthRef.current.cancel();
            setStatus('speaking');
            const utt = new SpeechSynthesisUtterance(text);
            utt.lang = selectedLanguage.voiceLang;
            utt.rate = 1.0;
            const voices = synthRef.current.getVoices();
            const pref = voices.find(v => v.name.includes('Google') || v.lang.startsWith(selectedLanguage.voiceLang.split('-')[0]));
            if (pref) utt.voice = pref;
            utt.onend = () => { setStatus('idle'); resolve(); setTimeout(() => { if (!cleanupRef.current) startListen(); }, 300); };
            utt.onerror = () => { setStatus('idle'); resolve(); };
            synthRef.current.speak(utt);
        });
    }, [selectedLanguage]);

    const startListen = useCallback(() => {
        if (recognitionRef.current && status !== 'processing' && status !== 'speaking') {
            try { recognitionRef.current.start(); } catch { }
        }
    }, [status]);

    const stopListen = useCallback(() => {
        try { recognitionRef.current?.stop(); } catch { }
        setStatus('idle');
    }, []);

    const toggle = useCallback(() => {
        if (status === 'listening') {
            stopListen();
            const pending = (transcript + interimTranscript).trim();
            if (pending) process(pending);
        } else if (status === 'idle') startListen();
    }, [status, transcript, interimTranscript, process, startListen, stopListen]);

    const stopSpeak = useCallback(() => { synthRef.current?.cancel(); setStatus('idle'); }, []);

    const clear = useCallback(() => {
        setConversation([]);
        conversationRef.current = [];
        setDuration(0);
    }, []);

    const close = useCallback(() => {
        cleanupRef.current = true;
        stopListen();
        stopSpeak();
        onClose();
    }, [onClose, stopListen, stopSpeak]);

    if (!isOpen) return null;

    const displayText = transcript || interimTranscript;
    const statusLabels = { idle: 'Tap to speak', listening: 'Listening...', processing: 'Thinking...', speaking: 'Speaking...' };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn('fixed inset-0 z-50 flex', isDark ? 'bg-black' : 'bg-white')}
            >
                {/* Left: Voice Interface */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
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
                            <span className={cn('font-medium', isDark ? 'text-white' : 'text-black')}>
                                Gemini Live
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Model Selector */}
                            <select
                                value={selectedModel.id}
                                onChange={(e) => setSelectedModel(VOICE_MODELS.find(m => m.id === e.target.value) || VOICE_MODELS[0])}
                                className={cn(
                                    'text-xs px-2 py-1.5 rounded-lg border-none outline-none cursor-pointer',
                                    isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70'
                                )}
                            >
                                {VOICE_MODELS.map(m => <option key={m.id} value={m.id}>{m.short}</option>)}
                            </select>

                            {/* Language Selector */}
                            <select
                                value={selectedLanguage.code}
                                onChange={(e) => setSelectedLanguage(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[0])}
                                className={cn(
                                    'text-xs px-2 py-1.5 rounded-lg border-none outline-none cursor-pointer',
                                    isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70'
                                )}
                            >
                                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>

                            <button onClick={clear} className={cn('p-2 rounded-lg transition-colors', isDark ? 'hover:bg-white/10' : 'hover:bg-black/10')}>
                                <RefreshCw className={cn('w-4 h-4', isDark ? 'text-white/50' : 'text-black/50')} />
                            </button>
                            <button onClick={close} className={cn('p-2 rounded-lg transition-colors', isDark ? 'hover:bg-white/10' : 'hover:bg-black/10')}>
                                <X className={cn('w-4 h-4', isDark ? 'text-white/50' : 'text-black/50')} />
                            </button>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className={cn('text-sm px-4 py-2 rounded-lg', isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600')}>
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* Status */}
                        <motion.span
                            key={status}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn('text-sm', isDark ? 'text-white/50' : 'text-black/50')}
                        >
                            {statusLabels[status]}
                        </motion.span>

                        {/* Orb */}
                        <Orb
                            status={status}
                            onClick={status === 'speaking' ? stopSpeak : toggle}
                            disabled={status === 'processing'}
                            isDark={isDark}
                        />

                        {/* Waveform */}
                        <div className="h-10">
                            <AnimatePresence>
                                {(status === 'listening' || status === 'speaking') && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <Waveform isActive={true} isDark={isDark} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Transcript */}
                        <AnimatePresence>
                            {displayText && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={cn('max-w-md text-center px-5 py-3 rounded-2xl', isDark ? 'bg-white/5' : 'bg-black/5')}
                                >
                                    <p className={cn('text-base', isDark ? 'text-white/90' : 'text-black/90')}>
                                        {transcript}
                                        {interimTranscript && <span className={isDark ? 'text-white/40' : 'text-black/40'}> {interimTranscript}</span>}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-4">
                            <StatPill icon={MessageSquare} value={conversation.length} isDark={isDark} />
                            <StatPill icon={Clock} value={`${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`} isDark={isDark} />
                            <StatPill icon={Cpu} value={selectedModel.short} isDark={isDark} />
                        </div>
                    </main>

                    {/* Footer */}
                    <footer className={cn(
                        'px-6 py-3 flex justify-center text-xs',
                        isDark ? 'text-white/20 border-t border-white/5' : 'text-black/20 border-t border-black/5'
                    )}>
                        <span className="flex items-center gap-3">
                            <Globe className="w-3 h-3" />
                            <span>{selectedLanguage.name}</span>
                            <span>•</span>
                            <span>Gemini Native Audio</span>
                        </span>
                    </footer>
                </div>

                {/* Right: Conversation Panel (Desktop) */}
                <aside className={cn(
                    'hidden lg:flex flex-col w-96',
                    isDark ? 'border-l border-white/5' : 'border-l border-black/5'
                )}>
                    <div className={cn(
                        'px-5 py-4 flex items-center justify-between',
                        isDark ? 'border-b border-white/5' : 'border-b border-black/5'
                    )}>
                        <span className={cn('text-sm font-medium', isDark ? 'text-white/70' : 'text-black/70')}>
                            Conversation
                        </span>
                        <span className={cn('text-xs', isDark ? 'text-white/30' : 'text-black/30')}>
                            {conversation.length} messages
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {conversation.length === 0 ? (
                            <p className={cn('text-xs text-center py-12', isDark ? 'text-white/20' : 'text-black/20')}>
                                Messages will appear here
                            </p>
                        ) : (
                            conversation.map((msg, i) => <Message key={i} message={msg} isDark={isDark} />)
                        )}
                    </div>
                </aside>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
