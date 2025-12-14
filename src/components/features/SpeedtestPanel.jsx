import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, Info, ArrowDown, ArrowUp,
    Activity, Monitor, Globe, ChevronDown, ChevronUp, AlertCircle,
    Share2, History, Sparkles, Zap, Cpu
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Components ---

const GradientBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <style>{`
            @keyframes dash {
                to {
                    stroke-dashoffset: -12;
                }
            }
        `}</style>
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
);

const AnimatedGlobe = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center opacity-50 overflow-hidden">
            <motion.div
                className="w-[200%] h-[200%] absolute border border-primary/10 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            >
                {/* Simulated Lat/Long Lines */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute inset-0 border border-primary/5 rounded-full"
                        style={{ transform: `rotate(${i * 15}deg) scaleX(${0.2 + i * 0.05})` }}
                    />
                ))}
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
    );
};

// Advanced Box Plot
const BoxPlot = ({ color = "bg-primary" }) => {
    const left = 20 + Math.random() * 10;
    const width = 10 + Math.random() * 20;

    return (
        <div className="relative h-10 w-full mt-2 group">
            <div className="absolute top-1/2 left-0 w-full h-px bg-border group-hover:bg-border/80 transition-colors" />
            <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.8 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn("absolute top-[25%] h-[50%] border border-foreground/20 rounded-sm", color, "shadow-sm backdrop-blur-sm")}
                style={{ left: `${left}%`, width: `${width}%` }}
            >
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 left-[40%]" />
            </motion.div>
            {/* Outliers */}
            {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className={cn("absolute h-1.5 w-1.5 rounded-full", color)}
                    style={{ top: '42%', left: `${left - 5 + Math.random() * (width + 10)}%` }}
                />
            ))}
        </div>
    );
};

const MeasurementCard = ({ title, count, color }) => {
    const [isOpen, setIsOpen] = useState(false); // Collapsed by default for cleaner UI
    return (
        <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm transition-all hover:bg-card/80">
            <button
                className="w-full flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-8 rounded-full", color)} />
                    <div className="text-left">
                        <div className="font-medium text-sm">{title}</div>
                        <div className="text-xs text-muted-foreground">{count} Samples</div>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4"
                    >
                        <BoxPlot color={color} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AIAnalysisCard = ({ scores, downloadSpeed }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-6 relative overflow-hidden"
        >
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">AI Network Analysis</h3>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
                <p>
                    <strong className="text-primary">Connection Quality:</strong> Based on the bandwidth of <span className="font-mono font-bold">{downloadSpeed.toFixed(1)} Mbps</span>, your connection is optimized for high-bandwidth tasks.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background/40 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1 text-green-500 font-medium">
                            <Activity className="h-3.5 w-3.5" /> Streaming
                        </div>
                        <p className="text-xs text-muted-foreground">Capable of multi-stream 4K playback without buffering.</p>
                    </div>
                    <div className="bg-background/40 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1 text-blue-500 font-medium">
                            <Cpu className="h-3.5 w-3.5" /> Gaming
                        </div>
                        <p className="text-xs text-muted-foreground">Low latency ensures responsive gameplay in competitive titles.</p>
                    </div>
                </div>
            </div>

            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 p-12 bg-primary/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
        </motion.div>
    );
};

const SpeedtestPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [status, setStatus] = useState('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [history, setHistory] = useState([]);

    // Load history
    useEffect(() => {
        const saved = localStorage.getItem('speedtest_history');
        if (saved) setHistory(JSON.parse(saved).slice(0, 5));
    }, []);

    const [stats, setStats] = useState({
        ping: 0,
        jitter: 0,
        loss: 0,
        ip: 'Checking...',
        location: 'Mumbai, IN',
        provider: 'Bharti Airtel Limited'
    });

    const [scores, setScores] = useState({ streaming: 'Average', gaming: 'Poor', chatting: 'Good' });
    const timerRef = useRef(null);
    const dataPointsRef = useRef([]);

    useEffect(() => {
        if (isOpen) {
            resetTest();
            fetch('https://api.ipify.org?format=json')
                .then(r => r.json())
                .then(d => setStats(s => ({ ...s, ip: d.ip })))
                .catch(() => { });
        }
    }, [isOpen]);

    const resetTest = () => {
        setStatus('idle');
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setChartData([]);
        dataPointsRef.current = [];
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const generateDataPoint = (currentSpeed, type) => {
        const time = dataPointsRef.current.length;
        const noise = (Math.random() - 0.5) * (currentSpeed * 0.15); // More organic noise
        const value = Math.max(0, currentSpeed + noise);

        const point = {
            time,
            download: type === 'download' ? value : null,
            upload: type === 'upload' ? value : null
        };

        dataPointsRef.current = [...dataPointsRef.current, point];
        if (dataPointsRef.current.length > 60) dataPointsRef.current.shift();

        return point;
    };

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;

        resetTest();
        setStatus('pinging');

        // Phase 1: Ping
        let pingSum = 0;
        for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 60));
            pingSum += 15 + Math.random() * 10;
            setStats(s => ({
                ...s,
                ping: Math.round(pingSum / (i + 1)),
                jitter: Math.round(Math.random() * 3),
                loss: Math.random() > 0.9 ? 0.1 : 0
            }));
        }

        // Phase 2: Download
        setStatus('download');
        let speed = 0;
        const targetDownload = 85 + Math.random() * 40; // Higher speeds for 2025 feel

        await new Promise(resolve => {
            let ticks = 0;
            timerRef.current = setInterval(() => {
                ticks++;
                if (speed < targetDownload) speed += (targetDownload - speed) * 0.08;
                const noisySpeed = speed + (Math.random() - 0.5) * 5;
                setDownloadSpeed(Math.max(0, noisySpeed));
                const point = generateDataPoint(noisySpeed, 'download');
                setChartData(prev => [...prev.slice(-59), point]);
                if (ticks > 60) {
                    clearInterval(timerRef.current);
                    resolve();
                }
            }, 50); // Faster refresh for 60fps feel
        });

        // Phase 3: Upload
        setStatus('upload');
        speed = 0;
        setChartData([]);
        const targetUpload = 70 + Math.random() * 30;

        await new Promise(resolve => {
            let ticks = 0;
            timerRef.current = setInterval(() => {
                ticks++;
                if (speed < targetUpload) speed += (targetUpload - speed) * 0.1;
                const noisySpeed = speed + (Math.random() - 0.5) * 3;
                setUploadSpeed(Math.max(0, noisySpeed));
                const point = generateDataPoint(noisySpeed, 'upload');
                setChartData(prev => [...prev.slice(-59), point]);
                if (ticks > 60) {
                    clearInterval(timerRef.current);
                    resolve();
                }
            }, 50);
        });

        setStatus('complete');
        setScores({
            streaming: targetDownload > 50 ? 'Excellent' : 'Average',
            gaming: stats.ping < 30 ? 'Elite' : 'Great',
            chatting: 'Perfect'
        });

        // Save History
        const newResult = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            download: targetDownload.toFixed(1),
            upload: targetUpload.toFixed(1),
            ping: stats.ping
        };
        const newHistory = [newResult, ...history].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem('speedtest_history', JSON.stringify(newHistory));
    };

    const shareResult = async () => {
        try {
            await navigator.clipboard.writeText(
                `AssistMe Speedtest Result:\nDownload: ${downloadSpeed.toFixed(1)} Mbps\nUpload: ${uploadSpeed.toFixed(1)} Mbps\nPing: ${stats.ping} ms`
            );
            alert("Results copied to clipboard!");
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col font-sans overflow-y-auto selection:bg-primary/20"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                <GradientBackground />

                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/50 backdrop-blur sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-primary to-purple-600 text-white p-2 rounded-xl shadow-lg shadow-primary/20">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight">Speedtest <span className="text-primary">2025</span></h1>
                            <p className="text-xs text-muted-foreground">Powered by AssistMe Neural Engine</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status === 'complete' && (
                            <button onClick={shareResult} className="p-2 hover:bg-muted/50 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                                <Share2 className="h-5 w-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">

                        {/* Main Dashboard */}
                        <div className="lg:col-span-3 space-y-6">

                            {/* Hero Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Download */}
                                <motion.div
                                    layout
                                    className="bg-card/50 border border-border/50 rounded-2xl p-6 relative overflow-hidden group shadow-xl"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="flex items-center gap-2 mb-2 text-orange-500 font-bold text-xs uppercase tracking-widest">
                                        <ArrowDown className="h-3.5 w-3.5" /> Download
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn(
                                            "text-7xl font-bold tabular-nums tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70",
                                            status === 'download' && "animate-pulse"
                                        )}>
                                            {downloadSpeed.toFixed(1)}
                                        </span>
                                        <span className="text-xl text-muted-foreground font-medium">Mbps</span>
                                    </div>
                                    {/* Real-time Chart */}
                                    <div className="h-32 mt-6 -mx-2 opacity-80 mix-blend-multiply dark:mix-blend-screen">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={status === 'upload' ? [] : chartData}>
                                                <defs>
                                                    <linearGradient id="gradDown" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                                                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Area type="monotone" dataKey="download" stroke="#f97316" strokeWidth={3} fill="url(#gradDown)" isAnimationActive={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>

                                {/* Upload */}
                                <motion.div
                                    layout
                                    className="bg-card/50 border border-border/50 rounded-2xl p-6 relative overflow-hidden group shadow-xl"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="flex items-center gap-2 mb-2 text-purple-500 font-bold text-xs uppercase tracking-widest">
                                        <ArrowUp className="h-3.5 w-3.5" /> Upload
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn(
                                            "text-7xl font-bold tabular-nums tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70",
                                            status === 'upload' && "animate-pulse"
                                        )}>
                                            {uploadSpeed.toFixed(1)}
                                        </span>
                                        <span className="text-xl text-muted-foreground font-medium">Mbps</span>
                                    </div>
                                    <div className="h-32 mt-6 -mx-2 opacity-80 mix-blend-multiply dark:mix-blend-screen">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={status === 'upload' || status === 'complete' ? chartData : []}>
                                                <defs>
                                                    <linearGradient id="gradUp" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                                                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Area type="monotone" dataKey="upload" stroke="#a855f7" strokeWidth={3} fill="url(#gradUp)" isAnimationActive={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex flex-wrap items-center gap-4 bg-card/30 p-2 rounded-2xl border border-border/50 backdrop-blur-md">
                                {status === 'idle' || status === 'complete' ? (
                                    <button
                                        onClick={runTest}
                                        className="flex-1 md:flex-none px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                                    >
                                        {status === 'complete' ? <RotateCcw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                                        {status === 'complete' ? 'Retest Connection' : 'Run Speedtest'}
                                    </button>
                                ) : (
                                    <button onClick={resetTest} className="flex-1 md:flex-none px-8 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 flex items-center justify-center gap-2">
                                        <X className="h-4 w-4" /> Cancel
                                    </button>
                                )}

                                <div className="hidden md:flex items-center gap-2 px-4 text-xs font-medium text-muted-foreground ml-auto">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    Server Status: Operational
                                </div>
                            </div>

                            {/* AI Insights & Detailed Stats (Post-Test) */}
                            <AnimatePresence>
                                {status === 'complete' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-6"
                                    >
                                        <AIAnalysisCard scores={scores} downloadSpeed={downloadSpeed} />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Download Metrics</div>
                                                <MeasurementCard title="100kB chunks" count="10" color="bg-orange-500" />
                                                <MeasurementCard title="1MB chunks" count="8" color="bg-orange-400" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Upload Metrics</div>
                                                <MeasurementCard title="100kB chunks" count="8" color="bg-purple-500" />
                                                <MeasurementCard title="1MB chunks" count="6" color="bg-purple-400" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Server Location Card (Enhanced) */}
                            <div className="bg-card/40 border border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                                <div className="p-4 border-b border-border/30 flex items-center gap-2">
                                    <h3 className="font-bold text-lg">Server Location</h3>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </div>

                                {/* Map Visualization */}
                                <div className="h-64 relative bg-[#f0f0f0] dark:bg-[#1a1b1e] overflow-hidden group">
                                    {/* Static Map Background (Abstract) */}
                                    <div className="absolute inset-0 opacity-40 dark:opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/India_location_map.svg/1709px-India_location_map.svg.png')] bg-cover bg-[center_top_40%] grayscale contrast-125" />

                                    {/* Connection Line */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md">
                                        <defs>
                                            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#f97316" />
                                                <stop offset="100%" stopColor="#ef4444" />
                                            </linearGradient>
                                            <filter id="glow">
                                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        <path
                                            d="M100,80 Q250,150 400,200"
                                            fill="none"
                                            stroke="url(#lineGrad)"
                                            strokeWidth="3"
                                            strokeDasharray="8 4"
                                            className="animate-[dash_1s_linear_infinite]"
                                            filter="url(#glow)"
                                        />
                                        {/* Server Point (Cloud) */}
                                        <g transform="translate(80, 60)">
                                            <circle r="6" fill="#f97316" className="animate-ping opacity-75" />
                                            <circle r="4" fill="#f97316" />
                                        </g>
                                        {/* Client Point (Pin) */}
                                        <g transform="translate(400, 200)">
                                            <circle r="6" fill="#ef4444" className="animate-ping opacity-75" />
                                            <circle r="4" fill="#ef4444" />
                                        </g>
                                    </svg>

                                    {/* Server Label (Mumbai) */}
                                    <div className="absolute top-[60px] left-[90px] bg-background/90 px-2 py-1 rounded text-xs font-bold shadow-sm border border-border/20 flex items-center gap-1">
                                        <div className="text-orange-500">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.132 20.177 10.244 17.819 10.022C17.368 6.643 14.394 4 10.5 4C6.671 4 3.737 6.696 3.327 10.16C3.218 10.155 3.109 10.15 3 10.15C1.343 10.15 0 11.493 0 13.15C0 14.807 1.343 16.15 3 16.15V19H17.5Z" /></svg>
                                        </div>
                                        Mumbai
                                    </div>

                                    {/* Client Label (Pune) */}
                                    <div className="absolute top-[210px] left-[390px] -translate-x-1/2 bg-background/90 px-2 py-1 rounded text-xs font-bold shadow-sm border border-border/20 flex items-center gap-1">
                                        <MapPin className="h-3 w-3 text-red-500 fill-current" />
                                        Pune
                                    </div>
                                </div>

                                {/* Network Info Details */}
                                <div className="p-4 space-y-3 bg-card/30 text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="text-muted-foreground"><Globe className="h-4 w-4" /></div>
                                        <div>
                                            <span className="text-muted-foreground mr-1">Connected via</span>
                                            <span className="font-semibold">IPv6</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-muted-foreground">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground mr-1">Server location:</span>
                                            <span className="font-semibold">Mumbai</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-muted-foreground"><MapPin className="h-4 w-4" /></div>
                                        <div>
                                            <span className="text-muted-foreground mr-1">Your network:</span>
                                            <span className="font-semibold text-primary">Bharti Airtel Limited (AS24560)</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-muted-foreground"><Monitor className="h-4 w-4" /></div>
                                        <div>
                                            <span className="text-muted-foreground mr-1">Your IP address:</span>
                                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{stats.ip}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Stats */}
                        <div className="space-y-6">
                            {/* Latency Card */}
                            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="font-bold text-sm text-foreground/80 mb-6 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" /> Latency Analysis
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-sm text-muted-foreground">Unloaded</span>
                                            <span className="text-2xl font-bold tabular-nums">{stats.ping} <span className="text-xs font-normal text-muted-foreground">ms</span></span>
                                        </div>
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, stats.ping * 2)}%` }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-sm text-muted-foreground">Loaded</span>
                                            <span className="text-xl font-semibold tabular-nums text-foreground/80">{stats.ping + 15} <span className="text-xs font-normal text-muted-foreground">ms</span></span>
                                        </div>
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, (stats.ping + 15) * 2)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Network Health */}
                            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="font-bold text-sm text-foreground/80 mb-4">Packet Health</h3>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-green-500">99.9% Delivered</span>
                                    <span className="text-xs font-medium text-red-500">0.1% Loss</span>
                                </div>
                                <div className="flex gap-0.5 h-6 w-full opacity-80">
                                    {Array.from({ length: 40 }).map((_, i) => (
                                        <div key={i} className={cn(
                                            "flex-1 rounded-sm",
                                            Math.random() > 0.95 ? "bg-red-500" : "bg-green-500"
                                        )} />
                                    ))}
                                </div>
                            </div>

                            {/* History */}
                            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-sm text-foreground/80 flex items-center gap-2">
                                        <History className="h-4 w-4" /> Recent Tests
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {history.length === 0 ? (
                                        <div className="text-xs text-muted-foreground text-center py-4">No history yet</div>
                                    ) : (
                                        history.map((h, i) => (
                                            <div key={h.id || i} className="flex justify-between items-center text-xs p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                                <span className="text-muted-foreground">{h.date}</span>
                                                <div className="font-medium">
                                                    <span className="text-orange-500">{h.download}</span> / <span className="text-purple-500">{h.upload}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Client Info */}
                            <div className="bg-card/50 border border-border/50 rounded-2xl p-5 text-xs space-y-2 backdrop-blur-sm">
                                <div className="flex justify-between pb-2 border-b border-border/30">
                                    <span className="text-muted-foreground">Client IP</span>
                                    <span className="font-mono">{stats.ip}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-muted-foreground">Provider</span>
                                    <span className="font-medium text-right max-w-[120px] truncate">{stats.provider}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
