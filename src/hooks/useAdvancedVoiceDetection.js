/**
 * useAdvancedVoiceDetection Hook 4.0
 * 
 * Custom React hook for advanced speech recognition with:
 * 1. Voice Activity Detection (VAD) - RMS-based speech detection
 * 2. Adaptive Pause Detection - Context-aware silence thresholds
 * 3. Confidence Filtering - Only accept high-confidence results
 * 4. Auto-Mute Control - Mute during AI speech
 * 5. Audio Level Monitoring - For visualizations
 * 
 * Usage:
 * const {
 *   isListening,
 *   isMuted,
 *   transcript,
 *   interimText,
 *   audioLevel,
 *   isSpeechDetected,
 *   start,
 *   stop,
 *   toggleMute,
 * } = useAdvancedVoiceDetection({
 *   language: 'en-US',
 *   onFinalTranscript: (text) => handleUserInput(text),
 *   isSpeaking: status === 'speaking',
 * });
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
    VOICE_CONFIG,
    getAdaptiveSilenceTimeout,
    calculateRMS
} from '@/config/voice-detection.config';

export const useAdvancedVoiceDetection = ({
    language = VOICE_CONFIG.recognition.defaultLanguage,
    onFinalTranscript,
    onInterimTranscript,
    onAudioLevel,
    onError,
    isSpeaking = false,
    muteMode = 'manual',
}) => {
    // ─────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [isSpeechDetected, setIsSpeechDetected] = useState(false);
    const [confidence, setConfidence] = useState(1.0);

    // ─────────────────────────────────────────────────────────────────────────
    // REFS
    // ─────────────────────────────────────────────────────────────────────────
    const recognitionRef = useRef(null);
    const pauseTimerRef = useRef(null);
    const transcriptRef = useRef('');
    const streamRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const smoothedLevelRef = useRef(0);

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-MUTE WHEN AI IS SPEAKING
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (muteMode === 'auto' && VOICE_CONFIG.pushToTalk.muteWhileSpeaking) {
            setIsMuted(isSpeaking);
        }
    }, [isSpeaking, muteMode]);

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIO LEVEL MONITORING
    // ─────────────────────────────────────────────────────────────────────────
    const startAudioMonitoring = useCallback((stream) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            audioCtxRef.current = ctx;
            analyserRef.current = analyser;

            const dataArray = new Float32Array(analyser.fftSize);

            const updateLevel = () => {
                if (!analyserRef.current) return;

                analyser.getFloatTimeDomainData(dataArray);
                const rms = calculateRMS(dataArray);

                // Smooth the level
                smoothedLevelRef.current =
                    smoothedLevelRef.current * VOICE_CONFIG.vad.smoothingFactor +
                    rms * (1 - VOICE_CONFIG.vad.smoothingFactor);

                const level = Math.min(1, smoothedLevelRef.current * 10);
                const speaking = smoothedLevelRef.current > VOICE_CONFIG.vad.energyThreshold;

                setAudioLevel(level);
                setIsSpeechDetected(speaking);
                onAudioLevel?.(level, speaking);

                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };

            updateLevel();
        } catch (e) {
            console.error('Audio monitoring error:', e);
        }
    }, [onAudioLevel]);

    const stopAudioMonitoring = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => { });
            audioCtxRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0);
        setIsSpeechDetected(false);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // SPEECH RECOGNITION
    // ─────────────────────────────────────────────────────────────────────────
    const initRecognition = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            onError?.('Speech recognition not supported in this browser.');
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = VOICE_CONFIG.recognition.continuous;
        recognition.interimResults = VOICE_CONFIG.recognition.interimResults;
        recognition.lang = language;
        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
            setIsListening(true);
            transcriptRef.current = '';
        };

        recognition.onresult = (event) => {
            if (isMuted) return;

            let interim = '';
            let final = '';
            let lastConfidence = 1.0;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const alternative = result[0];
                const text = alternative.transcript;
                lastConfidence = alternative.confidence || 1.0;

                if (result.isFinal) {
                    if (lastConfidence >= VOICE_CONFIG.recognition.minConfidence) {
                        final += text + ' ';
                        transcriptRef.current += text + ' ';
                    }
                } else {
                    if (lastConfidence >= VOICE_CONFIG.recognition.interimConfidence) {
                        interim += text;
                    }
                }
            }

            setConfidence(lastConfidence);

            if (interim) {
                setInterimText(interim);
                onInterimTranscript?.(interim);
            }

            if (final) {
                setTranscript(transcriptRef.current.trim());
            }

            // Clear existing pause timer
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
            }

            // Set adaptive pause timer
            const timeout = getAdaptiveSilenceTimeout(transcriptRef.current.length);
            pauseTimerRef.current = setTimeout(() => {
                const finalText = transcriptRef.current.trim();
                if (finalText.length > 2) {
                    recognition.stop();
                }
            }, timeout);
        };

        recognition.onend = () => {
            setIsListening(false);

            const finalText = transcriptRef.current.trim();
            if (finalText.length > 2) {
                onFinalTranscript?.(finalText, confidence);
            }

            // Clear timer
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = null;
            }
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('Speech recognition error:', event.error);
                onError?.(event.error);
            }

            // Auto-restart on no-speech
            if (event.error === 'no-speech' && VOICE_CONFIG.recovery.autoRestart) {
                setTimeout(() => {
                    if (!isMuted && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) { }
                    }
                }, VOICE_CONFIG.recovery.autoRestartDelay);
            }
        };

        return recognition;
    }, [language, isMuted, onError, onFinalTranscript, onInterimTranscript, confidence]);

    // ─────────────────────────────────────────────────────────────────────────
    // CONTROL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    const start = useCallback(async () => {
        if (isListening || isMuted) return;

        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: VOICE_CONFIG.audio.constraints,
            });
            streamRef.current = stream;

            // Start audio monitoring for visualization
            startAudioMonitoring(stream);

            // Initialize and start recognition
            const recognition = initRecognition();
            if (recognition) {
                recognitionRef.current = recognition;
                recognition.start();
            }
        } catch (e) {
            console.error('Failed to start voice detection:', e);
            onError?.('Microphone access denied.');
        }
    }, [isListening, isMuted, initRecognition, startAudioMonitoring, onError]);

    const stop = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch { }
        }

        if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        stopAudioMonitoring();
        setIsListening(false);
    }, [isListening, stopAudioMonitoring]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const forceMute = useCallback((muted) => {
        setIsMuted(muted);
    }, []);

    const clearTranscript = useCallback(() => {
        setTranscript('');
        setInterimText('');
        transcriptRef.current = '';
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    // ─────────────────────────────────────────────────────────────────────────
    // RETURN
    // ─────────────────────────────────────────────────────────────────────────
    return {
        // State
        isListening,
        isMuted,
        transcript,
        interimText,
        audioLevel,
        isSpeechDetected,
        confidence,

        // Controls
        start,
        stop,
        toggleMute,
        forceMute,
        clearTranscript,
    };
};

export default useAdvancedVoiceDetection;
