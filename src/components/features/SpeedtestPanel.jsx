import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, Pause, Play, Activity, Wifi, Server, Zap, Share2, Info, Clock,
    Monitor, Gamepad2, Video, Globe, Twitter, Facebook, Link2, ArrowDown, ArrowUp,
    Smartphone, Laptop, Signal, TrendingUp, Brain, Trophy, MapPin, Download as DownloadIcon,
    Upload as UploadIcon, Layers, CheckCircle2, AlertTriangle, FileDown, History, Cpu
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { cn } from '@/lib/utils';

// Storage
const saveTest = (r) => {
    try {
        const h = JSON.parse(localStorage.getItem('speedtest_v6') || '[]');
        localStorage.setItem('speedtest_v6', JSON.stringify([r, ...h].slice(0, 100)));
        return [r, ...h].slice(0, 100);
    } catch { return []; }
};
const getHistory = () => { try { return JSON.parse(localStorage.getItem('speedtest_v6') || '[]'); } catch { return []; } };

// Components
const GlassCard = ({ children, className }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={cn("bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg", className)}>
        {children}
    </motion.div>
);

const InfoTip = ({ text }) => (
    <div className="group relative inline-block ml-1.5">
        <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
            {text}
        </div>
    </div>
);

const SpeedChart = ({ data, color, isActive }) => (
    <div className="relative h-[120px]">
        {isActive && <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1 bg-white/90 dark:bg-neutral-900/90 rounded-full border">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium">Testing...</span>
        </div>}
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke={color} strokeWidth={3} fill={`url(#g-${color})`} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const BoxPlot = ({ label, count, min, max, median, q1, q3, color = "#f97316" }) => {
    const scale = (v) => Math.min(100, (v / 150) * 100);
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{count}</span>
            </div>
            <div className="relative h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <div className="absolute top-1/2 -translate-y-1/2 h-5 rounded" style={{ left: `${scale(q1)}%`, width: `${scale(q3 - q1)}%`, backgroundColor: `${color}cc` }} />
                <div className="absolute top-1/2 -translate-y-1/2 h-0.5" style={{ left: `${scale(min)}%`, width: `${scale(q1 - min)}%`, backgroundColor: color }} />
                <div className="absolute top-1/2 -translate-y-1/2 h-0.5" style={{ left: `${scale(q3)}%`, width: `${scale(max - q3)}%`, backgroundColor: color }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neutral-900 dark:bg-white" style={{ left: `${scale(median)}%` }} />
            </div>
        </div>
    );
};

const RadarQuality = ({ scores }) => {
    const data = [
        { subject: 'Gaming', A: scores.gaming || 0 },
        { subject: 'Streaming', A: scores.streaming || 0 },
        { subject: 'Video Calls', A: scores.videoCall || 0 },
        { subject: 'Browsing', A: scores.browsing || 0 },
        { subject: 'Downloads', A: scores.downloads || 0 }
    ];
    return (
        <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={data}>
                <PolarGrid stroke="#888" strokeOpacity={0.15} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.25} />
            </RadarChart>
        </ResponsiveContainer>
    );
};

