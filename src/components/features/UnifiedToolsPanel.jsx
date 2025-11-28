import React, { useState } from 'react';
import { X, Wand2, Globe, ChevronRight, LayoutGrid } from 'lucide-react';
import GrammarlyQuillbotPanel from './GrammarlyQuillbotPanel';
import AI4BharatPanel from './AI4BharatPanel';

const UnifiedToolsPanel = ({ isOpen, onClose }) => {
    const [activeSuite, setActiveSuite] = useState('writing'); // 'writing' | 'indian'

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background z-50 flex font-sans text-foreground overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="w-64 border-r border-border bg-muted/10 flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <LayoutGrid className="h-6 w-6 text-primary" />
                        <span>AI Studio</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Suites
                    </div>
                    <button
                        onClick={() => setActiveSuite('writing')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${activeSuite === 'writing'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold ring-1 ring-indigo-500/20 shadow-sm'
                            : 'text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeSuite === 'writing' ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-background border border-border group-hover:border-indigo-200'}`}>
                                <Wand2 className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm">Writing Studio</div>
                                <div className="text-[10px] opacity-70 font-normal">Editor, Grammar, Rewrite</div>
                            </div>
                        </div>
                        {activeSuite === 'writing' && <ChevronRight className="h-4 w-4" />}
                    </button>

                    <button
                        onClick={() => setActiveSuite('indian')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${activeSuite === 'indian'
                            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold ring-1 ring-orange-500/20 shadow-sm'
                            : 'text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeSuite === 'indian' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-background border border-border group-hover:border-orange-200'}`}>
                                <Globe className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm">Indian AI Suite</div>
                                <div className="text-[10px] opacity-70 font-normal">Translate, Script, Dict</div>
                            </div>
                        </div>
                        {activeSuite === 'indian' && <ChevronRight className="h-4 w-4" />}
                    </button>
                </nav>

                <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                    <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/10 dark:hover:border-red-900/30 transition-all text-sm font-medium shadow-sm"
                    >
                        <X className="h-4 w-4" />
                        Close Studio
                    </button>
                </div>
            </aside>

            {/* Mobile Header (Visible only on mobile) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 z-[60]">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <span>AI Studio</span>
                </div>
                <button onClick={onClose} className="p-2 -mr-2 hover:bg-muted rounded-full">
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Mobile Tab Bar (Visible only on mobile) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around px-2 z-[60] pb-safe">
                <button
                    onClick={() => setActiveSuite('writing')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 ${activeSuite === 'writing' ? 'text-indigo-600' : 'text-muted-foreground'}`}
                >
                    <Wand2 className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Writing Studio</span>
                </button>
                <div className="w-px h-8 bg-border/50" />
                <button
                    onClick={() => setActiveSuite('indian')}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 ${activeSuite === 'indian' ? 'text-orange-600' : 'text-muted-foreground'}`}
                >
                    <Globe className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Indian AI</span>
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 relative pt-14 md:pt-0 pb-16 md:pb-0 h-full overflow-hidden">
                {activeSuite === 'writing' && (
                    <GrammarlyQuillbotPanel isOpen={true} isEmbedded={true} />
                )}
                {activeSuite === 'indian' && (
                    <AI4BharatPanel isOpen={true} isEmbedded={true} />
                )}
            </main>
        </div>
    );
};

export default UnifiedToolsPanel;
