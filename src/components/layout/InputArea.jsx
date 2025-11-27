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
        ? 'w-full max-w-3xl mx-auto px-3 sm:px-4'
        : 'w-full px-3 sm:px-4 pb-4 sm:pb-5 md:pb-6 pt-4';

    return (
        <div className={containerClass}>
            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-sm"
                        >
                            <FileText className="h-4 w-4 text-blue-400" />
                            <span className="text-white font-medium truncate max-w-[150px]">
                                {file.name}
                            </span>
                            <button
                                onClick={() => removeFile(index)}
                                className="p-0.5 hover:bg-neutral-700 rounded-full transition-colors"
                            >
                                <X className="h-3 w-3 text-neutral-400" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Input Shell */}
            <div className="relative flex flex-col gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition-all">



                {/* Main Input Row */}
                <div className="flex items-end gap-2 px-4 pb-3 pt-2">
                    {/* File Upload Button */}
                    <label className="p-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex-shrink-0">
                        <Paperclip className="h-5 w-5" />
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

                    {/* Text Input */}
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
                        placeholder="Ask me anything..."
                        className="flex-1 bg-transparent focus:outline-none resize-none text-sm md:text-base placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-black dark:text-white py-2 min-w-0"
                        disabled={isLoading}
                        rows={1}
                        style={{ minHeight: '24px', maxHeight: '140px' }}
                        autoComplete="off"
                    />

                    {/* Model Selector */}
                    {models.length > 0 && (
                        <div className="hidden md:flex items-center gap-1.5 px-2 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex-shrink-0 mb-0.5">
                            <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            <select
                                value={selectedModel}
                                onChange={onModelChange}
                                className="bg-transparent focus:outline-none text-xs font-medium appearance-none pr-4 text-black dark:text-white cursor-pointer max-w-[120px] truncate"
                                title="Select AI Model"
                            >
                                <optgroup label="Free Models">
                                    {models.filter(m => m.free).map(m => (
                                        <option key={m.id} value={m.id} className="bg-white dark:bg-neutral-900">{m.name.replace(' (Free)', '')}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Premium Models">
                                    {models.filter(m => !m.free).map(m => (
                                        <option key={m.id} value={m.id} className="bg-white dark:bg-neutral-900">{m.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <ChevronDown className="h-3 w-3 text-neutral-500 dark:text-neutral-400 pointer-events-none -ml-3" />
                        </div>
                    )}

                    {/* Advanced Voice Mode Button */}
                    <button
                        onClick={onOpenVoiceMode}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex-shrink-0"
                        title="Advanced Voice Mode"
                    >
                        <AudioLines className="h-5 w-5" />
                    </button>

                    {/* Voice Button - Simplified Dictation */}
                    <button
                        onClick={toggleListening}
                        disabled={isLoading}
                        className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${isListening
                            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 animate-pulse'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                        title={isListening ? "Stop Dictation" : "Start Dictation"}
                    >
                        <Mic className={`h-5 w-5 ${isListening ? 'fill-current' : ''}`} />
                    </button>

                    {/* Send Button */}
                    <button
                        onClick={() => sendMessage()}
                        disabled={isLoading || !input.trim()}
                        className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg flex-shrink-0"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Footer Text */}
            <p className={`text-center mt-3 text-xs text-neutral-500 dark:text-neutral-500 font-medium ${isHero ? 'opacity-70' : ''}`}>
                AI can make mistakes. Verify important information.
            </p>
        </div>
    );
};

export default InputArea;
