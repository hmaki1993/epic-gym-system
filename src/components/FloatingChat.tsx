import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Send, MessageCircle, X, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_role: string;
    content: string;
    created_at: string;
}

export default function FloatingChat() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [showOnline, setShowOnline] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isRtl = i18n.language === 'ar' || document.dir === 'rtl';

    useEffect(() => {
        fetchUser();
    }, []);

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
                if (!isOpen) {
                    toast.success(`${newMsg.sender_name}: ${newMsg.content.substring(0, 30)}...`, {
                        icon: '💬',
                        position: 'bottom-right'
                    });
                }
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
            {/* Chat Window */}
            {isOpen && (
                <div className={`mb-6 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden animate-in slide-in-from-bottom-10 duration-500 flex flex-col ${isMaximized ? 'w-[400px] h-[600px]' : 'w-[350px] h-[450px]'}`}>
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between relative z-20">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowOnline(!showOnline)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showOnline ? 'bg-primary text-white shadow-lg' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
                            >
                                <MessageCircle className="w-5 h-5" />
                            </button>
                            <div>
                                <h3 className="font-extrabold text-white text-xs uppercase tracking-widest">Staff Chat</h3>
                                <button
                                    onClick={() => setShowOnline(!showOnline)}
                                    className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-1.5 hover:text-emerald-300 transition-colors"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {onlineUsers.length} Online
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-rose-400 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden relative">
                        {/* Online Users Section */}
                        {showOnline && (
                            <div className="absolute inset-y-0 left-0 w-48 bg-black/60 backdrop-blur-xl border-r border-white/10 z-30 animate-in slide-in-from-left duration-300 flex flex-col p-4">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 px-2">Online Now</h4>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                    {onlineUsers.map((u, i) => (
                                        <div key={i} className="flex items-center gap-2 group cursor-default">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black ${getRoleColor(u.role)}`}>
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-white/80 truncate">{u.name}</p>
                                                <p className="text-[7px] font-black text-white/20 uppercase tracking-tighter">{u.role.replace('_', ' ')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/20">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-white/10 animate-pulse uppercase font-black text-[10px] tracking-widest">Loading...</div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-4">
                                    <MessageCircle className="w-12 h-12" />
                                    <p className="uppercase font-black text-[10px] tracking-widest">No messages yet</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender_id === user.id;
                                    return (
                                        <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-300`}>
                                            {!isMe && (
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 px-2">
                                                    {msg.sender_name} • {msg.sender_role.replace('_', ' ')}
                                                </span>
                                            )}
                                            <div className={`px-5 py-3 rounded-2xl text-[13px] font-bold tracking-tight max-w-[85%] ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white/5 text-white/80 border border-white/5 rounded-tl-none'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/5 bg-white/[0.02] relative">
                        {showEmoji && (
                            <div className="absolute bottom-full left-4 mb-4 p-4 glass-card rounded-2xl border border-white/10 shadow-premium animate-in zoom-in slide-in-from-bottom-2 duration-300 w-[240px]">
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
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Message staff..."
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

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative group p-4 rounded-2xl shadow-2xl transition-all duration-500 hover:scale-105 active:scale-95 ${isOpen ? 'bg-rose-500/90 text-white rotate-90 scale-90' : 'bg-gradient-to-br from-primary via-primary/80 to-accent text-white hover:shadow-primary/40'}`}
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-[1.2rem] blur-sm opacity-20 group-hover:opacity-40 transition duration-1000 animate-pulse"></div>
                {isOpen ? <X className="relative z-10 w-6 h-6" /> : (
                    <>
                        <MessageCircle className="relative z-10 w-6 h-6" />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 relative z-20">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background"></span>
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
