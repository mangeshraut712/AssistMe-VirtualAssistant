/**
 * Enhanced Voice Mode - Dual Engine Support
 * 
 * Mode 1: OpenRouter (Standard) - Works with any OpenRouter model
 * Mode 2: Gemini Live API (Premium) - Real-time audio streaming
 * 
 * Features:
 * - Web Speech API for STT (browser)
 * - OpenRouter AI for standard conversation
 * - Gemini Live API for premium real-time audio (requires Google API key)
 * - Browser TTS as fallback
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, Settings, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Voice mode options
const VOICE_MODES = [
    {
        id: 'openrouter',
        name: 'Standard (OpenRouter)',
        description: 'Uses Gemini 2.0 Flash via OpenRouter',
        badge: 'Free'
    },
    {
        id: 'gemini-live',
        name: 'Gemini Live API',
        description: 'Real-time native audio (requires API key)',
        badge: 'Premium'
    }
];

const AdvancedVoiceMode = ({ isOpen, onClose, backendUrl = '' }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [voiceMode, setVoiceMode] = useState('openrouter'); // 'openrouter' | 'gemini-live'
    const [showSettings, setShowSettings] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState('');

    const recognitionRef = useRef(null);
    const audioRef = useRef(null);
    const wsRef = useRef(null); // WebSocket for Gemini Live

    // ==========================================
    // MODE 1: OpenRouter (Standard)
    // ==========================================

    const getOpenRouterResponse = useCallback(async (userMessage) => {
        try {
            const messages = [
                ...conversationHistory.slice(-6).map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: 'user', content: userMessage }
            ];

            const response = await fetch(`${backendUrl}/api/chat/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages,
                    model: 'google/gemini-2.0-flash-001:free'
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.response || data.message || "I didn't understand that.";
        } catch (error) {
            console.error('OpenRouter Error:', error);
            throw error;
        }
    }, [backendUrl, conversationHistory]);

    // ==========================================
    // MODE 2: Gemini Live API (Premium)
    // ==========================================

    const connectGeminiLive = useCallback(async () => {
        try {
            // Get API key from backend
            const keyResponse = await fetch(`${backendUrl}/api/gemini/key`);
            if (!keyResponse.ok) {
                throw new Error('Gemini API key not configured');
            }
            const { apiKey } = await keyResponse.json();

            // Connect to Gemini Live WebSocket
            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setIsConnected(true);
                setError('');

                // Send setup message
                ws.send(JSON.stringify({
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
                        generationConfig: {
                            responseModalities: ["TEXT"]
                        }
                    }
                }));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.serverContent?.modelTurn?.parts) {
                    const text = data.serverContent.modelTurn.parts
                        .filter(p => p.text)
                        .map(p => p.text)
                        .join('');
                    if (text) {
                        setResponse(text);
                        speakWithBrowser(text);
                    }
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setError('Connection failed. Try Standard mode.');
                setIsConnected(false);
            };

            ws.onclose = () => {
                setIsConnected(false);
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('Gemini Live connection error:', error);
            setError(error.message);
        }
    }, [backendUrl]);

    const sendToGeminiLive = useCallback((text) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                clientContent: {
                    turns: [{ role: "user", parts: [{ text }] }],
                    turnComplete: true
                }
            }));
        }
    }, []);

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Connect to Gemini Live when mode changes
    useEffect(() => {
        if (voiceMode === 'gemini-live' && !isConnected) {
            connectGeminiLive();
        } else if (voiceMode === 'openrouter' && wsRef.current) {
            wsRef.current.close();
            setIsConnected(false);
        }
    }, [voiceMode, isConnected, connectGeminiLive]);

    // ==========================================
    // Browser TTS (Fallback)
    // ==========================================

    const speakWithBrowser = useCallback((text) => {
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    // ==========================================
    // Speech Recognition (STT)
    // ==========================================

    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('Listening...');
            setError('');
        };

        recognition.onresult = async (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setIsListening(false);

            try {
                let aiResponse;

                if (voiceMode === 'gemini-live' && isConnected) {
                    // Use Gemini Live API
                    sendToGeminiLive(text);
                    // Response will come via WebSocket
                } else {
                    // Use OpenRouter
                    aiResponse = await getOpenRouterResponse(text);
                    setResponse(aiResponse);

                    // Update conversation history
                    setConversationHistory(prev => [
                        ...prev,
                        { role: 'user', content: text },
                        { role: 'assistant', content: aiResponse }
                    ]);

                    // Speak response
                    speakWithBrowser(aiResponse);
                }
            } catch (error) {
                console.error('Error:', error);
                const fallbackResponse = "I'm having trouble connecting. Please try again.";
                setResponse(fallbackResponse);
                speakWithBrowser(fallbackResponse);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            setTranscript('Error: ' + event.error);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [voiceMode, isConnected, getOpenRouterResponse, sendToGeminiLive, speakWithBrowser]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-background z-50 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Header */}
                <header className="h-16 border-b border-border flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <div>
                            <h1 className="text-xl font-semibold">Voice Mode</h1>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                {voiceMode === 'gemini-live' ? (
                                    <>
                                        <Zap className="w-3 h-3" />
                                        Gemini Live {isConnected ? '(Connected)' : '(Connecting...)'}
                                    </>
                                ) : (
                                    'OpenRouter • Gemini 2.0 Flash'
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Settings Panel */}
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-border bg-muted/50 overflow-hidden"
                    >
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-3 block">Voice Engine</label>
                                <div className="space-y-2">
                                    {VOICE_MODES.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setVoiceMode(mode.id)}
                                            className={cn(
                                                "w-full p-4 rounded-lg text-left transition-all border",
                                                voiceMode === mode.id
                                                    ? "bg-primary/10 border-primary"
                                                    : "bg-background border-border hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{mode.name}</span>
                                                <span className={cn(
                                                    "text-xs px-2 py-1 rounded-full",
                                                    mode.badge === 'Free'
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                                )}>
                                                    {mode.badge}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {mode.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center p-6">
                    {/* Microphone Button */}
                    <motion.button
                        onClick={toggleListening}
                        className={cn(
                            "w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all shadow-lg",
                            isListening
                                ? "bg-red-500 hover:bg-red-600 shadow-red-500/50"
                                : voiceMode === 'gemini-live'
                                    ? "bg-purple-500 hover:bg-purple-600 shadow-purple-500/50"
                                    : "bg-primary hover:bg-primary/90 shadow-primary/50"
                        )}
                        whileTap={{ scale: 0.95 }}
                        animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
                    >
                        {isListening ? (
                            <MicOff className="w-16 h-16 text-white" />
                        ) : (
                            <Mic className="w-16 h-16 text-white" />
                        )}
                    </motion.button>

                    {/* Status */}
                    <div className="text-center mb-8">
                        <p className="text-lg font-medium mb-2">
                            {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Tap to speak'}
                        </p>
                        {isSpeaking && (
                            <div className="flex items-center justify-center gap-2 text-primary">
                                <Volume2 className="w-5 h-5 animate-pulse" />
                                <span className="text-sm">Playing response</span>
                            </div>
                        )}
                    </div>

                    {/* Transcript */}
                    {transcript && transcript !== 'Listening...' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl w-full bg-muted/50 rounded-lg p-6 mb-4"
                        >
                            <p className="text-sm text-muted-foreground mb-1">You said:</p>
                            <p className="text-lg">{transcript}</p>
                        </motion.div>
                    )}

                    {/* Response */}
                    {response && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl w-full bg-primary/10 rounded-lg p-6"
                        >
                            <p className="text-sm text-muted-foreground mb-1">Response:</p>
                            <p className="text-lg">{response}</p>
                        </motion.div>
                    )}
                </main>

                {/* Footer */}
                <footer className="h-16 border-t border-border flex items-center justify-center px-6">
                    <p className="text-sm text-muted-foreground">
                        {voiceMode === 'gemini-live'
                            ? 'Gemini Live API • Real-time Audio'
                            : 'OpenRouter • Gemini 2.0 Flash'}
                    </p>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
