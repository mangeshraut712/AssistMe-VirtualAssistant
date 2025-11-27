/**
 * Voice Recorder Component
 * Handles audio recording and transcription
 */
export default class VoiceRecorder {
    constructor(apiBaseUrl) {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.apiBaseUrl = apiBaseUrl || '';
    }

    /**
     * Start recording audio
     * @returns {Promise<boolean>} Success status
     */
    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            return false;
        }
    }

    /**
     * Stop recording and return audio blob
     * @returns {Promise<Blob|null>} Audio blob
     */
    async stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.isRecording = false;
                this.audioChunks = [];

                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Transcribe audio blob
     * @param {Blob} audioBlob 
     * @param {string} [language] Optional language code
     * @returns {Promise<string>} Transcribed text
     */
    async transcribe(audioBlob, language = null) {
        if (!audioBlob) return '';

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        if (language) {
            formData.append('language', language);
        }

        try {
            // Use window.API_BASE_URL if defined (from script.js context usually)
            // But here we are in a module. We should rely on relative path or global config.
            // Assuming relative path works or proxy is set up.
            // If running on different port, we need the base URL.
            // script.js sets window.ASSISTME_API_BASE.

            const url = `${this.apiBaseUrl}/api/speech/transcribe`;

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
            }

            const result = await response.json();
            return result.text;
        } catch (error) {
            console.error('Transcription error:', error);
            throw error;
        }
    }

    /**
     * Transcribe audio blob via WebSocket streaming (sends blob then 'end').
     * @param {Blob} audioBlob
     * @returns {Promise<string>}
     */
    async transcribeStreaming(audioBlob) {
        if (!audioBlob) return '';
        const wsUrl = this.apiBaseUrl.replace(/^http/, 'ws') + '/api/speech/transcribe-stream';

        return new Promise((resolve, reject) => {
            let resolved = false;
            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';

            ws.onopen = async () => {
                try {
                    const buffer = await audioBlob.arrayBuffer();
                    ws.send(buffer);
                    ws.send('end');
                } catch (err) {
                    ws.close();
                    reject(err);
                }
            };

            ws.onmessage = (event) => {
                resolved = true;
                try {
                    const data = JSON.parse(event.data);
                    if (data?.success && data.text) {
                        resolve(data.text);
                    } else {
                        reject(new Error(data?.error || 'Transcription failed'));
                    }
                } catch (err) {
                    reject(err);
                } finally {
                    ws.close();
                }
            };

            ws.onerror = (err) => {
                if (!resolved) reject(err);
            };

            ws.onclose = () => {
                if (!resolved) {
                    reject(new Error('WebSocket closed before transcription'));
                }
            };
        });
    }

    /**
     * Detect language from audio blob
     * @param {Blob} audioBlob
     * @returns {Promise<string>} Detected language code
     */
    async detectLanguage(audioBlob) {
        if (!audioBlob) return 'en';

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');

        try {
            const url = `${this.apiBaseUrl}/api/speech/detect-language`;

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Language detection failed: ${response.statusText}`);
            }

            const result = await response.json();
            return result.language;
        } catch (error) {
            console.error('Language detection error:', error);
            return 'en'; // Default
        }
    }
}
