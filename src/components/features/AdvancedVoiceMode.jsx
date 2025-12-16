/**
 * Enhanced Voice Mode with Backend Integration
 * 
 * Features:
 * - Web Speech API (browser-based STT/TTS)
 * - Backend Gemini TTS integration
 * - Multiple voice options and languages
 * - Real-time transcription
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, Settings, Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createApiClient } from '@/lib/apiClient';

// Voice configuration
const VOICES = [
    { id: 'Puck', name: 'Puck (Neutral)', category: 'neutral' },
    { id: 'Charon', name: 'Charon (Warm)', category: 'warm' },
    { id: 'Kore', name: 'Kore (Calm)', category: 'calm' },
    { id: 'Fenrir', name: 'Fenrir (Energetic)', category: 'energetic' },
    { id: 'Aoede', name: 'Aoede (Professional)', category: 'professional' },
];

const LANGUAGES = [
    { code: 'en-US', name: 'English (US)', native: 'English' },
    { code: 'en-IN', name: 'English (India)', native: 'English' },
    { code: 'hi-IN', name: 'Hindi', native: 'हिंदी' },
    { code: 'es-US', name: 'Spanish', native: 'Español' },
    { code: 'fr-FR', name: 'French', native: 'Français' },
    { code: 'de-DE', name: 'German', native: 'Deutsch' },
    { code: 'ja-JP', name: 'Japanese', native: '日本語' },
    { code: 'ko-KR', name: 'Korean', native: '한국어' },
    { code: 'zh-CN', name: 'Chinese', native: '中文' },
    { code: 'pt-BR', name: 'Portuguese', native: 'Português' },
];

const AdvancedVoiceMode = ({ isOpen, onClose, backendUrl = '' }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [useBackendTTS, setUseBackendTTS] = useState(true);
    const [selectedVoice, setSelectedVoice] = useState('Puck');
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');
    const [showSettings, setShowSettings] = useState(false);

    const recognitionRef = useRef(null);
    const audioRef = useRef(null);
    const apiClient = useRef(null);

    useEffect(() => {
        if (backendUrl) {
            apiClient.current = createApiClient(backendUrl);
        }
    }, [backendUrl]);

    // Generate AI Response using backend
    const generateAIResponse = useCallback(async (userMessage) => {
        try {
            const response = await fetch(`${backendUrl}/api/tts/voice-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    voice: selectedVoice,
                    language: selectedLanguage,
                    conversation_history: [],
                    stt_confidence: 1.0
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            return data.response || data.text || "I didn't quite catch that.";
        } catch (error) {
            console.error('AI Response Error:', error);
            throw error;
        }
    }, [backendUrl, selectedVoice, selectedLanguage]);

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
        recognition.lang = selectedLanguage;

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('Listening...');
        };

        recognition.onresult = async (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setIsListening(false);

            // Generate AI response using backend
            try {
                const aiResponse = await generateAIResponse(text);
                setResponse(aiResponse);

                // Speak response
                if (useBackendTTS && backendUrl) {
                    await speakWithBackend(aiResponse);
                } else {
                    speakWithBrowser(aiResponse);
                }
            } catch (error) {
                console.error('AI response error:', error);
                const fallbackResponse = "I'm sorry, I couldn't process that. Please try again.";
                setResponse(fallbackResponse);
                speakWithBrowser(fallbackResponse);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            setTranscript('Error occurred');
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [selectedLanguage, useBackendTTS, backendUrl, generateAIResponse]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    // Backend TTS using Gemini
    const speakWithBackend = useCallback(async (text) => {
        if (!apiClient.current) {
            console.error('Backend API not available');
            speakWithBrowser(text);
            return;
        }

        try {
            setIsSpeaking(true);

            const response = await fetch(`${backendUrl}/api/tts/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    voice: selectedVoice,
                    language: selectedLanguage,
                    auto_emotion: true
                })
            });

            if (!response.ok) throw new Error('TTS failed');

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
                setIsSpeaking(false);
                console.error('Audio playback failed');
            };

            await audio.play();
        } catch (error) {
            console.error('Backend TTS error:', error);
            setIsSpeaking(false);
            // Fallback to browser TTS
            speakWithBrowser(text);
        }
    }, [backendUrl, selectedVoice, selectedLanguage]);

    // Browser TTS (fallback)
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
        utterance.lang = selectedLanguage;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [selectedLanguage]);

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
                                {useBackendTTS ? 'Gemini TTS' : 'Browser TTS'} • {selectedLanguage}
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
                            {/* TTS Mode */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">TTS Engine</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setUseBackendTTS(true)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            useBackendTTS
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background hover:bg-muted"
                                        )}
                                    >
                                        Gemini TTS (Backend)
                                    </button>
                                    <button
                                        onClick={() => setUseBackendTTS(false)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            !useBackendTTS
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background hover:bg-muted"
                                        )}
                                    >
                                        Browser TTS
                                    </button>
                                </div>
                            </div>

                            {/* Voice Selection (for backend TTS) */}
                            {useBackendTTS && (
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Voice</label>
                                    <select
                                        value={selectedVoice}
                                        onChange={(e) => setSelectedVoice(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-background border border-border"
                                    >
                                        {VOICES.map(voice => (
                                            <option key={voice.id} value={voice.id}>
                                                {voice.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Language Selection */}
                            <div>
                                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Language
                                </label>
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-border"
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name} ({lang.native})
                                        </option>
                                    ))}
                                </select>
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
                    {transcript && (
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
                        {useBackendTTS ? `Gemini TTS • ${selectedVoice} voice` : 'Web Speech API'} • {LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                    </p>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
