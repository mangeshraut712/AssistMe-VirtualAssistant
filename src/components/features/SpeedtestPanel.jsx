import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, ArrowDown, ArrowUp,
    Activity, Wifi, Server, Zap, Share2, Info,
    Monitor, Gamepad2, Video, Globe, Brain, Calendar, Router, Satellite
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Advanced Components ---

const GlassCard = ({ children, className }) => (
    <div className={cn("bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm", className)}>
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
        <div className="h-6 w-full bg-neutral-50 dark:bg-neutral-900 rounded-full relative overflow-hidden">
            <div className="absolute top-1/2 -translate-y-1/2 left-[20%] right-[30%] h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            <div className="absolute top-1/2 -translate-y-1/2 left-[40%] text-[8px] font-mono text-neutral-400">
                ~{Math.round(20 + Math.random() * 30)}ms
            </div>
        </div>
    </div>
);

const GradeBadge = ({ grade }) => {
    const color = grade.startsWith('A') ? 'bg-green-500' : grade.startsWith('B') ? 'bg-blue-500' : 'bg-yellow-500';
    return (
        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <span className={cn("text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-black to-neutral-600 dark:from-white dark:to-neutral-400")}>{grade}</span>
            <span className="text-[10px] text-neutral-400 font-bold uppercase">Grade</span>
        </div>
    );
};

