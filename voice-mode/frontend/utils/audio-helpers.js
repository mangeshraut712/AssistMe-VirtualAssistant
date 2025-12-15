/**
 * Audio Utilities
 * Helper functions for voice processing
 */

/**
 * Trigger haptic feedback (mobile devices)
 */
export const triggerHaptic = (pattern = [10]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

/**
 * Count words in text
 */
export const countWords = (text) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Estimate tokens (~1.33 words per token)
 */
export const estimateTokens = (text) => {
    return Math.ceil(countWords(text) * 1.33);
};

/**
 * Format duration (seconds to MM:SS)
 */
export const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Decode base64 to ArrayBuffer
 */
export const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Create audio blob from base64
 */
export const createAudioBlob = (base64Audio, mimeType = 'audio/mp3') => {
    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    return new Blob([arrayBuffer], { type: mimeType });
};

/**
 * Play audio from base64
 */
export const playAudioFromBase64 = async (base64Audio, onEnded, onError) => {
    try {
        const audioBlob = createAudioBlob(base64Audio);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (onEnded) onEnded();
        };

        audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl);
            if (onError) onError(e);
        };

        await audio.play();
        return audio;
    } catch (error) {
        if (onError) onError(error);
        throw error;
    }
};
