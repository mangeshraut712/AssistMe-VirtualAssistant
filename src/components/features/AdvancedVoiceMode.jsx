/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VOICE MODE - Premium AI Conversation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Distinct Premium vs Standard visual experiences
 * - Premium: Immersive dark mode with neural orb animations
 * - Standard: Clean, fast, browser-based TTS
 * - Clean conversation display (filters internal thoughts)
 * - Real-time audio visualization
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mic, MicOff, Volume2, VolumeX, Trash2,
    Sparkles, Zap, Brain, AudioWaveform, Copy, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    SILENCE_TIMEOUT: 800, // Reduced from 1500ms for faster response
    MIN_TRANSCRIPT_LENGTH: 2, // Reduced from 3 for faster detection

    // Models for Standard Mode (via OpenRouter)
    STANDARD_MODEL: 'x-ai/grok-3-mini-beta',  // Fast, conversational
    STANDARD_FALLBACK: 'google/gemini-2.0-flash-001',

    // Models for Premium Mode (via Gemini Live API - native audio)
    PREMIUM_MODEL: 'gemini-2.5-flash-native-audio-preview-12-2025',

    // Audio configuration for Gemini Live native audio output
    AUDIO_OUTPUT: {
        sampleRate: 24000,
        channels: 1,
        bitDepth: 16
    },

    // Endpoints
    CHAT_ENDPOINT: '/api/chat',
    TTS_ENDPOINT: '/api/tts/synthesize',
    GEMINI_WS_URL: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent',

    // Voice-specific system prompts
    PREMIUM_SYSTEM_PROMPT: `You are Gemini, a friendly AI voice assistant. Respond directly and naturally like a friend.

RULES:
- Start with the answer immediately - no preamble
- Never reveal internal thinking or planning
- Keep responses short: 1-2 sentences for simple questions
- Be warm, natural, conversational
- Use contractions (I'm, you're, that's)

Examples:
User: "How are you?" → "I'm great, thanks! How can I help you today?"
User: "What's 2+2?" → "That's 4!"
User: "Tell me a joke" → "Why don't scientists trust atoms? Because they make up everything!"`,

    STANDARD_SYSTEM_PROMPT: `You are a helpful voice assistant. Be concise and direct.

RULES:
- Answer immediately - no thinking out loud
- Keep responses under 3 sentences
- Be friendly but efficient
- Never describe what you're about to do`
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean response text by removing internal thought markers and AI meta-commentary
 */
