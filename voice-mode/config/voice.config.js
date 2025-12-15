/**
 * Voice Configuration
 * Gemini voice models, languages, and voice profiles
 */

export const VOICE_MODELS = [
    { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Native Audio', short: '2.5 Native' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', short: '2.5 Flash' },
    { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', short: '2.5 Lite' },
    { id: 'google/gemini-2.0-flash-001:free', name: 'Gemini 2.0 Flash (Free)', short: '2.0 Free' },
    { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', short: '2.0 Lite' },
];

export const LANGUAGES = [
    { code: 'en', name: 'English', voiceLang: 'en-US' },
    { code: 'hi', name: 'हिंदी', voiceLang: 'hi-IN' },
    { code: 'es', name: 'Español', voiceLang: 'es-ES' },
    { code: 'fr', name: 'Français', voiceLang: 'fr-FR' },
    { code: 'de', name: 'Deutsch', voiceLang: 'de-DE' },
    { code: 'ja', name: '日本語', voiceLang: 'ja-JP' },
    { code: 'ko', name: '한국어', voiceLang: 'ko-KR' },
    { code: 'zh', name: '中文', voiceLang: 'zh-CN' },
];

export const VOICE_PROFILES = {
    Aoede: {
        gender: 'Female',
        tone: 'Warm, Clear',
        style: 'Professional, Friendly',
        useCases: ['Customer Support', 'Education', 'General Assistant'],
    },
    Charon: {
        gender: 'Male',
        tone: 'Deep, Authoritative',
        style: 'Serious, Educational',
        useCases: ['News', 'Documentation', 'Formal'],
    },
    Fenrir: {
        gender: 'Unisex',
        tone: 'Dynamic, Expressive',
        style: 'Creative, Storytelling',
        useCases: ['Entertainment', 'Podcasts', 'Creative'],
    },
    Kore: {
        gender: 'Female',
        tone: 'Smooth, Professional',
        style: 'Business, Presentations',
        useCases: ['Business', 'Presentations', 'Corporate'],
    },
    Puck: {
        gender: 'Male',
        tone: 'Playful, Energetic',
        style: 'Casual, Fun',
        useCases: ['Gaming', 'Social', 'Casual'],
    },
};
