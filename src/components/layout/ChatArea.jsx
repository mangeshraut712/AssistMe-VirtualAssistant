/**
 * Enhanced ChatArea Component with Premium Homepage
 * Apple & Japanese design aesthetics - 2025 Edition
 * 
 * Features:
 * - Stunning animated hero section
 * - Floating orb visual effect
 * - Glassmorphic quick actions
 * - Time-based greeting
 * - Keyboard shortcuts display
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
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
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import InputArea from './InputArea';
import MessageBubble from './MessageBubble';

// Animation variants
const welcomeVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
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
        transition: {
            delay: i * 0.1,
            type: 'spring',
            stiffness: 300,
            damping: 25
        }
    }),
    hover: {
        y: -4,
        scale: 1.02,
        transition: { type: 'spring', stiffness: 400, damping: 20 }
    }
};

// Floating Orb Component
const FloatingOrb = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 150 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            mouseX.set((clientX - innerWidth / 2) * 0.1);
            mouseY.set((clientY - innerHeight / 2) * 0.1);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ x, y }}
        >
            <motion.div
                className={cn(
                    'w-[600px] h-[600px] rounded-full',
                    'bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/10',
                    'blur-[120px] opacity-60'
                )}
                animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 10, 0],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />
        </motion.div>
    );
};

// Get time-based greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    if (hour < 21) return { text: 'Good evening', emoji: '🌅' };
    return { text: 'Good night', emoji: '🌙' };
};

// Quick Action Card with glass effect
const QuickActionCard = ({ icon: Icon, title, description, onClick, index, gradient }) => (
    <motion.button
        onClick={onClick}
        className={cn(
            'group relative flex flex-col items-start gap-3 p-5 rounded-2xl text-left',
            'bg-card/50 backdrop-blur-sm',
            'border border-border/50 hover:border-primary/30',
            'shadow-sm hover:shadow-xl hover:shadow-primary/5',
            'transition-colors duration-300',
            'overflow-hidden'
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        custom={index}
    >
        {/* Gradient overlay on hover */}
        <motion.div
            className={cn(
                'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                gradient
            )}
        />

        <div className="relative z-10 flex items-start justify-between w-full">
            <div className={cn(
                'h-11 w-11 rounded-xl flex items-center justify-center',
                'bg-primary/10 group-hover:bg-primary/20',
                'border border-primary/20 group-hover:border-primary/30',
                'transition-all duration-300'
            )}>
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <motion.div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                initial={{ x: -10 }}
                whileHover={{ x: 0 }}
            >
                <ArrowRight className="h-4 w-4 text-primary" />
            </motion.div>
        </div>

        <div className="relative z-10 space-y-1">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                {title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
            </p>
        </div>
    </motion.button>
);

// Capability Pill
const CapabilityPill = ({ icon: Icon, label, index }) => (
    <motion.div
        className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full',
            'bg-muted/50 border border-border/50',
            'text-xs font-medium text-muted-foreground'
        )}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 + index * 0.05 }}
        whileHover={{ scale: 1.05, y: -2 }}
    >
        <Icon className="h-3.5 w-3.5" />
        {label}
    </motion.div>
);

// Typing indicator with better animation
const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3"
    >
        <div className={cn(
            'h-8 w-8 rounded-xl flex items-center justify-center',
            'bg-primary/10 shadow-sm'
        )}>
            <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-card border border-border/50">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="h-2.5 w-2.5 rounded-full bg-primary/50"
                    animate={{
                        y: [-3, 3, -3],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                    }}
                />
            ))}
        </div>
    </motion.div>
);