const cleanResponseText = (text) => {
    if (!text) return '';

    const lowerText = text.toLowerCase();

    // VERY aggressive - any of these words indicate internal thinking
    const thinkingKeywords = [
        "i've determined", "i've settled", "i've crafted", "i've formulated",
        "i've checked", "i've begun", "i've processed", "i've tackled",
        "i'm crafting", "i'm aiming", "i'm focusing", "i'm wrestling",
        "i'm processing", "i'm zeroing", "i'm breaking down", "i'm currently",
        "my aim", "my focus", "my approach", "my response will",
        "the exact wording", "along the lines of", "this fits",
        "directly addressing", "reciprocating", "maintains a",
        "conversational tone", "friendly approach", "concise, natural",
        "positive inquiry", "settled on a response", "will be along",
        "let me", "i plan to", "i will try"
    ];

    // If ANY thinking keyword exists, the whole text is thinking
    const isThinking = thinkingKeywords.some(k => lowerText.includes(k));

    if (isThinking) {
        // Try to extract the QUOTED actual response
        // Pattern: "I'm doing great, thanks!"
        const quotedMatch = text.match(/"([^"]+)"/);
        if (quotedMatch && quotedMatch[1].length > 5) {
            return quotedMatch[1].trim();
        }

        // Pattern: 'I'm doing great, thanks!'
        const singleQuotedMatch = text.match(/'([^']+)'/);
        if (singleQuotedMatch && singleQuotedMatch[1].length > 5) {
            return singleQuotedMatch[1].trim();
        }

        // No quoted response found - return empty, don't show thinking
        return '';
    }

    // For normal text, just clean up formatting
    return text
        .replace(/\*\*[^*]+\*\*\s*/g, '')
        .trim();
};


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdvancedVoiceMode({ isOpen, onClose }) {
    // State
    const [status, setStatus] = useState('idle');
    const [conversation, setConversation] = useState([]);
    const [transcript, setTranscript] = useState(''); // User's speech transcript
    const [aiStreamingText, setAiStreamingText] = useState(''); // AI's current speech (real-time)
    const [isMuted, setIsMuted] = useState(false);
    const [isPremium, setIsPremium] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);

    // Refs
    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const conversationEndRef = useRef(null);
    const processRef = useRef(null);
    const wsRef = useRef(null);

    // ─────────────────────────────────────────────────────────────────────────
    // SPEECH TO TEXT
    // ─────────────────────────────────────────────────────────────────────────

    const startListening = useCallback(() => {
        if (typeof window === 'undefined' || isProcessingRef.current) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage('Speech recognition not supported');
            setStatus('error');
            return;
        }

        const recognition = new SpeechRecognition();

        // IMPROVED: Better recognition settings for accuracy
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;  // Get multiple alternatives for better accuracy
        recognition.lang = 'en-US';

        // Enhanced language hints for better recognition
        if (recognition.grammars) {
            const speechRecognitionList = new (window.SpeechGrammarList || window.webkitSpeechGrammarList)();
            recognition.grammars = speechRecognitionList;
        }

        recognition.onstart = async () => {
            console.log('[Voice] Started listening');
            setStatus('listening');
            setTranscript('');

            try {
                // Request high-quality audio for better recognition
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 48000  // Higher sample rate for better quality
                    }
                });
                streamRef.current = stream;

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                analyser.fftSize = 64;
                source.connect(analyser);

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const updateLevel = () => {
                    if (status !== 'listening' && status !== 'speaking') {
                        setAudioLevel(0);
                        return;
                    }
                    analyser.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                    setAudioLevel(average / 255);
                    requestAnimationFrame(updateLevel);
                };
                updateLevel();
            } catch (err) {
                console.warn('[Voice] Could not start audio visualization:', err);
            }
        };

        let accumulatedFinalTranscript = '';

        recognition.onresult = (event) => {
            let interimTranscript = '';

            // Process all results to get the most accurate transcript
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];

                // Choose the best alternative (highest confidence)
                let bestTranscript = result[0].transcript;
                let bestConfidence = result[0].confidence;

                for (let j = 1; j < result.length; j++) {
                    if (result[j].confidence > bestConfidence) {
                        bestTranscript = result[j].transcript;
                        bestConfidence = result[j].confidence;
                    }
                }

                if (result.isFinal) {
                    accumulatedFinalTranscript += bestTranscript + ' ';
                    console.log('[Voice] Final:', bestTranscript, 'Confidence:', bestConfidence);
                } else {
                    interimTranscript += bestTranscript;
                }
            }

            // Show accumulated final + current interim
            const currentText = (accumulatedFinalTranscript + interimTranscript).trim();
            setTranscript(currentText);

            // Wait for a complete sentence with better timeout
            if (accumulatedFinalTranscript.trim().length >= CONFIG.MIN_TRANSCRIPT_LENGTH) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                // Longer timeout to capture complete thoughts (2.5s)
                silenceTimerRef.current = setTimeout(() => {
                    recognition.stop();
                    const finalText = accumulatedFinalTranscript.trim();
                    console.log('[Voice] Processing complete transcript:', finalText);
                    if (processRef.current && finalText) {
                        processRef.current(finalText);
                    }
                    accumulatedFinalTranscript = '';
                }, 2500);
            }
        };

        recognition.onerror = (event) => {
            console.error('[Voice] Recognition error:', event.error);
            if (event.error === 'no-speech') {
                setErrorMessage('No speech detected. Please try again.');
            } else if (event.error === 'audio-capture') {
                setErrorMessage('Microphone not accessible. Check permissions.');
            } else if (event.error !== 'aborted') {
                setErrorMessage(`Error: ${event.error}`);
            }
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                setStatus('error');
            }
        };

        recognition.onend = () => {
            console.log('[Voice] Recognition ended');
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [status]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioLevel(0);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIO PLAYBACK (IMPROVED)
    // ─────────────────────────────────────────────────────────────────────────

    // Single persistent AudioContext for playback (separate from visualizer context)
    const playbackContextRef = useRef(null);

    const getAudioContext = useCallback(() => {
        if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
            playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 24000,  // Match Gemini's output
                latencyHint: 'interactive'  // Low latency for real-time feel
            });
        }
        // Resume if suspended (happens on mobile)
        if (playbackContextRef.current.state === 'suspended') {
            playbackContextRef.current.resume();
        }
        return playbackContextRef.current;
    }, []);

    /**
     * Play multiple PCM audio chunks smoothly by concatenating them
     * This eliminates gaps between chunks for natural-sounding speech
     */
    const playPCMAudioChunks = useCallback(async (chunks) => {
        if (!chunks || chunks.length === 0 || isMuted) return;

        try {
            const audioCtx = getAudioContext();

            // Decode all chunks first
            const decodedChunks = [];
            let totalSamples = 0;

            for (const base64Data of chunks) {
                try {
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    // Convert int16 PCM to float32
                    const int16Array = new Int16Array(bytes.buffer);
                    const float32Array = new Float32Array(int16Array.length);
                    for (let i = 0; i < int16Array.length; i++) {
                        // Normalize and apply slight gain for clarity
                        float32Array[i] = Math.max(-1, Math.min(1, int16Array[i] / 32768.0 * 1.1));
                    }

                    decodedChunks.push(float32Array);
                    totalSamples += float32Array.length;
                } catch (err) {
                    console.warn('[Voice] Failed to decode chunk:', err);
                }
            }

            if (decodedChunks.length === 0 || totalSamples === 0) {
                console.warn('[Voice] No valid audio chunks to play');
                return;
            }

            // Concatenate all chunks into a single buffer for smooth playback
            const concatenated = new Float32Array(totalSamples);
            let offset = 0;
            for (const chunk of decodedChunks) {
                concatenated.set(chunk, offset);
                offset += chunk.length;
            }

            // Create audio buffer
            const audioBuffer = audioCtx.createBuffer(
                1,  // Mono
                concatenated.length,
                24000  // Gemini's native sample rate
            );
            audioBuffer.getChannelData(0).set(concatenated);

            // Create and configure source
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;

            // Add gain node for volume control and dynamic range
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.0;

            // Optional: Add compression for better dynamics
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // Connect: source -> compressor -> gain -> destination
            source.connect(compressor);
            compressor.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Play and return promise
            return new Promise((resolve) => {
                source.onended = () => {
                    // Don't close context, reuse it
                    resolve();
                };
                source.start(0);
            });
        } catch (error) {
            console.error('[Voice] PCM audio playback error:', error);
        }
    }, [isMuted, getAudioContext]);

    /**
     * Legacy single-chunk playback (for fallback/compatibility)
     */



    const speak = useCallback(async (text) => {
        if (!text || isMuted) return;

        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);

        await new Promise((resolve) => {
            utterance.onend = resolve;
            utterance.onerror = resolve;
            setTimeout(resolve, 15000);
        });
    }, [isMuted]);

    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI LIVE API (PREMIUM)
    // ─────────────────────────────────────────────────────────────────────────

    const connectToGeminiLive = useCallback((text) => {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    const keyResponse = await fetch('/api/gemini/key');
                    if (!keyResponse.ok) throw new Error('Failed to get API key');
                    const { apiKey } = await keyResponse.json();
                    if (!apiKey) throw new Error('API key not configured');

                    const wsUrl = `${CONFIG.GEMINI_WS_URL}?key=${apiKey}`;
                    const ws = new WebSocket(wsUrl);
                    wsRef.current = ws;

                    let isSetupComplete = false;
                    let accumulatedText = '';
                    const audioChunks = [];
                    let timeoutId = null;

                    const cleanup = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        if (ws.readyState === WebSocket.OPEN) ws.close();
                        wsRef.current = null;
                    };

                    timeoutId = setTimeout(() => {
                        cleanup();
                        reject(new Error('Response timeout'));
                    }, 45000);

                    ws.onopen = () => {
                        ws.send(JSON.stringify({
                            setup: {
                                model: `models/${CONFIG.PREMIUM_MODEL}`,
                                generation_config: {
                                    response_modalities: ['AUDIO'],
                                    speech_config: {
                                        voice_config: {
                                            prebuilt_voice_config: {
                                                voice_name: 'Kore'
                                            }
                                        }
                                    }
                                },
                                // Request transcription of what AI actually says
                                output_audio_transcription: {},
                                system_instruction: {
                                    parts: [{ text: CONFIG.PREMIUM_SYSTEM_PROMPT }]
                                }
                            }
                        }));
                    };

                    ws.onmessage = async (event) => {
                        try {
                            let textData;
                            if (event.data instanceof Blob) {
                                textData = await event.data.text();
                            } else {
                                textData = event.data;
                            }

                            const data = JSON.parse(textData);

                            if (data.setupComplete) {
                                isSetupComplete = true;
                                ws.send(JSON.stringify({
                                    clientContent: {
                                        turns: [{ role: 'user', parts: [{ text }] }],
                                        turnComplete: true
                                    }
                                }));
                                return;
                            }

                            if (data.serverContent) {
                                const serverContent = data.serverContent;

                                if (serverContent.interrupted) {
                                    audioChunks.length = 0;
                                    return;
                                }

                                // Collect audio data
                                if (serverContent.modelTurn?.parts) {
                                    for (const part of serverContent.modelTurn.parts) {
                                        if (part.inlineData?.data) {
                                            audioChunks.push(part.inlineData.data);
                                        }
                                        // Collect text but DON'T show it yet (it's mostly thinking)
                                        if (part.text) {
                                            accumulatedText += part.text;
                                        }
                                    }
                                }

                                // If we have audio transcription, use that instead
                                if (serverContent.outputAudioTranscription?.text) {
                                    // This is the actual spoken text - much better
                                    accumulatedText = serverContent.outputAudioTranscription.text;
                                    setAiStreamingText(accumulatedText);
                                }

                                if (serverContent.turnComplete) {
                                    if (timeoutId) clearTimeout(timeoutId);

                                    // Apply aggressive filtering to get ONLY the actual response
                                    // Remove all internal thinking, planning, meta-commentary
                                    let finalText = cleanResponseText(accumulatedText.trim());

                                    // If filter removed everything, try extracting the last sentence
                                    if (!finalText && accumulatedText.length > 50) {
                                        const sentences = accumulatedText.split(/[.!?]+/).filter(s => s.trim());
                                        // Take last 1-2 sentences as they're usually the actual response
                                        finalText = sentences.slice(-2).join('. ').trim();
                                        if (finalText) finalText += '.';
                                    }

                                    if (finalText) {
                                        setConversation(prev => [...prev, {
                                            role: 'assistant',
                                            content: finalText
                                        }]);
                                    }

                                    // Clear streaming text after adding to conversation
                                    setAiStreamingText('');

                                    // Play all audio chunks at once for smooth, fast playback
                                    if (audioChunks.length > 0) {
                                        setStatus('speaking');
                                        await playPCMAudioChunks(audioChunks);
                                    } else if (finalText) {
                                        setStatus('speaking');
                                        await speak(finalText);
                                    }

                                    cleanup();
                                    resolve({ text: finalText, audioCount: audioChunks.length });
                                    return;
                                }
                            }

                            if (data.error) {
                                cleanup();
                                reject(new Error(data.error.message || 'API error'));
                            }
                        } catch (parseError) {
                            console.error('[Voice] Parse error:', parseError);
                        }
                    };

                    ws.onerror = () => {
                        cleanup();
                        reject(new Error('Connection failed'));
                    };

                    ws.onclose = (event) => {
                        if (event.code === 1011) {
                            const msg = event.reason || 'Server error';
                            reject(new Error(msg.includes('quota') ? 'Quota exceeded' : msg));
                        } else if (!isSetupComplete && event.code !== 1000) {
                            reject(new Error('Connection closed'));
                        }
                    };
                } catch (error) {
                    reject(error);
                }
            })().catch(reject);
        });
    }, [playPCMAudioChunks, speak]);

    // ─────────────────────────────────────────────────────────────────────────
    // PROCESSING
    // ─────────────────────────────────────────────────────────────────────────

    const processStandard = useCallback(async (text) => {
        // Build conversation history for context
        const conversationHistory = conversation.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Add system message for voice-optimized responses
        const messagesWithSystem = [
            { role: 'system', content: CONFIG.STANDARD_SYSTEM_PROMPT },
            ...conversationHistory,
            { role: 'user', content: text }
        ];

        try {
            // Add timeout protection
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max

            try {
                const chatResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        messages: messagesWithSystem,
                        model: CONFIG.STANDARD_MODEL,
                        stream: false,  // CRITICAL: Voice mode needs complete response
                        temperature: 0.7,
                        max_tokens: 150  // Shorter for faster voice response
                    }),
                });

                clearTimeout(timeoutId);

                if (!chatResponse.ok) {
                    throw new Error(`API error: ${chatResponse.status}`);
                }

                const data = await chatResponse.json();

                if (data.response) {
                    const cleanText = cleanResponseText(data.response);
                    if (cleanText) {
                        setConversation(p => [...p, { role: 'assistant', content: cleanText }]);
                        setStatus('speaking');
                        await speak(cleanText);
                    } else {
                        throw new Error('Empty response');
                    }
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                throw fetchErr;
            }
        } catch (err) {
            console.error('[Voice] Standard mode error:', err);

            // Try fallback model with same non-streaming approach
            try {
                const fallbackController = new AbortController();
                const fallbackTimeout = setTimeout(() => fallbackController.abort(), 10000);

                const fallbackResponse = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: fallbackController.signal,
                    body: JSON.stringify({
                        messages: messagesWithSystem,
                        model: CONFIG.STANDARD_FALLBACK,
                        stream: false,
                        temperature: 0.7,
                        max_tokens: 150
                    }),
                });

                clearTimeout(fallbackTimeout);

                const fallbackData = await fallbackResponse.json();
                if (fallbackData.response) {
                    const cleanText = cleanResponseText(fallbackData.response);
                    if (cleanText) {
                        setConversation(p => [...p, { role: 'assistant', content: cleanText }]);
                        setStatus('speaking');
                        await speak(cleanText);
                        return;
                    }
                }
                throw new Error('Fallback failed');
            } catch (fallbackErr) {
                console.error('[Voice] Fallback error:', fallbackErr);
                setErrorMessage('Unable to connect. Please try again.');
                throw fallbackErr;
            }
        }
    }, [conversation, speak]);


    const processPremium = useCallback(async (text) => {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
                const statusRes = await fetch('/api/gemini/status', {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!statusRes.ok) {
                    throw new Error(`Status check failed: ${statusRes.status}`);
                }

                const statusData = await statusRes.json();

                if (!statusData.available) {
                    setErrorMessage('Premium unavailable. Using standard mode.');
                    setTimeout(() => setErrorMessage(''), 3000);
                    await processStandard(text);
                    return;
                }
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                console.error('[Voice] Status check failed:', fetchErr.message);
                // If status check fails, fall back to standard mode
                setErrorMessage('Server unavailable. Using browser voice.');
                setTimeout(() => setErrorMessage(''), 3000);
                await processStandard(text);
                return;
            }

            await connectToGeminiLive(text);
        } catch (err) {
            console.error('[Voice] Premium error:', err.message);
            setErrorMessage('Falling back to standard mode.');
            setTimeout(() => setErrorMessage(''), 3000);
            await processStandard(text);
        }
    }, [processStandard, connectToGeminiLive]);


    const processUserInput = useCallback(async (text) => {
        if (!text || isProcessingRef.current) return;
        isProcessingRef.current = true;
        setStatus('processing');
        setConversation(p => [...p, { role: 'user', content: text }]);
        setTranscript('');

        try {
            if (isPremium) await processPremium(text);
            else await processStandard(text);
        } catch (error) {
            setErrorMessage(error.message);
            setStatus('error');
        } finally {
            isProcessingRef.current = false;
            setStatus('idle');
            setTimeout(() => {
                if (status !== 'error') startListening();
            }, 500);
        }
    }, [isPremium, startListening, status, processPremium, processStandard]);

    useEffect(() => {
        processRef.current = processUserInput;
    }, [processUserInput]);

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen) return;
        setTimeout(() => {
            conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [conversation, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        setStatus('idle');
        setConversation([]);
        setTranscript('');
        setErrorMessage('');

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'm' && e.ctrlKey) setIsMuted(prev => !prev);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            stopListening();
            window.speechSynthesis?.cancel();
            window.removeEventListener('keydown', handleKeyDown);
            // Cleanup audio context
            if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
                playbackContextRef.current.close();
            }
        };
    }, [isOpen, stopListening, onClose]);

    if (!isOpen) return null;

    // ─────────────────────────────────────────────────────────────────────────
    // CONVERSATION MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    const exportConversation = (format = 'text') => {
        if (conversation.length === 0) return;

        let content;
        const timestamp = new Date().toLocaleString();

        if (format === 'json') {
            content = JSON.stringify({
                exported: timestamp,
                mode: isPremium ? 'Premium (Gemini Live)' : 'Standard',
                messages: conversation
            }, null, 2);
        } else {
            content = `Voice Conversation Export\nMode: ${isPremium ? 'Premium (Gemini Live)' : 'Standard'}\nDate: ${timestamp}\n\n`;
            conversation.forEach((msg) => {
                content += `${msg.role === 'user' ? 'You' : 'Gemini'}: ${msg.content}\n\n`;
            });
        }

        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voice-conversation-${Date.now()}.${format === 'json' ? 'json' : 'txt'}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyConversation = async () => {
        if (conversation.length === 0) return;

        const text = conversation.map(msg =>
            `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`
        ).join('\n\n');

        try {
            await navigator.clipboard.writeText(text);
            // Could add a toast notification here
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const clearConversation = () => {
        if (confirm('Clear conversation history?')) {
            setConversation([]);
            setTranscript('');
            setStatus('idle');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    const handleOrbClick = () => {
        if (status === 'idle' || status === 'error') {
            setStatus('listening');
            setErrorMessage('');
            startListening();
        } else if (status === 'listening') {
            stopListening();
            setStatus('idle');
        } else if (status === 'speaking') {
            window.speechSynthesis?.cancel();
            setStatus('idle');
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'listening': return 'Listening...';
            case 'processing': return isPremium ? 'Neural Processing...' : 'Thinking...';
            case 'speaking': return isPremium ? 'Speaking with Gemini' : 'Responding...';
            case 'error': return errorMessage || 'Error occurred';
            default: return isPremium ? 'Tap to activate' : 'Tap to speak';
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER - PREMIUM MODE
    // ─────────────────────────────────────────────────────────────────────────

    if (isPremium) {
        return (
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-black transition-colors duration-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Subtle Premium Accent Glow (theme-aware) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {/* Top-right violet glow */}
                        <motion.div
                            className="absolute w-[600px] h-[600px] rounded-full"
                            style={{
                                top: '-200px',
                                right: '-200px',
                            }}
                            animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.08, 0.12, 0.08],
                            }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-500/30 via-indigo-500/20 to-transparent dark:from-violet-600/20 dark:via-indigo-600/15 dark:to-transparent" />
                        </motion.div>
                        {/* Bottom-left blue glow */}
                        <motion.div
                            className="absolute w-[500px] h-[500px] rounded-full"
                            style={{
                                bottom: '-150px',
                                left: '-150px',
                            }}
                            animate={{
                                scale: [1.1, 1, 1.1],
                                opacity: [0.06, 0.1, 0.06],
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500/25 via-cyan-500/15 to-transparent dark:from-blue-600/15 dark:via-cyan-600/10 dark:to-transparent" />
                        </motion.div>
                        {/* Center shimmer effect */}
                        <motion.div
                            className="absolute w-[400px] h-[400px] rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            animate={{
                                scale: [0.9, 1.1, 0.9],
                                opacity: [0.02, 0.05, 0.02],
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-r from-violet-400/20 via-pink-400/10 to-indigo-400/20 dark:from-violet-500/10 dark:via-pink-500/5 dark:to-indigo-500/10 blur-2xl" />
                        </motion.div>
                    </div>

                    {/* Header */}
                    <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 border-b border-gray-100 dark:border-gray-900">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-violet-500/25">
                                <Sparkles className="w-4 h-4" />
                                <span>Premium AI</span>
                            </div>
                            <button
                                onClick={() => setIsPremium(false)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Switch to Standard
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsMuted(!isMuted)}
                                className={cn(
                                    "p-3 rounded-full transition-all",
                                    isMuted
                                        ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                                )}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </motion.button>
                            {conversation.length > 0 && (
                                <>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={copyConversation}
                                        className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-gray-200 dark:border-gray-700"
                                        title="Copy conversation"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => exportConversation('text')}
                                        className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-500/20 hover:text-green-600 dark:hover:text-green-400 transition-all border border-gray-200 dark:border-gray-700"
                                        title="Download conversation"
                                    >
                                        <Download className="w-5 h-5" />
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={clearConversation}
                                        className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-all border border-gray-200 dark:border-gray-700"
                                        title="Clear conversation"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </motion.button>
                                </>
                            )}
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </header>

                    {/* ═══════════════════════════════════════════════════════════════
                        PREMIUM CONVERSATION AREA - Apple Intelligence Style
                    ═══════════════════════════════════════════════════════════════ */}
                    <div className="relative z-10 flex-1 overflow-y-auto">
                        {/* Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-gray-950 dark:to-indigo-950/20" />

                        <div className="relative px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                            {/* Welcome Hero - Shows when no conversation */}
                            {conversation.length === 0 && !aiStreamingText && !transcript && (
                                <motion.div
                                    className="flex flex-col items-center justify-center min-h-[50vh] text-center"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                >
                                    <motion.div
                                        className="relative mb-8"
                                        animate={{
                                            y: [0, -10, 0],
                                            rotateZ: [0, 5, -5, 0]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <div className="absolute inset-0 w-28 h-28 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 blur-2xl opacity-30" />
                                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl">
                                            <Brain className="w-14 h-14 text-white" />
                                        </div>
                                    </motion.div>
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent mb-3">
                                        Gemini Live Voice
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 max-w-sm text-lg leading-relaxed">
                                        Experience natural AI conversation with real-time audio synthesis
                                    </p>
                                    <motion.p
                                        className="mt-4 text-violet-600 dark:text-violet-400 font-semibold"
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        ✨ Tap the orb below to begin
                                    </motion.p>
                                </motion.div>
                            )}

                            {/* Messages Container */}
                            <div className="space-y-6">
                                {/* Conversation History */}
                                {conversation.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25,
                                            delay: i * 0.05
                                        }}
                                        className={cn(
                                            "flex items-end gap-3",
                                            msg.role === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {/* AI Avatar */}
                                        {msg.role === 'assistant' && (
                                            <motion.div
                                                className="flex-shrink-0"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", delay: 0.1 }}
                                            >
                                                <div className="relative w-10 h-10">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full blur-md opacity-50" />
                                                    <div className="relative w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl ring-2 ring-white/50 dark:ring-gray-800/50">
                                                        <Sparkles className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Message Bubble */}
                                        <div className={cn(
                                            "relative max-w-[80%] sm:max-w-[70%] rounded-3xl shadow-xl",
                                            msg.role === 'user'
                                                ? "bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 text-white px-6 py-4"
                                                : "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 px-6 py-4"
                                        )}>
                                            {/* AI Header */}
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="flex gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                                                        Gemini
                                                    </span>
                                                </div>
                                            )}

                                            {/* Message Text */}
                                            <p className={cn(
                                                "text-[15px] leading-relaxed font-medium",
                                                msg.role === 'user' ? "text-white" : "text-gray-800 dark:text-gray-100"
                                            )}>
                                                {msg.content}
                                            </p>
                                        </div>

                                        {/* User Avatar */}
                                        {msg.role === 'user' && (
                                            <motion.div
                                                className="flex-shrink-0"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", delay: 0.1 }}
                                            >
                                                <div className="relative w-10 h-10">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-md opacity-50" />
                                                    <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl ring-2 ring-white/50 dark:ring-gray-800/50">
                                                        <Mic className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ))}

                                {/* ═══════════════════════════════════════════════════════════
                                    REAL-TIME AI RESPONSE - Shows while Gemini is speaking
                                ═══════════════════════════════════════════════════════════ */}
                                {aiStreamingText && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-end gap-3 justify-start"
                                    >
                                        <motion.div
                                            className="flex-shrink-0"
                                            animate={{ scale: [1, 1.15, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        >
                                            <div className="relative w-10 h-10">
                                                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full blur-lg opacity-70 animate-pulse" />
                                                <div className="relative w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl ring-2 ring-violet-300 dark:ring-violet-700">
                                                    <Volume2 className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                        </motion.div>

                                        <div className="relative max-w-[80%] sm:max-w-[70%] px-6 py-4 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 border-2 border-violet-300 dark:border-violet-600 shadow-2xl backdrop-blur-xl">
                                            {/* Speaking Header with Waveform */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <motion.div
                                                            key={i}
                                                            className="w-1 bg-gradient-to-t from-violet-500 to-indigo-500 rounded-full"
                                                            animate={{ height: [4, 20, 4] }}
                                                            transition={{
                                                                duration: 0.5,
                                                                repeat: Infinity,
                                                                delay: i * 0.08,
                                                                ease: "easeInOut"
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent uppercase tracking-wider">
                                                    Gemini Speaking
                                                </span>
                                            </div>

                                            {/* Streaming Text */}
                                            <p className="text-[15px] leading-relaxed font-medium text-gray-800 dark:text-gray-100">
                                                {aiStreamingText}
                                                <motion.span
                                                    className="inline-block w-0.5 h-5 ml-1 bg-violet-500 rounded-full"
                                                    animate={{ opacity: [1, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity }}
                                                />
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ═══════════════════════════════════════════════════════════
                                    USER LISTENING INDICATOR - Shows what user is saying
                                ═══════════════════════════════════════════════════════════ */}
                                {transcript && status === 'listening' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-end gap-3 justify-end"
                                    >
                                        <div className="relative max-w-[80%] sm:max-w-[70%] px-6 py-4 rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 border-2 border-blue-300 dark:border-blue-600 shadow-2xl backdrop-blur-xl">
                                            {/* Listening Header */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex gap-1">
                                                    <motion.div
                                                        className="w-2 h-2 bg-blue-500 rounded-full"
                                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                                        transition={{ duration: 1, repeat: Infinity }}
                                                    />
                                                    <motion.div
                                                        className="w-2 h-2 bg-blue-500 rounded-full"
                                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                                        transition={{ duration: 1, repeat: Infinity, delay: 0.15 }}
                                                    />
                                                    <motion.div
                                                        className="w-2 h-2 bg-blue-500 rounded-full"
                                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                                        transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent uppercase tracking-wider">
                                                    Listening
                                                </span>
                                            </div>

                                            {/* User's Speech */}
                                            <p className="text-[15px] leading-relaxed font-medium text-gray-800 dark:text-gray-100">
                                                {transcript}
                                            </p>
                                        </div>

                                        <motion.div
                                            className="flex-shrink-0"
                                            animate={{ scale: [1, 1.15, 1] }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                        >
                                            <div className="relative w-10 h-10">
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-lg opacity-70 animate-pulse" />
                                                <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl ring-2 ring-blue-300 dark:ring-blue-700">
                                                    <Mic className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </div>

                            <div ref={conversationEndRef} className="h-4" />
                        </div>
                    </div>

                    {/* Neural Orb */}
                    <div className="relative z-10 pb-safe px-4 py-8 sm:px-6 sm:py-12 border-t border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/50">
                        <div className="flex flex-col items-center gap-6">
                            <motion.button
                                onClick={handleOrbClick}
                                whileTap={{ scale: 0.95 }}
                                className="relative"
                            >
                                {/* Outer glow rings */}
                                {(status === 'listening' || status === 'speaking') && (
                                    <>
                                        <motion.div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                width: '200px',
                                                height: '200px',
                                                left: '-36px',
                                                top: '-36px',
                                            }}
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [0.5, 0.2, 0.5],
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            <div className="w-full h-full rounded-full bg-gradient-to-r from-violet-500/40 via-indigo-500/30 to-blue-500/40" />
                                        </motion.div>
                                        <motion.div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                width: '250px',
                                                height: '250px',
                                                left: '-61px',
                                                top: '-61px',
                                            }}
                                            animate={{
                                                scale: [1.2, 1, 1.2],
                                                opacity: [0.3, 0.5, 0.3],
                                            }}
                                            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                                        >
                                            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500/30 via-cyan-500/20 to-teal-500/30" />
                                        </motion.div>
                                    </>
                                )}

                                {/* Main Orb */}
                                <motion.div
                                    className={cn(
                                        "relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden shadow-2xl",
                                        status === 'listening'
                                            ? "bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500"
                                            : status === 'speaking'
                                                ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500"
                                                : status === 'processing'
                                                    ? "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500"
                                                    : "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800"
                                    )}
                                    style={{
                                        boxShadow: status === 'listening'
                                            ? '0 0 60px rgba(139,92,246,0.4), 0 0 100px rgba(99,102,241,0.2)'
                                            : status === 'speaking'
                                                ? '0 0 60px rgba(16,185,129,0.4), 0 0 100px rgba(20,184,166,0.2)'
                                                : '0 10px 40px rgba(0,0,0,0.15)',
                                    }}
                                    animate={{
                                        scale: status === 'listening' ? (1 + audioLevel * 0.3) : 1,
                                    }}
                                >
                                    {/* Inner gradient overlay */}
                                    <div
                                        className="absolute inset-0 rounded-full opacity-50"
                                        style={{
                                            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)',
                                        }}
                                    />

                                    {/* Icon */}
                                    {status === 'listening' ? (
                                        <AudioWaveform className="w-14 h-14 text-white relative z-10" />
                                    ) : status === 'speaking' ? (
                                        <Volume2 className="w-14 h-14 text-white relative z-10 animate-pulse" />
                                    ) : status === 'processing' ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Zap className="w-14 h-14 text-white relative z-10" />
                                        </motion.div>
                                    ) : (
                                        <Mic className="w-14 h-14 text-white relative z-10" />
                                    )}
                                </motion.div>
                            </motion.button>

                            {/* Status */}
                            <div className="text-center">
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{getStatusText()}</p>
                                {status === 'listening' && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Speak naturally...</p>
                                )}
                            </div>
                        </div>
                    </div >
                </motion.div >
            </AnimatePresence >
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER - STANDARD MODE
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-white dark:bg-black flex flex-col transition-colors duration-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold">
                            <Mic className="w-4 h-4" />
                            <span>Standard</span>
                        </div>
                        <button
                            onClick={() => setIsPremium(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:opacity-90 transition-opacity"
                        >
                            <Sparkles className="w-3 h-3" />
                            Upgrade to Premium
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "p-3 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center",
                                isMuted
                                    ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                    : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                            )}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </motion.button>
                        {conversation.length > 0 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setConversation([])}
                                className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                <Trash2 className="w-5 h-5" />
                            </motion.button>
                        )}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>
                </header>

                {/* Conversation Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                        {conversation.length === 0 && (
                            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                                <div className="w-20 h-20 mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Mic className="w-10 h-10 text-gray-400" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Standard Voice Mode
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                    Fast, browser-based voice interaction. Tap the button below to start.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            {conversation.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn("flex items-end gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}
                                >
                                    {/* AI Avatar */}
                                    {msg.role === 'assistant' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            "max-w-[75%] sm:max-w-[65%] px-4 py-3 rounded-2xl",
                                            msg.role === 'user'
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                        )}
                                    >
                                        <p className="text-sm sm:text-base leading-relaxed">{msg.content}</p>
                                    </div>

                                    {/* User Avatar */}
                                    {msg.role === 'user' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                                            <Mic className="w-4 h-4 text-white dark:text-gray-900" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {/* Listening Transcript */}
                            {transcript && status === 'listening' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-end gap-3 justify-end"
                                >
                                    <div className="max-w-[75%] sm:max-w-[65%] px-4 py-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-500">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Listening</span>
                                        </div>
                                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{transcript}</p>
                                    </div>
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                                        <Mic className="w-4 h-4 text-white" />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div ref={conversationEndRef} className="h-4" />
                    </div>
                </div>

                {/* Simple Orb */}
                <div className="pb-safe px-4 py-8 sm:px-6 sm:py-10 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col items-center gap-4">
                        <motion.button
                            onClick={handleOrbClick}
                            whileTap={{ scale: 0.95 }}
                            className="relative"
                        >
                            {/* Pulse */}
                            {status === 'listening' && (
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-blue-500"
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.3, 0, 0.3],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    style={{ width: '128px', height: '128px' }}
                                />
                            )}

                            <motion.div
                                className={cn(
                                    "w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center shadow-xl",
                                    status === 'listening'
                                        ? "bg-blue-500"
                                        : status === 'speaking'
                                            ? "bg-green-500"
                                            : status === 'processing'
                                                ? "bg-amber-500"
                                                : "bg-gray-400 dark:bg-gray-600"
                                )}
                                animate={{
                                    scale: status === 'listening' ? (1 + audioLevel * 0.2) : 1,
                                }}
                            >
                                {status === 'listening' ? (
                                    <Mic className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                                ) : status === 'speaking' ? (
                                    <Volume2 className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-pulse" />
                                ) : (
                                    <MicOff className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                                )}
                            </motion.div>
                        </motion.button>

                        <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {getStatusText()}
                            </p>
                            {status === 'listening' && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Speak clearly...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
