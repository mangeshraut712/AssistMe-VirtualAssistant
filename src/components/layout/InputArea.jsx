import React, { useState, useRef, useEffect } from 'react';
import {
    Paperclip,
    Send,
    ChevronDown,
    Mic,
    Square,
    Loader2,
    Sparkles,
    X,
    FileText,
    AudioLines
} from 'lucide-react';

const InputArea = ({
    input,
    setInput,
    isLoading,
    sendMessage,
    onFileUpload,
    onVoiceTranscription,
    onOpenVoiceMode,
    variant = 'docked',
    models = [],
    selectedModel,
    onModelChange
}) => {
    const [isListening, setIsListening] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const recognitionRef = useRef(null);
    const textareaRef = useRef(null);
    const silenceTimerRef = useRef(null);

    const isHero = variant === 'hero';

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            const resetSilenceTimer = () => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    if (recognitionRef.current) {
                        recognitionRef.current.stop();
                        setIsListening(false);
                    }
                }, 3000); // Stop after 3 seconds of silence
            };

            recognitionRef.current.onstart = () => {
                resetSilenceTimer();
            };

            recognitionRef.current.onresult = (event) => {
                resetSilenceTimer(); // Reset timer on speech input

                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        transcript += event.results[i][0].transcript + ' ';
                    }
                }
                if (transcript) {
                    setInput(prev => prev + transcript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };
        }
    }, [setInput]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.start();
                setIsListening(true);
            } else {
                alert('Speech recognition is not supported in this browser.');
            }
        }
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files || []);
        setUploadedFiles(prev => [...prev, ...files]);
        if (onFileUpload) {
            onFileUpload(files);
        }
    };

    const removeFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const containerClass = isHero
        ? 'w-full max-w-3xl mx-auto'
        : 'w-full max-w-3xl mx-auto px-2 pb-4';

    return (
        <div className={containerClass}>
            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 px-2">
                    {uploadedFiles.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700"
                        >
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="text-neutral-700 dark:text-neutral-200 font-medium truncate max-w-[150px]">
                                {file.name}
                            </span>
                            <button
                                onClick={() => removeFile(index)}
                                className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
                            >
                                <X className="h-3 w-3 text-neutral-500" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Input Shell - Gemini Style */}
            <div className="relative flex flex-col bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] p-5 shadow-sm border border-transparent focus-within:border-neutral-200 dark:focus-within:border-neutral-800 focus-within:bg-white dark:focus-within:bg-black transition-all duration-300">

                {/* Top Row: Text Input */}
                <div className="flex-1 min-h-[44px]">
                    <textarea
                        id="chat-input"
                        name="message"
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="Ask AssistMe"
                        className="w-full bg-transparent focus:outline-none resize-none text-lg text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-500 leading-relaxed"
                        disabled={isLoading}
                        rows={1}
                        style={{ minHeight: '44px', maxHeight: '200px' }}
                        autoComplete="off"
                    />
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex items-center justify-between mt-2">
                    {/* Left: File Upload */}
                    <div className="flex items-center gap-2">
                        <label className="p-2 rounded-full bg-neutral-200/50 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer active:scale-95 touch-manipulation">
                            <Paperclip className="h-4.5 w-4.5" />
                            <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".txt,.pdf,.doc,.docx,.md"
                            />
                        </label>

                        {/* Model Selector - Compact */}
                        {models.length > 0 && (
                            <div className="relative flex items-center">
                                <div className="absolute left-2.5 pointer-events-none">
                                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                                </div>
                                <select
                                    value={selectedModel}
                                    onChange={onModelChange}
                                    className="appearance-none bg-neutral-200/50 dark:bg-neutral-800 pl-8 pr-8 py-1.5 rounded-full text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer focus:outline-none max-w-[140px] truncate"
                                >
                                    <optgroup label="Free Models">
                                        {models.filter(m => m.free).map(m => (
                                            <option key={m.id} value={m.id} className="bg-white dark:bg-neutral-900">{m.name.replace(' (Free)', '').replace('Google: ', '').replace('Meta ', '').replace('NVIDIA ', '')}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Premium Models">
                                        {models.filter(m => !m.free).map(m => (
                                            <option key={m.id} value={m.id} className="bg-white dark:bg-neutral-900">{m.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500 pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Right: Voice & Send */}
                    <div className="flex items-center gap-2">
                        {/* Voice Mode */}
                        <button
                            onClick={onOpenVoiceMode}
                            disabled={isLoading}
                            className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors active:scale-95 touch-manipulation"
                            title="Advanced Voice Mode"
                        >
                            <AudioLines className="h-5 w-5" />
                        </button>

                        {/* Dictation - Always visible next to Voice Mode */}
                        <button
                            onClick={toggleListening}
                            disabled={isLoading}
                            className={`p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors active:scale-95 touch-manipulation ${isListening ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-neutral-600 dark:text-neutral-300'}`}
                            title={isListening ? "Stop Dictation" : "Start Dictation"}
                        >
                            <Mic className={`h-5 w-5 ${isListening ? 'fill-current' : ''}`} />
                        </button>

                        {/* Send Button - Always visible, disabled when empty */}
                        <button
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                            className={`h-9 w-9 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-sm touch-manipulation ${input.trim()
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputArea;
