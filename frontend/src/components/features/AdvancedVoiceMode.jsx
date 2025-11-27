import React, { useState, useEffect, useRef } from 'react';
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
    Sparkles
} from 'lucide-react';

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
            };

            recognition.onresult = (event) => {
                let interim = '';
                let final = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        final += transcript;
                    } else {
                        interim += transcript;
                    }
                }

                if (interim) {
                    setInterimTranscript(interim);
                }

                if (final) {
                    setTranscript(prev => prev + final + ' ');
                    setInterimTranscript('');

                    // Auto-process after 2 seconds of silence
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
                if (event.error !== 'no-speech') {
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                if (isListening && !isProcessing) {
                    // Auto-restart if still in listening mode
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
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (processingTimeoutRef.current) {
                clearTimeout(processingTimeoutRef.current);
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
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
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
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);

        // Process any remaining transcript
        const fullTranscript = (transcript + interimTranscript).trim();
        if (fullTranscript && !isProcessing) {
            handleProcessTranscript(fullTranscript);
        }
    };

    const handleProcessTranscript = async (text) => {
        if (!text.trim() || isProcessing) return;

        setIsProcessing(true);
        setIsListening(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        // Add user message to history
        const userMessage = { role: 'user', content: text, timestamp: Date.now() };
        setConversationHistory(prev => [...prev, userMessage]);

        try {
            // Send to chat (this will update the main chat thread)
            const response = await onSendMessage(text);

            if (response) {
                // Add assistant response to history
                const assistantMessage = { role: 'assistant', content: response, timestamp: Date.now() };
                setConversationHistory(prev => [...prev, assistantMessage]);

                // Speak the response
                await speak(response);
            }
        } catch (error) {
            console.error('Processing error:', error);
        } finally {
            setIsProcessing(false);
            setTranscript('');
            setInterimTranscript('');

            // Auto-restart listening after response
            setTimeout(() => {
                if (isOpen) {
                    startListening();
                }
            }, 500);
        }
    };

    const speak = (text) => {
        return new Promise((resolve) => {
            synthRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = settings?.language === 'hi' ? 'hi-IN' : 'en-US';
            utterance.rate = 1.1; // Slightly faster for better UX
            utterance.pitch = 1.0;

            const voices = synthRef.current.getVoices();
            const preferredVoice = voices.find(v => v.lang.startsWith(utterance.lang)) || voices[0];
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
                resolve();
            };
            utterance.onerror = () => {
                setIsSpeaking(false);
                resolve();
            };

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
        <div className={`fixed inset-0 z-50 ${isFullscreen ? 'bg-gradient-to-br from-blue-950 via-purple-950 to-black' : 'bg-black/95 backdrop-blur-xl'} flex items-center justify-center transition-all duration-300`}>
            <div className={`${isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-[80vh] rounded-3xl border border-white/10'} flex flex-col overflow-hidden`}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-semibold text-white">Voice Mode</h2>
                            <p className="text-xs text-white/60">Powered by {selectedModel?.split('/')[1] || 'AI'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowTranscript(!showTranscript)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
                            title={showTranscript ? "Hide transcript" : "Show transcript"}
                        >
                            <MessageSquare className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
                            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">

                    {/* Background Glow */}
                    <div className={`absolute inset-0 transition-opacity duration-500 ${isListening ? 'opacity-100' : isProcessing ? 'opacity-50' : isSpeaking ? 'opacity-75' : 'opacity-0'
                        }`}>
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${isListening ? 'bg-red-500/20' : isProcessing ? 'bg-blue-500/20' : 'bg-green-500/20'
                            }`} />
                    </div>

                    {/* Status Indicator */}
                    <div className="relative z-10 mb-8">
                        <div className={`text-sm font-medium px-4 py-2 rounded-full border transition-all duration-300 ${isListening ? 'bg-red-500/20 border-red-500/50 text-red-300' :
                                isProcessing ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' :
                                    isSpeaking ? 'bg-green-500/20 border-green-500/50 text-green-300' :
                                        'bg-white/10 border-white/20 text-white/60'
                            }`}>
                            {isListening ? '🎤 Listening...' :
                                isProcessing ? '⚡ Processing...' :
                                    isSpeaking ? '🔊 Speaking...' :
                                        '💤 Idle'}
                        </div>
                    </div>

                    {/* Main Orb */}
                    <div className="relative z-10 mb-12">
                        <button
                            onClick={toggleListening}
                            disabled={isProcessing}
                            className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-gradient-to-br from-red-500 to-red-600 scale-110 shadow-[0_0_60px_rgba(239,68,68,0.6)]' :
                                    isProcessing ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_60px_rgba(59,130,246,0.6)]' :
                                        isSpeaking ? 'bg-gradient-to-br from-green-500 to-green-600 scale-110 shadow-[0_0_60px_rgba(34,197,94,0.6)]' :
                                            'bg-gradient-to-br from-white/20 to-white/10 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)]'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-16 w-16 md:h-20 md:h-20 text-white animate-spin" />
                            ) : isSpeaking ? (
                                <Volume2 className="h-16 w-16 md:h-20 md:h-20 text-white" />
                            ) : isListening ? (
                                <MicOff className="h-16 w-16 md:h-20 md:h-20 text-white" />
                            ) : (
                                <Mic className="h-16 w-16 md:h-20 md:h-20 text-white" />
                            )}

                            {/* Ripple Effects */}
                            {(isListening || isSpeaking) && (
                                <>
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: isListening ? '#ef4444' : '#22c55e' }} />
                                    <div className="absolute -inset-4 rounded-full animate-pulse opacity-10" style={{ backgroundColor: isListening ? '#ef4444' : '#22c55e' }} />
                                </>
                            )}
                        </button>

                        {/* Audio Level Indicator */}
                        {(isListening || isSpeaking) && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-100"
                                    style={{ width: `${audioLevel}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Live Transcript */}
                    {showTranscript && displayTranscript && (
                        <div className="relative z-10 max-w-2xl w-full">
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                <p className="text-white/90 text-center text-lg leading-relaxed">
                                    {displayTranscript}
                                    {interimTranscript && <span className="text-white/50">{interimTranscript}</span>}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Conversation History */}
                    {showTranscript && conversationHistory.length > 0 && (
                        <div className="absolute bottom-6 left-6 right-6 max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/20">
                            {conversationHistory.slice(-3).map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md px-4 py-2 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-blue-500/20 border border-blue-500/30 text-blue-100'
                                            : 'bg-white/10 border border-white/20 text-white/90'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Instructions */}
                    {!isListening && !isProcessing && !isSpeaking && !displayTranscript && (
                        <p className="relative z-10 text-white/60 text-center text-sm max-w-md">
                            Tap the microphone to start a voice conversation. I'll listen, process, and respond automatically.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedVoiceMode;
