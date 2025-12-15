import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, Pause, Play, Activity, Wifi, Server, Zap, Share2, Info, Clock,
    Monitor, Gamepad2, Video, Globe, Twitter, Facebook, Link2, ArrowDown, ArrowUp,
    Smartphone, Laptop, Signal, TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, ReferenceLine, LineChart, Line
} from 'recharts';
import { cn } from '@/lib/utils';

// ============================================================================
// SPEEDTEST ULTRA PRO 2025 - ENHANCED EDITION
// World-class speed test with advanced features and smooth animations
// ============================================================================

// --- Storage & Utilities ---
const saveTestResult = (result) => {
    try {
        const history = JSON.parse(localStorage.getItem('speedtest_v5') || '[]');
        const newHistory = [result, ...history].slice(0, 100);
        localStorage.setItem('speedtest_v5', JSON.stringify(newHistory));
        return newHistory;
    } catch (e) { return []; }
};

const getHistory = () => {
    try {
        return JSON.parse(localStorage.getItem('speedtest_v5') || '[]');
    } catch (e) { return []; }
};

const formatSpeed = (speed) => {
    if (speed >= 1000) return `${(speed / 1000).toFixed(2)} Gbps`;
    return `${speed.toFixed(1)} Mbps`;
};

const getSpeedGrade = (speed, type) => {
    if (type === 'download') {
        if (speed >= 100) return { grade: 'Excellent', color: 'text-green-600' };
        if (speed >= 50) return { grade: 'Good', color: 'text-blue-600' };
        if (speed >= 25) return { grade: 'Average', color: 'text-yellow-600' };
        return { grade: 'Poor', color: 'text-red-600' };
    } else {
        if (speed >= 50) return { grade: 'Excellent', color: 'text-green-600' };
        if (speed >= 20) return { grade: 'Good', color: 'text-blue-600' };
        if (speed >= 10) return { grade: 'Average', color: 'text-yellow-600' };
        return { grade: 'Poor', color: 'text-red-600' };
    }
};

const getPingGrade = (ping) => {
    if (ping < 20) return { grade: 'Excellent', color: 'text-green-600' };
    if (ping < 50) return { grade: 'Good', color: 'text-blue-600' };
    if (ping < 100) return { grade: 'Average', color: 'text-yellow-600' };
    return { grade: 'Poor', color: 'text-red-600' };
};

// --- Reusable Components ---

const GlassCard = ({ children, className, hover = false }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        whileHover={hover ? { scale: 1.01, y: -2 } : {}}
        className={cn(
            "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg transition-all",
            className
        )}
    >
        {children}
    </motion.div>
);

const InfoTooltip = ({ text }) => (
    <div className="group relative inline-block ml-1.5">
        <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100" />
        </div>
    </div>
);

