import React, { useState } from 'react';
import { X, Wand2, Copy, Check, Sparkles } from 'lucide-react';

const modes = [
    { id: 'grammar', label: 'Grammar Fix', hint: 'Correct grammar, tone, and clarity.' },
    { id: 'paraphrase', label: 'Paraphrase', hint: 'Rewrite with fresh phrasing.' },
    { id: 'summarize', label: 'Summarize', hint: 'Condense into key points.' },
];

const GrammarlyQuillbotPanel = ({ isOpen, onClose, model = 'google/gemini-2.0-flash-exp:free' }) => {
    const [mode, setMode] = useState('grammar');
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const promptForMode = (text) => {
        if (mode === 'paraphrase') {
            return `Rewrite this text with improved phrasing and flow, preserve meaning:\n\n${text}`;
        }
        if (mode === 'summarize') {
            return `Summarize this text into concise bullet points and a one-line TL;DR:\n\n${text}`;
        }
        return `Act as a premium grammar assistant (Grammarly/Quillbot style). Fix grammar, punctuation, clarity, and tone. Return the improved text only.\n\n${text}`;
    };

    const handleCopy = async () => {
        if (!outputText) return;
        await navigator.clipboard.writeText(outputText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
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
                        { role: 'system', content: 'You are a concise writing assistant. Keep formatting minimal.' },
                        { role: 'user', content: promptForMode(inputText) }
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

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[hsl(var(--surface))]">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Wand2 className="h-5 w-5" />
                            Grammarly / Quillbot
                        </h2>
                        <p className="text-sm text-muted-foreground">Polish, paraphrase, or summarize in one click.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {modes.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id)}
                                className={`px-3 py-2 rounded-full border text-sm transition-all ${mode === m.id
                                        ? 'border-foreground bg-foreground text-background shadow-[0_12px_30px_rgba(0,0,0,0.12)]'
                                        : 'border-border bg-background hover:border-foreground/40'
                                    }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{modes.find(m => m.id === mode)?.hint}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Input</label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Paste or write your text..."
                                className="w-full min-h-[180px] rounded-xl border border-border bg-background p-3 focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                Output
                                {outputText && (
                                    <button
                                        onClick={handleCopy}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-border hover:border-foreground/50 transition-colors"
                                    >
                                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                )}
                            </label>
                            <div className="w-full min-h-[180px] rounded-xl border border-border bg-muted p-3 text-sm overflow-auto">
                                {outputText || <span className="text-muted-foreground">Your improved text will appear here.</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={runEnhance}
                        disabled={isProcessing || !inputText.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-foreground text-background font-semibold hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
                    >
                        {isProcessing ? 'Processing...' : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                {mode === 'grammar' && 'Fix Grammar'}
                                {mode === 'paraphrase' && 'Paraphrase'}
                                {mode === 'summarize' && 'Summarize'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GrammarlyQuillbotPanel;
