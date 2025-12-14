import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, ArrowDown, ArrowUp,
    Activity, Wifi, Server, Zap, Share2, Info,
    Monitor, Gamepad2, Video, Globe
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Components (Shadcn/Apple/Japanese Style) ---

const Card = ({ children, className }) => (
    <div className={cn("bg-white dark:bg-black rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm", className)}>
        {children}
    </div>
);

const StatWithGraph = ({ label, value, unit, color, data, type }) => (
    <div className="flex flex-col h-full">
        <div className="flex justify-between items-baseline mb-2">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">{label}</h3>
            <Info className="h-4 w-4 text-neutral-300" />
        </div>
        <div className="flex items-baseline gap-1 mb-4">
            <span className="text-6xl font-light tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50">{value}</span>
            <span className="text-lg font-medium text-neutral-400">{unit}</span>
        </div>
        <div className="flex-1 min-h-[120px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`grad${type}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="val"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#grad${type})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const BoxPlotRow = ({ label, count }) => (
    <div className="py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 pl-10 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
        </div>
        <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
            <span className="text-xs text-neutral-400">({count})</span>
        </div>
        {/* Abstract Box Plot Viz */}
        <div className="h-6 w-full bg-neutral-50 dark:bg-neutral-900 rounded-full relative overflow-hidden">
            <div className="absolute top-1/2 -translate-y-1/2 left-[20%] right-[30%] h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            <div className="absolute top-1/2 -translate-y-1/2 left-[40%] text-[8px] font-mono text-neutral-400">
                ~{Math.round(20 + Math.random() * 30)}ms
            </div>
            <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-neutral-800 dark:bg-neutral-200 rounded sm shadow-sm"
                initial={{ left: '0%' }}
                animate={{ left: `${30 + Math.random() * 40}%` }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
        </div>
    </div>
);

const SpeedtestPanel = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [chartData, setChartData] = useState([]);

    const [clientInfo, setClientInfo] = useState({ ip: '...', city: '...', isp: '...', lat: 0, lon: 0 });
    const [stats, setStats] = useState({ ping: 0, jitter: 0, loss: 0 });

    const timerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            resetTest();
            fetch('https://ipapi.co/json/')
                .then(r => r.json())
                .then(d => setClientInfo({ ip: d.ip, city: d.city, isp: d.org, lat: d.latitude, lon: d.longitude }))
                .catch(() => setClientInfo({ ip: 'Unknown', city: 'Local', isp: 'Private', lat: 0, lon: 0 }));
        }
    }, [isOpen]);

    const resetTest = () => {
        setStatus('idle');
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setChartData([]);
        setStats({ ping: 0, jitter: 0, loss: 0 });
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;
        resetTest();

        setStatus('pinging');
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 100));
            setStats(s => ({ ...s, ping: Math.round(15 + Math.random() * 5), jitter: Math.round(Math.random() * 3) }));
        }

        setStatus('download');
        let speed = 0;
        const targetD = 120 + Math.random() * 40;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (speed < targetD) speed += (targetD - speed) * 0.1;
                const val = Math.max(0, speed + (Math.random() - 0.5) * 5);
                setDownloadSpeed(val);
                setChartData(p => [...p, { val, type: 'download' }].slice(-60));
                if (t > 50) { clearInterval(timerRef.current); resolve(); }
            }, 60);
        });

        setStatus('upload');
        setChartData([]);
        speed = 0;
        const targetU = targetD * 0.8;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (speed < targetU) speed += (targetU - speed) * 0.1;
                const val = Math.max(0, speed + (Math.random() - 0.5) * 5);
                setUploadSpeed(val);
                setChartData(p => [...p, { val, type: 'upload' }].slice(-60));
                if (t > 50) { clearInterval(timerRef.current); resolve(); }
            }, 60);
        });

        setStatus('complete');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-neutral-50 dark:bg-neutral-950 overflow-y-auto font-sans"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Minimal Header */}
                <header className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
                    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-500" />
                            <span className="font-bold text-lg tracking-tight">Speed Test</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="text-sm font-medium hover:opacity-70">Close</button>
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">

                    {/* Top Section: Main Gauges */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Download Graph */}
                        <div className="lg:col-span-5 h-64">
                            <StatWithGraph
                                label="Download"
                                value={(status === 'upload' ? downloadSpeed : status === 'download' ? downloadSpeed : status === 'complete' ? downloadSpeed : 0).toFixed(1)}
                                unit="Mbps"
                                color="#f97316"
                                data={status === 'download' ? chartData : []}
                                type="d"
                            />
                        </div>

                        {/* Upload Graph */}
                        <div className="lg:col-span-5 h-64 border-l border-neutral-200 dark:border-neutral-800 pl-12">
                            <StatWithGraph
                                label="Upload"
                                value={(status === 'upload' ? uploadSpeed : status === 'complete' ? uploadSpeed : 0).toFixed(1)}
                                unit="Mbps"
                                color="#a855f7"
                                data={status === 'upload' ? chartData : []}
                                type="u"
                            />
                        </div>

                        {/* Side Stats */}
                        <div className="lg:col-span-2 space-y-8 pl-4">
                            <div>
                                <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-1">Latency</h4>
                                <div className="text-2xl font-light">{stats.ping} <span className="text-sm text-neutral-400">ms</span></div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-1">Jitter</h4>
                                <div className="text-2xl font-light">{stats.jitter} <span className="text-sm text-neutral-400">ms</span></div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-1">Loss</h4>
                                <div className="text-2xl font-light">{stats.loss} <span className="text-sm text-neutral-400">%</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Quality Score Bar */}
                    <div className="border-y border-neutral-200 dark:border-neutral-800 py-6">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-lg">Network Quality Score</h3>
                            <a href="#" className="text-xs text-blue-500 underline">Learn more</a>
                        </div>
                        <div className="grid grid-cols-3 gap-8 text-sm">
                            <div className="flex items-center justify-between">
                                <span>Video Streaming</span>
                                <span className={cn("font-bold", status === 'complete' ? "text-green-600" : "text-neutral-400")}>
                                    {status === 'complete' ? "Good" : "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-l pl-8 border-neutral-200 dark:border-neutral-800">
                                <span>Online Gaming</span>
                                <span className={cn("font-bold", status === 'complete' ? "text-yellow-600" : "text-neutral-400")}>
                                    {status === 'complete' ? "Average" : "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-l pl-8 border-neutral-200 dark:border-neutral-800">
                                <span>Video Chatting</span>
                                <span className={cn("font-bold", status === 'complete' ? "text-green-600" : "text-neutral-400")}>
                                    {status === 'complete' ? "Optimal" : "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Map & Detailed Measurements */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                        {/* Left: Map */}
                        <div>
                            <h3 className="font-bold text-lg mb-4">Server Location</h3>
                            <Card className="h-[400px] overflow-hidden relative group">
                                {/* Map Background */}
                                <div className="absolute inset-0 bg-[#f0f0f0] dark:bg-[#1a1b1e]">
                                    <div className="absolute inset-0 opacity-40 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/India_location_map.svg/1709px-India_location_map.svg.png')] bg-cover bg-[center_top_40%] grayscale contrast-125" />
                                </div>

                                {/* Connection Line */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <path d="M100,100 Q250,200 400,250" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_1s_linear_infinite]" />
                                    <circle cx="100" cy="100" r="4" fill="#f97316" />
                                    <circle cx="400" cy="250" r="4" fill="#ef4444" />
                                </svg>

                                {/* Info Overlay */}
                                <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur border border-neutral-200 dark:border-neutral-800 p-4 rounded-lg text-xs space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">Connected via</span>
                                        <span className="font-semibold">IPv6</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">Your Network</span>
                                        <span className="font-semibold text-orange-600">{clientInfo.isp}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">Location</span>
                                        <span className="font-mono">{clientInfo.city}, {clientInfo.ip}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Right: Box Plots */}
                        <div>
                            <h3 className="font-bold text-lg mb-4">Latency Measurements</h3>
                            <Card className="p-6 space-y-2">
                                <BoxPlotRow label="Unloaded latency" count="20/20" />
                                <BoxPlotRow label="Latency during download" count="20" />
                                <BoxPlotRow label="Latency during upload" count="20" />
                            </Card>

                            <h3 className="font-bold text-lg mb-4 mt-8">Transfer Measurements</h3>
                            <Card className="p-6 space-y-2">
                                <BoxPlotRow label="100kB download test" count="10/10" />
                                <BoxPlotRow label="1MB download test" count="8/8" />
                                <BoxPlotRow label="10MB download test" count="6/6" />
                            </Card>
                        </div>

                    </div>

                    {/* Control Bar (Floating) */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button
                            onClick={status === 'idle' || status === 'complete' ? runTest : resetTest}
                            className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full font-medium shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {status === 'idle' ? 'Start Test' : status === 'complete' ? 'Restart Test' : 'Stop'}
                            <Zap className="h-4 w-4" />
                        </button>
                    </div>

                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
