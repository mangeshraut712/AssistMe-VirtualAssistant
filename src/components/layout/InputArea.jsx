/**
 * Enhanced InputArea Component with Framer Motion
 * Apple-style input with smooth animations and glass effect
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Paperclip,
    Send,
    ChevronDown,
    Mic,
    Loader2,
    Sparkles,
    X,
    FileText,
    AudioLines,
    ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// File chip animation variants
const fileChipVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
    },
    exit: {
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.15 }
    }
};

// Listening pulse animation
const pulseVariants = {
    listening: {
        scale: [1, 1.2, 1],
        transition: { duration: 1.5, repeat: Infinity }
    }
};

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
    const [isFocused, setIsFocused] = useState(false);
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
                }, 3000);
            };

            recognitionRef.current.onstart = () => resetSilenceTimer();

            recognitionRef.current.onresult = (event) => {
                resetSilenceTimer();
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

            recognitionRef.current.onerror = () => {
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };
        }
    }, [setInput]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

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

    const handleSubmit = () => {
        if (input.trim() || uploadedFiles.length > 0) {
            sendMessage();
            setUploadedFiles([]);
        }
    };

    return (
        <div className={cn(
            'w-full max-w-3xl mx-auto',
            isHero ? '' : 'px-2 pb-4'
        )}>
            {/* Uploaded Files Preview */}
            <AnimatePresence>
                {uploadedFiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 flex flex-wrap gap-2 px-2"
                    >
                        {uploadedFiles.map((file, index) => (
                            <motion.div
                                key={`${file.name}-${index}`}
                                variants={fileChipVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
                                    'bg-primary/10 border border-primary/20',
                                    'shadow-sm'
                                )}
                            >
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="font-medium truncate max-w-[150px]">
                                    {file.name}
                                </span>
                                <motion.button
                                    onClick={() => removeFile(index)}
                                    className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="h-3 w-3 text-primary" />
                                </motion.button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Input Shell - Apple/Gemini Style */}
            <motion.div
                className={cn(
                    'relative flex flex-col rounded-3xl p-4 transition-all duration-300',
                    'bg-card border shadow-lg',
                    isFocused
                        ? 'border-primary/30 shadow-xl shadow-primary/5 ring-2 ring-primary/10'
                        : 'border-border/50 hover:border-border'
                )}
                animate={{
                    scale: isFocused ? 1.01 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {/* Listening Indicator */}
                <AnimatePresence>
                    {isListening && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-medium shadow-lg"
                        >
                            <motion.div
                                className="h-2 w-2 rounded-full bg-white"
                                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                            Listening...
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Text Input */}
                <div className="flex-1 min-h-[44px]">
                    <textarea
                        id="chat-input"
                        name="message"
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Message AssistMe..."
                        className={cn(
                            'w-full bg-transparent focus:outline-none resize-none',
                            'text-base leading-relaxed',
                            'placeholder:text-muted-foreground/60'
                        )}
                        disabled={isLoading}
                        rows={1}
                        style={{ minHeight: '44px', maxHeight: '200px' }}
                        autoComplete="off"
                    />
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                    {/* Left: File Upload & Model Selector */}
                    <div className="flex items-center gap-2">
                        {/* File Upload */}
                        <motion.label
                            className={cn(
                                'p-2 rounded-xl cursor-pointer transition-colors',
                                'text-muted-foreground hover:text-foreground',
                                'hover:bg-foreground/5'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
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
                        </motion.label>

                        {/* Model Selector */}
                        {models.length > 0 && (
                            <div className="relative flex items-center">
                                <Sparkles className="absolute left-2.5 h-3.5 w-3.5 text-primary pointer-events-none" />
                                <select
                                    value={selectedModel}
                                    onChange={onModelChange}
                                    className={cn(
                                        'appearance-none bg-foreground/5 hover:bg-foreground/10',
                                        'pl-8 pr-7 py-1.5 rounded-xl',
                                        'text-xs font-medium transition-colors',
                                        'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20',
                                        'max-w-[140px] truncate'
                                    )}
                                >
                                    <optgroup label="Free Models">
                                        {models.filter(m => m.free).map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name.replace(' (Free)', '').replace('Google: ', '').replace('Meta ', '').replace('NVIDIA ', '')}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Premium Models">
                                        {models.filter(m => !m.free).map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <ChevronDown className="absolute right-2 h-3 w-3 text-muted-foreground pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Right: Voice & Send */}
                    <div className="flex items-center gap-1.5">
                        {/* Voice Mode */}
                        <motion.button
                            onClick={onOpenVoiceMode}
                            disabled={isLoading}
                            className={cn(
                                'p-2 rounded-xl transition-colors',
                                'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Advanced Voice Mode"
                        >
                            <AudioLines className="h-5 w-5" />
                        </motion.button>

                        {/* Dictation */}
                        <motion.button
                            onClick={toggleListening}
                            disabled={isLoading}
                            className={cn(
                                'p-2 rounded-xl transition-colors',
                                isListening
                                    ? 'text-red-500 bg-red-500/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
                            title={isListening ? 'Stop Dictation' : 'Start Dictation'}
                        >
                            <Mic className={cn('h-5 w-5', isListening && 'fill-current')} />
                        </motion.button>

                        {/* Send Button */}
                        <motion.button
                            onClick={handleSubmit}
                            disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                            className={cn(
                                'h-10 w-10 flex items-center justify-center rounded-xl transition-all',
                                input.trim() || uploadedFiles.length > 0
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                            )}
                            whileHover={input.trim() ? { scale: 1.05 } : {}}
                            whileTap={input.trim() ? { scale: 0.95 } : {}}
                        >
                            {isLoading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                    <Loader2 className="h-5 w-5" />
                                </motion.div>
                            ) : (
                                <ArrowUp className="h-5 w-5" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Hint Text */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-xs text-muted-foreground/60 mt-3"
            >
                Press <kbd className="px-1.5 py-0.5 rounded bg-foreground/5 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-foreground/5 font-mono text-[10px]">Shift + Enter</kbd> for new line
            </motion.p>
        </div>
    );
};

export default InputArea;
