/**
 * Simple Voice Mode - OpenRouter AI + Gemini TTS
 * 
 * Features:
 * - Web Speech API for STT (browser)
 * - OpenRouter for AI conversation
 * - Gemini TTS for voice synthesis
 * - Browser TTS as fallback
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdvancedVoiceMode = ({ isOpen, onClose, backendUrl = '' }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [useGeminiTTS, setUseGeminiTTS] = useState(false); // Default to browser TTS
    const [showSettings, setShowSettings] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);

    const recognitionRef = useRef(null);
    const audioRef = useRef(null);

    // Get AI response using OpenRouter (same as chat)
    const getAIResponse = useCallback(async (userMessage) => {
        try {
            const response = await fetch(`${backendUrl}/api/chat/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    model: 'google/gemini-2.0-flash-001',
                    conversation_history: conversationHistory.slice(-6) // Last 3 exchanges
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.response || data.message || "I didn't understand that.";
        } catch (error) {
            console.error('AI Response Error:', error);
            throw error;
        }
    }, [backendUrl, conversationHistory]);

    // Get Gemini TTS audio
    const getGeminiTTS = useCallback(async (text) => {
        try {
            const response = await fetch(`${backendUrl}/api/tts/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice: 'Puck',
                    auto_emotion: true
                })
            });

            if (!response.ok) {
                throw new Error('TTS failed');
            }

            const data = await response.json();

            // Convert base64 to blob
            const audioData = data.audio;
            const byteCharacters = atob(audioData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/wav' });

            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('Gemini TTS Error:', error);
            throw error;
        }
    }, [backendUrl]);

    // Speak using Gemini TTS
    const speakWithGemini = useCallback(async (text) => {
        try {
            setIsSpeaking(true);
            const audioUrl = await getGeminiTTS(text);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                // Fallback to browser TTS
                speakWithBrowser(text);
            };

            await audio.play();
        } catch (error) {
            console.error('Gemini TTS playback error:', error);
            setIsSpeaking(false);
            // Fallback to browser TTS
            speakWithBrowser(text);
        }
    }, [getGeminiTTS]);

    // Speak using browser TTS
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

    // Speech Recognition (STT)
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
        };

        recognition.onresult = async (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setIsListening(false);

            // Get AI response
            try {
                const aiResponse = await getAIResponse(text);
                setResponse(aiResponse);

                // Update conversation history
                setConversationHistory(prev => [
                    ...prev,
                    { role: 'user', content: text },
                    { role: 'assistant', content: aiResponse }
                ]);

                // Speak response
                if (useGeminiTTS && backendUrl) {
                    await speakWithGemini(aiResponse);
                } else {
                    speakWithBrowser(aiResponse);
                }
            } catch (error) {
                console.error('Error:', error);
                const fallbackResponse = "I'm having trouble connecting. Please check your internet connection.";
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
    }, [getAIResponse, useGeminiTTS, backendUrl, speakWithGemini, speakWithBrowser]);

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
                            <p className="text-xs text-muted-foreground">
                                {useGeminiTTS ? 'Gemini TTS' : 'Browser TTS'} • en-US
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
                                <label className="text-sm font-medium mb-2 block">TTS Engine</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setUseGeminiTTS(true)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            useGeminiTTS
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background hover:bg-muted"
                                        )}
                                    >
                                        Gemini TTS
                                    </button>
                                    <button
                                        onClick={() => setUseGeminiTTS(false)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            !useGeminiTTS
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background hover:bg-muted"
                                        )}
                                    >
                                        Browser TTS (Recommended)
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Browser TTS works offline and is more reliable
                                </p>
                            </div>
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
                        OpenRouter AI • {useGeminiTTS ? 'Gemini TTS' : 'Web Speech API'}
                    </p>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
