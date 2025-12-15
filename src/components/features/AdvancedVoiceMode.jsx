/**
 * Gemini Live Voice Mode - Japanese Minimalist Design (2025 Edition)
 * 
 * Design: Apple + Japanese (間 Ma, 簡素 Kanso) 
 * Theme: Solid White/Black backgrounds with Real-time Audio Visualization
 * 
 * Features:
 * - Real-time Web Audio API Visualization (Microphone & Output)
 * - Haptic Feedback for Mobile
 * - Adaptive Visuals based on Audio Energy
 * - Live Analytics & Metadata
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Volume2, X, Sparkles, MessageSquare, Globe, Cpu,
    Loader2, User, RefreshCw, Clock, Waves, Download,
    Zap, Hash, Type, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// CONFIGURATION
// ============================================================================

const VOICE_MODELS = [
    { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Native Audio', short: '2.5 Native' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', short: '2.5 Flash' },
    { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', short: '2.5 Lite' },
    { id: 'google/gemini-2.0-flash-001:free', name: 'Gemini 2.0 Flash (Free)', short: '2.0 Free' },
    { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', short: '2.0 Lite' },
];

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

// Utility: Haptic Feedback
const triggerHaptic = (pattern = [10]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

// --- Real-time Audio Visualizer ---
const AudioVisualizer = ({ stream, isDark, isActive }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const contextRef = useRef(null);
    const sourceRef = useRef(null);

    useEffect(() => {
        if (!stream || !isActive || !canvasRef.current) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            contextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Low FFT size for bars
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            dataArrayRef.current = dataArray;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const bars = 7; // Number of bars to render

            const renderFrame = () => {
                animationRef.current = requestAnimationFrame(renderFrame);
                analyser.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Calculate total energy for glow effect
                // let energy = 0;
                // for(let i = 0; i < bufferLength; i++) energy += dataArray[i];
                // energy = energy / bufferLength;

                const barWidth = 6;
                const gap = 4;
                const totalWidth = (barWidth * bars) + (gap * (bars - 1));
                const startX = (canvas.width - totalWidth) / 2;

                for (let i = 0; i < bars; i++) {
                    // Map frequency data to bars (skip lower frequencies)
                    const index = Math.floor(i * (bufferLength / bars));
                    const value = dataArray[index];
                    const percent = value / 256;
                    const height = Math.max(8, percent * 40); // Min height 8px, Max 40px

                    const x = startX + i * (barWidth + gap);
                    const y = (canvas.height - height) / 2;

                    ctx.fillStyle = isDark ? `rgba(255, 255, 255, ${0.4 + percent * 0.6})` : `rgba(0, 0, 0, ${0.4 + percent * 0.6})`;

                    // Draw rounded rect
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, height, 50);
                    ctx.fill();
                }
            };

            renderFrame();
        } catch (err) {
            console.error("Audio Context Error:", err);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (contextRef.current) contextRef.current.close();
        };
    }, [stream, isActive, isDark]);

    // Fallback for when inactive
    if (!isActive) {
        return (
            <div className="flex items-center justify-center gap-1 h-12">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className={cn('w-1.5 h-2 rounded-full opacity-20', isDark ? 'bg-white' : 'bg-black')} />
                ))}
            </div>
        );
    }

    return <canvas ref={canvasRef} width={80} height={48} />;
};

// --- Minimal Orb (Reactive) ---
const Orb = ({ status, onClick, disabled, isDark, audioLevel }) => {
    const isActive = status !== 'idle';

    // Calculate scale based on audio level if listening/speaking
    const baseScale = isActive ? 1.05 : 1;
    const dynamicScale = isActive && audioLevel > 0 ? 1 + (audioLevel * 0.15) : baseScale;

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'relative w-48 h-48 md:w-56 md:h-56 rounded-full',
                'flex items-center justify-center transition-all duration-300',
                'disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none',
                isDark ? 'bg-white' : 'bg-black',
                isActive && (isDark ? 'shadow-[0_0_60px_rgba(255,255,255,0.3)]' : 'shadow-[0_0_60px_rgba(0,0,0,0.2)]')
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
                scale: status === 'processing' ? [1, 1.05, 1] : dynamicScale
            }}
            transition={{
                duration: status === 'processing' ? 2 : 0.1,
                repeat: status === 'processing' ? Infinity : 0,
                ease: "easeOut"
            }}
        >
            <div className={cn(isDark ? 'text-black' : 'text-white')}>
                {status === 'processing' ? (
                    <Loader2 className="w-16 h-16 md:w-20 md:h-20 animate-spin" />
                ) : status === 'listening' ? (
                    <Mic className="w-16 h-16 md:w-20 md:h-20" />
                ) : status === 'speaking' ? (
                    <Volume2 className="w-16 h-16 md:w-20 md:h-20" />
                ) : (
                    <MicOff className="w-16 h-16 md:w-20 md:h-20" />
                )}
            </div>

            {/* Ripple rings */}
            {isActive && (
                <>
                    <motion.div
                        className={cn('absolute inset-0 rounded-full border', isDark ? 'border-white/20' : 'border-black/10')}
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{ scale: 1.4, opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                    <motion.div
                        className={cn('absolute inset-0 rounded-full border', isDark ? 'border-white/10' : 'border-black/5')}
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{ scale: 1.6, opacity: [0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4, ease: "easeOut" }}
                    />
                </>
            )}
        </motion.button>
    );
};

