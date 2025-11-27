import React, { useState } from 'react';
import { X, Languages, ArrowRightLeft, Globe, Mic, Type, FileText, Cpu, Keyboard, Volume2, ScanText } from 'lucide-react';

const AI4BharatPanel = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, demo

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col font-sans text-foreground overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/95 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-xl">
                        AI
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">AI4Bharat</h2>
                        <p className="text-xs text-muted-foreground">Building AI for India</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <nav className="hidden md:flex gap-1 bg-muted/50 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'overview'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('demo')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'demo'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Live Demo
                        </button>
                    </nav>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-neutral-950">
                {activeTab === 'overview' ? <OverviewSection /> : <DemoSection />}
            </main>
        </div>
    );
};

const OverviewSection = () => {
    const features = [
        {
            icon: FileText,
            title: "Large Language Models",
            models: ["IndicBERT", "IndicBART", "Airavata"],
            description: "Multilingual LLMs tailored for Indian languages, trained on extensive diverse datasets like IndicCorpora and Sangraha.",
            color: "text-orange-600",
            bg: "bg-orange-50 dark:bg-orange-950/20"
        },
        {
            icon: Languages,
            title: "Machine Translation",
            models: ["IndicTransv2", "Samanantar"],
            description: "State-of-the-art translation models built on large-scale datasets mined from the web and carefully curated human translations.",
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/20"
        },
        {
            icon: Keyboard,
            title: "Transliteration",
            models: ["IndicXlit", "Aksharantar"],
            description: "Convert text between scripts of Indian languages and English, leveraging large scale datasets.",
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-950/20"
        },
        {
            icon: Mic,
            title: "Automatic Speech Recognition",
            models: ["IndicWav2Vec", "IndicWhisper"],
            description: "ASR models trained on rich datasets like Kathbath, Shrutilipi and IndicVoices covering multiple Indian languages.",
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-950/20"
        },
        {
            icon: Volume2,
            title: "Text to Speech",
            models: ["AI4BTTS", "Rasa", "Saffron"],
            description: "Natural-sounding synthetic voices for Indian languages using a mix of web-crawled data and curated recordings.",
            color: "text-pink-600",
            bg: "bg-pink-50 dark:bg-pink-950/20"
        },
        {
            icon: ScanText,
            title: "Optical Character Recognition",
            models: ["IndicOCR", "Document Layout"],
            description: "Models and datasets for advancing Document Layout Parsing and OCR technologies for Indian languages.",
            color: "text-red-600",
            bg: "bg-red-50 dark:bg-red-950/20"
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
            {/* Hero */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                    Building AI <br />
                    <span className="text-orange-500">for India!</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    AI4Bharat is a research lab at IIT Madras dedicated to advancing AI technology for Indian languages through open-source contributions.
                </p>
            </div>

            {/* Features Grid */}
            <div>
                <h2 className="text-3xl font-bold mb-8 text-center">Cutting-edge work across areas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <div key={idx} className={`p-6 rounded-2xl border border-border transition-all hover:shadow-lg ${feature.bg}`}>
                            <div className={`h-12 w-12 rounded-xl bg-white dark:bg-neutral-900 flex items-center justify-center mb-4 shadow-sm ${feature.color}`}>
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {feature.models.map((m, i) => (
                                    <span key={i} className="px-2 py-1 text-xs font-medium bg-white/80 dark:bg-black/20 rounded-md border border-black/5">
                                        {m}
                                    </span>
                                ))}
                            </div>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Importance for Indians */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 md:p-12 border border-border shadow-sm">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Why is this important for India?</h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 text-orange-600">
                                    <Globe className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg">Digital Inclusion</h4>
                                    <p className="text-muted-foreground">Enabling millions of non-English speakers to access the internet and digital services in their native tongues.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600">
                                    <Cpu className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg">Technological Sovereignty</h4>
                                    <p className="text-muted-foreground">Building indigenous AI models ensures data privacy and solutions tailored to India's unique cultural context.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 text-green-600">
                                    <Languages className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg">Preserving Heritage</h4>
                                    <p className="text-muted-foreground">Digitizing and preserving low-resource Indian languages for future generations through AI.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-full min-h-[300px] bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-neutral-900 rounded-2xl flex items-center justify-center p-8 text-center">
                        <div className="space-y-4">
                            <p className="text-4xl font-serif text-orange-600 dark:text-orange-400">
                                "Welcome"
                            </p>
                            <div className="text-2xl font-serif text-muted-foreground space-y-2">
                                <p>स्वागत हे</p>
                                <p>സ്വാഗതം</p>
                                <p>வரவேற்பு</p>
                                <p>స్వాగతం</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DemoSection = () => {
    const [sourceLanguage, setSourceLanguage] = useState('en');
    const [targetLanguage, setTargetLanguage] = useState('hi');
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);

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

    const handleTranslate = async () => {
        if (!inputText.trim()) return;
        setIsTranslating(true);
        try {
            const response = await fetch('/api/ai4bharat/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: inputText,
                    source_lang: sourceLanguage,
                    target_lang: targetLanguage,
                    action: 'translate'
                })
            });
            const data = await response.json();
            setOutputText(data.translated_text || data.result || 'Translation failed');
        } catch (error) {
            setOutputText('Error: ' + error.message);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <ArrowRightLeft className="h-6 w-6 text-primary" />
                    IndicTransv2 Demo
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Source Language</label>
                        <select
                            value={sourceLanguage}
                            onChange={(e) => setSourceLanguage(e.target.value)}
                            className="w-full p-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {indianLanguages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Target Language</label>
                        <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="w-full p-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {indianLanguages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Input Text</label>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Enter text here..."
                            className="w-full h-48 p-4 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Translation</label>
                        <div className="w-full h-48 p-4 border border-border rounded-xl bg-muted/50 overflow-y-auto text-lg">
                            {outputText || <span className="text-muted-foreground">Translation will appear here...</span>}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !inputText.trim()}
                    className="w-full mt-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium text-lg flex items-center justify-center gap-2"
                >
                    {isTranslating ? 'Translating...' : 'Translate Now'}
                </button>
            </div>
        </div>
    );
};

export default AI4BharatPanel;
