import React, { useState, useEffect } from 'react';
import { X, Sparkles, Download, Wand2, Image as ImageIcon, Ratio, Video, MoreHorizontal, ArrowUp, Settings2, ChevronDown, Copy, ExternalLink, Check } from 'lucide-react';

const ImageGenerationPanel = ({ isOpen, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [mode, setMode] = useState('image'); // image, video
    const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash-image');
    const [showSettings, setShowSettings] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const models = [
        { id: 'google/gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
    ];

    // Updated gallery with AI-themed images
    const [gallery, setGallery] = useState([
        { id: 1, url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[2/3]' }, // AI robot
        { id: 2, url: 'https://images.unsplash.com/photo-1686191128892-c0557e5a4e93?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-square' }, // Digital art
        { id: 3, url: 'https://images.unsplash.com/photo-1675271591433-d2c5c4c3f9a3?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[3/4]' }, // AI generated landscape
        { id: 4, url: 'https://images.unsplash.com/photo-1696258686454-60082b2c33e2?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[16/9]' }, // Futuristic city
        { id: 5, url: 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-[4/5]' }, // Abstract AI art
        { id: 6, url: 'https://images.unsplash.com/photo-1706885093476-b1e54f26d4b6?q=80&w=800&auto=format&fit=crop', aspect: 'aspect-square' }, // Digital creation
    ]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        callGenerationApi();
    };

    const callGenerationApi = async () => {
        try {
            const sizeMap = {
                '1:1': '1024x1024',
                '16:9': '1792x1024',
                '9:16': '1024x1792'
            };
            const aspectClassMap = {
                '1:1': 'aspect-square',
                '16:9': 'aspect-[16/9]',
                '9:16': 'aspect-[9/16]'
            };

            const response = await fetch('/api/images/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    model: selectedModel,
                    size: sizeMap[aspectRatio] || '1024x1024',
                    num_images: 1
                })
            });
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                const newImg = {
                    id: Date.now(),
                    url: data.data[0].url || `data:image/png;base64,${data.data[0].b64_json}`,
                    aspect: aspectClassMap[aspectRatio] || 'aspect-square',
                    isNew: true
                };
                setGallery(prev => [newImg, ...prev]);
            }
        } catch (error) {
            console.error("Generation failed", error);
        } finally {
            setIsGenerating(false);
            setPrompt('');
        }
    };

    const handleDownload = async (url, id) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `imagine-${id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error("Download failed", e);
            window.open(url, '_blank');
        }
    };

    const handleCopyLink = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleViewFull = (url) => {
        window.open(url, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col font-sans text-foreground overflow-hidden">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur border-b border-border sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span className="font-bold text-lg">Imagine</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
                    <X className="h-6 w-6" />
                </button>
            </header>

            {/* Main Content - Masonry Grid */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 max-w-7xl mx-auto pb-32">
                    {gallery.map((item) => (
                        <div key={item.id} className={`relative group rounded-xl overflow-hidden bg-card border border-border shadow-lg break-inside-avoid ${item.aspect}`}>
                            <img
                                src={item.url}
                                alt="Gallery item"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                <div className="flex items-center justify-end gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    <button
                                        onClick={() => handleViewFull(item.url)}
                                        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-colors"
                                        title="View Full Size"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleCopyLink(item.url, item.id)}
                                        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-colors"
                                        title="Copy Link"
                                    >
                                        {copiedId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDownload(item.url, item.id)}
                                        className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-colors"
                                        title="Download"
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {item.isNew && (
                                <span className="absolute top-3 right-3 px-2 py-1 bg-purple-500/90 backdrop-blur text-xs font-bold rounded-full shadow-lg border border-white/20 animate-in fade-in zoom-in text-white">
                                    NEW
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {/* Floating Input Bar */}
            <div className="absolute bottom-8 left-0 right-0 px-4 flex justify-center z-20">
                <div className="w-full max-w-3xl bg-card/90 backdrop-blur-xl border border-border rounded-3xl p-2 shadow-2xl flex flex-col gap-2">
                    {/* Input Area */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="p-2 bg-muted rounded-full">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                        </div>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            placeholder="Enter prompt to create image"
                            className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none h-12 text-lg"
                            autoFocus
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim() || isGenerating}
                            className={`p-2 rounded-full transition-all ${prompt.trim()
                                ? 'bg-foreground text-background hover:opacity-90'
                                : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            {isGenerating ? (
                                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ArrowUp className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-2 pt-1 border-t border-border">
                        <div className="flex items-center gap-1">
                            <div className="relative">
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-foreground/5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Settings2 className="h-3.5 w-3.5" />
                                    <span>Settings</span>
                                </button>

                                {/* Settings Popover */}
                                {showSettings && (
                                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2">

                                        {/* Model Selector */}
                                        <div className="mb-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Model</h4>
                                            <div className="relative">
                                                <select
                                                    value={selectedModel}
                                                    onChange={(e) => setSelectedModel(e.target.value)}
                                                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-purple-500 appearance-none"
                                                >
                                                    {models.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                            </div>
                                        </div>

                                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Aspect Ratio</h4>
                                        <div className="flex gap-2 mb-4">
                                            <button
                                                onClick={() => setAspectRatio('1:1')}
                                                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${aspectRatio === '1:1' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-foreground/5'}`}
                                            >
                                                Square
                                            </button>
                                            <button
                                                onClick={() => setAspectRatio('16:9')}
                                                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${aspectRatio === '16:9' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-foreground/5'}`}
                                            >
                                                Landscape
                                            </button>
                                            <button
                                                onClick={() => setAspectRatio('9:16')}
                                                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${aspectRatio === '9:16' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-foreground/5'}`}
                                            >
                                                Portrait
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-4 w-[1px] bg-border mx-1" />

                            <button
                                onClick={() => setMode('image')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mode === 'image' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <ImageIcon className="h-3.5 w-3.5" />
                                <span>Image</span>
                            </button>
                            <button
                                onClick={() => setMode('video')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${mode === 'video' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Video className="h-3.5 w-3.5" />
                                <span>Video</span>
                            </button>
                        </div>

                        <div className="text-[10px] text-muted-foreground font-mono hidden md:block">
                            Powered by {models.find(m => m.id === selectedModel)?.name}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerationPanel;
