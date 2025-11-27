import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    ScatterChart,
    Scatter,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    AreaChart,
    Area,
    LineChart,
    Line
} from 'recharts';
import {
    ArrowLeft, TrendingUp, Zap, DollarSign, Clock, Download, Gauge, Filter,
    Activity, Server, Users, Globe, Cpu, Award, Briefcase, BarChart2, Newspaper, Terminal, X
} from 'lucide-react';

// --- DATASETS ---

// 1. Enhanced Model Benchmarks
const BENCHMARK_DATA = [
    // Frontier Models
    { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xAI', free: false, aaii: 97, mmlu: 89.5, coding: 96, speed: 140, price: 4.50, context: 256000, type: 'Proprietary', accuracy: 96, latency: 250 },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', free: false, aaii: 96, mmlu: 88.7, coding: 92, speed: 80, price: 5.00, context: 128000, type: 'Proprietary', accuracy: 94, latency: 450 },
    { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', free: false, aaii: 95, mmlu: 88.3, coding: 94, speed: 70, price: 3.00, context: 200000, type: 'Proprietary', accuracy: 93, latency: 500 },
    { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', free: false, aaii: 94, mmlu: 85.9, coding: 88, speed: 60, price: 3.50, context: 2000000, type: 'Proprietary', accuracy: 91, latency: 600 },
    { id: 'meta-llama/llama-3.1-405b', name: 'Llama 3.1 405B', provider: 'Meta', free: true, aaii: 93, mmlu: 87.3, coding: 89, speed: 40, price: 0, context: 128000, type: 'Open Weights', accuracy: 90, latency: 800 },

    // Efficient / Value Models
    { id: 'x-ai/grok-code-fast-1', name: 'Grok Code Fast', provider: 'xAI', free: false, aaii: 92, mmlu: 86.0, coding: 95, speed: 180, price: 1.50, context: 128000, type: 'Proprietary', accuracy: 92, latency: 180 },
    { id: 'meta-llama/llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Meta', free: true, aaii: 89, mmlu: 82.0, coding: 85, speed: 120, price: 0, context: 128000, type: 'Open Weights', accuracy: 88, latency: 300 },
    { id: 'google/gemma-2-27b', name: 'Gemma 2 27B', provider: 'Google', free: true, aaii: 82, mmlu: 75.0, coding: 78, speed: 150, price: 0, context: 8192, type: 'Open Weights', accuracy: 82, latency: 200 },
    { id: 'mistral/mistral-large', name: 'Mistral Large 2', provider: 'Mistral', free: false, aaii: 91, mmlu: 84.0, coding: 86, speed: 65, price: 2.00, context: 128000, type: 'Proprietary', accuracy: 89, latency: 400 },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', free: false, aaii: 85, mmlu: 82.0, coding: 87, speed: 200, price: 0.15, context: 128000, type: 'Proprietary', accuracy: 85, latency: 150 },
];

// 2. Global AI Leadership
const GLOBAL_AI_DATA = [
    { name: 'USA', value: 45, fill: '#3b82f6', region: 'North America' },
    { name: 'China', value: 27, fill: '#ef4444', region: 'Asia' },
    { name: 'UK', value: 8, fill: '#8b5cf6', region: 'Europe' },
    { name: 'EU (Other)', value: 11, fill: '#10b981', region: 'Europe' },
    { name: 'India', value: 5, fill: '#f59e0b', region: 'Asia' },
    { name: 'Canada', value: 3, fill: '#0ea5e9', region: 'North America' },
    { name: 'Other', value: 1, fill: '#6b7280', region: 'Rest of World' },
];

// 3. Top Companies
const COMPANY_DATA = [
    { name: 'OpenAI', models: 14, share: 34, quality: 95, growth: '+9%' },
    { name: 'xAI', models: 6, share: 24, quality: 97, growth: '+380%' },
    { name: 'Google', models: 16, share: 22, quality: 91, growth: '+11%' },
    { name: 'Anthropic', models: 6, share: 13, quality: 94, growth: '+15%' },
    { name: 'Meta', models: 8, share: 7, quality: 90, growth: '+6%' },
];

// 4. API Traffic Data
const API_TRAFFIC_DATA = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    requests: Math.floor(Math.random() * 6000) + 2000,
    errors: Math.floor(Math.random() * 30),
    latency: Math.floor(Math.random() * 150) + 40
}));

