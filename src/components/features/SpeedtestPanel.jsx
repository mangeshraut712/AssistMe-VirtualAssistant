import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, Info, ArrowDown, ArrowUp,
    Activity, Monitor, Globe, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';
import { cn } from '@/lib/utils';

// Simple Box Plot Visualization
const BoxPlot = ({ color = "bg-primary" }) => {
    // Randomized position for demo look
    const left = 20 + Math.random() * 10;
    const width = 10 + Math.random() * 20;
    const median = left + width * 0.4;

    return (
        <div className="relative h-12 w-full mt-2 group cursor-default">
            {/* Base Line (Whiskers) */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-border group-hover:bg-border/80 transition-colors"></div>

            {/* The Box (IQR) */}
            <div
                className={cn("absolute top-[30%] h-[40%] border border-foreground/20 rounded-sm opacity-80", color)}
                style={{ left: `${left}%`, width: `${width}%` }}
            >
                {/* Median Line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 left-[40%]"></div>
            </div>

            {/* Scatter Dots (Simulated) */}
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className={cn("absolute h-1.5 w-1.5 rounded-full opacity-60", color.replace('bg-', 'bg-text-'))}
                    style={{
                        top: '45%',
                        left: `${left - 10 + Math.random() * (width + 20)}%`
                    }}
                />
            ))}

            {/* Label Scale */}
            <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-muted-foreground pt-2">
                <span>0</span>
                <span>50M</span>
                <span>100M</span>
            </div>
        </div>
    );
};

// Toggle-able Measurement Card
const MeasurementCard = ({ title, count, color }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{title}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-2"
                >
                    <div className="text-xs text-muted-foreground mb-1">bps</div>
                    <BoxPlot color={color} />
                </motion.div>
            )}
        </div>
    );
};

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
        location: 'Mumbai, IN',
        provider: 'Bharti Airtel Limited'
    });

    const [scores, setScores] = useState({
        streaming: 'Average',
        gaming: 'Poor',
        chatting: 'Good'
    });

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
        const noise = (Math.random() - 0.5) * (currentSpeed * 0.1);
        const value = Math.max(0, currentSpeed + noise);

        const point = {
            time,
            download: type === 'download' ? value : null,
            upload: type === 'upload' ? value : null
        };

        dataPointsRef.current = [...dataPointsRef.current, point];
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
                jitter: Math.round(Math.random() * 5),
                loss: Math.random() > 0.8 ? 0.9 : 0
            }));
        }

        // Simulate Download
        setStatus('download');
        let speed = 0;
        const targetDownload = 40 + Math.random() * 60;

        await new Promise(resolve => {
            let ticks = 0;
            timerRef.current = setInterval(() => {
                ticks++;
                if (speed < targetDownload) speed += (targetDownload - speed) * 0.1;
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
        setChartData([]);
        const targetUpload = 30 + Math.random() * 40;

        await new Promise(resolve => {
            let ticks = 0;
            timerRef.current = setInterval(() => {
                ticks++;
                if (speed < targetUpload) speed += (targetUpload - speed) * 0.15;
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
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">

                    {/* Top Section: Dashboard + Sidebar */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
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
                                    <button onClick={resetTest} className="px-6 py-2.5 bg-muted rounded-lg hover:bg-muted/80 flex items-center gap-2">
                                        <X className="h-4 w-4" /> Cancel
                                    </button>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                                    <Info className="h-4 w-4" />
                                    <span>Tests are simulated for demo purposes</span>
                                </div>
                            </div>

                            {/* Map & Location */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden h-64 relative">
                                <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium border border-border shadow-sm flex items-center gap-1.5">
                                    <Globe className="h-3 w-3" /> Server: US-East (Virginia)
                                </div>
                                {/* Abstract Map */}
                                <div className="w-full h-full bg-muted/30 flex items-center justify-center relative bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center opacity-50 grayscale">
                                    <div className="absolute inset-0 bg-primary/5 mix-blend-overlay"></div>
                                    <MapPin className="h-8 w-8 text-primary absolute top-[40%] left-[25%] drop-shadow-lg animate-bounce" fill="currentColor" />
                                    <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur p-2 rounded text-xs space-y-1 border border-border/50">
                                        <div><span className="text-muted-foreground">IP:</span> 2401:4900:8fca:d69...</div>
                                        <div><span className="text-muted-foreground">Provider:</span> AssistMe Network</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Stats (Right Col) */}
                        <div className="space-y-6">
                            {/* Latency Card (Detailed) */}
                            <div className="bg-card border border-border rounded-xl p-5">
                                <h3 className="font-semibold mb-4">Latency Measurements</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Unloaded (20/20)</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold tabular-nums">{stats.ping}</span>
                                            <span className="text-sm text-muted-foreground">ms</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border"></div>
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">During Download</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold tabular-nums">{stats.ping + 24}</span>
                                            <span className="text-sm text-muted-foreground">ms</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border"></div>
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">During Upload</div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold tabular-nums">{stats.ping + 12}</span>
                                            <span className="text-sm text-muted-foreground">ms</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Packet Loss */}
                            <div className="bg-card border border-border rounded-xl p-5">
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    Packet Loss <Info className="h-3 w-3 text-muted-foreground" />
                                </h3>
                                <div className="text-sm text-muted-foreground mb-3">(1000/1000)</div>

                                <div className="w-full h-8 bg-muted rounded overflow-hidden relative border border-border/50">
                                    <div className="absolute inset-0 bg-green-500 w-full flex items-center justify-center text-xs font-bold text-white">
                                        Received 99.1%
                                    </div>
                                    {/* Simulated loss segments */}
                                    <div className="absolute top-0 bottom-0 left-[20%] w-[2px] bg-red-500"></div>
                                    <div className="absolute top-0 bottom-0 left-[60%] w-[1px] bg-red-500"></div>
                                    <div className="absolute top-0 bottom-0 left-[85%] w-[3px] bg-red-500"></div>
                                </div>
                                <div className="mt-2 text-right text-xs font-medium text-red-500/80">
                                    Loss: 0.9%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Measurements (Box Plots) - The "Second Image" content */}
                    {status === 'complete' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border"
                        >
                            {/* Download Section */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    Download Measurements <Info className="h-4 w-4 text-muted-foreground" />
                                </h3>
                                <MeasurementCard title="100kB download test" count="10/10" color="bg-orange-500" />
                                <MeasurementCard title="1MB download test" count="8/8" color="bg-orange-400" />
                                <MeasurementCard title="10MB download test" count="6/6" color="bg-orange-300" />
                            </div>

                            {/* Upload Section */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    Upload Measurements <Info className="h-4 w-4 text-muted-foreground" />
                                </h3>
                                <MeasurementCard title="100kB upload test" count="8/8" color="bg-purple-500" />
                                <MeasurementCard title="1MB upload test" count="6/6" color="bg-purple-400" />
                                <MeasurementCard title="10MB upload test" count="4/4" color="bg-purple-300" />
                            </div>
                        </motion.div>
                    )}

                </main>
            </motion.div>
        </AnimatePresence>
    );
};

export default SpeedtestPanel;
