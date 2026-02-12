import { useState, useRef } from 'react';
import { Mic, Radio, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useWalkieTalkie } from '../context/WalkieTalkieContext';

interface Props {
    className?: string;
    role: string;
    userId: string;
}

export default function WalkieTalkie({ className = '', role, userId }: Props) {
    const { isIncoming, isMuted, setIsMuted, stopIncoming, playBeep, currentAudio } = useWalkieTalkie();
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const holdTimer = useRef<any>(null);
    const mouseDownTime = useRef<number>(0);
    const isHolding = useRef(false);

    const startRecording = async () => {
        if (role !== 'admin' && role !== 'head_coach') return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                await uploadBroadcast(audioBlob);
            };

            playBeep('start');
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Recording error:', err);
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            try {
                mediaRecorder.current.stop();
                mediaRecorder.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                playBeep('end');
            } catch (err) {
                console.error('Error stopping recorder:', err);
            }
        }
    };

    const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (role !== 'admin' && role !== 'head_coach') return;
        if (e.type === 'touchstart') e.preventDefault();

        mouseDownTime.current = Date.now();
        isHolding.current = true;

        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(() => {
            if (isHolding.current && !isRecording) {
                startRecording();
            }
        }, 250);
    };

    const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isHolding.current) return;
        isHolding.current = false;

        const pressDuration = Date.now() - mouseDownTime.current;
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }

        if (isRecording) {
            if (pressDuration >= 250) stopRecording();
        } else if (pressDuration < 250) {
            startRecording();
        }
    };

    const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
        if (role !== 'admin' && role !== 'head_coach') return;
        if (isRecording && (Date.now() - mouseDownTime.current < 250)) {
            stopRecording();
        }
    };

    const uploadBroadcast = async (blob: Blob) => {
        setIsUploading(true);
        const fileName = `${userId}_${Date.now()}.webm`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('walkie-talkie')
                .upload(fileName, blob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('walkie-talkie')
                .getPublicUrl(fileName);

            const { error: dbError } = await supabase
                .from('voice_broadcasts')
                .insert({
                    sender_id: userId,
                    audio_url: publicUrl,
                    expires_at: new Date(Date.now() + 60000).toISOString()
                });

            if (dbError) throw dbError;
            // toast.success('Broadcast sent!'); // Reduced noise
        } catch (err: any) {
            console.error('Broadcast error:', err);
            toast.error('Failed to send broadcast');
        } finally {
            setIsUploading(false);
        }
    };

    if (role !== 'admin' && role !== 'head_coach' && role !== 'coach' && role !== 'reception' && role !== 'receptionist') {
        return null;
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Broadcast Button - ADMIN ONLY */}
            {role === 'admin' && (
                <button
                    onMouseDown={handlePressStart}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={handlePressStart}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        handlePressEnd(e);
                        handleToggle(e as any);
                    }}
                    onClick={(e) => {
                        if ((Date.now() - mouseDownTime.current) < 50) return;
                        handleToggle(e);
                    }}
                    className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 border ${isRecording
                        ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-110'
                        : 'bg-white/5 border-white/10 hover:border-primary/50 text-white/70 hover:bg-white/10'
                        }`}
                    title={isRecording ? "Click to Stop" : "Broadcasting Mic (Hold to Talk)"}
                >
                    {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : isRecording ? (
                        <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                    ) : (
                        <Mic className="w-4 h-4" />
                    )}
                </button>
            )}

            {/* Speaker Button - ALL AUTHORIZED ROLES */}
            <button
                onClick={() => {
                    if (isIncoming && currentAudio.current) {
                        stopIncoming();
                    } else {
                        setIsMuted(!isMuted);
                    }
                }}
                className={`relative w-10 h-10 flex items-center justify-center rounded-full border transition-all ${isMuted
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    : isIncoming
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 animate-bounce shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                title={isIncoming ? "Admin is Speaking... (Click to Stop)" : "Hoki Toki Speaker (Mute/Unmute)"}
            >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isIncoming && !isMuted && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                )}
            </button>
        </div>
    );
}
