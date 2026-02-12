import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface WalkieTalkieContextType {
    isIncoming: boolean;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    stopIncoming: () => void;
    playBeep: (type: 'start' | 'end') => void;
    currentAudio: React.MutableRefObject<HTMLAudioElement | null>;
}

const WalkieTalkieContext = createContext<WalkieTalkieContextType | undefined>(undefined);

export function WalkieTalkieProvider({ children, userId, role }: { children: React.ReactNode, userId: string | null, role: string | null }) {
    const [isMuted, setIsMuted] = useState(false);
    const [isIncoming, setIsIncoming] = useState(false);
    const currentAudio = useRef<HTMLAudioElement | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const gainNode = useRef<GainNode | null>(null);

    const initAudio = () => {
        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            gainNode.current = audioContext.current.createGain();
            // Amplify gain to 5.0 (500%) to ensure it's heard even on low volume settings
            gainNode.current.gain.value = 5.0;
            gainNode.current.connect(audioContext.current.destination);
            console.log('🎙️ WalkieTalkie: AudioContext & GainNode (5.0) initialized');
        }
        if (audioContext.current.state === 'suspended') {
            audioContext.current.resume();
        }
    };

    const playBeep = (type: 'start' | 'end') => {
        initAudio();
        if (!audioContext.current) return;

        const osc = audioContext.current.createOscillator();
        const beepGain = audioContext.current.createGain();
        osc.connect(beepGain);
        beepGain.connect(audioContext.current.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'start' ? 880 : 440, audioContext.current.currentTime);
        beepGain.gain.setValueAtTime(0.1, audioContext.current.currentTime);
        beepGain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.1);

        osc.start();
        osc.stop(audioContext.current.currentTime + 0.1);
    };

    const stopIncoming = () => {
        if (currentAudio.current) {
            currentAudio.current.pause();
            currentAudio.current = null;
        }
        setIsIncoming(false);
        playBeep('end');
    };

    useEffect(() => {
        if (!userId) return;

        // Handle app visibility/background state
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('🎙️ WalkieTalkie: App returned to foreground, checking audio...');
                if (audioContext.current && audioContext.current.state === 'suspended') {
                    audioContext.current.resume();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const channel = supabase
            .channel('voice-broadcasts-global')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'voice_broadcasts' },
                async (payload) => {
                    const newBroadcast = payload.new as any;

                    if (newBroadcast.sender_id !== userId && !isMuted) {
                        initAudio();

                        if (currentAudio.current) {
                            currentAudio.current.pause();
                            currentAudio.current = null;
                        }

                        setIsIncoming(true);
                        playBeep('start');

                        const audio = new Audio(newBroadcast.audio_url);
                        audio.crossOrigin = "anonymous";
                        audio.volume = 1.0; // Maximize standard volume slider
                        currentAudio.current = audio;

                        if (audioContext.current && gainNode.current) {
                            try {
                                const source = audioContext.current.createMediaElementSource(audio);
                                source.connect(gainNode.current);
                            } catch (err) {
                                console.warn('⚠️ WalkieTalkie: MediaSource connect failed (usually already connected or CORS)', err);
                            }
                        }

                        audio.play().catch(e => {
                            console.error('🚫 WalkieTalkie Global: Auto-play blocked:', e);
                            toast((t) => (
                                <span className="flex items-center gap-2">
                                    🎙️ Walkie Talkie
                                    <button
                                        onClick={() => {
                                            if (currentAudio.current === audio) {
                                                audio.play();
                                            }
                                            toast.dismiss(t.id);
                                        }}
                                        className="bg-primary text-black px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Listen
                                    </button>
                                </span>
                            ), { duration: 10000, className: 'premium-toast-vibrant' });
                        });

                        audio.onended = () => {
                            if (currentAudio.current === audio) {
                                setIsIncoming(false);
                                currentAudio.current = null;
                                playBeep('end');
                            }
                        };
                    }
                }
            )
            .subscribe();

        return () => {
            if (currentAudio.current) {
                currentAudio.current.pause();
                currentAudio.current = null;
            }
            supabase.removeChannel(channel);
        };
    }, [userId, isMuted, role]);

    return (
        <WalkieTalkieContext.Provider value={{
            isIncoming,
            isMuted,
            setIsMuted,
            stopIncoming,
            playBeep,
            currentAudio
        }}>
            {children}
        </WalkieTalkieContext.Provider>
    );
}

export function useWalkieTalkie() {
    const context = useContext(WalkieTalkieContext);
    if (context === undefined) {
        throw new Error('useWalkieTalkie must be used within a WalkieTalkieProvider');
    }
    return context;
}