// 5. Endpoint Usage
const ENDPOINT_USAGE = [
    { name: 'Chat (Text)', value: 55, color: '#3b82f6' },
    { name: 'Reasoning (Grok)', value: 25, color: '#8b5cf6' },
    { name: 'Image Gen', value: 10, color: '#ec4899' },
    { name: 'Knowledge/RAG', value: 5, color: '#10b981' },
    { name: 'Translation', value: 5, color: '#f59e0b' },
];

// 6. System Metrics
const SYSTEM_METRICS = [
    { name: 'Grok Inference', avg: 0.2, p95: 0.4, unit: 's' },
    { name: 'Whisper STT', avg: 1.1, p95: 1.9, unit: 's' },
    { name: 'Edge TTS', avg: 0.7, p95: 1.4, unit: 's' },
    { name: 'Image Gen', avg: 4.2, p95: 7.5, unit: 's' },
    { name: 'RAG Search', avg: 0.5, p95: 1.0, unit: 's' },
];

// 7. AI News
const AI_NEWS = [
    {
        title: "xAI releases Grok 4.1 Fast: The new speed king",
        source: "Artificial Analysis",
        time: "12m ago",
        content: "xAI has launched Grok 4.1 Fast, a new variant of their Grok model optimized for speed. Benchmarks show it achieves up to 140 tokens per second while maintaining high accuracy scores across multiple tasks. The model is available through xAI's API with competitive pricing at $4.50 per million tokens."
    },
    {
        title: "OpenAI expands GPT-4o multimodal endpoints for developers",
        source: "TechCrunch",
        time: "1h ago",
        content: "OpenAI has announced expanded multimodal capabilities for GPT-4o, including enhanced image understanding and generation features. The new endpoints support advanced vision tasks, code interpretation from images, and improved text-to-image generation quality. Developers can now access these features through the updated API."
    },
    {
        title: "Meta open sources Llama 3.3 70B with improved reasoning",
        source: "Meta AI",
        time: "3h ago",
        content: "Meta has released Llama 3.3 70B, their latest open-source model featuring significant improvements in reasoning capabilities. The model achieves 89% accuracy on coding benchmarks and includes enhanced multilingual support. Available for free download on Hugging Face, it represents a major advancement in open-source AI development."
    },
    {
        title: "Google rolls out Gemini 3 Pro preview for enterprise",
        source: "The Verge",
        time: "5h ago",
        content: "Google has begun a limited preview of Gemini 3 Pro, their most advanced AI model yet. With 2 million token context window and superior performance across enterprise tasks, it's designed for complex data analysis and long-form content generation. Enterprise customers can apply for early access through Google's AI platform."
    },
    {
        title: "Anthropic updates Claude 3.5 with better coding reliability",
        source: "Anthropic Blog",
        time: "6h ago",
        content: "Anthropic has released updates to Claude 3.5 Sonnet, focusing on improved coding reliability and error handling. The model now achieves 94% accuracy on software engineering tasks and includes better support for debugging and code review. These improvements make it more suitable for production development environments."
    },
    {
        title: "Microsoft previews Phi-4 for lightweight edge deployments",
        source: "MSAI Journal",
        time: "8h ago",
        content: "Microsoft has previewed Phi-4, a compact language model optimized for edge computing and mobile devices. Despite its small size, it maintains competitive performance across various tasks. The model is designed for offline AI applications and resource-constrained environments."
    },
    {
        title: "Stability AI hints at SDXL Turbo 2 for ultra-fast gen",
        source: "Stability Blog",
        time: "10h ago",
        content: "Stability AI has teased their upcoming SDXL Turbo 2 model, promising ultra-fast image generation with improved quality. The model is expected to generate high-resolution images in under 2 seconds while maintaining artistic control and prompt fidelity. Beta testing begins next month for select users."
    },
];

// 8. Cost trends & reliability
const COST_TRENDS = [
    { month: 'Jan', cost: 5.2 },
    { month: 'Feb', cost: 4.9 },
    { month: 'Mar', cost: 4.6 },
    { month: 'Apr', cost: 4.2 },
    { month: 'May', cost: 3.9 },
    { month: 'Jun', cost: 3.7 },
];

