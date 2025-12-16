/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE MODE 5.0 - Human-Like Continuous Conversation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Major Improvements:
 * 1. Uses Gemini 2.0 Flash (FREE) via OpenRouter for better voice responses
 * 2. Enhanced Browser TTS with emotion control
 * 3. Natural conversation flow with thinking pauses
 * 4. Multiple accent/voice options
 * 5. Continuous listening loop after AI speaks
 * 
 * @version 5.0.0
 * @date December 2025
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mic, MicOff, Settings, Sparkles, Zap, Globe,
    MessageSquare, Volume2, VolumeX, RefreshCw, Waves,
    User, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Speech Recognition
    SILENCE_SHORT: 1200,
    SILENCE_MEDIUM: 1800,
    SILENCE_LONG: 2500,
    MIN_CONFIDENCE: 0.65,

    // Natural Conversation
    THINKING_MIN: 400,
    THINKING_MAX: 900,
    AUTO_RESTART_DELAY: 500,

    // Audio
    SPEECH_RATE_DEFAULT: 0.92,
    SPEECH_PITCH_DEFAULT: 1.0,

    // OpenRouter Gemini Model (FREE and works great!)
    CHAT_MODEL: 'google/gemini-2.0-flash-exp:free',
};

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE PERSONAS WITH EMOTIONS & ACCENTS
// ═══════════════════════════════════════════════════════════════════════════════

