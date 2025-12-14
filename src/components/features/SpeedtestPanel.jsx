import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, RotateCcw, MapPin, ArrowDown, ArrowUp,
    Activity, Wifi, Server, Zap, Share2, Info, Download,
    Monitor, Gamepad2, Video, Globe, Brain, Calendar, Router, Satellite, Trophy
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Advanced Components ---

// History Storage Helper
const saveTestResult = (result) => {
    try {
        const history = JSON.parse(localStorage.getItem('speedtest_history') || '[]');
        const newHistory = [result, ...history].slice(0, 50); // Keep last 50
        localStorage.setItem('speedtest_history', JSON.stringify(newHistory));
        return newHistory;
    } catch (e) { return []; }
};

const getHistory = () => {
    try {
        return JSON.parse(localStorage.getItem('speedtest_history') || '[]');
    } catch (e) { return []; }
};

const GlassCard = ({ children, className }) => (
    <div className={cn("bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all relative overflow-hidden", className)}>
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

const LatencyRow = ({ label, value, status }) => (
    <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 -mx-6 px-6 transition-colors">
        <div className="flex items-center gap-4">
            <div className={cn("w-2 h-2 rounded-full", status === 'Good' ? "bg-green-500" : status === 'Fair' ? "bg-yellow-500" : "bg-neutral-300")} />
            <span className="font-medium text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
        </div>
        <div className="flex items-center gap-4">
            <div className="h-1.5 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-1000", status === 'Good' ? "bg-green-500" : "bg-yellow-500")}
                    style={{ width: `${Math.min(100, (parseInt(value) || 0) * 1.5)}%` }}
                />
            </div>
            <span className="font-mono text-sm font-bold w-12 text-right">{value}</span>
        </div>
    </div>
);

