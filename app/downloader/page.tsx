'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Search, Download, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface VideoInfo {
    title: string;
    thumbnail: string;
    duration: string;
    formats: {
        itag: number;
        qualityLabel: string;
        container: string;
        hasAudio: boolean;
        hasVideo: boolean;
    }[];
}

export default function DownloaderPage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState<VideoInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<number | null>(null);
    const [downloading, setDownloading] = useState(false);

    const fetchInfo = async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        setInfo(null);
        try {
            const res = await fetch(`/api/ytdl?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (!res.ok) {
                const errorMessage = data.details || data.error || 'Video bilgileri alınamadı';
                throw new Error(errorMessage);
            }
            setInfo(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!selectedFormat || !url) return;
        setDownloading(true);

        const downloadUrl = `/api/ytdl/download?url=${encodeURIComponent(url)}&itag=${selectedFormat}`;
        window.location.href = downloadUrl;
        setTimeout(() => setDownloading(false), 2000);
    };

    return (
        <div className="container mx-auto max-w-3xl min-h-[70vh] flex flex-col items-center py-12 px-4">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold mb-2 text-gradient">YouTube İndirici</h1>
                <p className="text-muted-foreground">Videoları saniyeler içinde kaydedin.</p>
            </div>

            <div className="w-full glass-card rounded-3xl p-6 md:p-10 space-y-8">
                {/* Search Bar */}
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input
                            type="text"
                            placeholder="YouTube bağlantısını buraya yapıştırın..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
                        />
                    </div>
                    <button
                        onClick={fetchInfo}
                        disabled={loading || !url}
                        className="bg-primary hover:bg-primary/90 text-white px-8 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                        <span className="hidden md:inline">Getir</span>
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-2"
                    >
                        <AlertCircle size={20} />
                        {error}
                    </motion.div>
                )}

                {/* Video Info & Download Options */}
                <AnimatePresence>
                    {info && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-6 overflow-hidden"
                        >
                            <div className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <img src={info.thumbnail} alt={info.title} className="w-full md:w-48 aspect-video object-cover rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-bold line-clamp-2">{info.title}</h3>
                                    <p className="text-sm text-muted-foreground">Süre: {info.duration}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium pl-1">Format Seçin:</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {info.formats.map((format) => (
                                        <button
                                            key={format.itag}
                                            onClick={() => setSelectedFormat(format.itag)}
                                            className={`p-4 rounded-xl text-left border transition-all ${selectedFormat === format.itag
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40'
                                                }`}
                                        >
                                            <div className="font-bold flex items-center gap-2">
                                                {format.hasVideo ? 'Video' : 'Ses'}
                                                <span className="text-xs opacity-70 px-2 py-0.5 rounded-full bg-white/10">
                                                    {format.qualityLabel || 'Sadece Ses'}
                                                </span>
                                            </div>
                                            <div className="text-xs opacity-70 mt-1">
                                                {format.container.toUpperCase()} • {format.hasAudio ? 'Ses Var' : 'Ses Yok'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleDownload}
                                disabled={!selectedFormat || downloading}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {downloading ? (
                                    <>
                                        <Loader2 className="animate-spin" /> İndiriliyor...
                                    </>
                                ) : (
                                    <>
                                        <Download /> Hemen İndir
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
