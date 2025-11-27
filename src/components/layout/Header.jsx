import React from 'react';
import { Menu, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = ({ onOpenSidebar, showSidebar = false }) => {
    return (
        <header
            className="fixed top-0 left-0 right-0 z-40 flex items-center justify-end px-4 sm:px-6 py-3 safe-area-top bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60"
            style={{ minHeight: 'calc(env(safe-area-inset-top) + 4rem)' }}
        >
            <div className="flex items-center justify-between w-full">
                <button
                    onClick={onOpenSidebar}
                    className={`p-2 rounded-xl border border-border bg-card text-foreground shadow-sm hover:shadow-md transition-all ${showSidebar ? 'md:hidden' : ''
                        }`}
                    title="Open sidebar"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <Link
                    to="/benchmark"
                    className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white dark:bg-neutral-900 text-foreground shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] text-sm font-semibold hover:border-foreground/60 transition-colors"
                >
                    <BarChart3 className="h-4 w-4" />
                    Benchmark
                </Link>
            </div>
        </header>
    );
};

export default Header;
