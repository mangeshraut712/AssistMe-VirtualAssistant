import React, { useState } from 'react';
import {
    X, Languages, ArrowRightLeft, Globe, Mic, Type, FileText,
    Cpu, Keyboard, Volume2, ScanText, Sparkles, Check, Copy, RotateCcw,
    BookA, MoveHorizontal
} from 'lucide-react';
import { createApiClient } from '@/lib/apiClient';

const AI4BharatPanel = ({ isOpen, onClose, isEmbedded = false, backendUrl = '' }) => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, translate, transliterate, script_convert, dictionary

    if (!isOpen && !isEmbedded) return null;

    const containerClasses = isEmbedded
        ? "h-full flex flex-col font-sans text-foreground overflow-hidden bg-slate-50/50 dark:bg-neutral-950/50"
        : "fixed inset-0 bg-background z-50 flex flex-col font-sans text-foreground overflow-hidden";

    return (
        <div className={containerClasses}>
            {/* Header */}
            {!isEmbedded && (
                <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/95 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/20">
                            AI
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300">AI4Bharat</h2>
                            <p className="text-xs text-muted-foreground font-medium">Building AI for India</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </header>
            )}

            {/* Embedded Nav */}
            {isEmbedded && (
                <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mr-4">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            AI
                        </div>
                        <span className="font-bold text-lg">AI4Bharat</span>
                    </div>
                    <nav className="flex gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto no-scrollbar">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'translate', label: 'Translate' },
                            { id: 'transliterate', label: 'Transliterate' },
                            { id: 'script_convert', label: 'Script' },
                            { id: 'dictionary', label: 'Dictionary' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}

            {/* Original Nav for Modal Mode */}
            {!isEmbedded && (
                <div className="px-6 py-2 border-b border-border bg-muted/10 flex justify-center">
                    <nav className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'translate', label: 'Translate' },
                            { id: 'transliterate', label: 'Transliterate' },
                            { id: 'script_convert', label: 'Script Converter' },
                            { id: 'dictionary', label: 'Dictionary' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${activeTab === tab.id
                                    ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}

            {/* Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-neutral-950/50">
                {activeTab === 'overview' && <OverviewSection onTryDemo={() => setActiveTab('translate')} />}
                {activeTab === 'translate' && <ToolSection tool="translate" backendUrl={backendUrl} />}
                {activeTab === 'transliterate' && <ToolSection tool="transliterate" backendUrl={backendUrl} />}
                {activeTab === 'script_convert' && <ToolSection tool="script_convert" backendUrl={backendUrl} />}
                {activeTab === 'dictionary' && <ToolSection tool="dictionary" backendUrl={backendUrl} />}
            </main>
        </div>
    );
};

const OverviewSection = ({ onTryDemo }) => {
    const features = [
        {
            icon: FileText,
            title: "Large Language Models",
            models: ["IndicBERT", "IndicBART", "Airavata"],
            description: "Multilingual LLMs tailored for Indian languages, trained on extensive diverse datasets.",
            color: "text-orange-600",
            bg: "bg-orange-50 dark:bg-orange-950/20",
            border: "border-orange-100 dark:border-orange-900/30"
        },
        {
            icon: Languages,
            title: "Machine Translation",
            models: ["IndicTransv2", "Samanantar"],
            description: "State-of-the-art translation models built on large-scale datasets mined from the web.",
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/20",
            border: "border-blue-100 dark:border-blue-900/30"
        },
        {
            icon: Keyboard,
            title: "Transliteration",
            models: ["IndicXlit", "Aksharantar"],
            description: "Convert text between scripts of Indian languages and English seamlessly.",
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-950/20",
            border: "border-green-100 dark:border-green-900/30"
        },
        {
            icon: Mic,
            title: "Speech Recognition",
            models: ["IndicWav2Vec", "IndicWhisper"],
            description: "ASR models trained on rich datasets covering multiple Indian languages.",
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-950/20",
            border: "border-purple-100 dark:border-purple-900/30"
        },
        {
            icon: Volume2,
            title: "Text to Speech",
            models: ["AI4BTTS", "Rasa", "Saffron"],
            description: "Natural-sounding synthetic voices for Indian languages.",
            color: "text-pink-600",
            bg: "bg-pink-50 dark:bg-pink-950/20",
            border: "border-pink-100 dark:border-pink-900/30"
        },
        {
            icon: ScanText,
            title: "OCR & Layout",
            models: ["IndicOCR", "Document Layout"],
            description: "Advanced Document Layout Parsing and OCR technologies for Indian scripts.",
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-950/20",
            border: "border-red-100 dark:border-red-900/30"
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
            {/* Hero */}
            <div className="text-center space-y-8 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    Powered by Grok 4.1
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
                    Building AI <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-white to-green-500 dark:from-orange-400 dark:via-neutral-200 dark:to-green-400 animate-gradient">for India!</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    Experience the power of Indian Language AI. Translate, transliterate, and interact in 22+ languages with state-of-the-art models.
                </p>
                <button
                    onClick={onTryDemo}
                    className="px-8 py-4 bg-foreground text-background rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-xl shadow-foreground/10"
                >
                    Try Live Demo
                </button>
            </div>

            {/* Features Grid */}
            <div>
                <h2 className="text-3xl font-bold mb-10 text-center">Cutting-edge Technology</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <div key={idx} className={`p-6 rounded-3xl border transition-all hover:shadow-xl hover:-translate-y-1 duration-300 ${feature.bg} ${feature.border}`}>
                            <div className={`h-14 w-14 rounded-2xl bg-white dark:bg-neutral-900 flex items-center justify-center mb-6 shadow-sm ${feature.color}`}>
                                <feature.icon className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {feature.models.map((m, i) => (
                                    <span key={i} className="px-2.5 py-1 text-xs font-bold bg-white/60 dark:bg-black/20 rounded-lg border border-black/5 backdrop-blur-sm">
                                        {m}
                                    </span>
                                ))}
                            </div>
                            <p className="text-muted-foreground leading-relaxed text-sm font-medium opacity-80">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ToolSection = ({ tool, backendUrl = '' }) => {
    const [sourceLanguage, setSourceLanguage] = useState('en');
    const [targetLanguage, setTargetLanguage] = useState('hi');
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);

    const indianLanguages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'ta', name: 'Tamil' },
        { code: 'te', name: 'Telugu' },
        { code: 'mr', name: 'Marathi' },
        { code: 'bn', name: 'Bengali' },
        { code: 'gu', name: 'Gujarati' },
        { code: 'kn', name: 'Kannada' },
        { code: 'ml', name: 'Malayalam' },
        { code: 'pa', name: 'Punjabi' },
        { code: 'ur', name: 'Urdu' },
        { code: 'or', name: 'Odia' },
    ];

    const getSystemPrompt = () => {
        const src = indianLanguages.find(l => l.code === sourceLanguage)?.name;
        const tgt = indianLanguages.find(l => l.code === targetLanguage)?.name;

        if (tool === 'translate') return `You are an expert translator. Translate the following text from ${src} to ${tgt}. Return ONLY the translated text.`;
        if (tool === 'transliterate') return `You are an expert transliterator. Convert the following text from ${src} script to ${tgt} script (phonetic transliteration). Return ONLY the transliterated text.`;
        if (tool === 'script_convert') return `You are an expert script converter. Convert the following text (which may be in any script) into the ${tgt} script. Preserve the phonetic sound, just change the script. Return ONLY the converted text.`;
        if (tool === 'dictionary') return `You are an expert dictionary. Provide the meaning, synonyms, and 2 usage examples for the word/phrase "${inputText}" in ${tgt}. Format clearly.`;
        return '';
    };

    const handleAction = async () => {
        if (!inputText.trim()) return;
        setIsProcessing(true);
        setOutputText('');

        try {
            let accumulatedContent = '';

            const api = createApiClient({ baseUrl: backendUrl });

            await api.streamChat({
                model: 'x-ai/grok-4.1-fast:free',
                messages: [
                    { role: 'system', content: getSystemPrompt() },
                    { role: 'user', content: inputText }
                ],
                onDelta: (delta) => {
                    accumulatedContent += delta;
                    setOutputText(accumulatedContent);
                },
                onError: (err) => {
                    const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
                    throw new Error(msg);
                }
            });
        } catch (error) {
            setOutputText('Error: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = async () => {
        if (!outputText) return;
        await navigator.clipboard.writeText(outputText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-xl shadow-black/5">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        {tool === 'translate' && <ArrowRightLeft className="h-7 w-7 text-blue-500" />}
                        {tool === 'transliterate' && <Keyboard className="h-7 w-7 text-green-500" />}
                        {tool === 'script_convert' && <MoveHorizontal className="h-7 w-7 text-orange-500" />}
                        {tool === 'dictionary' && <BookA className="h-7 w-7 text-purple-500" />}
                        <span className="capitalize">{tool === 'script_convert' ? 'Script Converter' : tool}</span>
                    </h2>

                    {/* Language Selectors */}
                    <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-xl">
                        {tool !== 'dictionary' && (
                            <select
                                value={sourceLanguage}
                                onChange={(e) => setSourceLanguage(e.target.value)}
                                className="bg-transparent text-sm font-medium px-2 py-1 focus:outline-none cursor-pointer"
                            >
                                {indianLanguages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        )}

                        {(tool === 'translate' || tool === 'transliterate' || tool === 'script_convert') && (
                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        )}

                        <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="bg-transparent text-sm font-medium px-2 py-1 focus:outline-none cursor-pointer"
                        >
                            {indianLanguages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-muted-foreground ml-1">Input</label>
                        <div className="relative group">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={tool === 'dictionary' ? "Enter a word to define..." : "Enter text here..."}
                                className="w-full h-64 p-6 border border-border rounded-2xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-lg leading-relaxed transition-all shadow-sm group-hover:shadow-md"
                            />
                            {inputText && (
                                <button
                                    onClick={() => setInputText('')}
                                    className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-muted-foreground ml-1">Output</label>
                        <div className="relative h-64 p-6 border border-border rounded-2xl bg-muted/30 overflow-y-auto text-lg leading-relaxed shadow-inner">
                            {outputText ? (
                                <p className="whitespace-pre-wrap">{outputText}</p>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40">
                                    <Sparkles className="h-8 w-8 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">AI output will appear here</p>
                                </div>
                            )}
                            {outputText && (
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={handleCopy}
                                        className="p-2 bg-background/80 backdrop-blur rounded-lg border border-border/50 shadow-sm hover:bg-background transition-all"
                                        title="Copy"
                                    >
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleAction}
                    disabled={isProcessing || !inputText.trim()}
                    className="w-full mt-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 active:scale-[0.99]"
                >
                    {isProcessing ? (
                        <>
                            <RotateCcw className="h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5" />
                            {tool === 'translate' && 'Translate Now'}
                            {tool === 'transliterate' && 'Transliterate'}
                            {tool === 'script_convert' && 'Convert Script'}
                            {tool === 'dictionary' && 'Get Definition'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AI4BharatPanel;
