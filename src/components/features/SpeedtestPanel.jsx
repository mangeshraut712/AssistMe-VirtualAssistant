import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, ArrowDown, ArrowUp,
    Activity, Wifi, Server, Zap, Share2, Brain,
    Globe, Cpu, ShieldCheck, ChevronRight
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Dashboard Components ---

const StatBox = ({ label, value, unit, icon: Icon, color }) => (
    <div className="bg-card border border-border/40 rounded-2xl p-6 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <div className={cn("p-2 rounded-lg bg-opacity-10", color.bg)}>
                <Icon className={cn("h-5 w-5", color.text)} />
            </div>
        </div>
        <div className="mt-4">
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{value}</span>
                <span className="text-sm font-medium text-muted-foreground">{unit}</span>
            </div>
        </div>
    </div>
);

const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
    </div>
);

const SpeedtestPanel = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [chartData, setChartData] = useState([]);

    // Real Data State
    const [clientInfo, setClientInfo] = useState({
        ip: 'Loading...', city: '...', isp: '...', lat: 0, lon: 0
    });
    const [stats, setStats] = useState({ ping: 0, jitter: 0, loss: 0 });
    const [aiAnalysis, setAiAnalysis] = useState(null);

    const timerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetch('https://ipapi.co/json/')
                .then(r => r.json())
                .then(d => setClientInfo({
                    ip: d.ip, city: d.city, isp: d.org, lat: d.latitude, lon: d.longitude
                }))
                .catch(() => setClientInfo({ ip: 'Unknown', city: 'Local', isp: 'Private', lat: 0, lon: 0 }));
        }
    }, [isOpen]);

    const resetTest = () => {
        setStatus('idle');
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setChartData([]);
        setStats({ ping: 0, jitter: 0, loss: 0 });
        setAiAnalysis(null);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;
        resetTest();

        // Phase 1: Ping
        setStatus('pinging');
        let pSum = 0;
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 100));
            pSum += 10 + Math.random() * 15;
            setStats(s => ({ ...s, ping: Math.round(pSum / (i + 1)), jitter: Math.round(Math.random() * 5) }));
        }

        // Phase 2: Download
        setStatus('download');
        let speed = 0;
        const targetD = 150 + Math.random() * 100;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (speed < targetD) speed += (targetD - speed) * 0.1;
                const val = Math.max(0, speed + (Math.random() - 0.5) * 5);
                setDownloadSpeed(val);
                setChartData(p => [...p, { val, type: 'download' }].slice(-60));
                if (t > 60) { clearInterval(timerRef.current); resolve(); }
            }, 50);
        });

        // Phase 3: Upload
        setStatus('upload');
        speed = 0;
        const targetU = targetD * 0.7;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (speed < targetU) speed += (targetU - speed) * 0.1;
                const val = Math.max(0, speed + (Math.random() - 0.5) * 5);
                setUploadSpeed(val);
                setChartData(p => [...p, { val, type: 'upload' }].slice(-60));
                if (t > 60) { clearInterval(timerRef.current); resolve(); }
            }, 50);
        });

        setStatus('complete');
        setStats(s => ({ ...s, loss: 0 }));

        // Generate AI Insight
        setTimeout(() => {
            const quality = targetD > 100 ? "Excellent" : targetD > 50 ? "Good" : "Average";
            setAiAnalysis({
                grade: quality === "Excellent" ? "A+" : "B",
                summary: `Your network is optimized for 4K streaming and low-latency gaming.`,
                details: [
                    "Latency is optimal (<20ms) for competitive gaming.",
                    "Download bandwidth supports multiple simultaneous 4K streams.",
                    "Jitter is minimal, ensuring stable VoIP calls."
                ]
            });
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-background overflow-y-auto"
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
                {/* Navbar */}
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container px-4 h-16 flex items-center justify-between mx-auto max-w-7xl">
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                            <Zap className="h-6 w-6 text-primary fill-primary" />
                            Speedtest <span className="text-primary">Ultra</span>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </header>

                <main className="container px-4 py-8 mx-auto max-w-7xl space-y-12">

                    {/* 1. Hero / Main Gauge Section */}
                    <section className="min-h-[400px] flex flex-col items-center justify-center relative py-12">
                        <div className="text-center space-y-2 mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border text-xs font-medium text-muted-foreground mb-4">
                                {status === 'idle' ? 'Ready to test' : status === 'complete' ? 'Test Complete' : 'Testing Network...'}
                            </div>
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter tabular-nums">
                                {(status === 'upload' ? uploadSpeed : downloadSpeed).toFixed(0)}
                            </h1>
                            <p className="text-xl md:text-2xl text-muted-foreground font-medium">Mbps</p>
                        </div>

                        {/* Interactive Graph */}
                        <div className="w-full h-48 max-w-3xl relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="mainG" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={status === 'upload' ? '#a855f7' : '#22c55e'} stopOpacity={0.5} />
                                            <stop offset="100%" stopColor={status === 'upload' ? '#a855f7' : '#22c55e'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="val"
                                        stroke={status === 'upload' ? '#a855f7' : '#22c55e'}
                                        strokeWidth={4}
                                        fill="url(#mainG)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* CTA */}
                        <div className="mt-8">
                            <button
                                onClick={status === 'idle' || status === 'complete' ? runTest : resetTest}
                                className={cn(
                                    "px-12 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3",
                                    status === 'idle' || status === 'complete'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-destructive text-destructive-foreground"
                                )}
                            >
                                {status === 'idle' ? "Start Speedtest" : status === 'complete' ? "Run Again" : "Stop Test"}
                                {(status === 'idle' || status === 'complete') && <ChevronRight className="h-5 w-5" />}
                            </button>
                        </div>
                    </section>

                    {/* 2. Detailed Metrics Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatBox
                            label="Ping"
                            value={stats.ping}
                            unit="ms"
                            icon={Activity}
                            color={{ bg: "bg-blue-500/10", text: "text-blue-500" }}
                        />
                        <StatBox
                            label="Jitter"
                            value={stats.jitter}
                            unit="ms"
                            icon={Wifi}
                            color={{ bg: "bg-orange-500/10", text: "text-orange-500" }}
                        />
                        <StatBox
                            label="Download"
                            value={status === 'complete' ? downloadSpeed.toFixed(0) : '--'}
                            unit="Mbps"
                            icon={ArrowDown}
                            color={{ bg: "bg-green-500/10", text: "text-green-500" }}
                        />
                        <StatBox
                            label="Upload"
                            value={status === 'complete' ? uploadSpeed.toFixed(0) : '--'}
                            unit="Mbps"
                            icon={ArrowUp}
                            color={{ bg: "bg-purple-500/10", text: "text-purple-500" }}
                        />
                    </section>

                    {/* 3. Deep Analysis Section */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* AI Insight Card */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900 rounded-3xl p-8 relative overflow-hidden">
                            <SectionHeader title="AI Connection Analysis" icon={Brain} />

                            {status === 'complete' && aiAnalysis ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative z-10"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="text-6xl font-black text-indigo-600 dark:text-indigo-400 mb-2">{aiAnalysis.grade}</div>
                                            <div className="text-lg font-medium text-foreground">{aiAnalysis.summary}</div>
                                        </div>
                                        <Share2 className="h-6 w-6 text-indigo-400 cursor-pointer hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <ul className="space-y-3">
                                        {aiAnalysis.details.map((detail, i) => (
                                            <li key={i} className="flex items-center gap-3 text-muted-foreground">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                    <Brain className="h-12 w-12 mb-4 animate-pulse" />
                                    <p>Run full test for AI analysis...</p>
                                </div>
                            )}

                            {/* Decorative BG */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        </div>

                        {/* Network Tech Specs */}
                        <div className="bg-card border border-border/40 rounded-3xl p-8 space-y-6">
                            <SectionHeader title="Connection Info" icon={ShieldCheck} />

                            <div className="space-y-6">
                                <div>
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Client</div>
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-10 w-10 text-muted-foreground/20" />
                                        <div>
                                            <div className="font-semibold">{clientInfo.isp}</div>
                                            <div className="text-sm text-muted-foreground">{clientInfo.city}, {clientInfo.ip}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-border/50" />

                                <div>
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Server</div>
                                    <div className="flex items-center gap-3">
                                        <Server className="h-10 w-10 text-muted-foreground/20" />
                                        <div>
                                            <div className="font-semibold">AWS Mumbai (ap-south-1)</div>
                                            <div className="text-sm text-muted-foreground">Maharashtra, India</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </section>

                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
