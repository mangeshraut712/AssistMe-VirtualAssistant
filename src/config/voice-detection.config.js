/**
 * Voice Mode Configuration 4.0
 *
 * Centralized configuration for Voice Mode features.
 * These values are used by both AdvancedVoiceMode and useAdvancedVoiceDetection.
 */

export const VOICE_CONFIG = {
    // ═══════════════════════════════════════════════════════════════════════
    // VOICE ACTIVITY DETECTION (VAD)
    // ═══════════════════════════════════════════════════════════════════════
    vad: {
        // RMS (Root Mean Square) threshold for speech detection
        energyThreshold: 0.015,
        // Threshold below which is considered silence
        silenceThreshold: 0.01,
        // Smoothing factor for audio level (0-1, higher = smoother)
        smoothingFactor: 0.85,
        // Minimum frames of speech before processing
        minSpeechFrames: 3,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ADAPTIVE SILENCE DETECTION
    // ═══════════════════════════════════════════════════════════════════════
    pauseDetection: {
        // Short phrases (< 30 chars): Quick commands
        shortPauseThreshold: 1200,
        // Medium phrases (30-80 chars): Normal conversation
        mediumPauseThreshold: 1800,
        // Long phrases (> 80 chars): Complex thoughts
        longPauseThreshold: 2500,
        // Minimum speech duration before processing
        minimumSpeechDuration: 300,
        // Character thresholds for adaptive detection
        shortPhraseMaxChars: 30,
        mediumPhraseMaxChars: 80,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SPEECH RECOGNITION (STT)
    // ═══════════════════════════════════════════════════════════════════════
    recognition: {
        // Minimum confidence to accept final result
        minConfidence: 0.7,
        // Minimum confidence for interim results
        interimConfidence: 0.5,
        // Default language
        defaultLanguage: 'en-US',
        // Enable continuous recognition
        continuous: true,
        // Enable interim results
        interimResults: true,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CONVERSATION FLOW
    // ═══════════════════════════════════════════════════════════════════════
    conversation: {
        // Min thinking delay before responding (ms) - feels more natural
        thinkingDelayMin: 200,
        // Max thinking delay
        thinkingDelayMax: 600,
        // Max tokens for voice responses (keep concise)
        maxResponseTokens: 200,
        // Number of previous messages to include for context
        contextWindowSize: 8,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO SETTINGS
    // ═══════════════════════════════════════════════════════════════════════
    audio: {
        // Microphone input sample rate
        inputSampleRate: 16000,
        // TTS output sample rate
        outputSampleRate: 24000,
        // Buffer size for ScriptProcessor (lower = less latency)
        bufferSize: 2048,
        // Audio constraints for getUserMedia
        constraints: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MUTE / PUSH-TO-TALK
    // ═══════════════════════════════════════════════════════════════════════
    pushToTalk: {
        enabled: false,
        // false = toggle mode, true = hold to speak
        holdToSpeak: false,
        // Auto-mute when AI is speaking
        muteWhileSpeaking: false,
        // Allow user to interrupt AI (barge-in)
        allowInterruption: true,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ERROR RECOVERY
    // ═══════════════════════════════════════════════════════════════════════
    recovery: {
        // Max reconnection attempts for WebSocket
        maxReconnectAttempts: 3,
        // Delay between reconnection attempts (ms)
        reconnectDelay: 1500,
        // Auto-restart recognition after error
        autoRestart: true,
        // Delay before auto-restart (ms)
        autoRestartDelay: 100,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AI MODELS
    // ═══════════════════════════════════════════════════════════════════════
    models: {
        // Chat model for voice responses
        chatModel: 'meta-llama/llama-3.3-70b-instruct:free',
        // Gemini Live model
        geminiLiveModel: 'models/gemini-2.0-flash-exp',
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// MUTE MODES
// ═══════════════════════════════════════════════════════════════════════════
export const MUTE_MODES = {
    AUTO: 'auto', // Auto-mute when AI speaks
    MANUAL: 'manual', // User controls mute manually
    PUSH_TO_TALK: 'ptt', // Hold/toggle to speak
};

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAS (Voice Styles)
// ═══════════════════════════════════════════════════════════════════════════
export const VOICE_PERSONAS = {
    assistant: {
        name: 'Assistant',
        description: 'Friendly & helpful',
        emoji: '🤖',
        geminiVoice: 'Puck',
        voiceSettings: { rate: 0.95, pitch: 1.0 },
        backchannels: ['Hmm...', 'I see.', 'Got it.', 'Right.'],
    },
    professional: {
        name: 'Expert',
        description: 'Concise & authoritative',
        emoji: '💼',
        geminiVoice: 'Charon',
        voiceSettings: { rate: 0.9, pitch: 0.95 },
        backchannels: ['Understood.', 'Noted.', 'Clear.'],
    },
    empathetic: {
        name: 'Companion',
        description: 'Warm & supportive',
        emoji: '💝',
        geminiVoice: 'Kore',
        voiceSettings: { rate: 0.85, pitch: 1.05 },
        backchannels: ['I hear you.', 'That makes sense.', 'I understand.'],
    },
    energetic: {
        name: 'Motivator',
        description: 'Upbeat & inspiring',
        emoji: '⚡',
        geminiVoice: 'Io',
        voiceSettings: { rate: 1.1, pitch: 1.1 },
        backchannels: ['Awesome!', 'Love it!', 'Yes!', "Let's go!"],
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get adaptive silence timeout based on transcript length
 */
export const getAdaptiveSilenceTimeout = transcriptLength => {
    const { pauseDetection } = VOICE_CONFIG;

    if (transcriptLength < pauseDetection.shortPhraseMaxChars) {
        return pauseDetection.shortPauseThreshold;
    }
    if (transcriptLength < pauseDetection.mediumPhraseMaxChars) {
        return pauseDetection.mediumPauseThreshold;
    }
    return pauseDetection.longPauseThreshold;
};

/**
 * Calculate natural thinking delay
 */
export const getThinkingDelay = () => {
    const { thinkingDelayMin, thinkingDelayMax } = VOICE_CONFIG.conversation;
    return thinkingDelayMin + Math.random() * (thinkingDelayMax - thinkingDelayMin);
};

/**
 * Calculate RMS (Root Mean Square) for VAD
 */
export const calculateRMS = buffer => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
};

/**
 * Normalize text for TTS
 */
export const normalizeForSpeech = text => {
    if (!text) return '';

    const numberWords = [
        'zero',
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
        'ten',
        'eleven',
        'twelve',
        'thirteen',
        'fourteen',
        'fifteen',
        'sixteen',
        'seventeen',
        'eighteen',
        'nineteen',
        'twenty',
    ];

    return text
        .replace(/\*\*/g, '') // Remove markdown bold
        .replace(/\*/g, '') // Remove markdown italic
        .replace(/`/g, '') // Remove code ticks
        .replace(/#{1,6}\s?/g, '') // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
        .replace(/\n+/g, '. ') // Newlines to pauses
        .replace(/(\d+)/g, match => {
            // Spell out small numbers
            const num = parseInt(match);
            return num <= 20 ? numberWords[num] || match : match;
        })
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
};

// Legacy export for backwards compatibility
export const VOICE_DETECTION_CONFIG = VOICE_CONFIG;

export default VOICE_CONFIG;
