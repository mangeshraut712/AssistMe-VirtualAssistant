/**
 * useAdvancedVoiceDetection Hook
 * 
 * Features:
 * 1. Smart pause detection - won't cut off mid-sentence
 * 2. Voice Activity Detection (VAD)
 * 3. Confidence-based filtering
 * 4. Auto-mute during AI speech
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { VOICE_DETECTION_CONFIG } from '@/config/voice-detection.config';

export const useAdvancedVoiceDetection = ({
    language = 'en-US',
    onFinalTranscript,
    onInterimTranscript,
    onError,
    isSpeaking = false, // Is AI currently speaking?
    muteMode = 'auto',
}) => {
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');

    const recognitionRef = useRef(null);
    const pauseTimerRef = useRef(null);
    const speechStartTimeRef = useRef(null);
    const interimCountRef = useRef(0);
    const lastEnergyRef = useRef(0);
    const consecutiveSilenceRef = useRef(0);

    // Auto-mute when AI is speaking
    useEffect(() => {
        if (muteMode === 'auto' && VOICE_DETECTION_CONFIG.pushToTalk.muteWhileSpeaking) {
            setIsMuted(isSpeaking);
        }
    }, [isSpeaking, muteMode]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            onError?.('Speech recognition not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 3; // Get multiple alternatives

        recognition.onstart = () => {
            setIsListening(true);
            speechStartTimeRef.current = null;
            interimCountRef.current = 0;
            consecutiveSilenceRef.current = 0;
        };

        recognition.onresult = (event) => {
            if (isMuted) return; // Ignore results when muted

            let interim = '';
            let final = '';
            let hasHighConfidence = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const alternative = result[0];
                const text = alternative.transcript;
                const confidence = alternative.confidence || 0;

                if (result.isFinal) {
                    // Only accept final results with sufficient confidence
                    if (confidence >= VOICE_DETECTION_CONFIG.recognition.minConfidence) {
                        final += text;
                        hasHighConfidence = true;
                    }
                } else {
                    // Track interim results
                    if (confidence >= VOICE_DETECTION_CONFIG.recognition.interimConfidence) {
                        interim += text;
                        interimCountRef.current++;
                    }
                }
            }

            // Update interim transcript
            if (interim) {
                setInterimText(interim);
                onInterimTranscript?.(interim);

                // Mark speech start
                if (!speechStartTimeRef.current) {
                    speechStartTimeRef.current = Date.now();
                }

                // Clear previous pause timer
                if (pauseTimerRef.current) {
                    clearTimeout(pauseTimerRef.current);
                }

                // Set new pause timer with adaptive threshold
                const pauseThreshold = getPauseThreshold(interim.length, interimCountRef.current);

                pauseTimerRef.current = setTimeout(() => {
                    processTranscript(interim);
                }, pauseThreshold);
            }

            // Handle final results
            if (final && hasHighConfidence) {
                const speechDuration = speechStartTimeRef.current
                    ? Date.now() - speechStartTimeRef.current
                    : 0;

                // Only process if speech was long enough
                if (speechDuration >= VOICE_DETECTION_CONFIG.pauseDetection.minimumSpeechDuration) {
                    processTranscript(final);
                }
            }
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('Speech recognition error:', event.error);
                onError?.(event.error);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch { }
            }
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
            }
        };
    }, [language, isMuted, onError, onFinalTranscript, onInterimTranscript]);

    // Smart pause threshold based on context
    const getPauseThreshold = (textLength, interimCount) => {
        const config = VOICE_DETECTION_CONFIG.pauseDetection;

        // Short text with few interim results = quick response
        if (textLength < 10 && interimCount < config.interimResultsRequired) {
            return config.shortPauseThreshold;
        }

        // Medium text = normal pause
        if (textLength < 50) {
            return config.mediumPauseThreshold;
        }

        // Long text = wait for complete thought
        return config.longPauseThreshold;
    };

    // Process final transcript
    const processTranscript = useCallback((text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        setTranscript(trimmed);
        setInterimText('');
        onFinalTranscript?.(trimmed);

        // Reset counters
        interimCountRef.current = 0;
        speechStartTimeRef.current = null;
    }, [onFinalTranscript]);

    // Control functions
    const start = useCallback(() => {
        if (recognitionRef.current && !isListening && !isMuted) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        }
    }, [isListening, isMuted]);

    const stop = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch { }
        }
    }, [isListening]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const forceMute = useCallback((muted) => {
        setIsMuted(muted);
    }, []);

    return {
        isListening,
        isMuted,
        transcript,
        interimText,
        start,
        stop,
        toggleMute,
        forceMute,
        clearTranscript: () => {
            setTranscript('');
            setInterimText('');
        }
    };
};

export default useAdvancedVoiceDetection;
