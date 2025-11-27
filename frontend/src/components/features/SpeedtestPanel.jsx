
import React, { useMemo, useState } from 'react';
import { X, Gauge, RefreshCcw, Activity, Server, Zap, Brain } from 'lucide-react';

const SpeedtestPanel = ({ isOpen, onClose }) => {
    const [results, setResults] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [stage, setStage] = useState(''); // 'api', 'llm', 'complete'
    const [error, setError] = useState('');

    const stats = useMemo(() => {
        if (!results) return null;
        const { apiSamples, llmLatency } = results;

        const avgApi = apiSamples.reduce((sum, v) => sum + v, 0) / apiSamples.length;
        const jitter = Math.sqrt(apiSamples.reduce((s, v) => s + Math.pow(v - avgApi, 2), 0) / apiSamples.length);

        return {
            api: {
                avg: Math.round(avgApi),
                min: Math.min(...apiSamples).toFixed(0),
                max: Math.max(...apiSamples).toFixed(0),
                jitter: Math.round(jitter),
            },
            llm: {
                latency: llmLatency ? Math.round(llmLatency) : null
            }
        };
    }, [results]);

    if (!isOpen) return null;

    const pingApi = async () => {
        const start = performance.now();
        await fetch(`/health?ts=${Date.now()}`);
        return performance.now() - start;
    };

    const testLlm = async () => {
        const start = performance.now();
        await fetch('/api/chat/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'ping' }],
                model: 'meta-llama/llama-3.3-70b-instruct:free'
            })
        });
        return performance.now() - start;
    };

    const runTest = async () => {
        setIsRunning(true);
        setError('');
        setResults(null);
        setStage('api');

        try {
            // 1. API Latency Test
            const apiSamples = [];
            for (let i = 0; i < 5; i++) {
                const duration = await pingApi();
                apiSamples.push(duration);
                // Small delay between pings
                await new Promise(r => setTimeout(r, 100));
            }

            // 2. LLM Latency Test
            setStage('llm');
            const llmLatency = await testLlm();

            setResults({ apiSamples, llmLatency });
            setStage('complete');
        } catch (err) {
            setError(err.message);
            setStage('error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="relative p-6 border-b border-white/5 bg-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                                <Gauge className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">System Benchmark</h2>
                                <p className="text-sm text-neutral-400">Analyze API & AI Model Performance</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {/* Control Center */}
                    <div className="flex flex-col items-center justify-center py-4">
                        <button
                            onClick={runTest}
                            disabled={isRunning}
                            className={`
                                relative group px-8 py-4 rounded-full font-bold text-lg transition-all duration-300
                                ${isRunning
                                    ? 'bg-neutral-800 text-neutral-400 cursor-wait'
                                    : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg hover:shadow-blue-500/25 hover:scale-105'
                                }
                            `}
                        >
                            <span className="flex items-center gap-3">
                                {isRunning ? (
                                    <>
                                        <RefreshCcw className="h-5 w-5 animate-spin" />
                                        Running Diagnostics...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-5 w-5 fill-current" />
                                        Start Benchmark
                                    </>
                                )}
                            </span>
                        </button>

                        {/* Status Indicator */}
                        <div className="mt-4 h-6">
                            {stage === 'api' && <span className="text-sm text-blue-400 animate-pulse">Testing API Latency...</span>}
                            {stage === 'llm' && <span className="text-sm text-violet-400 animate-pulse">Testing AI Model Response...</span>}
                            {stage === 'complete' && <span className="text-sm text-green-400">Benchmark Complete</span>}
                            {error && <span className="text-sm text-red-400">{error}</span>}
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* API Health Card */}
                        <div className={`
                            p-5 rounded-2xl border transition-all duration-500
                            ${stats ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/5 border-white/5'}
                        `}>
                            <div className="flex items-center gap-3 mb-4">
                                <Server className={`h-5 w-5 ${stats ? 'text-blue-400' : 'text-neutral-500'}`} />
                                <h3 className="font-semibold text-white">API Latency</h3>
                            </div>

                            {stats ? (
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-3xl font-bold text-white mb-1">
                                            {stats.api.avg} <span className="text-lg text-neutral-400 font-medium">ms</span>
                                        </div>
                                        <div className="text-xs text-blue-300/80 font-medium">Average Response Time</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                        <div>
                                            <div className="text-xs text-neutral-500">Jitter</div>
                                            <div className="text-sm font-mono text-white">{stats.api.jitter}ms</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-neutral-500">Peak</div>
                                            <div className="text-sm font-mono text-white">{stats.api.max}ms</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center text-neutral-600 text-sm">
                                    Ready to test
                                </div>
                            )}
                        </div>

                        {/* AI Performance Card */}
                        <div className={`
                            p-5 rounded-2xl border transition-all duration-500
                            ${stats?.llm ? 'bg-violet-500/10 border-violet-500/20' : 'bg-white/5 border-white/5'}
                        `}>
                            <div className="flex items-center gap-3 mb-4">
                                <Brain className={`h-5 w-5 ${stats?.llm ? 'text-violet-400' : 'text-neutral-500'}`} />
                                <h3 className="font-semibold text-white">AI Response</h3>
                            </div>

                            {stats?.llm ? (
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-3xl font-bold text-white mb-1">
                                            {stats.llm.latency} <span className="text-lg text-neutral-400 font-medium">ms</span>
                                        </div>
                                        <div className="text-xs text-violet-300/80 font-medium">Time to First Token (Est.)</div>
                                    </div>

                                    <div className="pt-2 border-t border-white/10">
                                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            Model: Llama 3.3 70B
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center text-neutral-600 text-sm">
                                    Ready to test
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Samples */}
                    {results && (
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Raw Samples</p>
                            <div className="flex flex-wrap gap-2">
                                {results.apiSamples.map((s, idx) => (
                                    <div key={idx} className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-white/5 text-xs font-mono text-neutral-300 flex items-center gap-2">
                                        <Activity className="h-3 w-3 text-blue-500" />
                                        {Math.round(s)}ms
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpeedtestPanel;
