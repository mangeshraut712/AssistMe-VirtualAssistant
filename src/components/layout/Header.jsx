import React from 'react';
import { Menu, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = ({ onOpenSidebar, showSidebar = false }) => {
    return (
        <header
            className="fixed top-0 left-0 right-0 z-40 px-4 py-3 safe-area-top bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
        >
            <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
                {/* Left: Menu Button */}
                <button
                    onClick={onOpenSidebar}
                    className="p-2 -ml-2 rounded-full hover:bg-foreground/5 active:scale-95 transition-all touch-manipulation text-foreground"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </button>

                {/* Center: App Title */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pt-safe-top">
                    <span className="text-lg font-medium text-foreground/90">AssistMe</span>
                </div>

                {/* Right: User Avatar (Project Logo) */}
                <div className="flex justify-end">
                    <button className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-white dark:ring-neutral-800 shadow-sm active:scale-95 transition-transform">
                        <img
                            src="/assets/logo.png"
                            alt="AssistMe Logo"
                            className="h-full w-full object-cover bg-white dark:bg-black"
                        />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
