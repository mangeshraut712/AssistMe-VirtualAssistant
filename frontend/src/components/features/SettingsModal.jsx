import React from 'react';
import { X, Sun, Moon, Monitor, Globe2, Sparkles, Palette } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-[0_20px_70px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in duration-200">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold">Settings</h2>
                        <p className="text-sm text-muted-foreground">Tailor your experience across theme, language, and power features.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-foreground/5 transition-colors"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                        <div className="flex items-center gap-2">
                            <Globe2 className="h-4 w-4" />
                            <div>
                                <p className="font-semibold text-sm">Language</p>
                                <p className="text-xs text-muted-foreground">Used across chat + AI4Bharat translations.</p>
                            </div>
                        </div>
                        <select
                            id="language"
                            name="language"
                            value={settings.language}
                            onChange={(e) => onSettingsChange('language', e.target.value)}
                            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="ja">Japanese</option>
                        </select>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            <div>
                                <p className="font-semibold text-sm">Theme</p>
                                <p className="text-xs text-muted-foreground">Preview light/dark and apply instantly.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'light', label: 'Light', icon: Sun, swatch: 'bg-white text-black border' },
                                { id: 'dark', label: 'Dark', icon: Moon, swatch: 'bg-neutral-900 text-white border border-neutral-700' },
                                { id: 'system', label: 'System', icon: Monitor, swatch: 'bg-gradient-to-r from-white via-slate-300 to-neutral-900 text-black border' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSettingsChange('theme', item.id)}
                                    className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${settings.theme === item.id
                                        ? 'border-foreground bg-foreground text-background shadow-[0_10px_30px_rgba(0,0,0,0.08)]'
                                        : 'border-border bg-card hover:border-foreground/40'
                                        }`}
                                >
                                    <div className={`w-full h-10 rounded-lg ${item.swatch} flex items-center justify-center text-xs font-semibold`}>
                                        {item.label}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <item.icon className="h-3.5 w-3.5" />
                                        Live preview
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-background space-y-3 md:col-span-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            <div>
                                <p className="font-semibold text-sm">Advanced mode</p>
                                <p className="text-xs text-muted-foreground">Toggle beta/experimental controls across panels.</p>
                            </div>
                        </div>
                        <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:border-foreground/40 transition-colors">
                            <div>
                                <p className="font-medium text-sm">Enable advanced UI</p>
                                <p className="text-xs text-muted-foreground">Adds power features where available. Use this to unlock premium models and experimental tools.</p>
                            </div>
                            <input
                                type="checkbox"
                                id="advanced"
                                name="advanced-mode"
                                checked={settings.advanced || false}
                                onChange={(e) => onSettingsChange('advanced', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-full text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity h-10 px-5"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
