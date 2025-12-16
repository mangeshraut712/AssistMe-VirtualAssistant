import { useState, useEffect } from 'react';
import {
    X, Wand2, Copy, Check, Sparkles,
    RefreshCw, Languages,
    AlignLeft, CheckCircle,
    Maximize2, SplitSquareHorizontal,
    Type
} from 'lucide-react';
import { createApiClient } from '@/lib/apiClient';

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

const GrammarlyQuillbotPanel = ({ isOpen, onClose, isEmbedded = false, backendUrl = '' }) => {
    const [activeTool, setActiveTool] = useState('paraphrase');
    const [activeMode, setActiveMode] = useState('standard');
    const [targetLang, setTargetLang] = useState('es');

    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState('split'); // split, focus

    // Reset state when tool changes
    useEffect(() => {
        setOutputText('');
        if (activeTool === 'paraphrase') setActiveMode('standard');
        if (activeTool === 'summarize') setActiveMode('paragraph');
    }, [activeTool]);

    if (!isOpen && !isEmbedded) return null;

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
            let accumulatedContent = '';

            const api = createApiClient({ baseUrl: backendUrl });

            await api.streamChat({
                model: 'x-ai/grok-4.1-fast:free',
                messages: [
                    { role: 'system', content: 'You are an expert writing assistant. Provide high-quality, direct responses without conversational filler.' },
                    { role: 'user', content: getPrompt() }
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
        } catch (err) {
            setOutputText(`Error: ${err?.message || String(err)}`);
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

    const containerClasses = isEmbedded
        ? "h-full flex flex-col font-sans text-foreground overflow-hidden"
        : "fixed inset-0 bg-background z-50 flex flex-col font-sans text-foreground overflow-hidden";

    return (
        <div className={containerClasses}>
            {/* Top Bar - Indigo Theme */}
            <header className={`flex items-center justify-between px-4 border-b border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 backdrop-blur-xl ${isEmbedded ? 'h-12' : 'h-14'}`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Wand2 className="h-5 w-5" />
                        <span className="font-bold text-lg tracking-tight">Writing Studio</span>
                    </div>
                    <div className="h-4 w-px bg-indigo-500/20 mx-2" />
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {TOOLS.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTool === tool.id
                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                    : 'text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                    }`}
                            >
                                <tool.icon className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'split' ? 'focus' : 'split')}
                        className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors hidden md:block"
                        title={viewMode === 'split' ? "Focus Mode" : "Split View"}
                    >
                        {viewMode === 'split' ? <Maximize2 className="h-4 w-4" /> : <SplitSquareHorizontal className="h-4 w-4" />}
                    </button>
                    {!isEmbedded && (
                        <button onClick={onClose} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 rounded-lg transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </header>

            {/* Toolbar */}
            <div className="h-12 border-b border-border bg-background/50 flex items-center px-4 gap-4 overflow-x-auto no-scrollbar">
                {activeTool === 'paraphrase' && (
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-muted-foreground mr-2 uppercase tracking-wider">Mode:</span>
                        {PARAPHRASE_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setActiveMode(mode.id)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeMode === mode.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                )}
                {activeTool === 'summarize' && (
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-muted-foreground mr-2 uppercase tracking-wider">Length:</span>
                        {SUMMARIZE_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setActiveMode(mode.id)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeMode === mode.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                )}
                {activeTool === 'translate' && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target:</span>
                        <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="bg-muted/50 border border-border text-xs rounded-md px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.id} value={lang.id}>{lang.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden bg-slate-50/50 dark:bg-neutral-950/50">
                {/* Input Area */}
                <div className={`flex-1 flex flex-col border-r border-border transition-all duration-300 ${viewMode === 'focus' && outputText ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex-1 relative group">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Start writing or paste text here..."
                            className="w-full h-full p-6 bg-transparent border-none resize-none focus:outline-none text-lg leading-relaxed font-serif placeholder:font-sans placeholder:text-muted-foreground/40"
                            spellCheck="false"
                        />
                        {!inputText && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 opacity-50 pointer-events-none">
                                <Type className="h-12 w-12 text-indigo-300" />
                                <p className="text-sm font-medium text-indigo-400">Type or paste to begin</p>
                            </div>
                        )}
                        {inputText && (
                            <button
                                onClick={() => setInputText('')}
                                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="p-4 border-t border-border flex justify-between items-center bg-background/50 backdrop-blur-sm">
                        <div className="text-xs text-muted-foreground font-mono">
                            {inputText.length} chars • {inputText.split(/\s+/).filter(w => w).length} words
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePaste}
                                className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                            >
                                Paste
                            </button>
                            <button
                                onClick={runEnhance}
                                disabled={!inputText.trim() || isProcessing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                            >
                                {isProcessing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                {activeTool === 'paraphrase' ? 'Rewrite' : activeTool === 'grammar' ? 'Fix' : activeTool === 'summarize' ? 'Summarize' : 'Translate'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Output Area */}
                {(viewMode === 'split' || outputText) && (
                    <div className={`flex-1 flex flex-col bg-white dark:bg-neutral-900 transition-all duration-300 ${viewMode === 'focus' && !outputText ? 'hidden' : 'flex'}`}>
                        <div className="flex-1 p-6 overflow-y-auto">
                            {outputText ? (
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-lg leading-relaxed font-serif whitespace-pre-wrap">{outputText}</p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30">
                                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center mb-4">
                                        <Sparkles className="h-8 w-8 text-indigo-200" />
                                    </div>
                                    <p className="text-sm font-medium">AI suggestions will appear here</p>
                                </div>
                            )}
                        </div>
                        {outputText && (
                            <div className="p-4 border-t border-border flex justify-between items-center bg-background/50 backdrop-blur-sm">
                                <div className="text-xs text-muted-foreground font-mono">
                                    Generated by Grok 4.1
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                                    >
                                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarlyQuillbotPanel;