const PERSONAS = {
    default: {
        name: 'AssistMe',
        emoji: '🎙️',
        rate: 0.92,
        pitch: 1.0,
        voicePreference: ['Samantha', 'Karen', 'Daniel', 'Google US', 'Microsoft Zira'],
        systemPrompt: `You are AssistMe, a warm and intelligent voice assistant having a natural spoken conversation.

🎯 VOICE RESPONSE RULES - FOLLOW EXACTLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. KEEP IT SHORT: Maximum 2-3 sentences. This is SPOKEN, not written.
2. SOUND NATURAL: Use contractions (I'm, you're, can't), filler words occasionally (well, so, actually)
3. NO MARKDOWN: Never use **, ##, -, *, or any formatting
4. NO LISTS: Never use bullet points or numbered lists
5. SPELL NUMBERS: Say "twenty-five" not "25"
6. ADD PAUSES: Use commas for natural breathing pauses
7. BE CONVERSATIONAL: Like talking to a friend, not reading a textbook
8. END CLEARLY: Finish with a complete thought, optionally ask a follow-up

WRONG: "Here are 3 things: 1. First... 2. Second..."
RIGHT: "Well, I'd say the main thing is... And you might also want to consider..."

Remember: You're being SPOKEN aloud, so sound like a human talking!`,
    },
    friendly: {
        name: 'Buddy',
        emoji: '😊',
        rate: 0.95,
        pitch: 1.05,
        voicePreference: ['Samantha', 'Karen', 'Google US Female'],
        systemPrompt: `You are Buddy, a super friendly and upbeat voice assistant!

🎯 YOUR STYLE:
- Be enthusiastic but not over the top
- Use casual language like "hey", "cool", "awesome"
- Keep responses to 2 sentences max
- Sound genuinely interested in helping
- Add warmth with phrases like "I'd love to help with that!"

NO FORMATTING OR LISTS - just natural speech!`,
    },
    professional: {
        name: 'Expert',
        emoji: '💼',
        rate: 0.88,
        pitch: 0.95,
        voicePreference: ['Daniel', 'Google UK Male', 'Microsoft David'],
        systemPrompt: `You are Expert, a professional and authoritative voice advisor.

🎯 YOUR STYLE:
- Be direct and confident
- Use precise language
- Maximum 2 sentences per response
- No hedging or unnecessary qualifiers
- Sound knowledgeable without being condescending

NO FORMATTING - concise spoken responses only.`,
    },
    empathetic: {
        name: 'Companion',
        emoji: '💝',
        rate: 0.85,
        pitch: 1.02,
        voicePreference: ['Samantha', 'Google UK Female', 'Karen'],
        systemPrompt: `You are Companion, a warm and supportive voice friend.

🎯 YOUR STYLE:
- Speak softly and warmly
- Validate feelings: "I understand how you feel..."
- Use supportive phrases: "That makes sense", "I hear you"
- Keep responses gentle and brief (2 sentences)
- Never rush - pause naturally

NO FORMATTING - just warm, spoken comfort.`,
    },
    energetic: {
        name: 'Spark',
        emoji: '⚡',
        rate: 1.05,
        pitch: 1.1,
        voicePreference: ['Samantha', 'Google US Female'],
        systemPrompt: `You are Spark, a high-energy motivational voice!

🎯 YOUR STYLE:
- Be EXCITED and dynamic!
- Short, punchy responses (1-2 sentences)
- Use power words: "Absolutely!", "Let's do this!", "You got it!"
- Inspire action and confidence
- Keep the energy HIGH

NO FORMATTING - pure spoken energy!`,
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const naturalDelay = () => new Promise(resolve =>
    setTimeout(resolve, CONFIG.THINKING_MIN + Math.random() * (CONFIG.THINKING_MAX - CONFIG.THINKING_MIN))
);

const getAdaptiveSilenceTimeout = (length) => {
    if (length < 30) return CONFIG.SILENCE_SHORT;
    if (length < 80) return CONFIG.SILENCE_MEDIUM;
    return CONFIG.SILENCE_LONG;
};

const normalizeForSpeech = (text) => {
    if (!text) return '';
    const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
    return text
        .replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')
        .replace(/#{1,6}\s?/g, '').replace(/\n+/g, '. ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/•|-\s/g, '')
        .replace(/\d+\.\s/g, '')
        .replace(/(\d+)/g, (m) => {
            const n = parseInt(m);
            return n <= 20 ? (numbers[n] || m) : m;
        })
        .replace(/\s+/g, ' ').trim();
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdvancedVoiceMode({ isOpen, onClose, backendUrl = '' }) {
    // State
    const [status, setStatus] = useState('idle');
    const [mode, setMode] = useState('standard');
    const [persona, setPersona] = useState('default');
    const [showSettings, setShowSettings] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Conversation
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [conversation, setConversation] = useState([]);

    // Audio Level
    const [audioLevel, setAudioLevel] = useState(0);
    const [isSpeechDetected, setIsSpeechDetected] = useState(false);

    // Error
    const [errorMessage, setErrorMessage] = useState('');

    // Refs
    const statusRef = useRef(status);
    const transcriptRef = useRef('');
    const personaRef = useRef(persona);
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
    const voicesLoadedRef = useRef(false);
    const currentUtteranceRef = useRef(null);
    const messagesEndRef = useRef(null);
    const streamRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Sync refs
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { personaRef.current = persona; }, [persona]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation, aiResponse]);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            if (synthRef.current) {
                synthRef.current.getVoices();
                voicesLoadedRef.current = true;
            }
        };
        loadVoices();
        if (synthRef.current) {
            synthRef.current.onvoiceschanged = loadVoices;
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // ENHANCED TTS WITH EMOTION
    // ─────────────────────────────────────────────────────────────────────────

    const speak = useCallback((text, onEnd) => {
        if (!synthRef.current || !text || isMuted) {
            if (onEnd) onEnd();
            return;
        }

        synthRef.current.cancel();
        const normalizedText = normalizeForSpeech(text);

        if (!normalizedText) {
            if (onEnd) onEnd();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(normalizedText);
        const personaConfig = PERSONAS[personaRef.current] || PERSONAS.default;

        // Apply persona voice settings
        utterance.rate = personaConfig.rate;
        utterance.pitch = personaConfig.pitch;
        utterance.volume = 1.0;

        // Find best matching voice
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v =>
            personaConfig.voicePreference.some(pref =>
                v.name.toLowerCase().includes(pref.toLowerCase())
            ) && v.lang.startsWith('en')
        );

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        } else {
            // Fallback to any English voice
            const englishVoice = voices.find(v => v.lang.startsWith('en'));
            if (englishVoice) utterance.voice = englishVoice;
        }

        utterance.onstart = () => {
            setStatus('speaking');
            currentUtteranceRef.current = utterance;
        };

        utterance.onend = () => {
            currentUtteranceRef.current = null;
            if (onEnd) onEnd();
        };

        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            currentUtteranceRef.current = null;
            if (onEnd) onEnd();
        };

        try {
            synthRef.current.speak(utterance);
        } catch (e) {
            console.error('Speak error:', e);
            if (onEnd) onEnd();
        }
    }, [isMuted]);

    const stopSpeaking = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        currentUtteranceRef.current = null;
        if (statusRef.current === 'speaking') {
            setStatus('idle');
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIO MONITORING FOR VISUALIZATION
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
                smoothed = smoothed * 0.85 + rms * 0.15;
                setAudioLevel(Math.min(1, smoothed * 15));
                setIsSpeechDetected(smoothed > 0.02);
                animationFrameRef.current = requestAnimationFrame(update);
            };
            update();
        } catch (e) {
            console.error('Audio monitoring error:', e);
        }
    }, []);

    const stopAudioMonitoring = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (analyserRef.current) {
            try { analyserRef.current.ctx.close(); } catch (e) { }
            analyserRef.current = null;
        }
        setAudioLevel(0);
        setIsSpeechDetected(false);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI-POWERED RESPONSE GENERATION
    // ─────────────────────────────────────────────────────────────────────────

    const generateResponse = useCallback(async (userText, history) => {
        const personaConfig = PERSONAS[personaRef.current] || PERSONAS.default;

        try {
            // Use OpenRouter with Gemini 2.0 Flash (FREE!)
            const response = await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: personaConfig.systemPrompt },
                        ...history.slice(-10).map(m => ({ role: m.role, content: m.content }))
                    ],
                    model: CONFIG.CHAT_MODEL,
                    max_tokens: 150,
                    temperature: 0.85,
                })
            });

            if (!response.ok) {
                throw new Error('Chat API failed');
            }

            const data = await response.json();
            return data.response || "I'm not sure how to respond to that.";

        } catch (e) {
            console.error('Response generation error:', e);
            return "I'm having trouble connecting. Please try again.";
        }
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // CONVERSATION HANDLER WITH CONTINUOUS FLOW
    // ─────────────────────────────────────────────────────────────────────────

    const handleUserInput = useCallback(async (userText, confidence = 1.0) => {
        if (!userText.trim()) return;

        setStatus('processing');
        setTranscript('');
        setInterimTranscript('');
        setErrorMessage('');

        // Add user message
        const newHistory = [...conversation, { role: 'user', content: userText }];
        setConversation(newHistory);

        // Low confidence - ask for clarification
        if (confidence < CONFIG.MIN_CONFIDENCE) {
            const clarification = "I didn't quite catch that. Could you say it again?";
            setAiResponse(clarification);
            setConversation([...newHistory, { role: 'assistant', content: clarification }]);
            speak(clarification, () => {
                setStatus('idle');
                // Auto-restart listening after speaking
                setTimeout(() => {
                    if (statusRef.current === 'idle') startRecognition();
                }, CONFIG.AUTO_RESTART_DELAY);
            });
            return;
        }

        // Natural thinking pause
        await naturalDelay();

        // Generate AI response
        const response = await generateResponse(userText, newHistory);

        setAiResponse(response);
        setConversation([...newHistory, { role: 'assistant', content: response }]);

        // Speak the response, then auto-resume listening
        speak(response, () => {
            setStatus('idle');
            // CONTINUOUS CONVERSATION: Auto-restart listening after AI speaks
            setTimeout(() => {
                if (statusRef.current === 'idle' && mode === 'standard') {
                    startRecognition();
                }
            }, CONFIG.AUTO_RESTART_DELAY);
        });

    }, [conversation, generateResponse, speak, mode]);

    // ─────────────────────────────────────────────────────────────────────────
    // SPEECH RECOGNITION
    // ─────────────────────────────────────────────────────────────────────────

    const startRecognition = useCallback(async () => {
        if (statusRef.current === 'processing' || statusRef.current === 'speaking') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage('Speech recognition not supported.');
            setStatus('error');
            return;
        }

        // Stop any existing recognition
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        // Get microphone access
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            streamRef.current = stream;
            startAudioMonitoring(stream);
        } catch (e) {
            setErrorMessage('Microphone access denied.');
            setStatus('error');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let finalTranscript = '';
        let lastConfidence = 1.0;

        recognition.onstart = () => {
            setStatus('listening');
            finalTranscript = '';
            transcriptRef.current = '';
        };

        recognition.onresult = (event) => {
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript + ' ';
                    lastConfidence = result[0].confidence || 1.0;
                } else {
                    interim += result[0].transcript;
                }
            }

            setTranscript(finalTranscript.trim());
            setInterimTranscript(interim);
            transcriptRef.current = finalTranscript.trim();

            // Clear existing timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

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
                handleUserInput(finalText, lastConfidence);
            } else if (statusRef.current === 'listening') {
                // Restart if no input
                setTimeout(() => {
                    if (statusRef.current === 'listening') {
                        try { recognition.start(); } catch (e) { }
                    }
                }, 100);
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech' && statusRef.current === 'listening') {
                setTimeout(() => {
                    try { recognition.start(); } catch (e) { }
                }, 100);
            } else if (event.error !== 'aborted') {
                console.error('Recognition error:', event.error);
            }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) { console.error(e); }
    }, [handleUserInput, startAudioMonitoring]);

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        stopAudioMonitoring();
    }, [stopAudioMonitoring]);

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (isOpen && status === 'idle' && mode === 'standard') {
            setTimeout(startRecognition, 400);
        }
    }, [isOpen, status, mode, startRecognition]);

    useEffect(() => {
        if (!isOpen) return;

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setStatus('error');
            setErrorMessage('Speech recognition not supported. Use Chrome or Edge.');
            return;
        }

        setStatus('idle');
        setConversation([]);
        setAiResponse('');
        setTranscript('');

        return () => {
            stopRecognition();
            stopSpeaking();
        };
    }, [isOpen, stopRecognition, stopSpeaking]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // UI HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    const getOrbColor = () => {
        if (status === 'error') return 'from-red-500 to-rose-600';
        if (status === 'speaking') return 'from-emerald-400 to-teal-500';
        if (status === 'processing') return 'from-amber-400 to-orange-500';
        if (status === 'listening') return 'from-blue-400 to-cyan-500';
        return 'from-slate-400 to-slate-500';
    };

    const handleOrbClick = () => {
        if (status === 'speaking') stopSpeaking();
        else if (status === 'error') { setStatus('idle'); setErrorMessage(''); startRecognition(); }
        else if (status === 'idle') startRecognition();
        else if (status === 'listening') { stopRecognition(); setStatus('idle'); }
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
                            <span className="hidden sm:inline">Gemini Voice</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted/30 border border-border/30">
                            <span>{PERSONAS[persona]?.emoji || '🎙️'}</span>
                            <span className="hidden sm:inline">{PERSONAS[persona]?.name || 'AssistMe'}</span>
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
                            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4">
                                <h3 className="text-sm font-semibold mb-3">Voice Persona</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.entries(PERSONAS).map(([key, p]) => (
                                        <button
                                            key={key}
                                            onClick={() => setPersona(key)}
                                            className={cn(
                                                "p-3 rounded-xl text-xs font-medium transition-all border text-left",
                                                persona === key
                                                    ? "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400"
                                                    : "border-border/50 hover:bg-muted"
                                            )}
                                        >
                                            <span className="text-lg mr-1">{p.emoji}</span>
                                            <span>{p.name}</span>
                                        </button>
                                    ))}
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
                                scale: status === 'listening' ? 1 + audioLevel * 0.6 : status === 'speaking' ? [1, 1.25, 1] : 1,
                                opacity: status === 'idle' ? 0.15 : 0.5
                            }}
                            transition={{ repeat: status === 'speaking' ? Infinity : 0, duration: 0.5 }}
                            className={cn("absolute -inset-10 sm:-inset-14 rounded-full blur-3xl bg-gradient-to-br", getOrbColor())}
                        />

                        {/* Speech Waves */}
                        {status === 'listening' && isSpeechDetected && (
                            <>
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 1, opacity: 0.6 }}
                                        animate={{ scale: 1.6 + i * 0.35, opacity: 0 }}
                                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                                        className="absolute inset-0 rounded-full border-2 border-blue-500"
                                    />
                                ))}
                            </>
                        )}

                        {/* Core Orb */}
                        <motion.div
                            animate={{
                                scale: status === 'speaking' ? [1, 1.1, 0.95, 1.05, 1] : status === 'processing' ? [1, 0.95, 1] : 1,
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
                        key={status + aiResponse.slice(0, 20)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 text-center max-w-md px-4"
                    >
                        <h2 className="text-xl sm:text-2xl font-medium mb-2">
                            {status === 'listening' && (isSpeechDetected ? 'Hearing you...' : 'Listening...')}
                            {status === 'processing' && 'Thinking...'}
                            {status === 'speaking' && 'Speaking...'}
                            {status === 'error' && (errorMessage || 'Error')}
                            {status === 'idle' && 'Tap to start'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {status === 'listening' && (transcript || interimTranscript || 'Say something...')}
                            {status === 'speaking' && 'Tap orb to stop'}
                        </p>
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

                            {/* Streaming response */}
                            {(status === 'processing' || status === 'speaking') && aiResponse &&
                                conversation[conversation.length - 1]?.role !== 'assistant' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-start">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-muted rounded-bl-md text-sm">
                                            {aiResponse}
                                            {status === 'processing' && <span className="inline-block w-2 h-4 bg-foreground/30 ml-1 animate-pulse" />}
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
