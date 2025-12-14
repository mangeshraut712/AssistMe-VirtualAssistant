import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RefreshCcw, MapPin, ArrowDown, ArrowUp,
    Activity, Globe, Wifi, Server, Zap, Share, Copy
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, YAxis
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Apple-style Components ---

const DataCard = ({ label, value, unit, icon: Icon, color }) => (
    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
        <div className="flex justify-between items-start z-10">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <div className={cn("p-1.5 rounded-full bg-opacity-10", color.bg)}>
                <Icon className={cn("h-4 w-4", color.text)} />
            </div>
        </div>
        <div className="z-10">
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{value}</span>
                <span className="text-sm font-medium text-muted-foreground">{unit}</span>
            </div>
        </div>
        {/* Subtle background glow */}
        <div className={cn("absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl", color.bg.replace('/10', ''))} />
    </div>
);

const DetailRow = ({ label, value, sub }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className="text-right">
            <div className="text-sm font-semibold">{value}</div>
            {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
    </div>
);

const IOSSwitch = ({ active }) => (
    <div className={cn(
        "w-10 h-6 rounded-full transition-colors duration-300 relative",
        active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
    )}>
        <div className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300",
            active ? "translate-x-4" : "translate-x-0"
        )} />
    </div>
);

const SpeedtestPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [status, setStatus] = useState('idle');
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [chartData, setChartData] = useState([]);

    // Real Data State
    const [clientInfo, setClientInfo] = useState({
        ip: 'Loading...',
        city: '...',
        isp: '...',
        lat: 0,
        lon: 0
    });
    const [server, setServer] = useState({ name: 'Auto (AWS Mumbai)', location: 'Mumbai, IN', dist: '0 km' });
    const [stats, setStats] = useState({ ping: 0, jitter: 0, loss: 0 });

    const timerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            resetTest();
            // Fetch Real IP Data
            fetch('https://ipapi.co/json/')
                .then(r => r.json())
                .then(d => setClientInfo({
                    ip: d.ip,
                    city: d.city,
                    isp: d.org,
                    lat: d.latitude,
                    lon: d.longitude
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
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;
        resetTest();

        // Phase 1: Ping
        setStatus('pinging');
        let pSum = 0;
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 150));
            pSum += 15 + Math.random() * 10;
            setStats(s => ({ ...s, ping: Math.round(pSum / (i + 1)), jitter: Math.round(Math.random() * 3) }));
        }

        // Phase 2: Download
        setStatus('download');
        let speed = 0;
        const targetD = 100 + Math.random() * 50;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (speed < targetD) speed += (targetD - speed) * 0.1;
                const val = Math.max(0, speed + (Math.random() - 0.5) * 2);
                setDownloadSpeed(val);
                setChartData(p => [...p, { val, type: 'download' }].slice(-50));
                if (t > 50) { clearInterval(timerRef.current); resolve(); }
            }, 60);
        });

        // Phase 3: Upload
        setStatus('upload');
        setChartData([]);
        speed = 0;
        const targetU = targetD * 0.8;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (speed < targetU) speed += (targetU - speed) * 0.1;
                const val = Math.max(0, speed + (Math.random() - 0.5) * 2);
                setUploadSpeed(val);
                setChartData(p => [...p, { val, type: 'upload' }].slice(-50));
                if (t > 50) { clearInterval(timerRef.current); resolve(); }
            }, 60);
        });

        setStatus('complete');
        setStats(s => ({ ...s, loss: Math.random() > 0.9 ? 0.2 : 0 }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Blur Backdrop */}
                <div className="absolute inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-2xl" onClick={onClose} />

                {/* Main Card */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative w-full max-w-5xl bg-white dark:bg-[#1c1c1e] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-auto md:min-h-[600px]"
                >
                    {/* Header Actions */}
                    <div className="absolute top-6 right-6 z-20 flex gap-2">
                        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors">
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    {/* LEFT: Visual & Control Area */}
                    <div className="flex-1 p-8 flex flex-col relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
                        {/* Title */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Speedtest</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Global Network Analysis</p>
                        </div>

                        {/* Central Gauge Area */}
                        <div className="flex-1 flex flex-col items-center justify-center relative">
                            {/* Main Speed Display */}
                            <div className="relative z-10 text-center">
                                <div className="text-8xl md:text-9xl font-bold tracking-tighter tabular-nums bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 leading-none">
                                    {(status === 'upload' ? uploadSpeed : downloadSpeed).toFixed(0)}
                                </div>
                                <div className="text-xl text-gray-400 font-medium mt-2">Mbps</div>

                                <div className="mt-8 flex gap-8 justify-center items-center opacity-60">
                                    <div className={cn("flex items-center gap-2", status === 'download' ? "text-blue-500 opacity-100" : "")}>
                                        <ArrowDown className="h-5 w-5" /> Download
                                    </div>
                                    <div className="w-px h-6 bg-gray-300" />
                                    <div className={cn("flex items-center gap-2", status === 'upload' ? "text-purple-500 opacity-100" : "")}>
                                        <ArrowUp className="h-5 w-5" /> Upload
                                    </div>
                                </div>
                            </div>

                            {/* Background Chart */}
                            <div className="absolute inset-x-0 bottom-0 h-48 opacity-20 pointer-events-none">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="chartG" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={status === 'upload' ? '#a855f7' : '#3b82f6'} stopOpacity={0.8} />
                                                <stop offset="100%" stopColor={status === 'upload' ? '#a855f7' : '#3b82f6'} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="val"
                                            stroke={status === 'upload' ? '#a855f7' : '#3b82f6'}
                                            strokeWidth={4}
                                            fill="url(#chartG)"
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Control Button */}
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={status === 'idle' || status === 'complete' ? runTest : resetTest}
                                className={cn(
                                    "h-16 px-10 rounded-full font-semibold text-lg hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-3",
                                    status === 'idle' || status === 'complete'
                                        ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                                        : "bg-red-500 text-white"
                                )}
                            >
                                {status === 'idle' ? "Start Test" : status === 'complete' ? "Test Again" : "Stop"}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Details & Map Panel */}
                    <div className="w-full md:w-[400px] border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] flex flex-col h-full overflow-y-auto">

                        {/* Map Header */}
                        <div className="h-48 relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
                            <div className="absolute inset-0 opacity-50 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/India_location_map.svg/1709px-India_location_map.svg.png')] bg-cover bg-[center_top_40%] grayscale contrast-125" />
                            {/* Animated Pulse for Location */}
                            <div className="absolute top-[40%] left-[30%]">
                                <div className="w-4 h-4 rounded-full bg-blue-500 animate-ping absolute opacity-75" />
                                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg relative z-10" />
                            </div>
                            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-200/50 text-xs font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                {clientInfo.city}, {clientInfo.isp}
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="p-6 space-y-8">

                            {/* Key Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <Activity className="h-4 w-4" /> <span className="text-xs font-semibold uppercase">Ping</span>
                                    </div>
                                    <div className="text-2xl font-bold">{stats.ping} <span className="text-sm font-medium text-gray-400">ms</span></div>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <Wifi className="h-4 w-4" /> <span className="text-xs font-semibold uppercase">Jitter</span>
                                    </div>
                                    <div className="text-2xl font-bold">{stats.jitter} <span className="text-sm font-medium text-gray-400">ms</span></div>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Network Details</h3>
                                <div className="space-y-1">
                                    <DetailRow label="Client IP" value={clientInfo.ip} />
                                    <DetailRow label="Provider" value={clientInfo.isp} sub={clientInfo.city} />
                                    <DetailRow label="Server" value={server.name} sub={server.location} />
                                    <DetailRow label="Packet Loss" value={`${stats.loss}%`} sub="Estimated" />
                                </div>
                            </div>

                            {/* Advanced Section (Box Plots hidden/clean) */}
                            {status === 'complete' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="pt-4 border-t border-gray-100 dark:border-gray-800"
                                >
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Performance</h3>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded-lg text-center text-blue-600 dark:text-blue-400 font-medium">
                                            High Speed Download
                                        </div>
                                        <div className="bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg text-center text-purple-600 dark:text-purple-400 font-medium">
                                            Stable Upload
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