const RELIABILITY_DATA = [
    { name: 'OpenAI', uptime: 99.7 },
    { name: 'xAI', uptime: 99.6 },
    { name: 'Google', uptime: 99.4 },
    { name: 'Anthropic', uptime: 99.3 },
    { name: 'Meta', uptime: 99.1 },
];

const SATISFACTION_DATA = [
    { name: 'Positive', value: 72, color: '#10b981' },
    { name: 'Neutral', value: 22, color: '#f59e0b' },
    { name: 'Negative', value: 6, color: '#ef4444' },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];

const BenchmarkPage = () => {
    const [filterType, setFilterType] = useState('All');
    const [sortBy, setSortBy] = useState('aaii');
    const [selectedNews, setSelectedNews] = useState(null);

    // --- Derived Data ---
    const filteredModels = useMemo(() =>
        BENCHMARK_DATA
            .filter(m => filterType === 'All' || (filterType === 'Open' ? m.type === 'Open Weights' : m.type === 'Proprietary'))
            .sort((a, b) => b[sortBy] - a[sortBy])
        , [filterType, sortBy]);

    const qualityPriceData = BENCHMARK_DATA.map(m => ({
        name: m.name,
        x: m.price,
        y: m.aaii,
        z: m.context,
        fill: m.type === 'Open Weights' ? '#10b981' : '#3b82f6'
    }));

    const latencyVsCost = BENCHMARK_DATA
        .filter(m => !m.free)
        .map(m => ({
            name: m.name.split(' ')[0],
            latency: m.latency,
            price: m.price,
            id: m.id,
        }));

    const freeVsPaidShare = [
        { name: 'Free', value: BENCHMARK_DATA.filter(m => m.free).length },
        { name: 'Paid', value: BENCHMARK_DATA.filter(m => !m.free).length },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 transition-colors duration-300">
            {/* --- Header --- */}
            <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a href="/" className="p-2 hover:bg-accent rounded-lg transition-colors text-foreground">
                            <ArrowLeft className="h-5 w-5" />
                        </a>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                                <Activity className="h-6 w-6 text-blue-500" />
                                Mission Control
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Comprehensive AI Analytics, Benchmarks & System Monitoring
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-xs font-medium animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            System Operational
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 font-medium">
                            <Download className="h-4 w-4" />
                            Export Report
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

                {/* --- Section 1: Live API Dashboard --- */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Server className="h-6 w-6 text-violet-500" />
                        <h2 className="text-xl font-bold text-foreground">Live System Status</h2>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-muted-foreground mb-1">Total Requests (24h)</p>
                            <p className="text-3xl font-bold text-foreground">142,893</p>
                            <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
                                <TrendingUp className="h-3 w-3" /> +12.5% vs yesterday
                            </div>
                        </div>
                        <div className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-muted-foreground mb-1">Avg Latency</p>
                            <p className="text-3xl font-bold text-foreground">145<span className="text-lg text-muted-foreground font-normal">ms</span></p>
                            <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
                                <TrendingUp className="h-3 w-3" /> -5ms improvement
                            </div>
                        </div>
                        <div className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-muted-foreground mb-1">Error Rate</p>
                            <p className="text-3xl font-bold text-foreground">0.04%</p>
                            <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
                                <TrendingUp className="h-3 w-3" /> Stable
                            </div>
                        </div>
                        <div className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-muted-foreground mb-1">Active Users</p>
                            <p className="text-3xl font-bold text-foreground">3,402</p>
                            <div className="flex items-center gap-1 text-xs text-blue-500 mt-2">
                                <Users className="h-3 w-3" /> Currently online
                            </div>
                        </div>
                    </div>

                    {/* Traffic & Usage Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-xl shadow-sm">
                            <h3 className="text-base font-semibold mb-4 text-foreground">Request Volume & Latency</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={API_TRAFFIC_DATA}>
                                    <defs>
                                        <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis dataKey="time" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReq)" name="Requests" />
                                    <Area yAxisId="right" type="monotone" dataKey="latency" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorLat)" name="Latency (ms)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                            <h3 className="text-base font-semibold mb-4 text-foreground">Endpoint Usage</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={ENDPOINT_USAGE}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {ENDPOINT_USAGE.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'var(--foreground)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </section>

                {/* --- Section 2: Global AI Landscape --- */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-6 w-6 text-blue-500" />
                        <h2 className="text-xl font-bold text-foreground">Global AI Landscape</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Global Map / Distribution */}
                        <div className="lg:col-span-2 p-6 bg-card border border-border rounded-xl shadow-sm">
                            <h3 className="text-lg font-bold text-foreground mb-4">Global AI Leadership (Market Share)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart layout="vertical" data={GLOBAL_AI_DATA} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: 'var(--foreground)' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'var(--accent)' }} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                        {GLOBAL_AI_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Companies Leaderboard */}
                        <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                                <Briefcase className="h-5 w-5 text-purple-500" />
                                Top AI Companies
                            </h3>
                            <div className="space-y-4">
                                {COMPANY_DATA.map((company, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50 hover:border-border transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">{company.name}</p>
                                                <p className="text-xs text-muted-foreground">{company.models} Models • {company.share}% Share</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-500">{company.growth}</p>
                                            <p className="text-xs text-muted-foreground">Avg Quality: {company.quality}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- Section 3: Model Leaderboard (ArtificialAnalysis Style) --- */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Award className="h-6 w-6 text-yellow-500" />
                            <h2 className="text-xl font-bold text-foreground">Model Leaderboard</h2>
                        </div>
                        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                            <button onClick={() => setFilterType('All')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'All' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>All</button>
                            <button onClick={() => setFilterType('Proprietary')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'Proprietary' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>Proprietary</button>
                            <button onClick={() => setFilterType('Open')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === 'Open' ? 'bg-green-500 text-white' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>Open Weights</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto bg-card border border-border rounded-xl shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Model</th>
                                    <th className="px-6 py-3 font-medium">Provider</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => setSortBy('aaii')}>AAII Score</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => setSortBy('mmlu')}>MMLU</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => setSortBy('coding')}>Coding</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => setSortBy('speed')}>Speed (t/s)</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => setSortBy('price')}>Price ($/1M)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredModels.map((model) => (
                                    <tr key={model.id} className="hover:bg-accent/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground">{model.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{model.provider}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-blue-500">{model.aaii}</span>
                                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${model.aaii}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-foreground">{model.mmlu}</td>
                                        <td className="px-6 py-4 text-foreground">{model.coding}</td>
                                        <td className="px-6 py-4 text-foreground">{model.speed}</td>
                                        <td className="px-6 py-4 text-foreground">{model.price === 0 ? <span className="text-green-500 font-medium">Free</span> : `$${model.price}`}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* --- Section 4: Advanced Analysis (Scatter & Radar) --- */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quality vs Price Scatter */}
                    <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                        <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
                            <BarChart2 className="h-5 w-5 text-indigo-500" />
                            Quality vs. Price Analysis
                        </h3>
                        <ResponsiveContainer width="100%" height={320}>
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis type="number" dataKey="x" name="Price" stroke="var(--foreground)" label={{ value: 'Price ($/1M Tokens)', position: 'bottom', offset: 0, fill: 'var(--foreground)' }} />
                                <YAxis type="number" dataKey="y" name="AAII" stroke="var(--foreground)" domain={[70, 100]} label={{ value: 'AAII Score', angle: -90, position: 'insideLeft', fill: 'var(--foreground)' }} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                                <Scatter name="Models" data={qualityPriceData} fill="#8884d8">
                                    {qualityPriceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Scatter>
                                <Legend payload={[{ value: 'Open Weights', type: 'circle', color: '#10b981' }, { value: 'Proprietary', type: 'circle', color: '#3b82f6' }]} wrapperStyle={{ color: 'var(--foreground)' }} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Capabilities Radar */}
                    <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                        <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
                            <Cpu className="h-5 w-5 text-orange-500" />
                            Model Capabilities Comparison
                        </h3>
                        <ResponsiveContainer width="100%" height={320}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={filteredModels.slice(0, 5).map(m => ({
                                name: m.name.split(' ')[0],
                                Intelligence: m.aaii,
                                Coding: m.coding,
                                Knowledge: m.mmlu,
                                Speed: m.speed / 2, // Normalized
                            }))}>
                                <PolarGrid stroke="var(--border)" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--foreground)', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border)" />
                                <Radar name="Intelligence" dataKey="Intelligence" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                                <Radar name="Coding" dataKey="Coding" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
                                <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* --- Section 5: Cost, Reliability & Satisfaction --- */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cost Trend */}
                    <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                        <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            Inference Cost Trend (per 1M tokens)
                        </h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={COST_TRENDS}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="month" stroke="var(--foreground)" />
                                <YAxis stroke="var(--foreground)" />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '10px', color: 'var(--foreground)' }} />
                                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Reliability */}
                    <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                        <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
                            <Gauge className="h-5 w-5 text-green-500" />
                            Provider Uptime (90d)
                        </h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={RELIABILITY_DATA}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--foreground)" tick={{ fill: 'var(--foreground)' }} />
                                <YAxis domain={[98.5, 100]} stroke="var(--foreground)" tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--foreground)' }} />
                                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '10px', color: 'var(--foreground)' }} />
                                <Bar dataKey="uptime" radius={[6, 6, 0, 0]} fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Satisfaction */}
                    <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                        <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
                            <Users className="h-5 w-5 text-pink-500" />
                            User Satisfaction (NPS-style)
                        </h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={SATISFACTION_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} label>
                                    {SATISFACTION_DATA.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                                <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* --- Section 5: Detailed Benchmarks (Original) --- */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-6 w-6 text-green-500" />
                        <h2 className="text-xl font-bold text-foreground">Detailed Benchmarks</h2>
                    </div>

                    {/* Accuracy & Free/Paid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 bg-card rounded-xl border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Software Engineering Accuracy</h3>
                                    <p className="text-sm text-muted-foreground">SWE-bench style accuracy (n=500)</p>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={filteredModels}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--foreground)' }} />
                                    <YAxis domain={[60, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: 'var(--foreground)' }} />
                                    <Tooltip formatter={(v) => `${v}%`} labelStyle={{ color: 'var(--foreground)' }} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--foreground)' }} />
                                    <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} label={{ position: 'top', formatter: (v) => `${v}%`, fill: 'var(--foreground)' }}>
                                        {filteredModels.map((entry, index) => (
                                            <Cell key={`cell-${entry.id}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="p-6 bg-card rounded-xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold mb-4 text-foreground">Free vs Paid Availability</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={freeVsPaidShare} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} label>
                                        {freeVsPaidShare.map((entry, index) => (
                                            <Cell key={entry.name} fill={['#10b981', '#6366f1'][index % 2]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                                    <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Latency vs Cost & Component Latency */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 bg-card rounded-xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold mb-4 text-foreground">Latency vs Cost (Paid)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <ScatterChart>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis type="number" dataKey="price" name="Price ($/unit)" stroke="var(--foreground)" />
                                    <YAxis type="number" dataKey="latency" name="Latency (ms)" stroke="var(--foreground)" />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                                    <Scatter data={latencyVsCost} fill="#6366f1">
                                        {latencyVsCost.map((item, idx) => (
                                            <Cell key={item.id} fill={idx === 0 ? '#10b981' : '#6366f1'} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
                            <h3 className="text-base font-semibold mb-4 text-foreground">Service Response Times</h3>
                            <div className="space-y-4">
                                {SYSTEM_METRICS.map((metric, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-foreground">{metric.name}</span>
                                            <span className="text-muted-foreground">{metric.avg}{metric.unit} avg</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                                                style={{ width: `${(metric.avg / 5) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- Section 6: Industry News --- */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2">
                        <Newspaper className="h-6 w-6 text-pink-500" />
                        <h2 className="text-xl font-bold text-foreground">Latest AI News</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {AI_NEWS.map((news, idx) => (
                            <div key={idx} className="p-4 bg-card border border-border rounded-xl shadow-sm hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedNews(news)}>
                                <p className="font-semibold text-foreground mb-1">{news.title}</p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{news.source}</span>
                                    <span>{news.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>

            {/* News Modal */}
            {selectedNews && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-foreground pr-4">{selectedNews.title}</h3>
                                <button onClick={() => setSelectedNews(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                <span className="font-medium">{selectedNews.source}</span>
                                <span>{selectedNews.time}</span>
                            </div>
                            <p className="text-foreground leading-relaxed">{selectedNews.content}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BenchmarkPage;
