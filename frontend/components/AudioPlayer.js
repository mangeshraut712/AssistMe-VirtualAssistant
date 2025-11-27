/**
 * Simple audio player for base64 audio strings.
 */
export default class AudioPlayer {
    constructor() {
        this.audio = new Audio();
    }

    playBase64(base64, format = 'mp3') {
        if (!base64) return;
        this.audio.src = `data:audio/${format};base64,${base64}`;
        this.audio.play().catch((err) => console.error('Audio playback failed', err));
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
    }
}
