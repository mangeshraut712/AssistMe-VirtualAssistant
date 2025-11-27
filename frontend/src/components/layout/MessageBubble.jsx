import React, { useState } from 'react';
import {
    RefreshCw,
    Volume2,
    Copy,
    Share2,
    ThumbsUp,
    ThumbsDown,
    MoreHorizontal,
    ArrowRight,
    Check,
    StopCircle
} from 'lucide-react';

const MessageBubble = ({ message, renderContent, onRegenerate }) => {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSpeak = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(message.content);
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    if (isUser) {
        return (
            <div className="flex justify-end animate-in fade-in duration-200">
                <div className="max-w-[85%] px-5 py-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white border border-neutral-200 dark:border-neutral-700">
                    {message.content}
                </div>
            </div>
        );
    }

    // Use real data if available, otherwise hide or use smart defaults
    const latency = message.latency ? `${message.latency.toFixed(1)}s` : null;
    const sources = message.sources || [];
    const followUps = message.followUps || [];

    return (
        <div className="flex justify-start animate-in fade-in duration-200 w-full">
            <div className="w-full max-w-3xl space-y-4">
                {/* Main Content */}
                <div className="text-black dark:text-white leading-relaxed prose dark:prose-invert max-w-none">
                    {renderContent(message.content)}
                </div>

                {/* Action Bar - Only show if content exists */}
                {message.content && (
                    <div className="flex items-center flex-wrap gap-4 pt-2 border-t border-transparent">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onRegenerate}
                                className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                title="Regenerate"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                                onClick={handleSpeak}
                                className={`p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors ${isSpeaking ? 'text-blue-500' : 'text-neutral-400 hover:text-black dark:hover:text-white'}`}
                                title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
                            >
                                {isSpeaking ? <StopCircle className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                title="Copy"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Latency & Sources - Only show if available */}
                        {(latency || sources.length > 0) && (
                            <div className="flex items-center gap-3 ml-auto text-xs text-neutral-400 font-medium">
                                {latency && (
                                    <span className="flex items-center gap-1.5">
                                        {latency} Fast
                                    </span>
                                )}
                                {latency && sources.length > 0 && (
                                    <div className="h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                                )}
                                {sources.length > 0 && (
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-black dark:hover:text-white transition-colors">
                                        <div className="flex -space-x-1.5">
                                            {sources.map((source, idx) => (
                                                <img
                                                    key={idx}
                                                    src={source.icon || `https://www.google.com/s2/favicons?domain=${source.url}`}
                                                    alt={source.name}
                                                    className="w-4 h-4 rounded-full border border-white dark:border-black bg-white"
                                                />
                                            ))}
                                        </div>
                                        <span>{sources.length} sources</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Follow-up Questions - Only show if available */}
                {followUps.length > 0 && (
                    <div className="space-y-1 pt-2">
                        {followUps.map((question, idx) => (
                            <button
                                key={idx}
                                className="flex items-center gap-3 w-full p-2 text-left text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-xl transition-all group"
                            >
                                <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                                <span className="text-sm font-medium">{question}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(MessageBubble);
