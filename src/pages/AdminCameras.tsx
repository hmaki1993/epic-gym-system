import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, Wifi, Save } from 'lucide-react';

export default function AdminCameras() {
    const { t } = useTranslation();
    const [streamUrl, setStreamUrl] = useState('');
    const [activeStream, setActiveStream] = useState('');

    const handleStartStream = (e: React.FormEvent) => {
        e.preventDefault();
        setActiveStream(streamUrl);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <h1 className="text-6xl font-black text-white uppercase tracking-tighter flex items-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-[2rem] text-primary shadow-inner">
                            <Video className="w-12 h-12" />
                        </div>
                        <span className="premium-gradient-text">{t('common.cameras')}</span>
                    </h1>
                    <p className="text-white/40 font-black uppercase tracking-[0.3em] text-xs ml-2">
                        {t('cameras.subtitle') || 'Monitor gym activities in real-time'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                    {/* Video Player Container */}
                    <div className="glass-card rounded-[3.5rem] overflow-hidden border border-white/10 shadow-premium aspect-video relative group bg-black/40">
                        {activeStream ? (
                            <iframe
                                src={activeStream}
                                className="w-full h-full border-0"
                                allowFullScreen
                                allow="autoplay; encrypted-media"
                            ></iframe>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                                <div className="relative">
                                    <Video className="w-32 h-32 mb-8 opacity-20 animate-pulse" />
                                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
                                </div>
                                <p className="font-black uppercase tracking-[0.4em] text-sm">{t('cameras.noSignal')}</p>
                            </div>
                        )}

                        {/* Live Indicator Overlay */}
                        {activeStream && (
                            <div className="absolute top-8 left-8 flex items-center gap-3 bg-rose-500 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-lg shadow-rose-500/20 animate-in zoom-in-50">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                LIVE FEED
                            </div>
                        )}

                        {/* Glass Overlay on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none p-12 flex items-end">
                            <div className="space-y-2">
                                <h4 className="text-white font-black text-2xl uppercase tracking-tighter">HD SECURITY FEED 01</h4>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">STABLE CONNECTION • {new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Controls Card */}
                    <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>

                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-inner">
                                <Wifi className="w-6 h-6" />
                            </div>
                            {t('cameras.connection')}
                        </h3>

                        <form onSubmit={handleStartStream} className="space-y-8 relative z-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">
                                    {t('cameras.streamUrl')}
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={streamUrl}
                                        onChange={(e) => setStreamUrl(e.target.value)}
                                        placeholder="https://ip-camera-link.com/..."
                                        className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 text-white placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold text-sm tracking-tight"
                                    />
                                </div>
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-relaxed px-2">
                                    {t('cameras.enterLinkNote')}
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="group/btn bg-primary hover:bg-primary/90 text-white px-10 py-6 rounded-[2rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 font-black uppercase tracking-widest text-sm relative overflow-hidden w-full justify-center"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                <Save className="w-6 h-6 relative z-10" />
                                <span className="relative z-10">{t('cameras.startStream')}</span>
                            </button>
                        </form>
                    </div>

                    {/* Security Note Card */}
                    <div className="glass-card p-10 rounded-[3rem] border border-rose-500/10 bg-rose-500/[0.02] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-rose-500 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Save className="w-12 h-12" />
                        </div>
                        <div className="space-y-4 relative z-10">
                            <p className="text-rose-400 font-black uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                                {t('cameras.noteTitle')}
                            </p>
                            <p className="text-white/40 text-xs font-bold leading-relaxed">
                                {t('cameras.noteContent')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
