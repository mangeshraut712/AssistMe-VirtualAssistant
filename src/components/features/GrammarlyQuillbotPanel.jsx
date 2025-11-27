import React, { useState, useEffect } from 'react';
import {
    X, Wand2, Copy, Check, Sparkles,
    RefreshCw, FileText, Languages,
    AlignLeft, CheckCircle, ArrowRight,
    Upload, ClipboardPaste, RotateCcw
} from 'lucide-react';

const TOOLS = [
    { id: 'paraphrase', label: 'Paraphraser', icon: RefreshCw, description: 'Rewrite text with improved phrasing.' },
    { id: 'grammar', label: 'Grammar Checker', icon: CheckCircle, description: 'Fix grammar, spelling, and punctuation.' },
    { id: 'summarize', label: 'Summarizer', icon: AlignLeft, description: 'Condense text into key points.' },
    { id: 'translate', label: 'Translator', icon: Languages, description: 'Translate text to another language.' },
];

const PARAPHRASE_MODES = [
    { id: 'standard', label: 'Standard', prompt: 'Rewrite this text to improve clarity and flow while maintaining the original meaning.' },
    { id: 'fluency', label: 'Fluency', prompt: 'Rewrite this text to sound more natural and fluent.' },
    { id: 'formal', label: 'Formal', prompt: 'Rewrite this text in a formal, professional tone.' },
    { id: 'simple', label: 'Simple', prompt: 'Rewrite this text using simple language and short sentences.' },
    { id: 'creative', label: 'Creative', prompt: 'Rewrite this text creatively, using more descriptive vocabulary.' },
];

const SUMMARIZE_MODES = [
    { id: 'paragraph', label: 'Paragraph', prompt: 'Summarize this text into a concise paragraph.' },
    { id: 'bullets', label: 'Bullet Points', prompt: 'Summarize this text into key bullet points.' },
];

const LANGUAGES = [
    { id: 'es', label: 'Spanish' },
    { id: 'fr', label: 'French' },
    { id: 'de', label: 'German' },
    { id: 'hi', label: 'Hindi' },
    { id: 'zh', label: 'Chinese' },
    { id: 'ja', label: 'Japanese' },
];

