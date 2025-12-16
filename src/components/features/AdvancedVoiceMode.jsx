/**
 * Advanced Voice Mode - Working Simplified Version
 * 
 * Note: The full-featured version with audio visualization had compatibility issues.
 * This simplified version provides core voice functionality.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdvancedVoiceMode = ({ isOpen, onClose, settings }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');

    const recognitionRef = useRef(null);
    const synthRef = useRef(null);

    // Initialize Speech Recognition
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

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setIsListening(false);

            // Simple echo response for now
            setResponse(`You said: ${text}`);
            speak(`You said: ${text}`);
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
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    // Text-to-Speech
    const speak = useCallback((text) => {
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
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
                    <h1 className="text-xl font-semibold">Voice Mode</h1>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center p-6">
                    {/* Microphone Button */}
                    <motion.button
                        onClick={toggleListening}
                        className={cn(
                            "w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all",
                            isListening
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-primary hover:bg-primary/90"
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
                        Using Web Speech API • Click microphone to start
                    </p>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdvancedVoiceMode;
