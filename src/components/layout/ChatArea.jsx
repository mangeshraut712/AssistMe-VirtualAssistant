import React, { useRef, useEffect } from 'react';
import { MessageSquare, Code, Image as ImageIcon, PenTool, Lightbulb, Search, Video } from 'lucide-react';
import InputArea from './InputArea';
import MessageBubble from './MessageBubble';

const QuickActionPill = ({ icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-3 px-5 py-3 rounded-full bg-neutral-100 dark:bg-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all text-sm font-medium text-neutral-700 dark:text-neutral-200 active:scale-95 touch-manipulation w-max"
    >
        <Icon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        <span>{label}</span>
    </button>
);

const ChatArea = ({ messages, isLoading, renderContent, showWelcome, quickActions, onQuickAction, inputProps }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    if (showWelcome) {
        return (
            <div className="h-full flex flex-col bg-white dark:bg-black relative overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 max-w-4xl mx-auto w-full pb-20">
                    <div className="space-y-8">
                        {/* Greeting & Headline */}
                        <div className="space-y-2">
                            <h2 className="text-2xl font-medium text-neutral-500 dark:text-neutral-400">Hi Mangesh</h2>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
                                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                                    I'm ready to help you
                                </span>
                                <br />
                                plan, study, bring ideas to life & more.
                            </h1>
                        </div>

                        {/* Quick Action Pills */}
                        <div className="flex flex-col items-start gap-3 pt-4">
                            <QuickActionPill icon={ImageIcon} label="Create image" onClick={() => onQuickAction({ key: 'imageGen' })} />
                            <QuickActionPill icon={PenTool} label="Write anything" onClick={() => onQuickAction({ text: 'Help me write...' })} />
                            <QuickActionPill icon={Lightbulb} label="Build an idea" onClick={() => onQuickAction({ text: 'I have an idea for...' })} />
                            <QuickActionPill icon={Search} label="Deep Research" onClick={() => onQuickAction({ text: 'Research about...' })} />
                        </div>
                    </div>
                </div>

                {/* Input Area at Bottom */}
                <div className="flex-none pb-4 px-4 sm:px-6 md:px-8 relative z-10 safe-area-bottom">
                    <div className="max-w-4xl mx-auto">
                        {inputProps && <InputArea {...inputProps} variant="hero" />}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-black">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-6 pt-20 pb-28 sm:pb-32">
                    {messages.map((msg, idx) => (
                        <MessageBubble
                            key={idx}
                            message={msg}
                            renderContent={renderContent}
                        />
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="flex space-x-1.5 px-5 py-3.5">
                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area Fixed at Bottom */}
            <div className="flex-none bg-white dark:bg-black pb-5 sm:pb-6 safe-area-bottom border-t border-border/60">
                {inputProps && <InputArea {...inputProps} variant="docked" />}
            </div>
        </div>
    );
};

export default ChatArea;