const GrammarlyQuillbotPanel = ({ isOpen, onClose, model = 'google/gemini-2.0-flash-exp:free' }) => {
    const [activeTool, setActiveTool] = useState('paraphrase');
    const [activeMode, setActiveMode] = useState('standard');
    const [targetLang, setTargetLang] = useState('es');

    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);

    // Reset state when tool changes
    useEffect(() => {
        setOutputText('');
        if (activeTool === 'paraphrase') setActiveMode('standard');
        if (activeTool === 'summarize') setActiveMode('paragraph');
    }, [activeTool]);

    if (!isOpen) return null;

    const getPrompt = () => {
        if (activeTool === 'paraphrase') {
            const mode = PARAPHRASE_MODES.find(m => m.id === activeMode);
            return `${mode?.prompt || 'Rewrite this text.'}\n\nText:\n${inputText}`;
        }
        if (activeTool === 'grammar') {
            return `Act as a professional grammar checker. Fix all grammar, spelling, punctuation, and style errors in the following text. Return ONLY the corrected text.\n\nText:\n${inputText}`;
        }
        if (activeTool === 'summarize') {
            const mode = SUMMARIZE_MODES.find(m => m.id === activeMode);
            return `${mode?.prompt || 'Summarize this text.'}\n\nText:\n${inputText}`;
        }
        if (activeTool === 'translate') {
            const lang = LANGUAGES.find(l => l.id === targetLang)?.label || targetLang;
            return `Translate the following text to ${lang}. Return ONLY the translated text.\n\nText:\n${inputText}`;
        }
        return inputText;
    };

    const runEnhance = async () => {
        if (!inputText.trim()) return;
        setIsProcessing(true);
        setOutputText('');

        try {
            const response = await fetch('/api/chat/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an expert writing assistant. Provide high-quality, direct responses without conversational filler.' },
                        { role: 'user', content: getPrompt() }
                    ],
                    model,
                    preferred_language: 'en'
                })
            });

            const data = await response.json();
            setOutputText(data.response || data.error || 'No response generated.');
        } catch (err) {
            setOutputText(`Error: ${err.message}`);
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

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setInputText(text);
        } catch (err) {
            console.error('Failed to read clipboard', err);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Top Bar */}
            <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background/90 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 flex items-center justify-center">
                        <Wand2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Writing Tools</h2>
                        <p className="text-xs text-muted-foreground">Paraphrase, grammar, summary, and translation in one place.</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 ml-4">
                        <span className="px-3 py-1 text-[11px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">Premium unlocked</span>
                        <span className="px-3 py-1 text-[11px] rounded-full bg-muted text-muted-foreground">Model: {model}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="md:hidden">
                        <select
                            value={activeTool}
                            onChange={(e) => setActiveTool(e.target.value)}
                            className="text-sm rounded-lg border border-border bg-card px-3 py-1.5"
                        >
                            {TOOLS.map(tool => (
                                <option key={tool.id} value={tool.id}>{tool.label}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close writing tools">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-muted/30 border-r border-border flex flex-col hidden md:flex">
                    <div className="p-6 border-b border-border/50">
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <Wand2 className="h-5 w-5 text-emerald-500" />
                            <span>Toolbox</span>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {TOOLS.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTool === tool.id
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <tool.icon className={`h-5 w-5 ${activeTool === tool.id ? 'text-emerald-500' : ''}`} />
                                <div className="text-left">
                                    <div>{tool.label}</div>
                                    <p className="text-[11px] text-muted-foreground">{tool.description}</p>
                                </div>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0 bg-background">

                    {/* Mode Bar */}
                    <div className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 bg-background/80 backdrop-blur">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                            <span className="font-semibold text-sm md:text-base whitespace-nowrap">
                                {TOOLS.find(t => t.id === activeTool)?.label}
                            </span>

                            {activeTool === 'paraphrase' && (
                                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                                    {PARAPHRASE_MODES.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setActiveMode(mode.id)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeMode === mode.id
                                                    ? 'bg-background text-foreground shadow-sm border border-border'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTool === 'summarize' && (
                                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                                    {SUMMARIZE_MODES.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setActiveMode(mode.id)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeMode === mode.id
                                                    ? 'bg-background text-foreground shadow-sm border border-border'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTool === 'translate' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">To:</span>
                                    <select
                                        value={targetLang}
                                        onChange={(e) => setTargetLang(e.target.value)}
                                        className="bg-muted/50 border border-border text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {LANGUAGES.map(lang => (
                                            <option key={lang.id} value={lang.id}>{lang.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                        {/* Input Pane */}
                        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border min-h-[300px]">
                    <div className="flex-1 p-4 md:p-6 relative group">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Paste text or write here to start..."
                                    className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-base leading-relaxed placeholder:text-muted-foreground/50"
                                    spellCheck="false"
                                />

                                {!inputText && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3">
                                        <button
                                            onClick={handlePaste}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-sm font-medium"
                                        >
                                            <ClipboardPaste className="h-4 w-4" />
                                            Paste Text
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors text-sm font-medium cursor-not-allowed opacity-60">
                                            <Upload className="h-4 w-4" />
                                            Upload Doc
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Input Footer */}
                            <div className="h-14 border-t border-border flex items-center justify-between px-4 md:px-6 bg-muted/10">
                                <div className="text-xs text-muted-foreground font-medium">
                                    {inputText.split(/\s+/).filter(w => w).length} words
                                </div>
                                <button
                                    onClick={runEnhance}
                                    disabled={!inputText.trim() || isProcessing}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            {activeTool === 'paraphrase' && 'Paraphrase'}
                                            {activeTool === 'grammar' && 'Fix Errors'}
                                            {activeTool === 'summarize' && 'Summarize'}
                                            {activeTool === 'translate' && 'Translate'}
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Output Pane */}
                        <div className="flex-1 flex flex-col bg-muted/10">
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                                {outputText ? (
                                    <div className="prose dark:prose-invert max-w-none">
                                        <p className="text-base leading-relaxed whitespace-pre-wrap">{outputText}</p>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40">
                                        <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                                        <p className="text-sm">AI output will appear here</p>
                                    </div>
                                )}
                            </div>

                            {/* Output Footer */}
                            <div className="h-14 border-t border-border flex items-center justify-between px-4 md:px-6 bg-muted/20">
                                <div className="flex items-center gap-2">
                                    {outputText && (
                                        <>
                                            <button
                                                onClick={handleCopy}
                                                className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors relative group"
                                                title="Copy to clipboard"
                                            >
                                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={runEnhance}
                                                className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                                title="Regenerate"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                                {outputText && (
                                    <div className="text-xs text-muted-foreground font-medium">
                                        {outputText.split(/\s+/).filter(w => w).length} words
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default GrammarlyQuillbotPanel;
