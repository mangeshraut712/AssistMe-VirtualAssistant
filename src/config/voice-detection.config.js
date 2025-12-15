/**
 * Enhanced Voice Mode Configuration
 * Advanced pause detection and push-to-talk features
 */

export const VOICE_DETECTION_CONFIG = {
    // Pause Detection Settings (prevents cutting off mid-sentence)
    pauseDetection: {
        shortPauseThreshold: 800,      // 0.8s - natural breath
        mediumPauseThreshold: 1500,    // 1.5s - thinking pause
        longPauseThreshold: 3000,      // 3s - sentence end
        interimResultsRequired: 2,     // Wait for 2 interim results before processing
        minimumSpeechDuration: 500,    // Minimum 0.5s of speech
    },

    // Voice Activity Detection (VAD)
    vad: {
        energyThreshold: 0.02,          // Minimum energy to consider speech
        silenceThreshold: 0.01,         // Below this is silence
        consecutiveSilenceFrames: 15,   // Frames of silence before considering end
        frameSize: 50,                  // ms per frame
    },

    // Push-to-Talk / Mute Settings
    pushToTalk: {
        enabled: true,
        holdToSpeak: false,             // false = toggle, true = hold
        muteWhileSpeaking: true,        // Mute mic when AI is speaking
        allowInterruption: false,       // Allow user to interrupt AI
    },

    // Confidence Threshold
    recognition: {
        minConfidence: 0.7,             // Minimum confidence to accept result
        interimConfidence: 0.5,         // Lower for interim results
    }
};

export const MUTE_MODES = {
    AUTO: 'auto',           // Auto-mute when AI speaks
    MANUAL: 'manual',       // User controls mute
    PUSH_TO_TALK: 'ptt',    // Hold/toggle to speak
};
