import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, Info, ArrowDown, ArrowUp,
    Activity, Monitor, Smartphone, Globe, Share2, Download
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';

const SpeedtestPanel = ({ isOpen, onClose, backendUrl = '' }) => {
    const [status, setStatus] = useState('idle'); // idle, download, upload, complete
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState({
        ping: 0,
        jitter: 0,
        loss: 0,
        ip: 'Checking...',
        location: 'Mumbai, IN', // Placeholder or detect
        provider: 'Bharti Airtel Limited' // Placeholder
    });

    const [scores, setScores] = useState({
        streaming: 'Average',
        gaming: 'Poor',
        chatting: 'Good'
    });

    const timerRef = useRef(null);
    const dataPointsRef = useRef([]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            resetTest();
            // Mock IP fetch
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
        // Add some noise
        const noise = (Math.random() - 0.5) * (currentSpeed * 0.1);
        const value = Math.max(0, currentSpeed + noise);

        const point = {
            time,
            download: type === 'download' ? value : null,
            upload: type === 'upload' ? value : null
        };

        dataPointsRef.current = [...dataPointsRef.current, point];
        // Keep last 50 points for smooth chart
        if (dataPointsRef.current.length > 50) dataPointsRef.current.shift();

        return point;
    };

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;

        resetTest();
        setStatus('pinging');

        // Simulate Ping
        let pingSum = 0;
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 100));
            pingSum += 20 + Math.random() * 15;
            setStats(s => ({
                ...s,
                ping: Math.round(pingSum / (i + 1)),
                jitter: Math.round(Math.random() * 5)
            }));
        }

        // Simulate Download
        setStatus('download');
        let speed = 0;
        const targetDownload = 40 + Math.random() * 60; // 40-100 Mbps

        await new Promise(resolve => {
            let ticks = 0;
            timerRef.current = setInterval(() => {
                ticks++;
                // Ramp up
                if (speed < targetDownload) {
                    speed += (targetDownload - speed) * 0.1;
                }

                // Add noise
                const noisySpeed = speed + (Math.random() - 0.5) * 2;
                setDownloadSpeed(Math.max(0, noisySpeed));

                const point = generateDataPoint(noisySpeed, 'download');
                setChartData(prev => [...prev.slice(-49), point]);

                if (ticks > 50) {
                    clearInterval(timerRef.current);
                    resolve();
                }
            }, 100);
        });

        // Simulate Upload
        setStatus('upload');
        speed = 0;
        dataPointsRef.current = []; // Reset chart for upload focus? Or keep? Cloudflare keeps separate.
        // Let's clear chart for simplified view or transition
        setChartData([]);
        const targetUpload = 30 + Math.random() * 40; // 30-70 Mbps

        await new Promise(resolve => {
            let ticks = 0;
            timerRef.current = setInterval(() => {
                ticks++;
                if (speed < targetUpload) {
                    speed += (targetUpload - speed) * 0.15;
                }

                const noisySpeed = speed + (Math.random() - 0.5) * 2;
                setUploadSpeed(Math.max(0, noisySpeed));

                const point = generateDataPoint(noisySpeed, 'upload');
                setChartData(prev => [...prev.slice(-49), point]);

                if (ticks > 50) {
                    clearInterval(timerRef.current);
                    resolve();
                }
            }, 100);
        });

        setStatus('complete');
        // Finalize scores
        setScores({
            streaming: targetDownload > 50 ? 'Excellent' : 'Average',
            gaming: stats.ping < 40 ? 'Great' : 'Fair',
            chatting: 'Excellent'
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-background z-50 flex flex-col font-sans overflow-y-auto"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="bg-foreground text-background p-1.5 rounded-lg">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">Speed Test</h1>
                            <p className="text-xs text-muted-foreground">Built with AssistMe Cloud</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Main Dashboard (Left 3 cols) */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Speed Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Download Card */}
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden group">
                                <div className="flex items-center gap-2 mb-2 text-orange-500 font-medium text-sm uppercase tracking-wider">
                                    <ArrowDown className="h-4 w-4" /> Download
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl md:text-7xl font-bold tabular-nums tracking-tighter">
                                        {downloadSpeed.toFixed(1)}
                                    </span>
                                    <span className="text-xl text-muted-foreground">Mbps</span>
                                </div>

                                {/* Chart */}
                                <div className="h-32 mt-4 -mx-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={status === 'upload' ? [] : chartData}>
                                            <defs>
                                                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="download"
                                                stroke="#f97316"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorDown)"
                                                isAnimationActive={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Upload Card */}
                            <div className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-2 text-purple-500 font-medium text-sm uppercase tracking-wider">
                                    <ArrowUp className="h-4 w-4" /> Upload
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl md:text-7xl font-bold tabular-nums tracking-tighter">
                                        {uploadSpeed.toFixed(1)}
                                    </span>
                                    <span className="text-xl text-muted-foreground">Mbps</span>
                                </div>

                                {/* Chart */}
                                <div className="h-32 mt-4 -mx-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={status === 'upload' || status === 'complete' ? chartData : []}>
                                            <defs>
                                                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="upload"
                                                stroke="#a855f7"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorUp)"
                                                isAnimationActive={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-4">
                            {status === 'idle' || status === 'complete' ? (
                                <button
                                    onClick={runTest}
                                    className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    {status === 'complete' ? <RotateCcw className="h-4 w-4" /> : null}
                                    {status === 'complete' ? 'Retest' : 'Start Test'}
                                </button>
                            ) : (
                                <button
                                    onClick={resetTest}
                                    className="px-6 py-2.5 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <X className="h-4 w-4" /> Cancel
                                </button>
                            )}

                            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                                <Info className="h-4 w-4" />
                                <span>Tests are simulated for demo purposes</span>
                            </div>
                        </div>

                        {/* Network Quality Score */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Activity className="h-4 w-4" /> Network Quality Score
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                    <span>Video Streaming</span>
                                    <span className={cn(
                                        "font-bold",
                                        scores.streaming === 'Excellent' ? "text-green-500" : "text-yellow-500"
                                    )}>{scores.streaming}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                    <span>Online Gaming</span>
                                    <span className={cn(
                                        "font-bold",
                                        scores.gaming === 'Great' ? "text-green-500" : "text-orange-500"
                                    )}>{scores.gaming}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                    <span>Video Chatting</span>
                                    <span className={cn(
                                        "font-bold",
                                        scores.chatting === 'Excellent' ? "text-green-500" : "text-yellow-500"
                                    )}>{scores.chatting}</span>
                                </div>
                            </div>
                        </div>

                        {/* Map Section */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden h-64 relative">
                            <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium border border-border shadow-sm flex items-center gap-1.5">
                                <Globe className="h-3 w-3" /> Server Location
                            </div>
                            {/* Abstract Map Background */}
                            <div className="w-full h-full bg-muted/30 flex items-center justify-center relative bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center opacity-50 grayscale">
                                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay"></div>
                                <div className="relative">
                                    <div className="h-4 w-4 bg-primary rounded-full animate-ping absolute top-0 left-0"></div>
                                    <div className="h-4 w-4 bg-primary rounded-full border-4 border-background shadow-xl"></div>
                                    <MapPin className="h-8 w-8 text-primary absolute -top-7 -left-2 drop-shadow-lg" fill="currentColor" />
                                </div>
                                {/* Simple Line to Server */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <line x1="50%" y1="50%" x2="60%" y2="40%" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats (Right Col) */}
                    <div className="space-y-6">
                        {/* Latency Card */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold">Latency</h3>
                            </div>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-4xl font-bold tabular-nums">{stats.ping}</span>
                                <span className="text-sm text-muted-foreground">ms</span>
                            </div>
                            <div className="space-y-3 mt-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Unloaded</span>
                                    <span className="font-medium">{stats.ping} ms</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Downloading</span>
                                    <span className="font-medium">{status === 'download' ? stats.ping + 20 : '-'} ms</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Uploading</span>
                                    <span className="font-medium">{status === 'upload' ? stats.ping + 15 : '-'} ms</span>
                                </div>
                            </div>
                        </div>

                        {/* Jitter & Loss */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <h3 className="font-semibold mb-4">Network Stability</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-muted-foreground mb-1">Jitter</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold tabular-nums">{stats.jitter}</span>
                                        <span className="text-xs text-muted-foreground">ms</span>
                                    </div>
                                </div>
                                <div className="h-px bg-border my-2"></div>
                                <div>
                                    <div className="text-sm text-muted-foreground mb-1">Packet Loss</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold tabular-nums">{stats.loss}</span>
                                        <span className="text-xs text-muted-foreground">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div className="bg-card border border-border rounded-xl p-5 text-sm space-y-3">
                            <div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                                    <Monitor className="h-3.5 w-3.5" /> Client IP
                                </div>
                                <div className="font-mono">{stats.ip}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" /> Location
                                </div>
                                <div className="font-medium">{stats.location}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5" /> Provider
                                </div>
                                <div className="font-medium">{stats.provider}</div>
                            </div>
                        </div>
                    </div>

                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