const ChatArea = ({ messages, isLoading, renderContent, showWelcome, quickActions, onQuickAction, inputProps }) => {
    const messagesEndRef = useRef(null);
    const [greeting] = useState(getGreeting());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Welcome Screen
    if (showWelcome) {
        const quickActionCards = [
            {
                icon: ImageIcon,
                title: 'Create an image',
                description: 'Generate stunning visuals with AI',
                action: { key: 'imageGen' },
                gradient: 'bg-gradient-to-br from-pink-500/10 to-transparent'
            },
            {
                icon: PenTool,
                title: 'Help me write',
                description: 'Essays, emails, stories & more',
                action: { text: 'Help me write...' },
                gradient: 'bg-gradient-to-br from-blue-500/10 to-transparent'
            },
            {
                icon: Code2,
                title: 'Write code',
                description: 'Debug, explain, or create code',
                action: { text: 'Write code for...' },
                gradient: 'bg-gradient-to-br from-green-500/10 to-transparent'
            },
            {
                icon: Lightbulb,
                title: 'Brainstorm ideas',
                description: 'Get creative suggestions',
                action: { text: 'I have an idea for...' },
                gradient: 'bg-gradient-to-br from-yellow-500/10 to-transparent'
            },
            {
                icon: Search,
                title: 'Research a topic',
                description: 'Deep dive into any subject',
                action: { text: 'Research about...' },
                gradient: 'bg-gradient-to-br from-purple-500/10 to-transparent'
            },
            {
                icon: FileText,
                title: 'Summarize content',
                description: 'Get key points quickly',
                action: { text: 'Summarize this:' },
                gradient: 'bg-gradient-to-br from-orange-500/10 to-transparent'
            }
        ];

        const capabilities = [
            { icon: Globe, label: 'Multilingual' },
            { icon: Mic, label: 'Voice Mode' },
            { icon: Zap, label: 'Fast Responses' },
            { icon: Sparkles, label: 'AI-Powered' }
        ];

        return (
            <div className="h-full flex flex-col bg-background relative overflow-hidden">
                {/* Floating Orb Background */}
                <FloatingOrb />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]" />

                {/* Main Content */}
                <motion.div
                    className="flex-1 flex flex-col justify-center px-6 sm:px-8 md:px-12 max-w-5xl mx-auto w-full pb-36 relative z-10"
                    variants={welcomeVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <div className="space-y-10">
                        {/* Greeting Badge */}
                        <motion.div variants={itemVariants}>
                            <div className={cn(
                                'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                                'bg-card/80 backdrop-blur-sm border border-border/50',
                                'text-sm font-medium shadow-sm'
                            )}>
                                <span>{greeting.emoji}</span>
                                <span className="text-muted-foreground">{greeting.text}</span>
                            </div>
                        </motion.div>

                        {/* Hero Headline */}
                        <motion.div variants={itemVariants} className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                                <span className="text-foreground">What can I help with</span>
                                <br />
                                <motion.span
                                    className={cn(
                                        'bg-gradient-to-r from-primary via-purple-500 to-pink-500',
                                        'bg-[length:200%_auto] bg-clip-text text-transparent'
                                    )}
                                    animate={{
                                        backgroundPosition: ['0%', '200%']
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: 'linear'
                                    }}
                                >
                                    today?
                                </motion.span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Your AI-powered assistant for creative writing, coding, research, and more.
                                Just ask anything.
                            </p>
                        </motion.div>

                        {/* Capability Pills */}
                        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
                            {capabilities.map((cap, index) => (
                                <CapabilityPill key={cap.label} {...cap} index={index} />
                            ))}
                        </motion.div>

                        {/* Quick Action Cards Grid */}
                        <motion.div variants={itemVariants}>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {quickActionCards.map((card, index) => (
                                    <QuickActionCard
                                        key={card.title}
                                        {...card}
                                        index={index}
                                        onClick={() => onQuickAction(card.action)}
                                    />
                                ))}
                            </div>
                        </motion.div>

                        {/* Keyboard Shortcut Hint */}
                        <motion.div
                            variants={itemVariants}
                            className="flex items-center gap-3 text-xs text-muted-foreground"
                        >
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 rounded bg-muted border border-border text-[10px] font-mono">⌘</kbd>
                                <span>+</span>
                                <kbd className="px-2 py-1 rounded bg-muted border border-border text-[10px] font-mono">K</kbd>
                            </div>
                            <span>to focus • Voice mode available</span>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Input Area */}
                <motion.div
                    className="flex-none pb-6 px-4 sm:px-6 md:px-8 relative z-20 safe-area-bottom"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                >
                    <div className="max-w-4xl mx-auto">
                        {inputProps && <InputArea {...inputProps} variant="hero" />}
                    </div>
                </motion.div>
            </div>
        );
    }

    // Chat Messages View
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-6 pt-20 pb-32">
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={msg.id || idx}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 30,
                                }}
                            >
                                <MessageBubble
                                    message={msg}
                                    renderContent={renderContent}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Loading Indicator */}
                    <AnimatePresence>
                        {isLoading && <TypingIndicator />}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area Fixed at Bottom */}
            <motion.div
                className={cn(
                    'flex-none pb-5 sm:pb-6 safe-area-bottom',
                    'bg-background/95 backdrop-blur-xl',
                    'border-t border-border/50'
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {inputProps && <InputArea {...inputProps} variant="docked" />}
            </motion.div>
        </div>
    );
};

export default ChatArea;
