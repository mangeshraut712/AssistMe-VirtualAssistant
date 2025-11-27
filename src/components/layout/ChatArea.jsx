import React, { useRef, useEffect } from 'react';
import { MessageSquare, Code, Image as ImageIcon } from 'lucide-react';
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
            <div className="h-full flex flex-col bg-gradient-to-br from-white via-neutral-50/30 to-white dark:from-black dark:via-neutral-900/30 dark:to-black relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 dark:from-emerald-500/10 dark:to-cyan-500/10 rounded-full blur-3xl"></div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 lg:px-24 relative z-10">
                    <div className="w-full max-w-5xl space-y-10 text-center">
                        {/* Logo/Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-20"></div>
                                <img
                                    src="/assets/logo.png"
                                    alt="AssistMe"
                                    className="h-20 w-20 rounded-3xl shadow-2xl relative z-10 ring-4 ring-white/50 dark:ring-black/50"
                                />
                            </div>
                        </div>

                        {/* Greeting */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 tracking-wide uppercase">Welcome back</p>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900 dark:from-white dark:via-neutral-200 dark:to-white bg-clip-text text-transparent leading-tight">
                                How can I help you today?
                            </h1>
                            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                                Ask me anything, generate images, translate text, or explore powerful AI features.
                            </p>
                        </div>

                        {/* Feature Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-4">
                            <div className="group p-6 rounded-2xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-800/50 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <MessageSquare className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Smart Conversations</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">Chat with advanced AI models for any task</p>
                            </div>

                            <div className="group p-6 rounded-2xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-800/50 hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ImageIcon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Image Generation</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">Create stunning visuals with AI</p>
                            </div>

                            <div className="group p-6 rounded-2xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/50 dark:border-neutral-800/50 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Code className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Writing Tools</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">Polish, paraphrase, and perfect your text</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input Area at Bottom */}
                <div className="flex-none pb-6 px-8 md:px-16 lg:px-24 relative z-10">
                    <div className="max-w-5xl mx-auto">
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