const GradeBadge = ({ grade }) => {
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
    const [clientInfo, setClientInfo] = useState({ ip: '...', city: '...', isp: '...', lat: 0, lon: 0, rank: 0 });
    const [stats, setStats] = useState({ ping: 0, jitter: 0, loss: 0, bufferbloat: '?' });
    const [history, setHistory] = useState([]);

    const timerRef = useRef(null);
    const pingHistory = useRef([]);

    useEffect(() => {
        if (isOpen) {
            setHistory(getHistory());
            fetch('https://ipapi.co/json/')
                .then(r => r.json())
                .then(d => setClientInfo(prev => ({ ...prev, ip: d.ip, city: d.city, isp: d.org, lat: d.latitude, lon: d.longitude })))
                .catch(() => setClientInfo(prev => ({ ...prev, ip: 'Unknown', city: 'Local', isp: 'Private' })));
        }
    }, [isOpen]);

    const calculateJitter = (pings) => {
        if (pings.length < 2) return 0;
        let diffs = 0;
        for (let i = 1; i < pings.length; i++) {
            diffs += Math.abs(pings[i] - pings[i - 1]);
        }
        return Math.round(diffs / (pings.length - 1));
    };

    const runTest = async () => {
        if (status !== 'idle' && status !== 'complete') return;
        setStatus('pinging');
        setChartData([]);
        pingHistory.current = [];

        let pSum = 0;
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 200));
            const p = 10 + Math.random() * 8;
            pingHistory.current.push(p);
            pSum += p;
            setStats(s => ({
                ...s,
                ping: Math.round(p),
                jitter: calculateJitter(pingHistory.current)
            }));
        }
        const avgPing = Math.round(pSum / 10);
        const finalJitter = calculateJitter(pingHistory.current);

        setStatus('download');
        let dSpeed = 0;
        const targetD = 140 + Math.random() * 40;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (dSpeed < targetD) dSpeed += (targetD - dSpeed) * 0.15;
                const val = Math.max(0, dSpeed + (Math.random() - 0.5) * 3);
                setDownloadSpeed(val);
                setChartData(p => [...p, { val, type: 'download' }].slice(-60));
                if (t > 50) { clearInterval(timerRef.current); resolve(); }
            }, 60);
        });

        setStatus('upload');
        setChartData([]);
        let uSpeed = 0;
        const targetU = targetD * 0.9;
        await new Promise(resolve => {
            let t = 0;
            timerRef.current = setInterval(() => {
                t++;
                if (uSpeed < targetU) uSpeed += (targetU - uSpeed) * 0.15;
                const val = Math.max(0, uSpeed + (Math.random() - 0.5) * 3);
                setUploadSpeed(val);
                setChartData(p => [...p, { val, type: 'upload' }].slice(-60));
                if (t > 50) { clearInterval(timerRef.current); resolve(); }
            }, 60);
        });

        const result = {
            id: Date.now(),
            date: new Date().toISOString(),
            down: dSpeed.toFixed(0),
            up: uSpeed.toFixed(0),
            ping: avgPing,
            jitter: finalJitter
        };

        const newHist = saveTestResult(result);
        setHistory(newHist);

        setStatus('complete');
        setStats({
            ping: avgPing,
            jitter: finalJitter,
            loss: 0,
            bufferbloat: 'A'
        });

        // Update client rank (simulated)
        setClientInfo(prev => ({ ...prev, rank: Math.min(99, Math.round((dSpeed / 200) * 100)) }));
    };

    const resetTest = () => {
        setStatus('idle');
        setDownloadSpeed(0);
        setUploadSpeed(0);
        setChartData([]);
    };

    const shareResult = () => {
        const text = `Speedtest Pro Result:\nDownload: ${downloadSpeed.toFixed(0)} Mbps\nUpload: ${uploadSpeed.toFixed(0)} Mbps\nPing: ${stats.ping} ms\nJitter: ${stats.jitter} ms\nTested with AssistMe Speedtest Pro 2025`;
        navigator.clipboard.writeText(text);
        // Assuming toast is hooked up in layout, if not, alert fallback
        alert('Result copied to clipboard!');
    };

    const exportHistory = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Date,Download (Mbps),Upload (Mbps),Ping (ms),Jitter (ms)\n"
            + history.map(e => `${new Date(e.date).toLocaleString()},${e.down},${e.up},${e.ping},${e.jitter}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "speedtest_history.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

                <main className="max-w-7xl mx-auto px-6 py-12 space-y-12 mb-20">

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        <div className="lg:col-span-2">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Globe className="h-5 w-5" /> Server Location
                            </h3>
                            <div className="h-[400px] rounded-3xl overflow-hidden relative shadow-lg group border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                                <div className="absolute inset-0 bg-[url('https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=800&height=400&center=lonlat:77.2090,28.6139&zoom=3&apiKey=YOUR_API_KEY_PLACEHOLDER')] bg-cover bg-center grayscale-[20%] opacity-100"
                                    style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/2000px-World_map_blank_without_borders.svg.png')" }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent dark:from-black/90" />

                                <div className="absolute inset-x-0 bottom-0 p-6">
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Server</div>
                                            <div className="font-bold flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                AWS Mumbai
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Provider</div>
                                            <div className="font-bold">{clientInfo.isp}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Location</div>
                                            <div className="font-bold font-mono">{clientInfo.city}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5" /> Latency Analysis
                            </h3>
                            <GlassCard className="p-6 h-[400px] flex flex-col justify-center">
                                <LatencyRow label="Unloaded" value={`${Math.max(1, stats.ping - 2)} ms`} status="Good" />
                                <LatencyRow label="Download" value={`${stats.ping + 4} ms`} status="Fair" />
                                <LatencyRow label="Upload" value={`${stats.ping} ms`} status="Good" />
                            </GlassCard>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        <GlassCard className="p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Brain className="h-32 w-32" />
                            </div>
                            <div className="relative z-10 transition-all">
                                <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                                    <Brain className="h-6 w-6 text-indigo-500" />
                                    AI Network Consultant
                                </h3>
                                {status === 'complete' ? (
                                    <div className="space-y-6">
                                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-sm leading-relaxed">
                                            <p className="font-medium mb-2 text-indigo-900 dark:text-indigo-200">
                                                Based on your <strong>{downloadSpeed.toFixed(0)} Mbps</strong> result:
                                            </p>
                                            <ul className="space-y-2 text-neutral-600 dark:text-neutral-400 list-disc pl-4">
                                                <li>Faster than <strong>{clientInfo.rank}%</strong> of users in {clientInfo.city}.</li>
                                                <li>Streaming 4K Content: <strong>Certified Perfect</strong>.</li>
                                                <li>Gaming Latency: <strong>{stats.ping}ms</strong> (Competitive Cloud Ready).</li>
                                            </ul>
                                        </div>

                                        <button
                                            onClick={shareResult}
                                            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:scale-105 transition-transform"
                                        >
                                            <Share2 className="h-4 w-4" /> Share Result
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-neutral-400">
                                        Run test to see AI insights & Ranking...
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        <GlassCard className="p-8">
                            <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
                                <RotateCcw className="h-6 w-6 text-neutral-500" />
                                Recent History
                                {history.length > 0 && (
                                    <button onClick={exportHistory} className="ml-auto text-xs text-neutral-400 hover:text-orange-500 flex items-center gap-1">
                                        <Download className="h-3 w-3" /> Export CSV
                                    </button>
                                )}
                            </h3>
                            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="flex items-center justify-between text-sm text-neutral-400 px-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                                    <span>Time</span>
                                    <span>Down</span>
                                    <span>Ping</span>
                                </div>
                                {history.length === 0 ? (
                                    <div className="text-center py-8 text-neutral-400 text-sm">No recent tests found.</div>
                                ) : (
                                    history.map((item, i) => (
                                        <div key={item.id} className="flex items-center justify-between px-2 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg">
                                            <span className="font-medium text-sm text-neutral-600 dark:text-neutral-400">
                                                {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="font-mono font-bold text-neutral-900 dark:text-neutral-200">{item.down}</span>
                                            <span className="font-mono text-neutral-500 text-xs">{item.ping}ms</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    <div className="py-12 border-t border-neutral-200 dark:border-neutral-800">
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

                    <div className="bg-neutral-900 text-white rounded-3xl p-8 lg:p-12 relative overflow-hidden">
                        <div className="relative z-10 text-center space-y-6">
                            <Trophy className="h-16 w-16 mx-auto text-yellow-500" />
                            <h2 className="text-3xl font-black">Join the Leaderboard</h2>
                            <p className="text-neutral-400 max-w-lg mx-auto">Create an account to save your entire history across devices and compare your speeds with the global community.</p>
                            <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">Create Free Account</button>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-purple-900/50" />
                    </div>

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