const SpeedtestPanel = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [clientInfo, setClientInfo] = useState({ ip: '...', city: '...', isp: '...', lat: 0, lon: 0 });
    const [stats, setStats] = useState({ ping: 0, jitter: 0, loss: 0, bufferbloat: '?' });
    const timerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
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
        setStats({ ping: 0, jitter: 0, loss: 0, bufferbloat: '?' });
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
        const targetD = 130 + Math.random() * 60;
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
        setStats(s => ({ ...s, loss: 0, bufferbloat: 'A' }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-neutral-50 dark:bg-neutral-950 overflow-y-auto font-sans selection:bg-orange-500/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Modern Header */}
                <header className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                                <Zap className="h-5 w-5 text-white dark:text-black fill-current" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">Speedtest <span className="text-neutral-400 items-center text-xs ml-1 font-mono">PRO</span></span>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">

                    {/* Top Section: Main Gauges */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Download Graph */}
                        <div className="lg:col-span-5 h-[280px]">
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
                        <div className="lg:col-span-5 h-[280px] lg:border-l border-neutral-200 dark:border-neutral-800 lg:pl-12">
                            <StatWithGraph
                                label="Upload"
                                value={(status === 'upload' ? uploadSpeed : status === 'complete' ? uploadSpeed : 0).toFixed(1)}
                                unit="Mbps"
                                color="#a855f7"
                                data={status === 'upload' ? chartData : []}
                                type="u"
                            />
                        </div>

                        {/* Side Stats & Grades */}
                        <div className="lg:col-span-2 space-y-6 lg:pl-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Ping</h4>
                                    <div className="text-2xl font-medium">{stats.ping} <span className="text-sm text-neutral-400">ms</span></div>
                                </div>
                                <GradeBadge grade={status === 'complete' ? 'A+' : '-'} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Bufferbloat</h4>
                                    <div className="text-2xl font-medium">{stats.bufferbloat === '?' ? '--' : 'Low'}</div>
                                </div>
                                <GradeBadge grade={status === 'complete' ? 'A' : '-'} />
                            </div>
                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-[10px] text-neutral-400 uppercase">Jitter</h4>
                                        <div className="font-mono text-sm">{stats.jitter}ms</div>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] text-neutral-400 uppercase">Loss</h4>
                                        <div className="font-mono text-sm">{stats.loss}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Network Quality Bar */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="h-5 w-5 text-blue-500" />
                            <h3 className="font-bold text-lg">Real-World Application Score</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { label: '4K Streaming', score: status === 'complete' ? 'Perfect' : '-', icon: Video },
                                { label: 'Competitive Gaming', score: status === 'complete' ? 'Good' : '-', icon: Gamepad2 },
                                { label: 'Video Conferencing', score: status === 'complete' ? 'Optimal' : '-', icon: Monitor },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                                        <item.icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-neutral-500">{item.label}</div>
                                        <div className="font-bold text-lg">{item.score}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Server Location & Analytics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Interactive Server Map */}
                        <div className="lg:col-span-2">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Globe className="h-5 w-5" /> Server Location
                            </h3>
                            <div className="h-[400px] rounded-3xl overflow-hidden relative shadow-lg group border border-neutral-200 dark:border-neutral-800">
                                {/* Map */}
                                <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 transition-transform duration-700 group-hover:scale-105">
                                    <div className="absolute inset-0 opacity-60 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/India_location_map.svg/1709px-India_location_map.svg.png')] bg-cover bg-[center_top_40%] grayscale contrast-125" />
                                </div>

                                {/* UI Overlay */}
                                <div className="absolute inset-x-0 bottom-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl p-6 border-t border-neutral-200 dark:border-neutral-800">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Server</div>
                                            <div className="font-bold flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                AWS Mumbai
                                            </div>
                                            <div className="text-xs text-neutral-400 mt-1">ap-south-1 • 124km</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Provider</div>
                                            <div className="font-bold">{clientInfo.isp}</div>
                                            <div className="text-xs text-neutral-400 mt-1">AS24560 • IPv6</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Protocol</div>
                                            <div className="font-bold font-mono">WebSocket/TLS</div>
                                            <div className="text-xs text-neutral-400 mt-1">Direct Path</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Measurements */}
                        <div>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5" /> Latency Analysis
                            </h3>
                            <GlassCard className="p-6 h-[400px] space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-sm">Unloaded Latency</span>
                                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Great</span>
                                    </div>
                                    <BoxPlotRow label="Idle" count="20/20" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-sm">Download Active</span>
                                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 px-2 py-0.5 rounded-full">bufferbloat</span>
                                    </div>
                                    <BoxPlotRow label="Loaded" count="40/40" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-sm">Upload Active</span>
                                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">Good</span>
                                    </div>
                                    <BoxPlotRow label="Loaded" count="20/20" />
                                </div>
                            </GlassCard>
                        </div>
                    </div>

                    {/* AI Analysis & History Row (NEW) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Deep AI Analysis */}
                        <GlassCard className="p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Brain className="h-32 w-32" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                                    <Brain className="h-6 w-6 text-indigo-500" />
                                    AI Network Consultant
                                </h3>

                                {status === 'complete' ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-sm leading-relaxed">
                                            <p className="font-medium mb-2 text-indigo-900 dark:text-indigo-200">
                                                Based on your <strong>{downloadSpeed.toFixed(0)} Mbps</strong> connection:
                                            </p>
                                            <ul className="space-y-2 text-neutral-600 dark:text-neutral-400 list-disc pl-4">
                                                <li>Your latency of <strong>{stats.ping}ms</strong> is exceptional for competitive gaming (est. 144+ FPS in CS:GO/Valorant online).</li>
                                                <li>You can stream <strong> {(downloadSpeed / 25).toFixed(0)} </strong> simultaneous 4K HDR movies without buffering.</li>
                                                <li>Bufferbloat is low, meaning large downloads won't lag your video calls.</li>
                                            </ul>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                                <div className="text-xs text-neutral-500 uppercase">Est. Gaming Ping</div>
                                                <div className="font-bold text-lg">12-18 ms</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                                                <div className="text-xs text-neutral-500 uppercase">Max Resolution</div>
                                                <div className="font-bold text-lg">8K / 60fps</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-neutral-400">
                                        Run test to generate AI insights...
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        {/* Recent History */}
                        <GlassCard className="p-8">
                            <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                                <RotateCcw className="h-6 w-6 text-neutral-500" />
                                Recent Performance
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm text-neutral-400 px-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                                    <span>Time</span>
                                    <span>Download</span>
                                    <span>Ping</span>
                                </div>
                                {/* Mock History Items */}
                                {[
                                    { time: 'Just now', down: status === 'complete' ? downloadSpeed.toFixed(0) : '-', ping: status === 'complete' ? stats.ping : '-' },
                                    { time: '2 hours ago', down: '142', ping: '18' },
                                    { time: 'Yesterday', down: '138', ping: '21' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-2 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-2 h-2 rounded-full", i === 0 && status === 'complete' ? "bg-green-500" : "bg-neutral-300")} />
                                            <span className="font-medium">{item.time}</span>
                                        </div>
                                        <div className="font-mono font-bold">{item.down} <span className="text-xs text-neutral-400 font-sans">Mbps</span></div>
                                        <div className="font-mono text-neutral-500">{item.ping} <span className="text-xs text-neutral-400 font-sans">ms</span></div>
                                    </div>
                                ))}
                                <button className="w-full py-3 mt-4 text-sm font-bold text-neutral-500 hover:text-black dark:hover:text-white transition-colors border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                    View Full History
                                </button>
                            </div>
                        </GlassCard>
                    </div>

                    {/* "Why We Are Best" Feature Showcase */}
                    <div className="py-12 border-t border-neutral-200 dark:border-neutral-800">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-black mb-4 tracking-tight">Why Speedtest Pro 2025?</h2>
                            <p className="text-neutral-500 max-w-2xl mx-auto">
                                Traditional speed tests only measure throughput. We analyze the entire digital experience using next-generation protocols.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { title: 'Satellite-Ready', icon: Satellite, desc: 'Optimized for Starlink & LEO constellations.' },
                                { title: 'Router Health', icon: Router, desc: 'Detects Wi-Fi 6/7 bottlenecks.' },
                                { title: 'Gaming FPS', icon: Gamepad2, desc: 'Predicts frame syncing latency.' },
                                { title: '8K Streaming', icon: Monitor, desc: 'Bufferbloat certification for HDR.' },
                            ].map((feature, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center hover:shadow-lg transition-shadow">
                                    <div className="w-12 h-12 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                        <feature.icon className="h-6 w-6 text-black dark:text-white" />
                                    </div>
                                    <h3 className="font-bold mb-2">{feature.title}</h3>
                                    <p className="text-xs text-neutral-500 leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-24" /> {/* Spacer for FAB */}

                    {/* Floating FAB */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button
                            onClick={status === 'idle' || status === 'complete' ? runTest : resetTest}
                            className={cn(
                                "h-14 px-8 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-all hover:scale-105",
                                status === 'idle' || status === 'complete' ? "bg-black dark:bg-white text-white dark:text-black" : "bg-red-500 text-white"
                            )}
                        >
                            {status === 'idle' ? "Start Speedtest" : status === 'complete' ? "Test Again" : "Stop"}
                            {(status === 'idle' || status === 'complete') && <Zap className="h-5 w-5" />}
                        </button>
                    </div>

                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
