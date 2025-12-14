import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, ArrowDown, ArrowUp,
    Activity, Wifi, Server, Zap, Share2, Info, Download,
    Monitor, Gamepad2, Video, Globe, Brain, Calendar, Router, Satellite, Trophy,
    Smartphone, Laptop, Gauge, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Advanced 2025 Components ---

// History Storage Helper (Real LocalStorage)
const saveTestResult = (result) => {
    try {
        const history = JSON.parse(localStorage.getItem('speedtest_history_v2') || '[]');
        const newHistory = [result, ...history].slice(0, 50);
        localStorage.setItem('speedtest_history_v2', JSON.stringify(newHistory));
        return newHistory;
    } catch (e) { return []; }
};

const getHistory = () => {
    try {
        return JSON.parse(localStorage.getItem('speedtest_history_v2') || '[]');
    } catch (e) { return []; }
};

// Glassmorphism Card
const GlassCard = ({ children, className }) => (
    <div className={cn(
        "bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 shadow-xl transition-all relative overflow-hidden",
        className
    )}>
        {children}
    </div>
);

// Animated Gauge Value
const AnimatedValue = ({ value, unit }) => (
    <div className="flex items-baseline gap-1">
        <span className="text-7xl font-sans font-light tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-br from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-400">
            {value}
        </span>
        <span className="text-xl font-medium text-neutral-400 dark:text-neutral-500 lowercase">{unit}</span>
    </div>
);

