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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-secondary flex items-center gap-2">
                    <Video className="w-8 h-8" />
                    {t('common.cameras')}
                </h1>
                <p className="text-gray-500 mt-1">{t('cameras.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Video Player */}
                    <div className="bg-black rounded-2xl overflow-hidden aspect-video relative shadow-lg group">
                        {activeStream ? (
                            <iframe
                                src={activeStream}
                                className="w-full h-full border-0"
                                allowFullScreen
                                allow="autoplay; encrypted-media"
                            ></iframe>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-900">
                                <Video className="w-16 h-16 mb-4 opacity-50" />
                                <p>{t('cameras.noSignal')}</p>
                            </div>
                        )}

                        {/* Live Indicator */}
                        {activeStream && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                LIVE
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Controls */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                            <Wifi className="w-5 h-5 text-primary" />
                            {t('cameras.connection')}
                        </h3>

                        <form onSubmit={handleStartStream} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('cameras.streamUrl')}
                                </label>
                                <input
                                    type="text"
                                    value={streamUrl}
                                    onChange={(e) => setStreamUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('cameras.enterLinkNote')}
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {t('cameras.startStream')}
                            </button>
                        </form>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-blue-800 text-sm">
                        <p className="font-bold mb-2">{t('cameras.noteTitle')}</p>
                        <p>{t('cameras.noteContent')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
