/**
 * Enhanced Voice Mode with Framer Motion
 * Apple-style voice assistant interface
 * 
 * Features:
 * - Animated orb with audio visualization
 * - Smooth state transitions
 * - Conversation history with animations
 * - Glass morphism design
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Loader2,
    X,
    Minimize2,
    Maximize2,
    MessageSquare,
    Sparkles,
    Bot,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';


// Animation variants
const panelVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const orbVariants = {
    idle: { scale: 1 },
    listening: { scale: 1.1 },
    processing: { scale: 1.05 },
    speaking: { scale: 1.1 }
};

const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
    },
    exit: { opacity: 0, y: -10, scale: 0.95 }
};

// Audio Wave Visualizer
const AudioWave = ({ isActive, color = 'primary' }) => (
    <div className="flex items-center justify-center gap-1 h-16">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
                key={i}
                className={cn(
                    'w-1.5 rounded-full',
                    color === 'red' && 'bg-red-500',
                    color === 'primary' && 'bg-primary',
                    color === 'green' && 'bg-emerald-500'
                )}
                animate={{
                    height: isActive
                        ? [20, 40 + Math.random() * 20, 20]
                        : 20,
                }}
                transition={{
                    duration: 0.5 + Math.random() * 0.3,
                    repeat: isActive ? Infinity : 0,
                    delay: i * 0.1,
                }}
            />
        ))}
    </div>
);

// Status Badge
const StatusBadge = ({ status }) => {
    const statusConfig = {
        idle: { icon: '💤', text: 'Tap to speak', color: 'bg-muted border-border text-muted-foreground' },
        listening: { icon: '🎤', text: 'Listening...', color: 'bg-red-500/15 border-red-500/40 text-red-500' },
        processing: { icon: '⚡', text: 'Thinking...', color: 'bg-primary/10 border-primary/40 text-primary' },
        speaking: { icon: '🔊', text: 'Speaking...', color: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' }
    };

    const config = statusConfig[status] || statusConfig.idle;

    return (
        <motion.div
            key={status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
                'px-4 py-2 rounded-full border text-sm font-medium',
                config.color
            )}
        >
            <span className="mr-2">{config.icon}</span>
            {config.text}
        </motion.div>
    );
};

const AdvancedVoiceMode = ({ isOpen, onClose, onSendMessage, settings, selectedModel }) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [showTranscript, setShowTranscript] = useState(true);
    const [audioLevel, setAudioLevel] = useState(0);

    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const animationFrameRef = useRef(null);
    const processingTimeoutRef = useRef(null);
    const recognitionRetryRef = useRef({ count: 0, timer: null });

    const currentStatus = isListening ? 'listening' : isProcessing ? 'processing' : isSpeaking ? 'speaking' : 'idle';

    // Initialize Speech Recognition
    useEffect(() => {
        if (!isOpen) return;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = settings?.language === 'hi' ? 'hi-IN' : 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                recognitionRetryRef.current.count = 0;
                if (recognitionRetryRef.current.timer) {
                    clearTimeout(recognitionRetryRef.current.timer);
                    recognitionRetryRef.current.timer = null;
                }
            };

            recognition.onresult = (event) => {
                let interim = '';
                let final = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const text = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        final += text;
                    } else {
                        interim += text;
                    }
                }

                if (interim) {
                    setInterimTranscript(interim);
                }

                if (final) {
                    setTranscript(prev => prev + final + ' ');
                    setInterimTranscript('');

                    if (processingTimeoutRef.current) {
                        clearTimeout(processingTimeoutRef.current);
                    }
                    processingTimeoutRef.current = setTimeout(() => {
                        if (final.trim()) {
                            handleProcessTranscript(final.trim());
                        }
                    }, 2000);
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') return;

                const recoverable = ['network', 'aborted', 'audio-capture'].includes(event.error);
                if (recoverable && isOpen && !isProcessing) {
                    recognitionRetryRef.current.count += 1;
                    const delay = Math.min(8000, 500 * Math.pow(2, recognitionRetryRef.current.count - 1));
                    if (recognitionRetryRef.current.timer) {
                        clearTimeout(recognitionRetryRef.current.timer);
                    }

                    setIsListening(false);
                    recognitionRetryRef.current.timer = setTimeout(() => {
                        try {
                            recognition.start();
                            setIsListening(true);
                        } catch (e) {
                            console.error('Failed to recover speech recognition:', e);
                            setIsListening(false);
                        }
                    }, delay);
                    return;
                }

                setIsListening(false);
            };

            recognition.onend = () => {
                if (isListening && !isProcessing) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error('Failed to restart recognition:', e);
                        setIsListening(false);
                    }
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
            if (recognitionRetryRef.current.timer) {
                clearTimeout(recognitionRetryRef.current.timer);
                recognitionRetryRef.current.timer = null;
            }
        };
    }, [isOpen, settings?.language]);

    // Audio level visualization
    useEffect(() => {
        if (isListening || isSpeaking) {
            const animate = () => {
                const level = isListening ? 30 + Math.random() * 70 : 20 + Math.random() * 40;
                setAudioLevel(level);
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            animate();
        } else {
            setAudioLevel(0);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isListening, isSpeaking]);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsListening(false);

        const fullTranscript = (transcript + interimTranscript).trim();
        if (fullTranscript && !isProcessing) {
            handleProcessTranscript(fullTranscript);
        }
    };

    const handleProcessTranscript = async (text) => {
        if (!text.trim() || isProcessing) return;

        setIsProcessing(true);
        setIsListening(false);
        if (recognitionRef.current) recognitionRef.current.stop();

        const userMessage = { role: 'user', content: text, timestamp: Date.now() };
        setConversationHistory(prev => [...prev, userMessage]);

        try {
            const response = await onSendMessage(text);

            if (response) {
                const assistantMessage = { role: 'assistant', content: response, timestamp: Date.now() };
                setConversationHistory(prev => [...prev, assistantMessage]);
                await speak(response);
            }
        } catch (error) {
            console.error('Processing error:', error);
        } finally {
            setIsProcessing(false);
            setTranscript('');
            setInterimTranscript('');

            setTimeout(() => {
                if (isOpen) startListening();
            }, 500);
        }
    };

    const speak = (text) => {
        return new Promise((resolve) => {
            synthRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = settings?.language === 'hi' ? 'hi-IN' : 'en-US';
            utterance.rate = 1.1;
            utterance.pitch = 1.0;

            const voices = synthRef.current.getVoices();
            const preferredVoice = voices.find(v => v.lang.startsWith(utterance.lang)) || voices[0];
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => { setIsSpeaking(false); resolve(); };
            utterance.onerror = () => { setIsSpeaking(false); resolve(); };

            synthRef.current.speak(utterance);
        });
    };

    const stopSpeaking = () => {
        synthRef.current.cancel();
        setIsSpeaking(false);
    };

    const handleClose = () => {
        stopListening();
        stopSpeaking();
        setConversationHistory([]);
        setTranscript('');
        setInterimTranscript('');
        onClose();
    };

    if (!isOpen) return null;

    const displayTranscript = transcript + interimTranscript;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-background flex items-center justify-center"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <motion.div
                    className={cn(
                        'flex flex-col overflow-hidden bg-background',
                        isFullscreen
                            ? 'w-full h-full'
                            : 'w-full max-w-4xl h-[80vh] rounded-3xl border border-border shadow-2xl'
                    )}
                    layout
                >
                    {/* Header */}
                    <motion.div
                        className={cn(
                            'flex items-center justify-between p-4 md:p-6',
                            'border-b border-border bg-background/90 backdrop-blur-xl'
                        )}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                className="p-2.5 rounded-xl bg-primary/10 border border-primary/20"
                                animate={{ rotate: isProcessing ? 360 : 0 }}
                                transition={{ duration: 2, repeat: isProcessing ? Infinity : 0, ease: 'linear' }}
                            >
                                <Sparkles className="h-5 w-5 text-primary" />
                            </motion.div>
                            <div>
                                <h2 className="text-lg md:text-xl font-semibold">Voice Mode</h2>
                                <p className="text-xs text-muted-foreground">
                                    Powered by {selectedModel?.split('/')[1] || 'AI'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.button
                                onClick={() => setShowTranscript(!showTranscript)}
                                className={cn(
                                    'p-2.5 rounded-xl transition-colors',
                                    showTranscript ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
                                )}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <MessageSquare className="h-5 w-5" />
                            </motion.button>
                            <motion.button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="p-2.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                            </motion.button>
                            <motion.button
                                onClick={handleClose}
                                className="p-2.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <X className="h-5 w-5" />
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
                        {/* Background Glow */}
                        <AnimatePresence>
                            {(isListening || isProcessing || isSpeaking) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute inset-0 pointer-events-none"
                                >
                                    <div className={cn(
                                        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                                        'w-[500px] h-[500px] rounded-full blur-[100px]',
                                        isListening && 'bg-red-500/20',
                                        isProcessing && 'bg-primary/20',
                                        isSpeaking && 'bg-emerald-500/20'
                                    )} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Status Badge */}
                        <div className="relative z-10 mb-8">
                            <AnimatePresence mode="wait">
                                <StatusBadge key={currentStatus} status={currentStatus} />
                            </AnimatePresence>
                        </div>

                        {/* Main Orb */}
                        <motion.button
                            onClick={toggleListening}
                            disabled={isProcessing}
                            className={cn(
                                'relative w-36 h-36 md:w-44 md:h-44 rounded-full',
                                'flex items-center justify-center',
                                'transition-all duration-300',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                currentStatus === 'idle' && 'bg-gradient-to-br from-muted to-muted/50 hover:from-primary/20 hover:to-primary/5',
                                currentStatus === 'listening' && 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_60px_rgba(239,68,68,0.4)]',
                                currentStatus === 'processing' && 'bg-gradient-to-br from-primary to-primary/80 shadow-[0_0_60px_rgba(var(--primary),0.4)]',
                                currentStatus === 'speaking' && 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_0_60px_rgba(16,185,129,0.4)]'
                            )}
                            variants={orbVariants}
                            animate={currentStatus}
                            whileHover={currentStatus === 'idle' ? { scale: 1.05 } : {}}
                            whileTap={{ scale: 0.95 }}
                        >
                            <AnimatePresence mode="wait">
                                {isProcessing ? (
                                    <motion.div
                                        key="processing"
                                        initial={{ opacity: 0, rotate: -180 }}
                                        animate={{ opacity: 1, rotate: 0 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <Loader2 className="h-16 w-16 md:h-20 md:w-20 text-white animate-spin" />
                                    </motion.div>
                                ) : isSpeaking ? (
                                    <motion.div
                                        key="speaking"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <Volume2 className="h-16 w-16 md:h-20 md:w-20 text-white" />
                                    </motion.div>
                                ) : isListening ? (
                                    <motion.div
                                        key="listening"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <MicOff className="h-16 w-16 md:h-20 md:w-20 text-white" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="idle"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <Mic className="h-16 w-16 md:h-20 md:w-20 text-foreground" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Ripple Effects */}
                            {(isListening || isSpeaking) && (
                                <>
                                    <motion.div
                                        className="absolute inset-0 rounded-full"
                                        style={{ backgroundColor: isListening ? 'rgb(239,68,68)' : 'rgb(16,185,129)' }}
                                        animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="absolute inset-0 rounded-full"
                                        style={{ backgroundColor: isListening ? 'rgb(239,68,68)' : 'rgb(16,185,129)' }}
                                        animate={{ scale: [1, 1.3], opacity: [0.2, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                                    />
                                </>
                            )}
                        </motion.button>

                        {/* Audio Level Indicator */}
                        <AnimatePresence>
                            {(isListening || isSpeaking) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="mt-8"
                                >
                                    <AudioWave
                                        isActive={isListening || isSpeaking}
                                        color={isListening ? 'red' : 'green'}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Live Transcript */}
                        <AnimatePresence>
                            {showTranscript && displayTranscript && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="mt-8 max-w-2xl w-full"
                                >
                                    <div className={cn(
                                        'bg-card/80 backdrop-blur-xl border border-border',
                                        'rounded-2xl p-6 shadow-lg'
                                    )}>
                                        <p className="text-center text-lg leading-relaxed">
                                            {displayTranscript}
                                            {interimTranscript && (
                                                <span className="text-muted-foreground italic">{interimTranscript}</span>
                                            )}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Instructions */}
                        <AnimatePresence>
                            {currentStatus === 'idle' && !displayTranscript && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="mt-8 text-muted-foreground text-center text-sm max-w-md"
                                >
                                    Tap the microphone to start a voice conversation.
                                    I'll listen, think, and respond naturally.
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Conversation History */}
                    <AnimatePresence>
                        {showTranscript && conversationHistory.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-border bg-muted/30 overflow-hidden"
                            >
                                <div className="p-4 max-h-48 overflow-y-auto space-y-3">
                                    {conversationHistory.slice(-4).map((msg, idx) => (
                                        <motion.div
                                            key={idx}
                                            variants={messageVariants}
                                            initial="hidden"
                                            animate="visible"
                                            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                                        >
                                            <div className={cn(
                                                'flex items-start gap-2 max-w-md',
                                                msg.role === 'user' && 'flex-row-reverse'
                                            )}>
                                                <div className={cn(
                                                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                                                    msg.role === 'user'
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-muted text-muted-foreground'
                                                )}>
                                                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                                </div>
                                                <div className={cn(
                                                    'px-4 py-2 rounded-2xl text-sm',
                                                    msg.role === 'user'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-card border border-border'
                                                )}>
                                                    {msg.content.length > 150 ? msg.content.slice(0, 150) + '...' : msg.content}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