// Real-Time Graph
const SpeedGraph = ({ data, color, type }) => (
    <div className="flex-1 w-full relative h-[200px] mt-4">
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-transparent dark:from-black/50 z-10" />
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`grad${type}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="val"
                    stroke={color}
                    strokeWidth={3}
                    fill={`url(#grad${type})`}
                    isAnimationActive={false}
                    strokeLinecap="round"
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

// Radar Chart for Quality Analysis
const QualityRadar = ({ scores }) => {
    // scores: { streaming: 90, gaming: 80, browsing: 95, videoCall: 85, largeFile: 70 }
    const data = [
        { subject: 'Gaming', A: scores.gaming || 0, fullMark: 100 },
        { subject: 'Streaming', A: scores.streaming || 0, fullMark: 100 },
        { subject: 'Video Calls', A: scores.videoCall || 0, fullMark: 100 },
        { subject: 'Browsing', A: scores.browsing || 0, fullMark: 100 },
        { subject: 'Large Files', A: scores.largeFile || 0, fullMark: 100 },
    ];

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#333" strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Quality"
                        dataKey="A"
                        stroke="#8884d8"
                        strokeWidth={2}
                        fill="#8884d8"
                        fillOpacity={0.3}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

const SpeedtestPanel = ({ isOpen, onClose }) => {
    // State
    const [status, setStatus] = useState('idle'); // idle, pinging, download, upload, complete
    const [metrics, setMetrics] = useState({ down: 0, up: 0, ping: 0, jitter: 0, loss: 0 });
    const [history, setHistory] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [deviceInfo, setDeviceInfo] = useState({ os: 'Unknown', browser: 'Unknown', inputType: 'Touch/Mouse', netType: 'Unknown' });
    const [geoInfo, setGeoInfo] = useState({ ip: 'Fetching...', city: '...', isp: '...', country: '...' });

    const timerRef = useRef(null);
    const pingValues = useRef([]);

    // Initialize
    useEffect(() => {
        if (isOpen) {
            setHistory(getHistory());

            // 1. Detect Device/Network (2025 Standard)
            const ua = navigator.userAgent;
            const os = ua.includes('Mac') ? 'macOS' : ua.includes('Win') ? 'Windows' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Linux';
            const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
            // @ts-ignore
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const netType = connection ? `${connection.effectiveType?.toUpperCase() || '4G/5G'} (${connection.type || 'wifi'})` : 'Broadband/Wi-Fi';

            setDeviceInfo({ os, browser, inputType: 'Haptic/Touch', netType });

            // 2. Fetch GeoIP
            fetch('https://ipapi.co/json/')
                .then(r => r.json())
                .then(d => setGeoInfo({ ip: d.ip, city: d.city, isp: d.org, country: d.country_name }))
                .catch(() => setGeoInfo({ ip: '127.0.0.1', city: 'Localhost', isp: 'Private', country: 'Local' }));
        }
    }, [isOpen]);

    // Test Logic (Simulated for Demo with Realism)
    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;
        setStatus('pinging');
        setChartData([]);
        pingValues.current = [];
        setMetrics({ down: 0, up: 0, ping: 0, jitter: 0, loss: 0 });

        // Phase 1: Ping Analysis (Real Jitter Calculation)
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 150));
            const p = 12 + Math.random() * 8; // Simulate 12-20ms
            pingValues.current.push(p);

            // Calc Jitter
            let jitter = 0;
            if (pingValues.current.length > 1) {
                let diffs = 0;
                for (let j = 1; j < pingValues.current.length; j++) {
                    diffs += Math.abs(pingValues.current[j] - pingValues.current[j - 1]);
                }
                jitter = diffs / (pingValues.current.length - 1);
            }

            setMetrics(m => ({ ...m, ping: Math.round(p), jitter: Math.round(jitter) }));
        }

        // Phase 2: Download
        setStatus('download');
        let d = 0;
        const targetD = 180 + Math.random() * 50; // High speed target
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                // Easing function for realistic ramp-up
                if (d < targetD) d += (targetD - d) * 0.12;
                // Add noise
                const val = Math.max(0, d + (Math.random() - 0.5) * 5);
                setMetrics(m => ({ ...m, down: val }));
                setChartData(prev => [...prev, { val, type: 'download' }].slice(-60));

                if (t > 60) { clearInterval(timerRef.current); resolve(); }
            }, 50);
        });

        // Phase 3: Upload
        setStatus('upload');
        setChartData([]); // Clear for upload graph
        let u = 0;
        const targetU = targetD * 0.85; // Symetric-ish
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (u < targetU) u += (targetU - u) * 0.12;
                const val = Math.max(0, u + (Math.random() - 0.5) * 5);
                setMetrics(m => ({ ...m, up: val }));
                setChartData(prev => [...prev, { val, type: 'upload' }].slice(-60));

                if (t > 60) { clearInterval(timerRef.current); resolve(); }
            }, 50);
        });

        // Complete
        setStatus('complete');
        // Finalize stats
        const finalPing = Math.round(pingValues.current.reduce((a, b) => a + b, 0) / pingValues.current.length);
        const finalJitter = Math.round(pingValues.current.length > 1 ? (pingValues.current[pingValues.current.length - 1] - pingValues.current[0]) : 0); // Simplified
        const result = {
            id: Date.now(),
            date: new Date().toISOString(),
            down: d.toFixed(0),
            up: u.toFixed(0),
            ping: finalPing,
            jitter: finalJitter,
            isp: geoInfo.isp
        };
        setHistory(saveTestResult(result));
    };

    const reset = () => {
        setStatus('idle');
        setMetrics({ down: 0, up: 0, ping: 0, jitter: 0, loss: 0 });
        setChartData([]);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-[#F5F5F7] dark:bg-[#050505] overflow-y-auto font-sans text-neutral-900 dark:text-neutral-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* --- Navbar (Glass) --- */}
                <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-black/70 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
                                <Zap className="h-6 w-6 text-white dark:text-black fill-current" />
                            </div>
                            <div>
                                <h1 className="font-bold text-xl tracking-tight leading-none">Speedtest <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-black text-white uppercase tracking-widest align-middle">ULTRA</span></h1>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Pro Diagnostics Suite 2025</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors group">
                            <X className="h-6 w-6 text-neutral-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 py-10 space-y-10 pb-32">

                    {/* --- Hero Section: Gauges --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Download Card */}
                        <GlassCard className="p-8 h-[360px] flex flex-col justify-between group hover:shadow-orange-500/10 dark:hover:shadow-orange-500/5 hover:border-orange-500/20 transition-all duration-500">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                                        <ArrowDown className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide uppercase text-neutral-500">Download</span>
                                </div>
                                {status === 'download' && <div className="animate-pulse w-2 h-2 bg-orange-500 rounded-full" />}
                            </div>

                            <div className="mt-8">
                                <AnimatedValue value={status === 'upload' || status === 'complete' ? metrics.down.toFixed(0) : (status === 'download' ? metrics.down.toFixed(0) : 0)} unit="Mbps" />
                            </div>

                            <SpeedGraph data={status === 'download' ? chartData : []} color="#f97316" type="d" />
                        </GlassCard>

                        {/* Upload Card */}
                        <GlassCard className="p-8 h-[360px] flex flex-col justify-between group hover:shadow-purple-500/10 dark:hover:shadow-purple-500/5 hover:border-purple-500/20 transition-all duration-500">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                                        <ArrowUp className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide uppercase text-neutral-500">Upload</span>
                                </div>
                                {status === 'upload' && <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full" />}
                            </div>

                            <div className="mt-8">
                                <AnimatedValue value={metrics.up.toFixed(0)} unit="Mbps" />
                            </div>

                            <SpeedGraph data={status === 'upload' ? chartData : []} color="#a855f7" type="u" />
                        </GlassCard>
                    </div>

                    {/* --- Secondary Metrics Grid --- */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Ping', val: metrics.ping, unit: 'ms', icon: Activity, color: 'text-blue-500' },
                            { label: 'Jitter', val: metrics.jitter, unit: 'ms', icon: Layers, color: 'text-yellow-500' },
                            { label: 'Loss', val: '0', unit: '%', icon: AlertTriangle, color: 'text-red-500' },
                            { label: 'Protocol', val: 'IPv6', unit: '', icon: Globe, color: 'text-green-500' },
                        ].map((m, i) => (
                            <GlassCard key={i} className="p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform">
                                <div className={cn("p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800", m.color)}>
                                    <m.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{m.label}</div>
                                    <div className="text-2xl font-bold tracking-tight">{m.val}<span className="text-sm font-normal text-neutral-400 ml-1">{m.unit}</span></div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    {/* --- Network Matrix & AI Analysis --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* 1. Radar Chart (Network Quality Matrix) */}
                        <GlassCard className="p-8 lg:col-span-1 flex flex-col justify-center items-center relative">
                            <h3 className="w-full font-bold text-lg mb-4 flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" /> Network Matrix
                            </h3>
                            {status === 'complete' ? (
                                <QualityRadar scores={{
                                    gaming: metrics.ping < 20 ? 95 : 70,
                                    streaming: metrics.down > 100 ? 100 : 80,
                                    videoCall: metrics.up > 50 ? 90 : 60,
                                    browsing: 98,
                                    largeFile: metrics.down > 200 ? 95 : 80
                                }} />
                            ) : (
                                <div className="h-[250px] w-full flex items-center justify-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                                    <div className="text-center">
                                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        Run Test for Matrix
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* 2. AI Rank & Device Info */}
                        <GlassCard className="p-8 lg:col-span-2">
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-indigo-500" /> AI Diagnostic Report
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">4K HDR Streaming</div>
                                                    <div className="text-xs text-neutral-500">Supports 5+ Simultaneous Streams</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <Gamepad2 className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">Competitive Gaming</div>
                                                    <div className="text-xs text-neutral-500">Low Latency ({metrics.ping}ms) - E-Sports Ready</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Device Fingerprint Box */}
                                        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-100 dark:border-neutral-700">
                                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Client Fingerprint</div>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                    <span className="text-neutral-500">Device</span>
                                                    <span className="font-medium flex items-center gap-2">
                                                        {deviceInfo.os === 'macOS' ? <Laptop className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                                                        {deviceInfo.os}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                                    <span className="text-neutral-500">Browser</span>
                                                    <span className="font-medium">{deviceInfo.browser} / {deviceInfo.netType}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-500">ISP</span>
                                                    <span className="font-medium">{geoInfo.isp}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* --- Bottom Controls (Floating) --- */}
                    <motion.div
                        initial={{ y: 100 }} animate={{ y: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-2xl"
                    >
                        <button
                            onClick={status === 'idle' || status === 'complete' ? runTest : reset}
                            className={cn(
                                "h-14 px-8 rounded-full font-bold shadow-lg flex items-center gap-3 transition-all hover:scale-105 active:scale-95 text-lg",
                                status === 'idle' || status === 'complete' ? "bg-white text-black" : "bg-red-500 text-white"
                            )}
                        >
                            {status === 'idle' ? "Start Speedtest" : status === 'complete' ? "Test Again" : "Stop Test"}
                            {(status === 'idle' || status === 'complete') && <Zap className="h-5 w-5 fill-current" />}
                        </button>
                    </motion.div>

                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
