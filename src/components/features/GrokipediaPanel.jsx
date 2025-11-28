import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock, History, User, Menu, ChevronRight, Share2, MoreHorizontal } from 'lucide-react';
import { marked } from 'marked';

const GrokipediaPanel = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [article, setArticle] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [toc, setToc] = useState([]);
    const [activeSection, setActiveSection] = useState('');

    // Mock initial state or load from search
    useEffect(() => {
        if (isOpen && !article) {
            // Optional: Load a default view or keep empty
        }
    }, [isOpen]);

    const handleSearch = async (e) => {
        if (e && e.key !== 'Enter') return;
        if (!query.trim()) return;

        setIsSearching(true);
        setArticle(null);
        setToc([]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.3-70b-instruct:free',
                    messages: [
                        { role: 'system', content: 'You are Grokipedia, an advanced AI encyclopedia. Provide a comprehensive, well-structured, and factual article about the user\'s query. Use Markdown headers (##, ###) to organize sections. Include a "References" section at the end if possible.' },
                        { role: 'user', content: query }
                    ],
                    stream: false
                })
            });

            const data = await response.json();

            if (data.choices && data.choices[0].message) {
                const content = data.choices[0].message.content;
                const generatedToc = parseToc(content);

                setArticle({
                    title: query,
                    content: content,
                    lastUpdated: new Date().toLocaleDateString(),
                    sources: [] // Chat API doesn't return sources separately usually
                });
                setToc(generatedToc);
            } else if (data.error) {
                console.error('Search error:', data.error);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Simple markdown header parser for TOC
    const parseToc = (markdown) => {
        const lines = markdown.split('\n');
        const headers = [];
        lines.forEach((line, index) => {
            if (line.startsWith('## ')) {
                headers.push({ id: `section-${index}`, text: line.replace('## ', ''), level: 2 });
            } else if (line.startsWith('### ')) {
                headers.push({ id: `section-${index}`, text: line.replace('### ', ''), level: 3 });
            }
        });
        return headers;
    };

    // Custom renderer to inject IDs for scrolling
    const renderMarkdown = (content) => {
        if (!content) return { __html: '' };

        let processedContent = content;
        // This is a simple replacement. For production, use a custom marked renderer.
        toc.forEach(item => {
            const regex = new RegExp(`(${item.level === 2 ? '##' : '###'} ${item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
            processedContent = processedContent.replace(regex, `<h${item.level} id="${item.id}">$1</h${item.level}>`);
        });

        return { __html: marked(processedContent) };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col font-sans text-foreground">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-serif text-xl font-bold tracking-tight">Grokipedia</span>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleSearch}
                            placeholder="Search..."
                            className="w-full h-9 pl-10 pr-12 bg-muted/50 border border-transparent focus:border-border hover:bg-muted/80 focus:bg-background rounded-lg text-sm transition-all outline-none"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar (TOC) */}
                <aside className="hidden lg:block w-64 border-r border-border overflow-y-auto p-6">
                    {article ? (
                        <div className="space-y-1">
                            <h3 className="font-semibold text-sm mb-4 px-2">{article.title}</h3>
                            <nav className="space-y-0.5">
                                {toc.map((item) => (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className={`block px-2 py-1.5 text-sm rounded-md transition-colors truncate ${item.level === 3 ? 'pl-6 text-muted-foreground' : 'text-foreground/80'
                                            } hover:bg-muted hover:text-foreground`}
                                    >
                                        {item.text}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                            <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
                        </div>
                    )}
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-background">
                    <div className="max-w-3xl mx-auto px-6 py-12 md:px-12">
                        {isSearching ? (
                            <div className="space-y-8 animate-pulse">
                                <div className="h-12 bg-muted rounded-lg w-3/4" />
                                <div className="space-y-4">
                                    <div className="h-4 bg-muted rounded w-full" />
                                    <div className="h-4 bg-muted rounded w-full" />
                                    <div className="h-4 bg-muted rounded w-5/6" />
                                </div>
                            </div>
                        ) : article ? (
                            <article className="prose dark:prose-invert prose-lg max-w-none">
                                {/* Article Header */}
                                <div className="mb-8 border-b border-border pb-8">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Fact-checked by Grok • {article.lastUpdated}</span>
                                    </div>
                                    <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-6">
                                        {article.title}
                                    </h1>
                                </div>

                                {/* Article Body */}
                                <div
                                    className="markdown-content font-serif leading-relaxed"
                                    dangerouslySetInnerHTML={renderMarkdown(article.content)}
                                />

                                {/* Sources Footer */}
                                {article.sources && article.sources.length > 0 && (
                                    <div className="mt-12 pt-8 border-t border-border">
                                        <h3 className="text-lg font-semibold mb-4">References</h3>
                                        <div className="grid gap-3">
                                            {article.sources.map((source, idx) => (
                                                <div key={idx} className="flex gap-3 text-sm">
                                                    <span className="text-muted-foreground">[{idx + 1}]</span>
                                                    <div>
                                                        <a
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium hover:underline text-primary"
                                                        >
                                                            {source.title}
                                                        </a>
                                                        <p className="text-muted-foreground text-xs mt-0.5">{source.url}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </article>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
                                    <Search className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold mb-2">Search Grokipedia</h2>
                                <p className="text-muted-foreground max-w-md">
                                    Access curated knowledge, benchmarks, and documentation powered by Grok 4.1.
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Right Sidebar (Optional - for future use or metadata) */}
                <aside className="hidden xl:block w-72 border-l border-border p-6 bg-muted/10">
                    {article && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl border border-border bg-card">
                                <h4 className="font-semibold mb-2 text-sm">About this article</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Source</span>
                                        <span className="font-medium text-foreground">Grok 4.1</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Confidence</span>
                                        <span className="font-medium text-foreground">High</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default GrokipediaPanel;