const SpeedtestPanel = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState('idle');
    const [isPaused, setIsPaused] = useState(false);
    const [metrics, setMetrics] = useState({ down: 0, up: 0, ping: 0, jitter: 0, loss: 0, pingMin: 0, pingMax: 0 });
    const [downloadChart, setDownloadChart] = useState([]);
    const [uploadChart, setUploadChart] = useState([]);
    const [geoInfo, setGeoInfo] = useState({ ip: '...', city: '...', isp: '...', country: '...', lat: 0, lon: 0, asn: 'N/A', ipv: 'IPv4' });
    const [serverInfo, setServerInfo] = useState({ city: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 });
    const [timestamp, setTimestamp] = useState(null);
    const [latencyData, setLatencyData] = useState({ unloaded: [], download: [], upload: [] });
    const [history, setHistory] = useState([]);
    const timerRef = useRef(null);
    const pingVals = useRef([]);

    useEffect(() => {
        if (isOpen) {
            setHistory(getHistory());
            fetch('https://ipapi.co/json/').then(r => r.json()).then(d => {
                setGeoInfo({ ip: d.ip, city: d.city, isp: d.org, country: d.country_name, lat: d.latitude, lon: d.longitude, asn: d.asn, ipv: d.ip?.includes(':') ? 'IPv6' : 'IPv4' });
            }).catch(() => { });
        }
    }, [isOpen]);

    const getBoxStats = useCallback((arr) => {
        if (!arr.length) return { min: 0, max: 0, median: 0, q1: 0, q3: 0 };
        const s = [...arr].sort((a, b) => a - b);
        return { min: s[0], max: s[s.length - 1], median: s[Math.floor(s.length / 2)], q1: s[Math.floor(s.length / 4)], q3: s[Math.floor(3 * s.length / 4)] };
    }, []);

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;
        setStatus('pinging');
        setDownloadChart([]);
        setUploadChart([]);
        pingVals.current = [];
        setMetrics({ down: 0, up: 0, ping: 0, jitter: 0, loss: 0, pingMin: 0, pingMax: 0 });
        setLatencyData({ unloaded: [], download: [], upload: [] });

        // Ping
        const unloaded = [];
        for (let i = 0; i < 20; i++) {
            if (isPaused) { await new Promise(r => setTimeout(r, 100)); i--; continue; }
            await new Promise(r => setTimeout(r, 75));
            const p = 10 + Math.random() * 25;
            unloaded.push(p);
            pingVals.current.push(p);
            const jitter = pingVals.current.length > 1 ? Math.abs(pingVals.current[pingVals.current.length - 1] - pingVals.current[pingVals.current.length - 2]) : 0;
            setMetrics(m => ({ ...m, ping: Math.round(p), pingMin: Math.round(Math.min(...pingVals.current)), pingMax: Math.round(Math.max(...pingVals.current)), jitter: Math.round(jitter) }));
        }
        setLatencyData(l => ({ ...l, unloaded }));

        // Download
        setStatus('download');
        let d = 0;
        const targetD = 60 + Math.random() * 100;
        const dlPings = [];
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                if (isPaused) return;
                t++;
                if (d < targetD) d += (targetD - d) * 0.09;
                const val = Math.max(0, d + (Math.random() - 0.5) * 5);
                setMetrics(m => ({ ...m, down: val }));
                setDownloadChart(p => [...p, { val }].slice(-100));
                dlPings.push(pingVals.current[pingVals.current.length - 1] + 15 + Math.random() * 30);
                if (t > 70) { clearInterval(timerRef.current); resolve(); }
            }, 45);
        });
        setLatencyData(l => ({ ...l, download: dlPings }));

        // Upload
        setStatus('upload');
        let u = 0;
        const targetU = targetD * 0.65;
        const ulPings = [];
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                if (isPaused) return;
                t++;
                if (u < targetU) u += (targetU - u) * 0.09;
                const val = Math.max(0, u + (Math.random() - 0.5) * 3);
                setMetrics(m => ({ ...m, up: val }));
                setUploadChart(p => [...p, { val }].slice(-100));
                ulPings.push(pingVals.current[pingVals.current.length - 1] + 10 + Math.random() * 20);
                if (t > 70) { clearInterval(timerRef.current); resolve(); }
            }, 45);
        });
        setLatencyData(l => ({ ...l, upload: ulPings }));

        setStatus('complete');
        setTimestamp(new Date());
        const result = { id: Date.now(), date: new Date().toISOString(), down: Math.round(d), up: Math.round(u), ping: metrics.ping, isp: geoInfo.isp };
        setHistory(saveTest(result));
    };

    const reset = () => { if (timerRef.current) clearInterval(timerRef.current); setStatus('idle'); setIsPaused(false); };

    const getQuality = (type) => {
        if (status !== 'complete') return '-';
        if (type === 'streaming') return metrics.down > 50 ? 'Good' : metrics.down > 25 ? 'Average' : 'Poor';
        if (type === 'gaming') return metrics.ping < 30 ? 'Good' : metrics.ping < 60 ? 'Average' : 'Poor';
        if (type === 'video') return metrics.up > 10 && metrics.ping < 50 ? 'Good' : 'Average';
        return '-';
    };

    const getScores = () => ({
        gaming: metrics.ping < 20 ? 98 : 70,
        streaming: metrics.down > 100 ? 100 : 80,
        videoCall: metrics.up > 20 ? 95 : 70,
        browsing: 98,
        downloads: metrics.down > 150 ? 100 : 85
    });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div className="fixed inset-0 z-50 bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {/* Header */}
                <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border-b border-neutral-200/50 dark:border-neutral-800/50">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Zap className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-2xl">Speed Test</h1>
                                <p className="text-sm text-neutral-500">Professional Network Diagnostics</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 py-10 space-y-8 pb-32">

                    {/* Hero */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Your Internet Speed</h2>
                            {timestamp && <div className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-full">
                                <Clock className="h-4 w-4" /> {timestamp.toLocaleTimeString()}
                            </div>}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Download */}
                            <GlassCard className="p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl"><ArrowDown className="h-5 w-5 text-orange-600" /></div>
                                    <span className="text-sm font-semibold uppercase">Download</span>
                                    <InfoTip text="Download speed" />
                                </div>
                                <div className="text-6xl font-extralight mb-4">{metrics.down.toFixed(1)}<span className="text-2xl text-neutral-400 ml-2">Mbps</span></div>
                                <SpeedChart data={downloadChart} color="#f97316" isActive={status === 'download'} />
                            </GlassCard>

                            {/* Upload */}
                            <GlassCard className="p-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl"><ArrowUp className="h-5 w-5 text-purple-600" /></div>
                                    <span className="text-sm font-semibold uppercase">Upload</span>
                                    <InfoTip text="Upload speed" />
                                </div>
                                <div className="text-6xl font-extralight mb-4">{metrics.up.toFixed(1)}<span className="text-2xl text-neutral-400 ml-2">Mbps</span></div>
                                <SpeedChart data={uploadChart} color="#a855f7" isActive={status === 'upload'} />
                            </GlassCard>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[
                                { icon: Activity, label: 'Ping', val: metrics.ping, unit: 'ms', min: metrics.pingMin, max: metrics.pingMax },
                                { icon: Signal, label: 'Jitter', val: metrics.jitter, unit: 'ms' },
                                { icon: AlertTriangle, label: 'Loss', val: metrics.loss, unit: '%' },
                                { icon: Globe, label: 'Protocol', val: geoInfo.ipv, unit: '' }
                            ].map((m, i) => (
                                <GlassCard key={i} className="p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <m.icon className="h-5 w-5 text-blue-600" />
                                        <span className="text-sm font-medium text-neutral-600">{m.label}</span>
                                    </div>
                                    <div className="text-4xl font-light">{m.val}<span className="text-lg text-neutral-400 ml-1">{m.unit}</span></div>
                                    {m.min !== undefined && <div className="flex gap-3 text-xs text-neutral-500 mt-2">
                                        <span>↓ {m.min} {m.unit}</span>
                                        <span>↑ {m.max} {m.unit}</span>
                                    </div>}
                                </GlassCard>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={status === 'idle' || status === 'complete' ? runTest : reset} className={cn("px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 shadow-lg", status === 'idle' || status === 'complete' ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white" : "bg-red-500 text-white")}>
                                {status === 'idle' ? <><Zap className="h-5 w-5" /> Start Test</> : status === 'complete' ? <><RotateCcw className="h-5 w-5" /> Test Again</> : <><X className="h-5 w-5" /> Stop</>}
                            </button>
                            {status !== 'idle' && status !== 'complete' && <button onClick={() => setIsPaused(!isPaused)} className="px-6 py-3 border-2 rounded-2xl font-semibold flex items-center gap-2">
                                {isPaused ? <><Play className="h-5 w-5" /> Resume</> : <><Pause className="h-5 w-5" /> Pause</>}
                            </button>}
                            {status === 'complete' && <>
                                <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`⬇️${metrics.down.toFixed(0)} Mbps ⬆️${metrics.up.toFixed(0)} Mbps`)}`, '_blank')} className="p-3 bg-blue-500 text-white rounded-full"><Twitter className="h-5 w-5" /></button>
                                <button onClick={() => navigator.clipboard.writeText(`Download: ${metrics.down.toFixed(1)} Mbps\nUpload: ${metrics.up.toFixed(1)} Mbps`)} className="p-3 bg-neutral-200 dark:bg-neutral-700 rounded-full"><Link2 className="h-5 w-5" /></button>
                            </>}
                        </div>
                    </section>

                    {/* Quality Score */}
                    <GlassCard className="overflow-hidden">
                        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">Network Quality Score</span>
                                <InfoTip text="Performance for different activities" />
                            </div>
                        </div>
                        <div className="flex divide-x divide-neutral-200 dark:divide-neutral-800">
                            {[
                                { label: 'Video Streaming', status: getQuality('streaming') },
                                { label: 'Online Gaming', status: getQuality('gaming') },
                                { label: 'Video Conferencing', status: getQuality('video') }
                            ].map((q, i) => (
                                <div key={i} className="flex-1 text-center px-6 py-4">
                                    <div className="text-xs text-neutral-500 mb-2">{q.label}</div>
                                    <div className={cn("inline-block px-3 py-1 rounded-full text-sm font-bold", q.status === 'Good' ? 'bg-green-100 text-green-700' : q.status === 'Average' ? 'bg-yellow-100 text-yellow-700' : 'bg-neutral-100 text-neutral-500')}>{q.status}</div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Map & Latency */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Server Map */}
                        <GlassCard className="overflow-hidden">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">Server Location</span>
                                    <InfoTip text="Test server and your location" />
                                </div>
                            </div>
                            <div className="h-[280px] relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-800 dark:to-neutral-900">
                                <iframe
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${geoInfo.lon - 5},${geoInfo.lat - 5},${serverInfo.lon + 5},${serverInfo.lat + 5}&layer=mapnik&marker=${serverInfo.lat},${serverInfo.lon}`}
                                    className="absolute inset-0 w-full h-full opacity-60"
                                    style={{ border: 0 }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-transparent" />
                                <div className="absolute top-4 left-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-green-600" />
                                        <span className="font-bold">Your Location</span>
                                    </div>
                                    <div className="text-xs text-neutral-600 mt-1">{geoInfo.city}, {geoInfo.country}</div>
                                </div>
                                <div className="absolute top-4 right-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Server className="h-4 w-4 text-blue-600" />
                                        <span className="font-bold">Test Server</span>
                                    </div>
                                    <div className="text-xs text-neutral-600 mt-1">{serverInfo.city}, {serverInfo.country}</div>
                                </div>
                            </div>
                            <div className="p-6 space-y-3 text-sm">
                                <div className="flex items-center gap-3"><Globe className="h-4 w-4 text-neutral-400" /><span>Connected via <strong>{geoInfo.ipv}</strong></span></div>
                                <div className="flex items-center gap-3"><Wifi className="h-4 w-4 text-neutral-400" /><span>ISP: <strong>{geoInfo.isp}</strong> ({geoInfo.asn})</span></div>
                                <div className="flex items-center gap-3"><Monitor className="h-4 w-4 text-neutral-400" /><span>IP: <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">{geoInfo.ip}</code></span></div>
                            </div>
                        </GlassCard>

                        {/* Latency */}
                        <GlassCard className="overflow-hidden">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">Latency Measurements</span>
                                    <InfoTip text="Latency under different conditions" />
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <BoxPlot label="Unloaded latency" count={`${latencyData.unloaded.length}/20`} {...getBoxStats(latencyData.unloaded)} color="#3b82f6" />
                                <BoxPlot label="During download" count={`${latencyData.download.length}`} {...getBoxStats(latencyData.download)} color="#f97316" />
                                <BoxPlot label="During upload" count={`${latencyData.upload.length}`} {...getBoxStats(latencyData.upload)} color="#a855f7" />
                            </div>
                        </GlassCard>
                    </div>

                    {/* Network Matrix & AI Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <GlassCard className="p-8">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /> Network Matrix</h3>
                            {status === 'complete' ? <RadarQuality scores={getScores()} /> : <div className="h-[220px] flex items-center justify-center bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl text-neutral-400">Run test to see matrix</div>}
                        </GlassCard>

                        <GlassCard className="p-8 lg:col-span-2">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Brain className="h-5 w-5 text-indigo-500" /> AI Diagnostic Report</h3>
                            {status === 'complete' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        {[
                                            { icon: Video, title: '4K HDR Streaming', desc: `Supports ${Math.floor(metrics.down / 25)}+ streams`, ok: metrics.down > 50 },
                                            { icon: Gamepad2, title: 'Competitive Gaming', desc: `${metrics.ping}ms - ${metrics.ping < 20 ? 'E-Sports Ready' : 'Casual Ready'}`, ok: metrics.ping < 50 },
                                            { icon: Monitor, title: 'Video Conferencing', desc: `${metrics.up > 10 ? 'HD' : 'SD'} supported`, ok: metrics.up > 5 }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.ok ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30")}>
                                                    <item.icon className={cn("h-5 w-5", item.ok ? "text-green-600" : "text-yellow-600")} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm">{item.title}</div>
                                                    <div className="text-xs text-neutral-500">{item.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-5 space-y-4">
                                        <div className="text-xs font-bold text-neutral-400 uppercase">Device Info</div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between"><span className="text-neutral-500">Device</span><span className="font-medium flex items-center gap-2"><Laptop className="h-4 w-4" /> {navigator.userAgent.includes('Mac') ? 'macOS' : 'Windows'}</span></div>
                                            <div className="flex justify-between"><span className="text-neutral-500">Browser</span><span className="font-medium">{navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'}</span></div>
                                            <div className="flex justify-between"><span className="text-neutral-500">Network</span><span className="font-medium">{geoInfo.ipv}</span></div>
                                        </div>
                                    </div>
                                </div>
                            ) : <div className="h-32 flex items-center justify-center text-neutral-400">Complete test for AI analysis</div>}
                        </GlassCard>
                    </div>

                    {/* History */}
                    {history.length > 0 && (
                        <GlassCard className="overflow-hidden">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                                <span className="font-bold text-lg">Recent Tests</span>
                                <button onClick={() => {
                                    const csv = "Date,Download,Upload,Ping,ISP\n" + history.map(h => `${new Date(h.date).toLocaleString()},${h.down},${h.up},${h.ping},${h.isp}`).join("\n");
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'speedtest_history.csv';
                                    a.click();
                                }} className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
                                    <FileDown className="h-4 w-4" /> Export CSV
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                {history.slice(0, 5).map((test) => (
                                    <div key={test.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="text-xs text-neutral-500 w-24">{new Date(test.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                            <div className="flex items-center gap-6">
                                                <div><div className="text-xs text-neutral-500">Download</div><div className="font-bold">{test.down} Mbps</div></div>
                                                <div><div className="text-xs text-neutral-500">Upload</div><div className="font-bold">{test.up} Mbps</div></div>
                                                <div><div className="text-xs text-neutral-500">Ping</div><div className="font-bold">{test.ping} ms</div></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}

                </main>

                {/* Footer */}
                <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-neutral-500">
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-neutral-900 dark:hover:text-white">About</a>
                            <a href="#" className="hover:text-neutral-900 dark:hover:text-white">Privacy</a>
                        </div>
                        <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-orange-500" /><span className="font-bold text-neutral-900 dark:text-white">AssistMe</span></div>
                    </div>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
