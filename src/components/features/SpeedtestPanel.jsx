import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Settings, Share2, Server, Activity, Zap, Brain, RotateCcw } from 'lucide-react';

const SpeedtestPanel = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState('idle'); // idle, pinging, llm, complete
    const [progress, setProgress] = useState(0);
    const [displayValue, setDisplayValue] = useState(0);
    const [results, setResults] = useState(null);
    const [server, setServer] = useState('AssistMe Cloud (US-East)');

    // Animation refs
    const requestRef = useRef();
    const startTimeRef = useRef();

    // Reset state when opened
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

        const animate = (time) => {
            const timeFraction = (time - startTimeRef.current) / duration;
            const progress = Math.min(timeFraction, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            const currentVal = start + (end - start) * ease;
            setDisplayValue(currentVal);

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
    };

    const pingApi = async () => {
        const start = performance.now();
        try {
            await fetch(`/health?ts=${Date.now()}`);
            return performance.now() - start;
        } catch (e) {
            return 0;
        }
    };

    const testLlm = async () => {
        const start = performance.now();
        try {
            await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: 'ping' }],
                    model: 'meta-llama/llama-3.3-70b-instruct:free'
                })
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

        // Phase 1: API Latency (Simulate "Download" phase visually)
        const apiSamples = [];
        let currentAvg = 0;

        for (let i = 0; i < 20; i++) {
            const latency = await pingApi();
            apiSamples.push(latency);

            // Update UI
            currentAvg = apiSamples.reduce((a, b) => a + b, 0) / apiSamples.length;
            setDisplayValue(currentAvg);
            setProgress((i + 1) / 40 * 100); // First half of progress

            await new Promise(r => setTimeout(r, 50));
        }

        // Phase 2: LLM Response (Simulate "Upload" phase visually)
        setStatus('llm');
        const llmStart = performance.now();
        const llmLatency = await testLlm();

        // Animate to final LLM value
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

    return (
        <div className="fixed inset-0 bg-[#0b0d14] z-50 flex flex-col font-sans text-white overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 z-10">
                <div className="flex items-center gap-2">
                    <Activity className="h-6 w-6 text-cyan-400" />
                    <span className="font-bold text-xl tracking-tight">SPEEDTEST</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center relative">

                {/* Gauge Container */}
                <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">

                    {/* Background Circle */}
                    <svg className="absolute inset-0 w-full h-full rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="#1a1d26"
                            strokeWidth="1"
                        />
                        {/* Ticks */}
                        {Array.from({ length: 60 }).map((_, i) => (
                            <line
                                key={i}
                                x1="50" y1="5"
                                x2="50" y2="8"
                                transform={`rotate(${i * 6} 50 50)`}
                                stroke={i % 5 === 0 ? "#333" : "#222"}
                                strokeWidth="0.5"
                            />
                        ))}
                    </svg>

                    {/* Active Progress Arc */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="2"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#06b6d4" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Center Display */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {status === 'idle' ? (
                            <button
                                onClick={runTest}
                                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-cyan-500/30 bg-black/50 backdrop-blur-sm text-cyan-400 hover:text-white hover:border-cyan-400 hover:bg-cyan-500/10 transition-all duration-500 flex flex-col items-center justify-center group shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_-5px_rgba(6,182,212,0.5)]"
                            >
                                <span className="text-4xl md:text-5xl font-light group-hover:scale-110 transition-transform duration-300">GO</span>
                            </button>
                        ) : (
                            <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                <div className="text-6xl md:text-8xl font-bold tracking-tighter tabular-nums text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                    {Math.round(displayValue)}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm font-medium text-neutral-400 uppercase tracking-widest">
                                        {status === 'pinging' ? 'API Latency' : 'AI Response'}
                                    </span>
                                    <span className="text-sm font-bold text-cyan-400">ms</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Text */}
                <div className="h-8 mt-8">
                    {status === 'pinging' && (
                        <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                            <Activity className="h-4 w-4" />
                            <span className="text-sm font-medium">Measuring System Latency...</span>
                        </div>
                    )}
                    {status === 'llm' && (
                        <div className="flex items-center gap-2 text-violet-400 animate-pulse">
                            <Brain className="h-4 w-4" />
                            <span className="text-sm font-medium">Testing AI Model Response...</span>
                        </div>
                    )}
                </div>

            </main>

            {/* Footer Stats */}
            <footer className="bg-[#0f1119] border-t border-white/5 p-6 md:p-8">
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Server Info */}
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-neutral-800/50 text-neutral-400">
                            <Server className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Server</div>
                            <div className="text-sm text-cyan-400 font-medium flex items-center gap-2">
                                {server}
                                <Settings className="h-3 w-3 opacity-50 hover:opacity-100 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    {/* API Stats */}
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-neutral-800/50 text-neutral-400">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">API Latency</div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-xl font-bold text-white">
                                    {results ? results.api.avg : '-'} <span className="text-sm font-normal text-neutral-500">ms</span>
                                </span>
                                {results && (
                                    <span className="text-xs text-neutral-500">
                                        ±{results.api.jitter}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Stats */}
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-neutral-800/50 text-neutral-400">
                            <Brain className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">AI Response</div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-xl font-bold text-white">
                                    {results ? results.llm.latency : '-'} <span className="text-sm font-normal text-neutral-500">ms</span>
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </footer>
        </div>
    );
};

export default SpeedtestPanel;
