/**
 * Enhanced Speedtest Panel with Framer Motion
 * Modern performance testing with stunning animations
 * 
 * Features:
 * - Animated circular gauge
 * - Real-time value updates
 * - Glass morphism design
 * - Detailed statistics
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, Server, Activity, Zap, Brain, RotateCcw, Wifi, Clock, CheckCircle2 } from 'lucide-react';
import { createApiClient } from '../../lib/apiClient';
import { cn } from '@/lib/utils';

// Animation variants
const panelVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: { opacity: 0, scale: 0.95 }
};

const statVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }
    })
};

// Animated Number component
const AnimatedNumber = ({ value, suffix = '' }) => {
    const displayValue = useMotionValue(0);
    const rounded = useTransform(displayValue, (v) => Math.round(v));
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        const controls = animate(displayValue, value, {
            duration: 1,
            ease: 'easeOut',
        });
        return controls.stop;
    }, [value, displayValue]);

    useEffect(() => {
        const unsubscribe = rounded.on('change', (v) => setDisplay(v));
        return unsubscribe;
    }, [rounded]);

    return (
        <span className="tabular-nums">
            {display}
            {suffix && <span className="text-primary ml-1">{suffix}</span>}
        </span>
    );
};

// Stat Card component
const StatCard = ({ icon: Icon, label, value, unit, subValue, index, color = 'primary' }) => (
    <motion.div
        variants={statVariants}
        initial="hidden"
        animate="visible"
        custom={index}
        className={cn(
            'flex items-center gap-4 p-4 rounded-2xl',
            'bg-card border border-border/50',
            'hover:border-border transition-colors'
        )}
    >
        <div className={cn(
            'p-3 rounded-xl',
            color === 'primary' && 'bg-primary/10 text-primary',
            color === 'green' && 'bg-green-500/10 text-green-500',
            color === 'purple' && 'bg-purple-500/10 text-purple-500'
        )}>
            <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {label}
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                    {value !== null ? <AnimatedNumber value={value} /> : '–'}
                </span>
                <span className="text-sm text-muted-foreground">{unit}</span>
                {subValue && (
                    <span className="text-xs text-muted-foreground ml-auto">
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    </motion.div>
);

const SpeedtestPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [displayValue, setDisplayValue] = useState(0);
    const [results, setResults] = useState(null);
    const [server] = useState('AssistMe Cloud (US-East)');

    const requestRef = useRef();
    const startTimeRef = useRef();

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setProgress(0);
            setDisplayValue(0);
            setResults(null);
        }
    }, [isOpen]);

    const animateValue = (start, end, duration) => {
        startTimeRef.current = performance.now();

        const animateFrame = (time) => {
            const timeFraction = (time - startTimeRef.current) / duration;
            const progressVal = Math.min(timeFraction, 1);
            const ease = 1 - Math.pow(1 - progressVal, 4);
            const currentVal = start + (end - start) * ease;
            setDisplayValue(currentVal);

            if (progressVal < 1) {
                requestRef.current = requestAnimationFrame(animateFrame);
            }
        };

        requestRef.current = requestAnimationFrame(animateFrame);
    };

    const pingApi = async () => {
        const start = performance.now();
        try {
            const base = String(backendUrl || '').replace(/\/+$/, '');
            const url = base ? `${base}/health?ts=${Date.now()}` : `/health?ts=${Date.now()}`;
            await fetch(url);
            return performance.now() - start;
        } catch (e) {
            return 0;
        }
    };

    const testLlm = async () => {
        const start = performance.now();
        try {
            const api = createApiClient({ baseUrl: backendUrl });
            await api.chatText({
                messages: [{ role: 'user', content: 'ping' }],
                model: 'meta-llama/llama-3.3-70b-instruct:free'
            });
            return performance.now() - start;
        } catch (e) {
            return 0;
        }
    };

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;

        setStatus('pinging');
        setProgress(0);
        setResults(null);

        const apiSamples = [];
        let currentAvg = 0;

        // Phase 1: API Latency
        for (let i = 0; i < 20; i++) {
            const latency = await pingApi();
            apiSamples.push(latency);
            currentAvg = apiSamples.reduce((a, b) => a + b, 0) / apiSamples.length;
            setDisplayValue(currentAvg);
            setProgress((i + 1) / 40 * 100);
            await new Promise(r => setTimeout(r, 50));
        }

        // Phase 2: LLM Response
        setStatus('llm');
        const llmLatency = await testLlm();
        animateValue(currentAvg, llmLatency, 1000);
        setProgress(100);

        setTimeout(() => {
            setStatus('complete');
            setResults({
                api: {
                    avg: Math.round(apiSamples.reduce((a, b) => a + b, 0) / apiSamples.length),
                    min: Math.min(...apiSamples).toFixed(0),
                    max: Math.max(...apiSamples).toFixed(0),
                    jitter: Math.round(Math.sqrt(apiSamples.reduce((s, v) => s + Math.pow(v - currentAvg, 2), 0) / apiSamples.length))
                },
                llm: {
                    latency: Math.round(llmLatency)
                }
            });
        }, 1000);
    };

    if (!isOpen) return null;

    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference * (1 - progress / 100);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden"
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary),0.1),transparent_50%)]" />

                {/* Header */}
                <motion.header
                    className={cn(
                        'flex items-center justify-between px-6 py-4 z-10',
                        'border-b border-border bg-background/90 backdrop-blur-xl'
                    )}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Activity className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight">Speedtest</h1>
                            <p className="text-xs text-muted-foreground">AI Performance Benchmark</p>
                        </div>
                    </div>
                    <motion.button
                        onClick={onClose}
                        className="p-2.5 hover:bg-muted rounded-xl transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <X className="h-5 w-5" />
                    </motion.button>
                </motion.header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center relative px-4">
                    {/* Gauge Container */}
                    <motion.div
                        className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                    >
                        {/* Background Ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                className="text-border"
                            />
                            {/* Tick marks */}
                            {Array.from({ length: 60 }).map((_, i) => (
                                <motion.line
                                    key={i}
                                    x1="50" y1="6"
                                    x2="50" y2={i % 5 === 0 ? "10" : "8"}
                                    transform={`rotate(${i * 6} 50 50)`}
                                    stroke="currentColor"
                                    strokeWidth={i % 5 === 0 ? "0.6" : "0.3"}
                                    className={i % 5 === 0 ? "text-muted-foreground" : "text-border"}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.01 }}
                                />
                            ))}
                        </svg>

                        {/* Progress Arc */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <motion.circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke="url(#speedGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-300"
                            />
                            <defs>
                                <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Glow Effect */}
                        {(status === 'pinging' || status === 'llm') && (
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    boxShadow: '0 0 60px 20px rgba(var(--primary), 0.15)'
                                }}
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        )}

                        {/* Center Display */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                {status === 'idle' ? (
                                    <motion.button
                                        key="go"
                                        onClick={runTest}
                                        className={cn(
                                            'w-36 h-36 md:w-44 md:h-44 rounded-full',
                                            'bg-card border-2 border-primary/30',
                                            'hover:border-primary hover:bg-primary/5',
                                            'transition-all duration-300',
                                            'flex flex-col items-center justify-center',
                                            'shadow-2xl shadow-primary/10',
                                            'group'
                                        )}
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <motion.span
                                            className="text-5xl md:text-6xl font-light text-primary"
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            GO
                                        </motion.span>
                                        <span className="text-xs text-muted-foreground mt-1">Tap to start</span>
                                    </motion.button>
                                ) : status === 'complete' ? (
                                    <motion.div
                                        key="complete"
                                        className="flex flex-col items-center"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                    >
                                        <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                                        <span className="text-lg font-medium text-green-500">Complete</span>
                                        <motion.button
                                            onClick={runTest}
                                            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Test Again
                                        </motion.button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="running"
                                        className="flex flex-col items-center"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                    >
                                        <div className="text-6xl md:text-8xl font-bold tracking-tighter tabular-nums">
                                            {Math.round(displayValue)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                                                {status === 'pinging' ? 'API Latency' : 'AI Response'}
                                            </span>
                                            <span className="text-sm font-bold text-primary">ms</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Status Text */}
                    <div className="h-10 mt-6">
                        <AnimatePresence mode="wait">
                            {status === 'pinging' && (
                                <motion.div
                                    key="pinging"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 text-primary"
                                >
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                        <Wifi className="h-4 w-4" />
                                    </motion.div>
                                    <span className="text-sm font-medium">Measuring API Latency...</span>
                                </motion.div>
                            )}
                            {status === 'llm' && (
                                <motion.div
                                    key="llm"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 text-purple-500"
                                >
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                                        <Brain className="h-4 w-4" />
                                    </motion.div>
                                    <span className="text-sm font-medium">Testing AI Model Response...</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>

                {/* Footer Stats */}
                <motion.footer
                    className="bg-card/50 backdrop-blur-xl border-t border-border p-6 md:p-8"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            icon={Server}
                            label="Server"
                            value={null}
                            unit=""
                            index={0}
                            color="primary"
                        />
                        <StatCard
                            icon={Zap}
                            label="API Latency"
                            value={results?.api?.avg ?? null}
                            unit="ms"
                            subValue={results ? `±${results.api.jitter}` : null}
                            index={1}
                            color="green"
                        />
                        <StatCard
                            icon={Brain}
                            label="AI Response"
                            value={results?.llm?.latency ?? null}
                            unit="ms"
                            index={2}
                            color="purple"
                        />
                    </div>
                    <div className="text-center mt-4 text-xs text-muted-foreground">
                        Server: {server}
                    </div>
                </motion.footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
