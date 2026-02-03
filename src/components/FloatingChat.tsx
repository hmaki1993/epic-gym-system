import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Send, MessageCircle, X, Maximize2, Minimize2, Search, Paperclip, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_role: string;
    content: string;
    image_url?: string;
    created_at: string;
}

interface FloatingChatProps {
    userStatus?: 'online' | 'busy';
    currentUserId?: string | null;
    currentUserRole?: string | null;
    currentUserName?: string | null;
}

export default function FloatingChat({
    userStatus = 'online',
    currentUserId,
    currentUserRole,
    currentUserName
}: FloatingChatProps) {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [showOnline, setShowOnline] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [msgToDeleteId, setMsgToDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isRtl = i18n.language === 'ar' || document.dir === 'rtl';

    const filteredMessages = messages.filter(msg =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('chat-images').getPublicUrl(filePath);

            const messageData = {
                sender_id: user.id,
                sender_name: user.full_name || 'Staff member',
                sender_role: user.role || 'staff',
                content: '📷 Image',
                image_url: data.publicUrl
            };

            const { data: msgData, error: msgError } = await supabase.from('staff_messages').insert([messageData]).select();

            if (msgError) throw msgError;

            const sentMsg = msgData?.[0] as Message;
            if (sentMsg) {
                setMessages(prev => [...prev, sentMsg]);
            }
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (currentUserId && currentUserRole) {
            setUser({
                id: currentUserId,
                role: currentUserRole,
                full_name: currentUserName || 'Staff'
            });
        } else {
            fetchUser();
        }

        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }, [currentUserId, currentUserRole, currentUserName]);

    useEffect(() => {
        if (!user || !isOpen) return;

        fetchMessages();
        const subscription = subscribeToMessagesAndPresence();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id, isOpen]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (profile) {
                setUser(profile);
            } else {
                const userRole = user.app_metadata?.role || user.user_metadata?.role || 'coach';
                setUser({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff',
                    role: userRole
                });
            }
        }
    };

    const fetchMessages = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('staff_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        if (!error) {
            setMessages(data || []);
        }
        setLoading(false);
    };

    const subscribeToMessagesAndPresence = () => {
        const channel = supabase.channel('floating_staff_messages');

        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_messages' }, payload => {
                const newMsg = payload.new as Message;
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                if (newMsg.sender_id !== user?.id && (!isOpen || document.hidden)) {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.6;
                    audio.play().catch(e => console.log('Audio blocked', e));

                    if (Notification.permission === 'granted') {
                        new Notification(`New Message from ${newMsg.sender_name}`, {
                            body: newMsg.content,
                            icon: '/logo.png'
                        });
                    }

                    toast.custom((t) => (
                        <div
                            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass-card border border-white/10 shadow-premium rounded-[2rem] pointer-events-auto flex items-center gap-4 p-4 cursor-pointer`}
                            onClick={() => {
                                setIsOpen(true);
                                toast.dismiss(t.id);
                                window.focus();
                            }}
                        >
                            <div className="flex-shrink-0 pt-0.5">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-lg border-2 border-white/10 shadow-lg">
                                    {newMsg.sender_name[0]?.toUpperCase()}
                                </div>
                            </div>
                            <div className="flex-1 w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                                    {newMsg.sender_name} <span className="text-white/30">•</span> {newMsg.sender_role}
                                </p>
                                <p className="text-sm font-bold text-white truncate shadow-black drop-shadow-md">
                                    {newMsg.content}
                                </p>
                            </div>
                            <div className="flex border-l border-white/10 pl-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toast.dismiss(t.id);
                                    }}
                                    className="w-full border border-transparent rounded-none rounded-r-lg p-2 flex items-center justify-center text-sm font-medium text-white/40 hover:text-white focus:outline-none"
                                >
                                    Review
                                </button>
                            </div>
                        </div>
                    ), {
                        duration: 5000,
                        position: 'top-center',
                    });
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'staff_messages' }, payload => {
                setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            })
            .on('presence', { event: 'sync' }, () => {
                const newStateString = channel.presenceState();
                const users = Object.values(newStateString).flat();
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && user) {
                    await channel.track({
                        user_id: user.id,
                        name: user.full_name,
                        role: user.role,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return channel;
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const messageData = {
            sender_id: user.id,
            sender_name: user.full_name || 'Staff member',
            sender_role: user.role || 'staff',
            content: newMessage.trim(),
        };

        const { data, error } = await supabase.from('staff_messages').insert([messageData]).select();

        if (!error) {
            const sentMsg = data?.[0] as Message;
            if (sentMsg && !messages.find(m => m.id === sentMsg.id)) {
                setMessages(prev => [...prev, sentMsg]);
            }
            setNewMessage('');
        }
    };

    const handleDeleteMessage = async () => {
        if (!msgToDeleteId) return;

        const { error } = await supabase
            .from('staff_messages')
            .delete()
            .eq('id', msgToDeleteId);

        if (!error) {
            setMsgToDeleteId(null);
        } else {
            toast.error('Failed to delete message');
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'text-primary bg-primary/20';
            case 'head_coach': return 'text-accent bg-accent/20';
            case 'coach': return 'text-emerald-400 bg-emerald-400/20';
            case 'reception': return 'text-amber-400 bg-amber-400/20';
            default: return 'text-white/40 bg-white/10';
        }
    };

    if (!user) return null;

    return (
        <div className={`fixed bottom-8 ${isRtl ? 'left-8' : 'right-8'} z-[100] flex flex-col items-end`}>
            {isOpen && (
                <div className={`mb-6 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden animate-in slide-in-from-bottom-10 duration-500 flex flex-col ${isMaximized ? 'w-[400px] h-[600px]' : 'w-[350px] h-[450px]'}`} style={{ backgroundColor: 'rgba(5, 5, 5, 0.85)' }}>
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between relative z-20">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                                onClick={() => setShowOnline(!showOnline)}
                                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showOnline ? 'bg-primary text-white shadow-lg' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
                            >
                                <MessageCircle className="w-5 h-5" />
                            </button>

                            {showSearch ? (
                                <div className="flex-1 lg:mr-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                                        onBlur={() => !searchQuery && setShowSearch(false)}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowSearch(true)}
                                        className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                                    >
                                        <Search className="w-4 h-4" />
                                    </button>
                                    <h3 className="font-extrabold text-white text-xs uppercase tracking-widest hidden sm:block">Staff Chat</h3>
                                </div>
                            )}

                            {!showSearch && (
                                <button
                                    onClick={() => setShowOnline(!showOnline)}
                                    className="hidden sm:flex text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] items-center gap-1.5 hover:text-emerald-300 transition-colors ml-auto mr-2"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {onlineUsers.length}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-rose-400 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden relative">
                        {showOnline && (
                            <div className="absolute inset-y-0 left-0 w-48 bg-black/80 backdrop-blur-xl border-r border-white/10 z-30 animate-in slide-in-from-left duration-300 flex flex-col p-4">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 px-2">Online</h4>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar text-white">
                                    {onlineUsers.map((u, i) => (
                                        <div key={i} className="flex items-center gap-2 group cursor-default">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black ${getRoleColor(u.role)}`}>
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-white/80 truncate">{u.name}</p>
                                                <p className="text-[7px] font-black text-white/20 uppercase tracking-tighter">{u.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/40">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-white/10 animate-pulse uppercase font-black text-[10px] tracking-widest">Loading...</div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-4">
                                    <MessageCircle className="w-12 h-12" />
                                    <p className="uppercase font-black text-[10px] tracking-widest">No messages</p>
                                </div>
                            ) : (
                                filteredMessages.map((msg, idx) => {
                                    const isMe = msg.sender_id === user.id;
                                    return (
                                        <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-300 group`}>
                                            {!isMe && (
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 px-2">
                                                    {msg.sender_name} • {msg.sender_role}
                                                </span>
                                            )}
                                            <div className="relative">
                                                {isMe && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMsgToDeleteId(msg.id);
                                                        }}
                                                        className="absolute top-1/2 -translate-y-1/2 -left-8 p-1.5 rounded-full text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <div className={`px-5 py-3 rounded-2xl text-[13px] font-bold tracking-tight max-w-[85%] ${isMe ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' : 'bg-white/5 text-white/80 border border-white/5 rounded-tl-none'}`}>
                                                    {msg.image_url && (
                                                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                                            <img src={msg.image_url} alt="Sent" className="max-w-full h-auto object-cover max-h-[200px]" loading="lazy" />
                                                        </div>
                                                    )}
                                                    {msg.content !== '📷 Image' && msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="p-4 border-t border-white/5 bg-white/[0.02] relative">
                        {showEmoji && (
                            <div className="absolute bottom-full left-4 mb-4 p-4 glass-card rounded-2xl border border-white/10 shadow-premium animate-in zoom-in slide-in-from-bottom-2 duration-300 w-[240px] bg-black/90">
                                <div className="grid grid-cols-6 gap-2">
                                    {['👋', '🙌', '🔥', '💪', '🚀', '⭐', '✅', '⚠️', '💎', '🎉', '👏', '🤝'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => {
                                                setNewMessage(prev => prev + emoji);
                                                setShowEmoji(false);
                                            }}
                                            className="text-lg p-2 hover:bg-white/5 rounded-lg transition-all active:scale-95"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowEmoji(!showEmoji)}
                                className={`p-2.5 rounded-xl transition-all ${showEmoji ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/20 border border-transparent hover:bg-white/10 hover:text-white'}`}
                            >
                                <span className="text-sm">😊</span>
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className={`p-2.5 rounded-xl transition-all ${isUploading ? 'bg-primary/20 text-primary animate-pulse' : 'bg-white/5 text-white/20 border border-transparent hover:bg-white/10 hover:text-white'}`}
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>

                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Message..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className={`p-2.5 rounded-xl transition-all ${newMessage.trim() ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105' : 'bg-white/5 text-white/10'}`}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!msgToDeleteId}
                onClose={() => setMsgToDeleteId(null)}
                onConfirm={handleDeleteMessage}
                title="Delete Message"
                message="Are you sure you want to delete this message? This action cannot be undone."
                type="danger"
            />

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative group p-4 rounded-[1.5rem] shadow-2xl transition-all duration-500 hover:scale-105 active:scale-95 ${isOpen ? 'bg-rose-500 text-white rotate-90 scale-90' : 'bg-[#0a0a0a] border border-white/10 text-white hover:border-primary/50'}`}
            >
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 relative z-20">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${userStatus === 'online' ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-4 w-4 border-2 border-[#0a0a0a] ${userStatus === 'online' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                    </span>
                )}
                {isOpen ? <X className="relative z-10 w-6 h-6" /> : <MessageCircle className="relative z-10 w-6 h-6 text-white/90" />}
            </button>
        </div>
    );
}