// --- Main Component ---
const AdvancedVoiceMode = ({ isOpen, onClose }) => {
    // Theme Detection
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

    // Audio State
    const [mediaStream, setMediaStream] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0); // 0 to 1 normalized volume

    // Metadata
    const [sessionStart, setSessionStart] = useState(null);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [totalWords, setTotalWords] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [avgLatency, setAvgLatency] = useState(0);

    // Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const timeoutRef = useRef(null);
    const cleanupRef = useRef(false);
    const conversationRef = useRef([]);
    const requestStartRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const rafRef = useRef(null);

    // Sync refs
    useEffect(() => { conversationRef.current = conversation; }, [conversation]);

    // Timer
    useEffect(() => {
        let interval;
        if (isOpen && sessionStart) {
            interval = setInterval(() => setSessionDuration(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
        }
        return () => clearInterval(interval);
    }, [isOpen, sessionStart]);

    // Audio Analysis Loop (for Orb Reactivity)
    useEffect(() => {
        if (!mediaStream) return;

        try {
            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContext();
            }
            if (!analyserRef.current) {
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                const source = audioContextRef.current.createMediaStreamSource(mediaStream);
                source.connect(analyserRef.current);
            }

            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVolume = () => {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const average = sum / bufferLength;
                // Normalize 0-255 to 0-1 with some sensitivity adjustment
                const normalized = Math.min(1, average / 128);
                setAudioLevel(normalized);
                rafRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

        } catch (e) {
            console.error("Audio analysis setup failed", e);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [mediaStream]);

    // Initialize Speech Recognition
    useEffect(() => {
        if (!isOpen) return;
        cleanupRef.current = false;
        setError(null);

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setError('Browser requires Native Audio support (Chrome/Edge)'); return; }

        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = selectedLanguage.voiceLang;

        rec.onstart = async () => {
            if (!cleanupRef.current) {
                setStatus('listening');
                triggerHaptic([10]); // Light tap
                if (!sessionStart) setSessionStart(Date.now());

                // Get stream for visualizer
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setMediaStream(stream);
                } catch (e) { console.error("Mic access denied for visualizer", e); }
            }
        };

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
                timeoutRef.current = setTimeout(() => process(final.trim()), 1000); // 1s silence threshold
            }
        };

        rec.onerror = (e) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                setStatus('idle');
                triggerHaptic([30, 30]); // Double tap error
            }
        };

        rec.onend = () => {
            // Stop visualizer stream to save battery when not listening
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
                setMediaStream(null);
            }
            if (status === 'listening' && !cleanupRef.current) {
                try { rec.start(); } catch { }
            }
        };

        recognitionRef.current = rec;
        return () => {
            cleanupRef.current = true;
            try { recognitionRef.current?.stop(); } catch { }
            if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        };
    }, [isOpen, selectedLanguage]);

    // Process logic
    const process = useCallback(async (text) => {
        if (!text.trim() || status === 'processing') return;
        setStatus('processing');
        triggerHaptic([15]);
        try { recognitionRef.current?.stop(); } catch { }

        // Metadata update
        const userWords = text.trim().split(/\s+/).length;
        setTotalWords(prev => prev + userWords);
        setMessageCount(prev => prev + 1);

        setConversation(prev => [...prev, {
            role: 'user', content: text, timestamp: Date.now(),
            metadata: { words: userWords }
        }]);

        try {
            requestStartRef.current = Date.now();

            // API Call
            const res = await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `You are Gemini Live. Be concise, warm, and natural. Respond in ${selectedLanguage.name}.` },
                        ...conversationRef.current.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: text }
                    ],
                    model: selectedModel.id,
                    preferred_language: selectedLanguage.code
                })
            });

            const latency = Date.now() - requestStartRef.current;

            if (!res.ok) throw new Error('Network error');
            const data = await res.json();

            if (data.response) {
                const botWords = data.response.trim().split(/\s+/).length;
                setTotalWords(prev => prev + botWords);
                setMessageCount(prev => prev + 1);
                setAvgLatency(prev => prev ? Math.round((prev + latency) / 2) : latency);

                setConversation(prev => [...prev, {
                    role: 'assistant', content: data.response, timestamp: Date.now(),
                    metadata: { words: botWords, latency }
                }]);

                await speak(data.response);
            }
        } catch (err) {
            setError('Connection failed');
            setStatus('idle');
            triggerHaptic([50]);
            setTimeout(() => { if (!cleanupRef.current) startListen(); }, 1500);
        }
        setTranscript('');
        setInterimTranscript('');
    }, [status, selectedLanguage, selectedModel]);

    // TTS using Gemini Native Audio (HD voices with emotions & accents)
    const speak = useCallback(async (text) => {
        setStatus('speaking');
        triggerHaptic([10]);

        try {
            // Call backend TTS service (Gemini Native Audio)
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    language: selectedLanguage.voiceLang,
                    voice: null, // Let Gemini pick best voice for language
                    speed: 1.05,
                })
            });

            if (!response.ok) {
                throw new Error('TTS API failed');
            }

            const data = await response.json();

            if (data.success && data.audio) {
                // Decode base64 audio
                const audioData = atob(data.audio);
                const arrayBuffer = new ArrayBuffer(audioData.length);
                const view = new Uint8Array(arrayBuffer);
                for (let i = 0; i < audioData.length; i++) {
                    view[i] = audioData.charCodeAt(i);
                }

                // Create blob and play
                const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    setStatus('idle');
                    setTimeout(() => { if (!cleanupRef.current) startListen(); }, 200);
                };

                audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    setStatus('idle');
                };

                await audio.play();
            } else {
                throw new Error('No audio in response');
            }
        } catch (error) {
            console.error('Gemini TTS error:', error);
            // Fallback to browser TTS if Gemini fails
            if (synthRef.current) {
                synthRef.current.cancel();
                const utt = new SpeechSynthesisUtterance(text);
                utt.lang = selectedLanguage.voiceLang;
                utt.rate = 1.05;
                utt.onend = () => {
                    setStatus('idle');
                    setTimeout(() => { if (!cleanupRef.current) startListen(); }, 200);
                };
                synthRef.current.speak(utt);
            } else {
                setStatus('idle');
            }
        }
    }, [selectedLanguage]);

    // Controls
    const startListen = useCallback(() => {
        if (recognitionRef.current && status !== 'processing' && status !== 'speaking') {
            try { recognitionRef.current.start(); } catch { }
        }
    }, [status]);

    const stopListen = useCallback(() => {
        try { recognitionRef.current?.stop(); } catch { }
        setStatus('idle');
        triggerHaptic([20]);
    }, []);

    const toggle = useCallback(() => {
        if (status === 'listening') {
            stopListen();
            const pending = (transcript + interimTranscript).trim();
            if (pending) process(pending);
        } else if (status === 'idle') startListen();
        else if (status === 'speaking') {
            synthRef.current?.cancel();
            setStatus('idle');
            triggerHaptic([20]);
        }
    }, [status, transcript, interimTranscript, process, startListen, stopListen]);

    const close = useCallback(() => {
        cleanupRef.current = true;
        stopListen();
        synthRef.current?.cancel();
        onClose();
    }, [onClose, stopListen]);

    const exportData = useCallback(() => {
        const data = { session: { start: sessionStart, duration: sessionDuration }, conversation };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = `voice-session-${Date.now()}.json`; a.click();
    }, [conversation, sessionStart, sessionDuration]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn('fixed inset-0 z-50 flex', isDark ? 'bg-black' : 'bg-white')}
            >
                {/* 1. Sidebar (Desktop) */}
                <aside className={cn(
                    'hidden lg:flex flex-col w-96 border-r',
                    isDark ? 'border-white/5 bg-black' : 'border-black/5 bg-white'
                )}>
                    <div className="p-6 border-b border-inherit">
                        <h2 className={cn('text-sm font-medium opacity-50', isDark ? 'text-white' : 'text-black')}>Conversation History</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {conversation.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-30">
                                <MessageSquare className="w-8 h-8 mb-2" />
                                <p className="text-xs">No messages yet</p>
                            </div>
                        ) : (
                            conversation.map((msg, i) => (
                                <div key={i} className={cn(
                                    'p-4 rounded-2xl text-sm leading-relaxed',
                                    msg.role === 'user'
                                        ? isDark ? 'bg-white text-black' : 'bg-black text-white'
                                        : isDark ? 'bg-white/10 text-white/90' : 'bg-black/5 text-black/90'
                                )}>
                                    {msg.content}
                                    <div className="mt-2 flex items-center gap-2 opacity-40 text-[10px]">
                                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                        {msg.metadata?.latency && <span>• {msg.metadata.latency}ms</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* 2. Main Interface */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Header */}
                    <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                        <div className="flex items-center gap-3">
                            <div className={cn('w-2 h-2 rounded-full animate-pulse',
                                status === 'listening' ? 'bg-red-500' :
                                    status === 'speaking' ? 'bg-green-500' : 'bg-blue-500'
                            )} />
                            <span className={cn('font-medium', isDark ? 'text-white' : 'text-black')}>
                                Gemini Live
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={selectedLanguage.code}
                                onChange={(e) => setSelectedLanguage(LANGUAGES.find(l => l.code === e.target.value))}
                                className={cn('text-xs bg-transparent outline-none cursor-pointer', isDark ? 'text-white/70' : 'text-black/70')}
                            >
                                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>
                            <button onClick={exportData} className="p-2 opacity-50 hover:opacity-100"><Download className="w-4 h-4" /></button>
                            <button onClick={close} className="p-2 opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
                        </div>
                    </header>

                    {/* Central Stage */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-8 relative">
                        {/* Status Label */}
                        <motion.div
                            key={status}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn('text-sm font-medium tracking-wide', isDark ? 'text-white/50' : 'text-black/50')}
                        >
                            {status === 'idle' ? 'Tap to start' :
                                status === 'listening' ? 'Listening...' :
                                    status === 'processing' ? 'Thinking...' : 'Speaking...'}
                        </motion.div>

                        {/* Interactive Orb */}
                        <Orb
                            status={status}
                            onClick={toggle}
                            disabled={status === 'processing'}
                            isDark={isDark}
                            audioLevel={audioLevel}
                        />

                        {/* Visualizer (Waveform) */}
                        <div className="h-12 w-32 flex items-center justify-center">
                            {(status === 'listening' || status === 'speaking') ? (
                                <AudioVisualizer stream={mediaStream} isActive={true} isDark={isDark} />
                            ) : (
                                <div className={cn('h-1 w-8 rounded-full opacity-20', isDark ? 'bg-white' : 'bg-black')} />
                            )}
                        </div>

                        {/* Live Transcript */}
                        <AnimatePresence>
                            {(transcript || interimTranscript) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={cn('absolute bottom-32 max-w-lg text-center px-6', isDark ? 'text-white/80' : 'text-black/80')}
                                >
                                    <p className="text-lg font-light leading-relaxed">
                                        {transcript}
                                        <span className="opacity-50">{interimTranscript}</span>
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer Stats */}
                    <footer className={cn(
                        'p-6 flex justify-center gap-8 text-[10px] uppercase tracking-wider',
                        isDark ? 'text-white/30' : 'text-black/30'
                    )}>
                        <div className="flex flex-col items-center gap-1">
                            <Clock className="w-3 h-3 mb-1" />
                            <span>{Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Type className="w-3 h-3 mb-1" />
                            <span>{totalWords} Words</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Cpu className="w-3 h-3 mb-1" />
                            <span>{selectedModel.short}</span>
                        </div>
                    </footer>
                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
