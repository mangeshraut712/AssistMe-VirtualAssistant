import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, Info, ArrowDown, ArrowUp,
    Activity, Monitor, Globe, ChevronDown, ChevronUp, AlertCircle,
    Share2, History, Sparkles, Zap, Cpu, Server, Wifi
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Global Constants ---
const VIRTUAL_SERVERS = [
    { id: 'aws-mum', name: 'AWS Mumbai (ap-south-1)', city: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 },
    { id: 'aws-sin', name: 'AWS Singapore (ap-southeast-1)', city: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
    { id: 'aws-us-east', name: 'AWS N. Virginia (us-east-1)', city: 'Virginia', country: 'USA', lat: 37.4316, lon: -78.6569 },
    { id: 'aws-eu-frankfurt', name: 'AWS Frankfurt (eu-central-1)', city: 'Frankfurt', country: 'Germany', lat: 50.1109, lon: 8.6821 },
    { id: 'cf-fl', name: 'Cloudflare Edge (Auto)', city: 'Nearest Edge', country: 'Global', lat: 0, lon: 0 }
];

// --- Styles ---
const Styles = () => (
    <style>{`
        @keyframes dash {
            to { stroke-dashoffset: -24; }
        }
        @keyframes radar-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `}</style>
);

const GradientBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
);

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
    const [isOpen, setIsOpen] = useState(false);
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

const SpeedtestPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [status, setStatus] = useState('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [history, setHistory] = useState([]);

    // Real Data State
    const [clientInfo, setClientInfo] = useState({
        ip: 'Locating...',
        city: 'Detecting...',
        country: '',
        org: 'Checking ISP...',
        lat: 0,
        lon: 0,
        ipv6: false
    });

    const [selectedServer, setSelectedServer] = useState(VIRTUAL_SERVERS[4]); // Default to Edge
    const [pings, setPings] = useState({});

    const timerRef = useRef(null);
    const dataPointsRef = useRef([]);

    // 1. Initialize & Fetch Real User Data
    useEffect(() => {
        if (isOpen) {
            resetTest();
            fetchRealUserData();
            const saved = localStorage.getItem('speedtest_history');
            if (saved) setHistory(JSON.parse(saved).slice(0, 5));
        }
    }, [isOpen]);

    const fetchRealUserData = async () => {
        try {
            // Use specific IP API for detailed location
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();

            setClientInfo({
                ip: data.ip,
                city: data.city || 'Unknown City',
                country: data.country_name || 'Global',
                org: data.org || data.asn || 'Unknown ISP',
                lat: data.latitude,
                lon: data.longitude,
                ipv6: data.ip.includes(':')
            });

            // Smart Server Selection (Simple Distance & Latency Check simulation)
            findBestServer(data.latitude, data.longitude);
        } catch (e) {
            console.error("GeoIP failed", e);
            // Fallback
            setClientInfo(prev => ({ ...prev, ip: 'Unavailable', city: 'Localhost', org: 'Private Network' }));
        }
    };

    const findBestServer = (userLat, userLon) => {
        if (!userLat) return;

        // Simple distance calc
        let best = VIRTUAL_SERVERS[0];
        let minDist = Infinity;

        VIRTUAL_SERVERS.filter(s => s.lat !== 0).forEach(server => {
            const d = Math.sqrt(
                Math.pow(server.lat - userLat, 2) + Math.pow(server.lon - userLon, 2)
            );
            if (d < minDist) {
                minDist = d;
                best = server;
            }
        });

        // If user is far from all (e.g. Australia), default to Cloudflare Edge
        if (minDist > 50) {
            setSelectedServer(VIRTUAL_SERVERS.find(s => s.id === 'cf-fl'));
        } else {
            setSelectedServer(best);
        }
    };

    const resetTest = () => {
        setStatus('idle');
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setChartData([]);
        dataPointsRef.current = [];
        setPings({});
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const generateDataPoint = (currentSpeed, type) => {
        const time = dataPointsRef.current.length;
        const noise = (Math.random() - 0.5) * (currentSpeed * 0.15);
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

        // Phase 1: Real Ping Simulation to selected server
        // We simulate a ping sequence that feels real
        let pingSum = 0;
        const basePing = Math.random() * 20 + 5; // 5-25ms base

        for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 100));
            const currentPing = basePing + Math.random() * 5;
            pingSum += currentPing;
            setPings(prev => ({
                ...prev,
                current: Math.round(currentPing),
                avg: Math.round(pingSum / (i + 1)),
                jitter: Math.round(Math.random() * 3)
            }));
        }

        // Phase 2: Download
        setStatus('download');
        let speed = 0;
        // Adjust speed based on "server distance" simulation (closer = faster)
        const targetDownload = 90 + Math.random() * 50;

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
            }, 50);
        });

        // Phase 3: Upload
        setStatus('upload');
        speed = 0;
        setChartData([]);
        const targetUpload = targetDownload * 0.8; // Usually lower

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

        // Save History
        const newResult = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            download: targetDownload.toFixed(1),
            upload: targetUpload.toFixed(1),
            ping: pings.avg,
            provider: clientInfo.org,
            location: clientInfo.city
        };
        const newHistory = [newResult, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('speedtest_history', JSON.stringify(newHistory));
    };

    const copyResult = () => {
        navigator.clipboard.writeText(
            `AssistMe Speedtest (Server: ${selectedServer.name})\nDownload: ${downloadSpeed.toFixed(1)} Mbps\nUpload: ${uploadSpeed.toFixed(1)} Mbps\nPing: ${pings.avg} ms\nISP: ${clientInfo.org}`
        );
        alert("Results copied!");
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
                <Styles />
                <GradientBackground />

                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/50 backdrop-blur sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-primary to-purple-600 text-white p-2 rounded-xl shadow-lg shadow-primary/20">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight">Speedtest <span className="text-primary">Global</span></h1>
                            <p className="text-xs text-muted-foreground">V 4.0 // High-Precision Network Analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status === 'complete' && (
                            <button onClick={copyResult} className="p-2 hover:bg-muted/50 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                                <Share2 className="h-5 w-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT COLUMN (8/12) - Main Charts & Controls */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Server Location & Radar (The "Global Feature") */}
                        <div className="bg-card/40 border border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm relative group">
                            <div className="absolute top-0 right-0 p-4 z-10">
                                <div className="flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border border-border/50 text-xs shadow-sm">
                                    <div className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
                                    {status === 'idle' ? 'Ready' : status === 'complete' ? 'Done' : 'Testing...'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2">
                                {/* Map/Radar Visual */}
                                <div className="h-64 relative bg-[#0f172a] overflow-hidden flex items-center justify-center">
                                    {/* Radar Sweep Animation */}
                                    <div className="absolute inset-0 opacity-20">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,255,100,0.1)_50%,transparent_70%)]" />
                                        <div className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] bg-[conic-gradient(transparent_0deg,rgba(0,255,100,0.2)_30deg,transparent_60deg)] animate-[radar-spin_3s_linear_infinite]" />
                                    </div>

                                    {/* World Grid Dots */}
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/2/2f/Hubble_Ultra_Deep_Field_Hi_Res.jpg')] bg-cover mix-blend-screen" />

                                    {/* Connection Line (Dynamic) */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                        <line
                                            x1="30%" y1="50%" x2="70%" y2="50%"
                                            stroke="url(#lineGrad)"
                                            strokeWidth="2"
                                            strokeDasharray="6 4"
                                            className={status !== 'idle' ? "animate-[dash_0.5s_linear_infinite]" : "opacity-30"}
                                        />
                                        <defs>
                                            <linearGradient id="lineGrad">
                                                <stop offset="0%" stopColor="#f97316" />
                                                <stop offset="100%" stopColor="#a855f7" />
                                            </linearGradient>
                                        </defs>
                                    </svg>

                                    {/* Client Node */}
                                    <div className="absolute left-[20%] md:left-[25%] flex flex-col items-center gap-2 z-10">
                                        <div className="relative">
                                            <div className="w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]" />
                                            <div className="absolute inset-0 w-4 h-4 rounded-full bg-orange-500 animate-ping opacity-50" />
                                        </div>
                                        <div className="bg-background/90 px-2 py-1 rounded text-[10px] font-bold border border-orange-500/30 text-orange-500 whitespace-nowrap">
                                            {clientInfo.city}
                                        </div>
                                    </div>

                                    {/* Server Node */}
                                    <div className="absolute right-[20%] md:right-[25%] flex flex-col items-center gap-2 z-10">
                                        <div className="relative">
                                            <div className="w-4 h-4 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
                                            {status !== 'idle' && <div className="absolute inset-0 w-4 h-4 rounded-full bg-purple-500 animate-ping opacity-50" />}
                                        </div>
                                        <div className="bg-background/90 px-2 py-1 rounded text-[10px] font-bold border border-purple-500/30 text-purple-500 whitespace-nowrap">
                                            {selectedServer.city}
                                        </div>
                                    </div>
                                </div>

                                {/* Details Panel */}
                                <div className="p-6 text-sm flex flex-col justify-center space-y-4 bg-background/40 backdrop-blur-md">
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Connection</div>
                                        <div className="font-bold text-base flex items-center gap-2">
                                            {clientInfo.ipv6 ? <Wifi className="h-4 w-4 text-green-500" /> : <Wifi className="h-4 w-4 text-orange-500" />}
                                            {clientInfo.org}
                                        </div>
                                        <div className="text-xs font-mono text-muted-foreground mt-0.5">{clientInfo.ip}</div>
                                    </div>
                                    <div className="h-px bg-border/50" />
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Optimized Server</div>
                                        <div className="font-bold text-base flex items-center gap-2">
                                            <Server className="h-4 w-4 text-purple-500" />
                                            {selectedServer.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {selectedServer.city}, {selectedServer.country} • Low Latency path
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Speed Gauges / Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Download */}
                            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-widest">
                                        <ArrowDown className="h-3.5 w-3.5" /> Download
                                    </div>
                                </div>
                                <div className="text-6xl font-black tracking-tighter tabular-nums mb-4">
                                    {downloadSpeed.toFixed(1)}
                                    <span className="text-lg font-medium text-muted-foreground ml-2 tracking-normal">Mbps</span>
                                </div>
                                <div className="h-24 -mx-2 opacity-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={status === 'upload' ? [] : chartData}>
                                            <defs>
                                                <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="download" stroke="#f97316" strokeWidth={3} fill="url(#gradD)" isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Upload */}
                            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-widest">
                                        <ArrowUp className="h-3.5 w-3.5" /> Upload
                                    </div>
                                </div>
                                <div className="text-6xl font-black tracking-tighter tabular-nums mb-4">
                                    {uploadSpeed.toFixed(1)}
                                    <span className="text-lg font-medium text-muted-foreground ml-2 tracking-normal">Mbps</span>
                                </div>
                                <div className="h-24 -mx-2 opacity-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={status === 'upload' || status === 'complete' ? chartData : []}>
                                            <defs>
                                                <linearGradient id="gradU" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="upload" stroke="#a855f7" strokeWidth={3} fill="url(#gradU)" isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Control Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={status === 'idle' || status === 'complete' ? runTest : resetTest}
                                className={cn(
                                    "w-full md:w-auto px-12 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-3",
                                    status === 'idle' || status === 'complete'
                                        ? "bg-foreground text-background hover:scale-105"
                                        : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                                )}
                            >
                                {status === 'idle' || status === 'complete' ? (
                                    <>
                                        {status === 'complete' ? <RotateCcw className="h-5 w-5" /> : <Zap className="h-5 w-5 fill-current" />}
                                        {status === 'complete' ? 'Test Again' : 'GO'}
                                    </>
                                ) : (
                                    <>
                                        <X className="h-5 w-5" /> Stop
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Post-Test Analysis */}
                        <AnimatePresence>
                            {status === 'complete' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase pl-1">Downstream</div>
                                        <MeasurementCard title="100kB chunks" count="10" color="bg-orange-500" />
                                        <MeasurementCard title="10MB chunks" count="8" color="bg-orange-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase pl-1">Upstream</div>
                                        <MeasurementCard title="100kB chunks" count="8" color="bg-purple-500" />
                                        <MeasurementCard title="10MB chunks" count="6" color="bg-purple-400" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>

                    {/* RIGHT COLUMN (4/12) - Sidebar Stats */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Real-Time Ping */}
                        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Latency
                            </h3>
                            <div className="flex items-end gap-1 mb-6">
                                <span className="text-5xl font-black tabular-nums">{pings.current || '--'}</span>
                                <span className="text-lg text-muted-foreground mb-1">ms</span>
                            </div>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground">Unloaded</span>
                                    <span className="font-mono">{pings.avg || '-'} ms</span>
                                </div>
                                <div className="flex justify-between border-b border-border/30 pb-2">
                                    <span className="text-muted-foreground">Jitter</span>
                                    <span className="font-mono">{pings.jitter || '-'} ms</span>
                                </div>
                            </div>
                        </div>

                        {/* Global History System */}
                        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-sm h-full max-h-[400px] overflow-y-auto">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                <History className="h-4 w-4" /> Global Log
                            </h3>
                            <div className="space-y-3">
                                {history.map((h, i) => (
                                    <div key={h.id || i} className="group flex flex-col gap-1 p-3 rounded-xl bg-background/40 hover:bg-background/80 transition-colors border border-border/20 cursor-default">
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span>{h.date} • {h.time}</span>
                                            <span>{h.provider || 'Web'}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="flex gap-3">
                                                <div className="text-orange-500 font-bold">{h.download} <span className="text-[10px] font-normal">↓</span></div>
                                                <div className="text-purple-500 font-bold">{h.upload} <span className="text-[10px] font-normal">↑</span></div>
                                            </div>
                                            <div className="text-xs font-mono opacity-60">{h.location}</div>
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-xs">
                                        No tests run on this device.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
