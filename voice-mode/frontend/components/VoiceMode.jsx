/**
 * Gemini Voice Mode - Production Component
 * Pure Gemini 2.5 Flash Native Audio (NO browser TTS fallback)
 * 
 * Features:
 * - 30 HD voices with emotional intelligence
 * - Real-time audio visualization
 * - Haptic feedback
 * - Session analytics
 * - 24 languages
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Volume2, X, Sparkles, MessageSquare, Globe,
    Loader2, User, RefreshCw, Download, Zap, Hash, Type, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import voice configurations
import { VOICE_MODELS, LANGUAGES, VOICE_PROFILES } from '../config/voice.config.js';
import { AudioVisualizer } from '../components/AudioVisualizer.jsx';
import { triggerHaptic, countWords, estimateTokens } from '../utils/audio-helpers.js';

/**
 * Gemini Voice Mode Component
 * 
 * @param {boolean} isOpen - Control visibility
 * @param {function} onClose - Close handler
 * @param {string} apiEndpoint - Backend TTS endpoint (default: '/api/voice/tts')
 */
const VoiceMode = ({ isOpen, onClose, apiEndpoint = '/api/voice/tts' }) => {
    // Theme detection
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const check = () => setIsDark(document.documentElement.classList.contains('dark'));
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // State
    const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [conversation, setConversation] = useState([]);
    const [error, setError] = useState(null);
    const [selectedModel, setSelectedModel] = useState(VOICE_MODELS[0]);
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
    const [selectedVoice, setSelectedVoice] = useState(null); // Auto-select per language

    // Audio state
    const [mediaStream, setMediaStream] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const [currentAudio, setCurrentAudio] = useState(null);

    // Metadata
    const [sessionStart, setSessionStart] = useState(null);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [totalWords, setTotalWords] = useState(0);
    const [totalTokens, setTotalTokens] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [avgLatency, setAvgLatency] = useState(0);

    // Refs
    const recognitionRef = useRef(null);
    const cleanupRef = useRef(false);
    const conversationRef = useRef([]);
    const requestStartRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => { conversationRef.current = conversation; }, [conversation]);

    // Session timer
    useEffect(() => {
        let interval;
        if (isOpen && sessionStart) {
            interval = setInterval(() => setSessionDuration(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
        }
        return () => clearInterval(interval);
    }, [isOpen, sessionStart]);

    // Audio level monitoring
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
                setAudioLevel(Math.min(1, average / 128));
                rafRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
        } catch (e) {
            console.error("Audio analysis failed", e);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [mediaStream]);

    // Speech Recognition
    useEffect(() => {
        if (!isOpen) return;
        cleanupRef.current = false;
        setError(null);

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setError('Speech recognition not supported in this browser');
            return;
        }

        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = selectedLanguage.voiceLang;

        rec.onstart = async () => {
            if (!cleanupRef.current) {
                setStatus('listening');
                triggerHaptic([10]);
                if (!sessionStart) setSessionStart(Date.now());

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setMediaStream(stream);
                } catch (e) {
                    console.error("Mic access denied", e);
                }
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
                setTimeout(() => processUserInput(final.trim()), 1000);
            }
        };

        rec.onerror = (e) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                setStatus('idle');
                triggerHaptic([30, 30]);
            }
        };

        rec.onend = () => {
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

    // Process user input
    const processUserInput = useCallback(async (text) => {
        if (!text.trim() || status === 'processing') return;
        setStatus('processing');
        triggerHaptic([15]);
        try { recognitionRef.current?.stop(); } catch { }

        const userWords = countWords(text);
        const userTokens = estimateTokens(text);

        setConversation(prev => [...prev, {
            role: 'user',
            content: text,
            timestamp: Date.now(),
            metadata: { words: userWords, tokens: userTokens }
        }]);
        setTotalWords(prev => prev + userWords);
        setTotalTokens(prev => prev + userTokens);
        setMessageCount(prev => prev + 1);

        try {
            requestStartRef.current = Date.now();

            const res = await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: ' system', content: `You are Gemini Live. Be concise, warm, and natural. Respond in ${selectedLanguage.name}.` },
                        ...conversationRef.current.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: text }
                    ],
                    model: selectedModel.id,
                    preferred_language: selectedLanguage.code
                })
            });

            const latency = Date.now() - requestStartRef.current;
            if (!res.ok) throw new Error('API error');

            const data = await res.json();

            if (data.response) {
                const botWords = countWords(data.response);
                const botTokens = estimateTokens(data.response);

                setConversation(prev => [...prev, {
                    role: 'assistant',
                    content: data.response,
                    timestamp: Date.now(),
                    metadata: { words: botWords, tokens: botTokens, latency }
                }]);
                setTotalWords(prev => prev + botWords);
                setTotalTokens(prev => prev + botTokens);
                setMessageCount(prev => prev + 1);
                setAvgLatency(prev => prev ? Math.round((prev + latency) / 2) : latency);

                await speakWithGemini(data.response);
            }
        } catch (err) {
            setError('Connection failed');
            setStatus('idle');
            triggerHaptic([50]);
        }
        setTranscript('');
        setInterimTranscript('');
    }, [status, selectedLanguage, selectedModel]);

    // Gemini Native Audio TTS (NO browser fallback)
    const speakWithGemini = useCallback(async (text) => {
        setStatus('speaking');
        triggerHaptic([10]);

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    language: selectedLanguage.voiceLang,
                    voice: selectedVoice,
                    speed: 1.05,
                    enable_emotions: true
                })
            });

            if (!response.ok) {
                throw new Error(`TTS API returned ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.audio) {
                throw new Error('No audio in response');
            }

            // Decode and play
            const audioData = atob(data.audio);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
            }

            const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            setCurrentAudio(audio);

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                setCurrentAudio(null);
                setStatus('idle');
                setTimeout(() => { if (!cleanupRef.current) startListening(); }, 200);
            };

            audio.onerror = (e) => {
                URL.revokeObjectURL(audioUrl);
                setCurrentAudio(null);
                console.error('Audio playback error:', e);
                setStatus('idle');
            };

            await audio.play();

        } catch (error) {
            console.error('Gemini TTS failed:', error);
            setError('Voice synthesis failed. Check GOOGLE_API_KEY.');
            setStatus('idle');
            triggerHaptic([50]);
        }
    }, [selectedLanguage, selectedVoice, apiEndpoint]);

    // Control functions
    const startListening = useCallback(() => {
        if (recognitionRef.current && status !== 'processing' && status !== 'speaking') {
            try { recognitionRef.current.start(); } catch { }
        }
    }, [status]);

    const stopListening = useCallback(() => {
        try { recognitionRef.current?.stop(); } catch { }
        setStatus('idle');
        triggerHaptic([20]);
    }, []);

    const toggle = useCallback(() => {
        if (status === 'listening') {
            stopListening();
            const pending = (transcript + interimTranscript).trim();
            if (pending) processUserInput(pending);
        } else if (status === 'idle') {
            startListening();
        } else if (status === 'speaking' && currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            setCurrentAudio(null);
            setStatus('idle');
            triggerHaptic([20]);
        }
    }, [status, transcript, interimTranscript, currentAudio, processUserInput, startListening, stopListening]);

    const close = useCallback(() => {
        cleanupRef.current = true;
        stopListening();
        if (currentAudio) {
            currentAudio.pause();
            setCurrentAudio(null);
        }
        onClose();
    }, [onClose, stopListening, currentAudio]);

    const exportData = useCallback(() => {
        const data = {
            session: { start: sessionStart, duration: sessionDuration, model: selectedModel.name, language: selectedLanguage.name },
            analytics: { messages: messageCount, totalWords, totalTokens, avgLatency },
            conversation: conversation.map(m => ({ ...m, timestamp: new Date(m.timestamp).toISOString() }))
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `gemini-voice-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [conversation, sessionStart, sessionDuration, selectedModel, selectedLanguage, messageCount, totalWords, totalTokens, avgLatency]);

    if (!isOpen) return null;

    const formatDuration = (sec) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn('fixed inset-0 z-50 flex', isDark ? 'bg-black' : 'bg-white')}
            >
                {/* Main Interface - Similar to previous design but cleaned */}
                <main className="flex-1 flex flex-col">
                    <header className="p-6 flex justify-between items-center border-b border-current/5">
                        <div className="flex items-center gap-3">
                            <div className={cn('w-2 h-2 rounded-full animate-pulse',
                                status === 'listening' ? 'bg-red-500' :
                                    status === 'speaking' ? 'bg-green-500' :
                                        status === 'processing' ? 'bg-blue-500' : 'bg-gray-400'
                            )} />
                            <span className="font-medium">Gemini Live</span>
                        </div>
                        <div className="flex gap-2">
                            <select value={selectedLanguage.code} onChange={(e) => setSelectedLanguage(LANGUAGES.find(l => l.code === e.target.value))}
                                className="text-xs bg-transparent outline-none cursor-pointer opacity-70 hover:opacity-100">
                                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>
                            {conversation.length > 0 && (
                                <button onClick={exportData} className="p-2 opacity-50 hover:opacity-100" title="Export">
                                    <Download className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={() => setConversation([])} className="p-2 opacity-50 hover:opacity-100" title="Clear">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={close} className="p-2 opacity-50 hover:opacity-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                        {error && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                                {error}
                            </motion.p>
                        )}

                        <motion.div key={status} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className="text-sm opacity-50">
                            {status === 'idle' ? 'Tap to start' :
                                status === 'listening' ? 'Listening...' :
                                    status === 'processing' ? 'Thinking...' : 'Speaking...'}
                        </motion.div>

                        {/* Orb - Render from AudioVisualizer component */}
                        <button onClick={toggle} disabled={status === 'processing'}
                            className={cn('relative w-48 h-48 md:w-56 md:h-56 rounded-full flex items-center justify-center transition-all',
                                isDark ? 'bg-white text-black' : 'bg-black text-white',
                                'disabled:opacity-40')}>
                            {status === 'processing' ? <Loader2 className="w-16 h-16 animate-spin" /> :
                                status === 'listening' ? <Mic className="w-16 h-16" /> :
                                    status === 'speaking' ? <Volume2 className="w-16 h-16" /> :
                                        <MicOff className="w-16 h-16" />}
                        </button>

                        <AudioVisualizer stream={mediaStream} isActive={status === 'listening' || status === 'speaking'} isDark={isDark} />

                        {(transcript || interimTranscript) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md text-center px-6 py-3 rounded-2xl bg-current/5">
                                <p>{transcript}<span className="opacity-50">{interimTranscript}</span></p>
                            </motion.div>
                        )}
                    </div>

                    <footer className="p-6 flex justify-center gap-8 text-[10px] uppercase tracking-wider opacity-30">
                        <div className="flex flex-col items-center gap-1">
                            <Timer className="w-3 h-3" />
                            <span>{formatDuration(sessionDuration)}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Type className="w-3 h-3" />
                            <span>{totalWords}w</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Hash className="w-3 h-3" />
                            <span>~{totalTokens}t</span>
                        </div>
                    </footer>
                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default VoiceMode;
