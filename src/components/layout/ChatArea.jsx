/**
 * ChatArea Component - ChatGPT-Style Layout
 * 
 * Layout Structure:
 * - Fixed Header (handled by parent)
 * - Scrollable Messages (with proper top padding)
 * - Fixed Input Box (ALWAYS visible at bottom)
 * - Scroll to Bottom Button
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Image as ImageIcon,
    PenTool,
    Lightbulb,
    Search,
    Sparkles,
    Bot,
    Mic,
    Code2,
    FileText,
    Globe,
    Zap,
    ArrowRight,
    ArrowDown,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import InputArea from './InputArea';
import MessageBubble from './MessageBubble';

// Animation variants
const welcomeVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }
    }),
    hover: {
        y: -4,
        scale: 1.02,
        transition: { type: 'spring', stiffness: 400, damping: 20 }
    }
};

// Floating Orb
const FloatingOrb = () => (
    <motion.div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <motion.div
            className="w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/10 blur-[120px] opacity-60"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
    </motion.div>
);

// Greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    if (hour < 21) return { text: 'Good evening', emoji: '🌅' };
    return { text: 'Good night', emoji: '🌙' };
};

// Quick Action Card - Compact
const QuickActionCard = ({ icon: Icon, title, description, onClick, index, gradient }) => (
    <motion.button
        onClick={onClick}
        className={cn(
            'group relative flex flex-col items-start gap-2 p-3 rounded-xl text-left',
            'bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30',
            'hover:shadow-md hover:shadow-primary/5 transition-all duration-200 overflow-hidden'
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        custom={index}
    >
        <motion.div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300', gradient)} />
        <div className="relative z-10 flex items-center gap-2 w-full">
            <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center',
                'bg-primary/10 group-hover:bg-primary/20 transition-colors'
            )}>
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">{title}</h3>
                <p className="text-[11px] text-muted-foreground truncate">{description}</p>
            </div>
        </div>
    </motion.button>
);

// Capability Pill
const CapabilityPill = ({ icon: Icon, label, index }) => (
    <motion.div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs font-medium text-muted-foreground"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 + index * 0.05 }}
        whileHover={{ scale: 1.05, y: -2 }}
    >
        <Icon className="h-3.5 w-3.5" />
        {label}
    </motion.div>
);

// Typing Indicator
const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3"
    >
        <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-primary/10 shadow-sm">
            <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-card border border-border/50">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="h-2.5 w-2.5 rounded-full bg-primary/50"
                    animate={{ y: [-3, 3, -3], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
            ))}
        </div>
    </motion.div>
);

// Scroll to Bottom Button - Centered above input
const ScrollToBottomButton = ({ onClick, show }) => (
    <AnimatePresence>
        {show && (
            <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={onClick}
                className={cn(
                    'absolute bottom-4 left-1/2 -translate-x-1/2 z-20',
                    'w-8 h-8 rounded-full',
                    'bg-background/90 backdrop-blur-sm border border-border shadow-md',
                    'flex items-center justify-center',
                    'hover:bg-muted transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary'
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.button>
        )}
    </AnimatePresence>
);

const ChatArea = ({ messages, isLoading, renderContent, showWelcome, onQuickAction, inputProps }) => {
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [greeting] = useState(getGreeting());
    const [showScrollButton, setShowScrollButton] = useState(false);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    // Show/hide scroll to bottom button
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        setShowScrollButton(!isNearBottom && messages.length > 0);
    }, [messages.length]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // Welcome Screen (Homepage)
    if (showWelcome) {
        const quickActionCards = [
            { icon: ImageIcon, title: 'Create an image', description: 'Generate stunning visuals with AI', action: { key: 'imageGen' }, gradient: 'bg-gradient-to-br from-pink-500/10 to-transparent' },
            { icon: PenTool, title: 'Help me write', description: 'Essays, emails, stories & more', action: { text: 'Help me write...' }, gradient: 'bg-gradient-to-br from-blue-500/10 to-transparent' },
            { icon: Code2, title: 'Write code', description: 'Debug, explain, or create code', action: { text: 'Write code for...' }, gradient: 'bg-gradient-to-br from-green-500/10 to-transparent' },
            { icon: Lightbulb, title: 'Brainstorm ideas', description: 'Get creative suggestions', action: { text: 'I have an idea for...' }, gradient: 'bg-gradient-to-br from-yellow-500/10 to-transparent' },
            { icon: Search, title: 'Research a topic', description: 'Deep dive into any subject', action: { text: 'Research about...' }, gradient: 'bg-gradient-to-br from-purple-500/10 to-transparent' },
            { icon: FileText, title: 'Summarize content', description: 'Get key points quickly', action: { text: 'Summarize this:' }, gradient: 'bg-gradient-to-br from-orange-500/10 to-transparent' }
        ];

        const capabilities = [
            { icon: Globe, label: 'Multilingual' },
            { icon: Mic, label: 'Voice Mode' },
            { icon: Zap, label: 'Fast Responses' },
            { icon: Sparkles, label: 'AI-Powered' }
        ];

        return (
            <div className="h-full flex flex-col bg-background relative overflow-hidden">
                <FloatingOrb />

                {/* Main Content - Centered vertically */}
                <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 max-w-3xl mx-auto w-full relative z-10">
                    <div className="space-y-4 sm:space-y-5">
                        {/* Greeting Badge */}
                        <motion.div variants={itemVariants} initial="hidden" animate="visible">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-xs font-medium">
                                <span>{greeting.emoji}</span>
                                <span className="text-muted-foreground">{greeting.text}</span>
                            </div>
                        </motion.div>

                        {/* Headline - Compact */}
                        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="space-y-2">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                                <span className="text-foreground">What can I help with </span>
                                <motion.span
                                    className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-[length:200%_auto] bg-clip-text text-transparent"
                                    animate={{ backgroundPosition: ['0%', '200%'] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                >
                                    today?
                                </motion.span>
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Your AI assistant for writing, coding, research, and more.
                            </p>
                        </motion.div>

                        {/* Capability Pills - Inline */}
                        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-1.5">
                            {capabilities.map((cap, index) => (
                                <CapabilityPill key={cap.label} {...cap} index={index} />
                            ))}
                        </motion.div>

                        {/* Quick Action Cards - Compact Grid */}
                        <motion.div variants={itemVariants} initial="hidden" animate="visible">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {quickActionCards.map((card, index) => (
                                    <QuickActionCard key={card.title} {...card} index={index} onClick={() => onQuickAction(card.action)} />
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Fixed Input - Compact */}
                <div className="flex-shrink-0 border-t border-border/40 bg-background px-4 sm:px-6 py-3 safe-area-bottom">
                    <div className="max-w-3xl mx-auto">
                        {inputProps && <InputArea {...inputProps} variant="hero" />}
                    </div>
                </div>
            </div>
        );
    }

    // ========================================
    // CHAT MESSAGES VIEW
    // ========================================
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Scrollable Messages Area - relative for button positioning */}
            <div className="flex-1 min-h-0 relative">
                <div
                    ref={scrollContainerRef}
                    className="h-full overflow-y-auto overscroll-contain scroll-smooth"
                >
                    {/* TOP PADDING - Ensures messages don't touch header */}
                    <div className="h-4 sm:h-6" />

                    {/* Messages Container */}
                    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6">
                        {/* Messages */}
                        <div className="space-y-4 pb-4">
                            <AnimatePresence mode="popLayout">
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={msg.id || idx}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    >
                                        <MessageBubble message={msg} renderContent={renderContent} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {isLoading && <TypingIndicator />}
                        </div>

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                </div>

                {/* Scroll to Bottom Button - Centered above input */}
                <ScrollToBottomButton onClick={scrollToBottom} show={showScrollButton} />
            </div>

            {/* FIXED INPUT AREA - Compact like ChatGPT */}
            <div className={cn(
                'flex-shrink-0',
                'border-t border-border/40',
                'bg-background',
                'px-4 sm:px-6 py-3',
                'safe-area-bottom'
            )}>
                <div className="max-w-3xl mx-auto">
                    {inputProps && <InputArea {...inputProps} variant="docked" />}
                </div>
            </div>
        </div>
    );
};

export default ChatArea;
