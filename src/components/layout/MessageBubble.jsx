/**
 * Enhanced MessageBubble Component with Framer Motion
 * Apple & Japanese design aesthetics
 * 
 * Features:
 * - Smooth slide-in animations
 * - Interactive action buttons with hover effects
 * - Typing indicator animation
 * - Elegant metadata display
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCw,
    Volume2,
    Copy,
    ArrowRight,
    Check,
    StopCircle,
    Clock,
    Cpu,
    Zap,
    User,
    Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Animation variants
const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 30,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 },
    },
};

const actionButtonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.1 },
    tap: { scale: 0.9 },
};

// Action button component
const ActionButton = ({ onClick, icon: Icon, title, isActive, activeColor = 'text-primary' }) => (
    <motion.button
        onClick={onClick}
        className={cn(
            'p-1.5 rounded-lg transition-colors',
            isActive
                ? activeColor
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
        )}
        variants={actionButtonVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        title={title}
    >
        <Icon className="h-4 w-4" />
    </motion.button>
);

// Typing indicator component
const TypingIndicator = () => (
    <div className="flex items-center gap-1 py-2">
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-muted-foreground/50"
                animate={{ y: [-2, 2, -2] }}
                transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                }}
            />
        ))}
    </div>
);

// Metadata pill component
const MetadataPill = ({ icon: Icon, value, title }) => (
    <motion.span
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        title={title}
    >
        <Icon className="h-3 w-3" />
        <span className="text-[11px] font-medium">{value}</span>
    </motion.span>
);

const MessageBubble = ({ message, renderContent, onRegenerate, isLoading = false }) => {
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

    // User message
    if (isUser) {
        return (
            <motion.div
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                className="flex justify-end"
            >
                <motion.div
                    className={cn(
                        'max-w-[85%] px-4 py-3 rounded-2xl',
                        'bg-primary text-primary-foreground',
                        'shadow-lg shadow-primary/20'
                    )}
                    whileHover={{ scale: 1.01 }}
                >
                    <div className="flex items-start gap-2">
                        <div className="flex-1 text-[15px] leading-relaxed whitespace-pre-wrap">
                            {message.content}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    // Extract metadata
    const metadata = message.metadata || {};
    const latency = metadata.latency
        ? `${(metadata.latency / 1000).toFixed(2)}s`
        : message.latency
            ? `${message.latency.toFixed(1)}s`
            : null;
    const model = metadata.model || null;
    const tokens = metadata.usage?.total_tokens || null;
    const followUps = message.followUps || [];

    // Assistant message
    return (
        <motion.div
            variants={messageVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-start w-full"
        >
            <div className="w-full max-w-3xl space-y-3">
                {/* Avatar & Content */}
                <div className="flex gap-3">
                    {/* AI Avatar */}
                    <motion.div
                        className={cn(
                            'flex-shrink-0 h-8 w-8 rounded-xl',
                            'bg-gradient-to-br from-primary/20 to-primary/10',
                            'flex items-center justify-center',
                            'shadow-sm border border-primary/20'
                        )}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                        <Bot className="h-4 w-4 text-primary" />
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {isLoading ? (
                            <TypingIndicator />
                        ) : (
                            <div className="prose dark:prose-invert max-w-none text-foreground leading-relaxed">
                                {renderContent(message.content)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Bar */}
                {message.content && !isLoading && (
                    <motion.div
                        className="flex items-center flex-wrap gap-3 pl-11"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {/* Actions */}
                        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-foreground/[0.03]">
                            <ActionButton
                                onClick={onRegenerate}
                                icon={RefreshCw}
                                title="Regenerate"
                            />
                            <ActionButton
                                onClick={handleSpeak}
                                icon={isSpeaking ? StopCircle : Volume2}
                                title={isSpeaking ? 'Stop Speaking' : 'Read Aloud'}
                                isActive={isSpeaking}
                                activeColor="text-blue-500"
                            />
                            <ActionButton
                                onClick={handleCopy}
                                icon={copied ? Check : Copy}
                                title="Copy"
                                isActive={copied}
                                activeColor="text-green-500"
                            />
                        </div>

                        {/* Metadata */}
                        <AnimatePresence>
                            {(latency || model || tokens) && (
                                <motion.div
                                    className="flex items-center gap-2 ml-auto"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {model && (
                                        <MetadataPill
                                            icon={Cpu}
                                            value={model.split('/').pop()}
                                            title="Model"
                                        />
                                    )}
                                    {latency && (
                                        <MetadataPill
                                            icon={Clock}
                                            value={latency}
                                            title="Response Time"
                                        />
                                    )}
                                    {tokens && (
                                        <MetadataPill
                                            icon={Zap}
                                            value={`${tokens} tokens`}
                                            title="Total Tokens"
                                        />
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Follow-up Questions */}
                <AnimatePresence>
                    {followUps.length > 0 && (
                        <motion.div
                            className="space-y-1.5 pl-11 pt-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <p className="text-xs text-muted-foreground font-medium mb-2">
                                Related questions
                            </p>
                            {followUps.map((question, idx) => (
                                <motion.button
                                    key={idx}
                                    className={cn(
                                        'flex items-center gap-2 w-full p-2.5 text-left',
                                        'text-muted-foreground hover:text-foreground',
                                        'hover:bg-foreground/5 rounded-xl transition-all group'
                                    )}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ x: 4 }}
                                >
                                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                    <span className="text-sm font-medium">{question}</span>
                                </motion.button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default React.memo(MessageBubble);
