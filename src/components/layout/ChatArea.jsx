import React, { useRef, useEffect } from 'react';
import InputArea from './InputArea';
import MessageBubble from './MessageBubble';

const QuickActionPill = ({ icon: Icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-800/90 dark:bg-neutral-800/90 hover:bg-neutral-700/90 dark:hover:bg-neutral-700/90 backdrop-blur-sm transition-all text-sm font-medium text-white border border-white/10"
    >
        <Icon className="h-4 w-4" />
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
            <div className="h-full flex flex-col items-center justify-center px-4 md:px-6 bg-white dark:bg-black">
                <div className="w-full max-w-2xl space-y-12">
                    {/* Greeting */}
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Hi there,</p>
                        <h1 className="text-4xl md:text-5xl font-normal text-black dark:text-white">
                            Where should we start?
                        </h1>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2.5">
                        {quickActions.map((action, idx) => (
                            <QuickActionPill
                                key={idx}
                                icon={action.icon}
                                label={action.label}
                                onClick={() => onQuickAction(action)}
                            />
                        ))}
                    </div>

                    {/* Input Area at Bottom */}
                    <div className="fixed bottom-6 left-0 right-0 md:left-64 p-4 md:p-6 bg-white dark:bg-black">
                        {inputProps && <InputArea {...inputProps} variant="hero" />}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-black">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-6 pt-20 pb-32">
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
            <div className="flex-none bg-white dark:bg-black pb-6">
                {inputProps && <InputArea {...inputProps} variant="docked" />}
            </div>
        </div>
    );
};

export default ChatArea;