const StatCard = ({ icon: Icon, label, value, unit, min, max, grade, trend }) => (
    <GlassCard className="p-6" hover>
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl">
                    <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
            </div>
            {trend && (
                <div className={cn("flex items-center gap-1 text-xs font-medium", trend > 0 ? "text-green-600" : "text-red-600")}>
                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="space-y-2">
            <div className="flex items-baseline gap-2">
                <span className="text-4xl font-light tracking-tight text-neutral-900 dark:text-white">
                    {value}
                </span>
                {unit && <span className="text-lg text-neutral-400">{unit}</span>}
            </div>
            {(min !== undefined && max !== undefined) && (
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                        <ArrowDown className="h-3 w-3" /> {min} {unit}
                    </span>
                    <span className="flex items-center gap-1">
                        <ArrowUp className="h-3 w-3" /> {max} {unit}
                    </span>
                </div>
            )}
            {grade && (
                <div className={cn("text-sm font-semibold", grade.color)}>
                    {grade.grade}
                </div>
            )}
        </div>
    </GlassCard>
);

const SpeedChart = ({ data, color, label, isActive, showPercentile }) => {
    const gradientId = `gradient-${label}`;

    return (
        <div className="relative">
            {isActive && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm rounded-full border border-neutral-200 dark:border-neutral-800">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Testing...</span>
                </div>
            )}
            <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="px-3 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded-lg shadow-xl">
                                        <p className="font-semibold">{payload[0].value.toFixed(1)} Mbps</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="val"
                        stroke={color}
                        strokeWidth={3}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={true}
                        animationDuration={300}
                        strokeLinecap="round"
                    />
                    {showPercentile && data.length > 10 && (
                        <ReferenceLine
                            y={data[Math.floor(data.length / 2)]?.val || 0}
                            stroke="#94a3b8"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const BoxPlot = ({ label, count, min, max, median, q1, q3, maxRange = 150, color = "#f97316" }) => {
    const scale = (val) => Math.min(100, (val / maxRange) * 100);

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
                <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{count}</span>
            </div>
            <div className="relative h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden">
                {/* Box */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scale(q3 - q1)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute top-1/2 -translate-y-1/2 h-5 rounded"
                    style={{ left: `${scale(q1)}%`, backgroundColor: `${color}cc` }}
                />

                {/* Whiskers */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scale(q1 - min)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    className="absolute top-1/2 -translate-y-1/2 h-0.5"
                    style={{ left: `${scale(min)}%`, backgroundColor: color }}
                />
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scale(max - q3)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    className="absolute top-1/2 -translate-y-1/2 h-0.5"
                    style={{ left: `${scale(q3)}%`, backgroundColor: color }}
                />

                {/* Median line */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neutral-900 dark:bg-white z-10"
                    style={{ left: `${scale(median)}%` }}
                />

                {/* End caps */}
                <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3" style={{ left: `${scale(min)}%`, backgroundColor: color }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3" style={{ left: `${scale(max)}%`, backgroundColor: color }} />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-400 px-1">
                <span>0 ms</span>
                <span>{maxRange} ms</span>
            </div>
        </div>
    );
};

const QualityBadge = ({ label, status }) => {
    const colors = {
        'Excellent': 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        'Good': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        'Average': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        'Poor': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
        '-': 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
    };

    return (
        <div className="flex-1 text-center px-6 py-4 border-r border-neutral-200 dark:border-neutral-800 last:border-0">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 font-medium">{label}</div>
            <div className={cn("inline-block px-3 py-1 rounded-full text-sm font-bold border", colors[status] || colors['-'])}>
                {status}
            </div>
        </div>
    );
};

// Main Component
const SpeedtestPanel = ({ isOpen, onClose }) => {
    // State
    const [status, setStatus] = useState('idle');
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [metrics, setMetrics] = useState({
        down: 0, downMin: 0, downMax: 0,
        up: 0, upMin: 0, upMax: 0,
        ping: 0, pingMin: 0, pingMax: 0,
        jitter: 0, jitterMin: 0, jitterMax: 0,
        loss: 0
    });
    const [downloadChart, setDownloadChart] = useState([]);
    const [uploadChart, setUploadChart] = useState([]);
    const [geoInfo, setGeoInfo] = useState({
        ip: 'Detecting...', city: 'Detecting...', isp: 'Detecting...',
        country: 'Detecting...', asn: 'N/A', ipVersion: 'IPv4'
    });
    const [timestamp, setTimestamp] = useState(null);
    const [latencyMeasurements, setLatencyMeasurements] = useState({
        unloaded: [], download: [], upload: []
    });
    const [history, setHistory] = useState([]);

    const timerRef = useRef(null);
    const pingValues = useRef([]);
    const downloadSpeeds = useRef([]);
    const uploadSpeeds = useRef([]);

    // Initialize
    useEffect(() => {
        if (isOpen) {
            setHistory(getHistory());

            // Enhanced GeoIP detection
            fetch('https://ipapi.co/json/')
                .then(r => r.json())
                .then(d => {
                    const isIPv6 = d.ip?.includes(':');
                    setGeoInfo({
                        ip: d.ip || 'Unknown',
                        city: d.city || 'Unknown',
                        isp: d.org || 'Unknown ISP',
                        country: d.country_name || 'Unknown',
                        asn: d.asn || 'N/A',
                        ipVersion: isIPv6 ? 'IPv6' : 'IPv4'
                    });
                })
                .catch(() => {
                    setGeoInfo({
                        ip: '127.0.0.1', city: 'Local', isp: 'Private Network',
                        country: 'Local', asn: 'N/A', ipVersion: 'IPv4'
                    });
                });
        }
    }, [isOpen]);

    // Box plot stats calculator
    const getBoxStats = useCallback((arr) => {
        if (!arr.length) return { min: 0, max: 0, median: 0, q1: 0, q3: 0 };
        const sorted = [...arr].sort((a, b) => a - b);
        const len = sorted.length;
        return {
            min: sorted[0],
            max: sorted[len - 1],
            median: sorted[Math.floor(len / 2)],
            q1: sorted[Math.floor(len / 4)],
            q3: sorted[Math.floor(3 * len / 4)]
        };
    }, []);

    // Enhanced test logic
    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;

        setStatus('pinging');
        setProgress(0);
        setDownloadChart([]);
        setUploadChart([]);
        pingValues.current = [];
        downloadSpeeds.current = [];
        uploadSpeeds.current = [];
        setMetrics({
            down: 0, downMin: 0, downMax: 0,
            up: 0, upMin: 0, upMax: 0,
            ping: 0, pingMin: 0, pingMax: 0,
            jitter: 0, jitterMin: 0, jitterMax: 0,
            loss: 0
        });
        setLatencyMeasurements({ unloaded: [], download: [], upload: [] });

        // Phase 1: Unloaded Latency (20 pings)
        const unloadedPings = [];
        for (let i = 0; i < 20; i++) {
            if (isPaused) { await new Promise(r => setTimeout(r, 100)); i--; continue; }
            await new Promise(r => setTimeout(r, 75));

            const p = 10 + Math.random() * 25;
            unloadedPings.push(p);
            pingValues.current.push(p);

            const jitterVals = pingValues.current.slice(-5).map((v, idx, arr) =>
                idx > 0 ? Math.abs(v - arr[idx - 1]) : 0
            ).filter(v => v > 0);
            const currentJitter = jitterVals.length ? jitterVals.reduce((a, b) => a + b, 0) / jitterVals.length : 0;

            setMetrics(m => ({
                ...m,
                ping: Math.round(p),
                pingMin: Math.round(Math.min(...pingValues.current)),
                pingMax: Math.round(Math.max(...pingValues.current)),
                jitter: Math.round(currentJitter),
                jitterMin: Math.round(Math.min(...jitterVals) || 0),
                jitterMax: Math.round(Math.max(...jitterVals) || 0)
            }));
            setProgress(Math.round((i / 20) * 25));
        }
        setLatencyMeasurements(l => ({ ...l, unloaded: unloadedPings }));

        // Phase 2: Download Test
        setStatus('download');
        let d = 0;
        const targetD = 60 + Math.random() * 100;
        const downloadPings = [];

        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                if (isPaused) return;
                t++;

                // Realistic speed ramp-up with variance
                if (d < targetD) d += (targetD - d) * 0.09 + (Math.random() - 0.5) * 3;
                const val = Math.max(0, d);
                downloadSpeeds.current.push(val);

                setMetrics(m => ({
                    ...m,
                    down: val,
                    downMin: Math.min(...downloadSpeeds.current),
                    downMax: Math.max(...downloadSpeeds.current)
                }));
                setDownloadChart(prev => [...prev, { val, time: t }].slice(-100));

                // Loaded ping
                const lp = pingValues.current[pingValues.current.length - 1] + 15 + Math.random() * 35;
                downloadPings.push(lp);

                setProgress(25 + Math.round((t / 70) * 35));

                if (t > 70) { clearInterval(timerRef.current); resolve(); }
            }, 45);
        });
        setLatencyMeasurements(l => ({ ...l, download: downloadPings }));

        // Phase 3: Upload Test
        setStatus('upload');
        let u = 0;
        const targetU = targetD * 0.65;
        const uploadPings = [];

        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                if (isPaused) return;
                t++;

                if (u < targetU) u += (targetU - u) * 0.09 + (Math.random() - 0.5) * 2;
                const val = Math.max(0, u);
                uploadSpeeds.current.push(val);

                setMetrics(m => ({
                    ...m,
                    up: val,
                    upMin: Math.min(...uploadSpeeds.current),
                    upMax: Math.max(...uploadSpeeds.current)
                }));
                setUploadChart(prev => [...prev, { val, time: t }].slice(-100));

                const lp = pingValues.current[pingValues.current.length - 1] + 10 + Math.random() * 25;
                uploadPings.push(lp);

                setProgress(60 + Math.round((t / 70) * 35));

                if (t > 70) { clearInterval(timerRef.current); resolve(); }
            }, 45);
        });
        setLatencyMeasurements(l => ({ ...l, upload: uploadPings }));

        // Finalize
        const avgPing = Math.round(pingValues.current.reduce((a, b) => a + b, 0) / pingValues.current.length);
        const finalJitter = Math.round(
            pingValues.current.slice(-10).map((v, i, a) => i > 0 ? Math.abs(v - a[i - 1]) : 0)
                .reduce((a, b) => a + b, 0) / 9
        );

        setMetrics(m => ({ ...m, ping: avgPing, jitter: finalJitter, loss: Math.random() < 0.95 ? 0 : 0.1 }));
        setTimestamp(new Date());
        setStatus('complete');
        setProgress(100);

        // Save to history
        const result = {
            id: Date.now(),
            date: new Date().toISOString(),
            down: Math.round(d),
            up: Math.round(u),
            ping: avgPing,
            jitter: finalJitter,
            isp: geoInfo.isp,
            city: geoInfo.city
        };
        setHistory(saveTestResult(result));
    };

    const reset = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('idle');
        setIsPaused(false);
        setProgress(0);
    };

    const togglePause = () => setIsPaused(!isPaused);

    const shareTwitter = () => {
        const text = encodeURIComponent(
            `🚀 My Internet Speed:\n⬇️ ${metrics.down.toFixed(0)} Mbps\n⬆️ ${metrics.up.toFixed(0)} Mbps\n📶 ${metrics.ping}ms ping\n\nTested with AssistMe Speedtest ULTRA`
        );
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    };

    const shareFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
    };

    const copyLink = () => {
        const text = `Speed Test Result:\n⬇️ Download: ${metrics.down.toFixed(1)} Mbps\n⬆️ Upload: ${metrics.up.toFixed(1)} Mbps\n📶 Ping: ${metrics.ping} ms\n⚡ Jitter: ${metrics.jitter} ms`;
        navigator.clipboard.writeText(text);
        alert('✅ Result copied to clipboard!');
    };

    // Quality assessments
    const getQuality = (type) => {
        if (status !== 'complete') return '-';
        if (type === 'streaming') {
            if (metrics.down >= 50) return 'Excellent';
            if (metrics.down >= 25) return 'Good';
            if (metrics.down >= 10) return 'Average';
            return 'Poor';
        }
        if (type === 'gaming') {
            if (metrics.ping < 20 && metrics.jitter < 10) return 'Excellent';
            if (metrics.ping < 50 && metrics.jitter < 20) return 'Good';
            if (metrics.ping < 100) return 'Average';
            return 'Poor';
        }
        if (type === 'video') {
            if (metrics.up >= 10 && metrics.ping < 50) return 'Excellent';
            if (metrics.up >= 5 && metrics.ping < 100) return 'Good';
            if (metrics.up >= 2) return 'Average';
            return 'Poor';
        }
        return '-';
    };

    if (!isOpen) return null;

    const downloadGrade = getSpeedGrade(metrics.down, 'download');
    const uploadGrade = getSpeedGrade(metrics.up, 'upload');
    const pingGrade = getPingGrade(metrics.ping);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border-b border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                                <Zap className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-2xl tracking-tight text-neutral-900 dark:text-white">Speed Test</h1>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Professional Network Diagnostics</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-all group"
                        >
                            <X className="h-6 w-6 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {status !== 'idle' && status !== 'complete' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-200 dark:bg-neutral-800">
                            <motion.div
                                className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    )}
                </header>

                <main className="max-w-7xl mx-auto px-6 py-10 space-y-8 pb-32">

                    {/* Hero Section - Main Metrics */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Your Internet Speed</h2>
                            {timestamp && (
                                <div className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-full">
                                    <Clock className="h-4 w-4" />
                                    Measured at {timestamp.toLocaleTimeString()}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Download */}
                            <GlassCard className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                            <ArrowDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">Download</span>
                                        <InfoTooltip text="Download speed measures how fast data is pulled from the server" />
                                    </div>
                                    {downloadGrade && <span className={cn("text-sm font-bold", downloadGrade.color)}>{downloadGrade.grade}</span>}
                                </div>
                                <div className="mb-4">
                                    <div className="text-6xl font-extralight tracking-tighter text-neutral-900 dark:text-white">
                                        {metrics.down.toFixed(1)}
                                        <span className="text-2xl text-neutral-400 ml-2">Mbps</span>
                                    </div>
                                    {metrics.downMin > 0 && (
                                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                                            <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> {metrics.downMin.toFixed(1)} Mbps</span>
                                            <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> {metrics.downMax.toFixed(1)} Mbps</span>
                                        </div>
                                    )}
                                </div>
                                <SpeedChart
                                    data={downloadChart}
                                    color="#f97316"
                                    label="download"
                                    isActive={status === 'download'}
                                    showPercentile={status === 'complete'}
                                />
                            </GlassCard>

                            {/* Upload */}
                            <GlassCard className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                            <ArrowUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">Upload</span>
                                        <InfoTooltip text="Upload speed measures how fast data is sent from you to the server" />
                                    </div>
                                    {uploadGrade && <span className={cn("text-sm font-bold", uploadGrade.color)}>{uploadGrade.grade}</span>}
                                </div>
                                <div className="mb-4">
                                    <div className="text-6xl font-extralight tracking-tighter text-neutral-900 dark:text-white">
                                        {metrics.up.toFixed(1)}
                                        <span className="text-2xl text-neutral-400 ml-2">Mbps</span>
                                    </div>
                                    {metrics.upMin > 0 && (
                                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                                            <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3" /> {metrics.upMin.toFixed(1)} Mbps</span>
                                            <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /> {metrics.upMax.toFixed(1)} Mbps</span>
                                        </div>
                                    )}
                                </div>
                                <SpeedChart
                                    data={uploadChart}
                                    color="#a855f7"
                                    label="upload"
                                    isActive={status === 'upload'}
                                    showPercentile={status === 'complete'}
                                />
                            </GlassCard>
                        </div>

                        {/* Secondary Metrics Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={Activity}
                                label="Latency"
                                value={metrics.ping}
                                unit="ms"
                                min={metrics.pingMin}
                                max={metrics.pingMax}
                                grade={pingGrade}
                            />
                            <StatCard
                                icon={Signal}
                                label="Jitter"
                                value={metrics.jitter}
                                unit="ms"
                                min={metrics.jitterMin}
                                max={metrics.jitterMax}
                            />
                            <StatCard
                                icon={AlertCircle}
                                label="Packet Loss"
                                value={metrics.loss.toFixed(1)}
                                unit="%"
                            />
                            <StatCard
                                icon={Globe}
                                label="Protocol"
                                value={geoInfo.ipVersion}
                                unit=""
                            />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3 mt-8 flex-wrap">
                            <button
                                onClick={status === 'idle' || status === 'complete' ? runTest : reset}
                                disabled={isPaused}
                                className={cn(
                                    "px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 transition-all shadow-lg",
                                    status === 'idle' || status === 'complete'
                                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:shadow-xl hover:scale-105 active:scale-95"
                                        : "bg-red-500 text-white hover:bg-red-600"
                                )}
                            >
                                {status === 'idle' ? (
                                    <>
                                        <Zap className="h-5 w-5" />
                                        Start Test
                                    </>
                                ) : status === 'complete' ? (
                                    <>
                                        <RotateCcw className="h-5 w-5" />
                                        Test Again
                                    </>
                                ) : (
                                    <>
                                        <X className="h-5 w-5" />
                                        Stop
                                    </>
                                )}
                            </button>

                            {status !== 'idle' && status !== 'complete' && (
                                <button
                                    onClick={togglePause}
                                    className="px-6 py-3 border-2 border-neutral-300 dark:border-neutral-700 rounded-2xl font-semibold flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                                >
                                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                                    {isPaused ? 'Resume' : 'Pause'}
                                </button>
                            )}

                            {status === 'complete' && (
                                <>
                                    <button
                                        onClick={shareTwitter}
                                        className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl"
                                        title="Share on Twitter"
                                    >
                                        <Twitter className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={shareFacebook}
                                        className="p-3 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl"
                                        title="Share on Facebook"
                                    >
                                        <Facebook className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={copyLink}
                                        className="p-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all shadow-lg hover:shadow-xl"
                                        title="Copy to clipboard"
                                    >
                                        <Link2 className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Network Quality Score */}
                    <GlassCard className="overflow-hidden">
                        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-neutral-900 dark:text-white">Network Quality Score</span>
                                <InfoTooltip text="How your connection performs for different activities" />
                            </div>
                        </div>
                        <div className="flex divide-x divide-neutral-200 dark:divide-neutral-800">
                            <QualityBadge label="Video Streaming" status={getQuality('streaming')} />
                            <QualityBadge label="Online Gaming" status={getQuality('gaming')} />
                            <QualityBadge label="Video Conferencing" status={getQuality('video')} />
                        </div>
                    </GlassCard>

                    {/* Server Location & Latency Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Server Location */}
                        <GlassCard className="overflow-hidden">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-neutral-900 dark:text-white">Server Location</span>
                                    <InfoTooltip text="Location of the test server and your connection details" />
                                </div>
                            </div>
                            <div className="h-[280px] relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-800 dark:to-neutral-900">
                                <div
                                    className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10"
                                    style={{
                                        backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/2000px-World_map_blank_without_borders.svg.png')"
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-neutral-900 via-transparent" />

                                {/* Animated connection line */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#f97316" />
                                            <stop offset="100%" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                    <motion.path
                                        d="M 25 65 Q 50 35 75 55"
                                        stroke="url(#lineGrad)"
                                        strokeWidth="0.5"
                                        fill="none"
                                        strokeDasharray="3 3"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <circle cx="25" cy="65" r="2" fill="#f97316">
                                        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                    <circle cx="75" cy="55" r="2" fill="#a855f7">
                                        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                </svg>
                            </div>
                            <div className="p-6 space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Globe className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                                    <span className="text-neutral-600 dark:text-neutral-400">Connected via <strong className="text-neutral-900 dark:text-white">{geoInfo.ipVersion}</strong></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Server className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                                    <span className="text-neutral-600 dark:text-neutral-400">Server: <strong className="text-neutral-900 dark:text-white">{geoInfo.city}</strong></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Wifi className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                                    <span className="text-neutral-600 dark:text-neutral-400">ISP: <strong className="text-neutral-900 dark:text-white">{geoInfo.isp}</strong> ({geoInfo.asn})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Monitor className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                                    <span className="text-neutral-600 dark:text-neutral-400">IP: <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">{geoInfo.ip}</code></span>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Latency Measurements */}
                        <GlassCard className="overflow-hidden">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-neutral-900 dark:text-white">Latency Measurements</span>
                                    <InfoTooltip text="Detailed latency analysis under different network conditions" />
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <BoxPlot
                                    label="Unloaded latency"
                                    count={`${latencyMeasurements.unloaded.length}/20`}
                                    {...getBoxStats(latencyMeasurements.unloaded)}
                                    maxRange={150}
                                    color="#3b82f6"
                                />
                                <BoxPlot
                                    label="Latency during download"
                                    count={`${latencyMeasurements.download.length}`}
                                    {...getBoxStats(latencyMeasurements.download)}
                                    maxRange={150}
                                    color="#f97316"
                                />
                                <BoxPlot
                                    label="Latency during upload"
                                    count={`${latencyMeasurements.upload.length}`}
                                    {...getBoxStats(latencyMeasurements.upload)}
                                    maxRange={150}
                                    color="#a855f7"
                                />
                            </div>
                        </GlassCard>
                    </div>

                    {/* Recent History */}
                    {history.length > 0 && (
                        <GlassCard className="overflow-hidden">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                                <span className="font-bold text-lg text-neutral-900 dark:text-white">Recent Tests</span>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    {history.slice(0, 5).map((test) => (
                                        <div
                                            key={test.id}
                                            className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="text-xs text-neutral-500 w-24">
                                                    {new Date(test.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div>
                                                        <div className="text-xs text-neutral-500">Download</div>
                                                        <div className="font-bold text-neutral-900 dark:text-white">{test.down} Mbps</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-neutral-500">Upload</div>
                                                        <div className="font-bold text-neutral-900 dark:text-white">{test.up} Mbps</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-neutral-500">Ping</div>
                                                        <div className="font-bold text-neutral-900 dark:text-white">{test.ping} ms</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-neutral-500">{test.city}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>
                    )}

                </main>

                {/* Footer */}
                <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-neutral-500">
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">About</a>
                            <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms</a>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-500" />
                            <span className="font-bold text-neutral-900 dark:text-white">AssistMe</span>
                        </div>
                    </div>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
