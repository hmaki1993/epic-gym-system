import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Send, User, MessageCircle, Clock, Smile } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_role: string;
    content: string;
    created_at: string;
}

export default function Chat() {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isRtl = i18n.language === 'ar' || document.dir === 'rtl';
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (!user) return;

        fetchMessages();
        const subscription = subscribeToMessagesAndPresence();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.id]); // Re-run when user is loaded

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchUser = async () => {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('Chat: Auth User:', user, authError);

        if (user) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle(); // Changed single() to maybeSingle() to avoid 406 errors

            console.log('Chat: Profile lookup result:', profile, profileError);

            if (profile) {
                setUser(profile);
            } else {
                // Fallback to Auth User data if profile is missing
                console.warn('Chat: Profile not found, using auth fallback');
                const userRole = user.app_metadata?.role || user.user_metadata?.role || 'admin';
                setUser({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
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

        if (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } else {
            setMessages(data || []);
        }
        setLoading(false);
    };

    const subscribeToMessagesAndPresence = () => {
        console.log('Chat: Setting up channel for messages and presence...');
        const channel = supabase.channel('staff_messages_channel');

        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_messages' }, payload => {
                console.log('Chat: New message received:', payload);
                const newMsg = payload.new as Message;
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            })
            .on('presence', { event: 'sync' }, () => {
                const newStateString = channel.presenceState();
                const users = Object.values(newStateString).flat();
                setOnlineUsers(users);
                console.log('Chat: Presence Sync:', users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Chat: User joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Chat: User left:', leftPresences);
            })
            .subscribe(async (status) => {
                console.log('Chat: Subscription status:', status);
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
        console.log('Chat: Attempting to send message. User:', user, 'Message:', newMessage);
        if (!newMessage.trim() || !user) {
            console.warn('Chat: Cannot send message. Missing content or user data.');
            return;
        }

        const messageData = {
            sender_id: user.id,
            sender_name: user.full_name || 'Staff member',
            sender_role: user.role || 'staff',
            content: newMessage.trim(),
        };

        const { data, error } = await supabase.from('staff_messages').insert([messageData]).select();

        if (error) {
            console.error('Chat: Error sending message:', error);
            if (error.code === 'PGRST205') {
                toast.error('Critical Error: The messages table does not exist. Please check the SQL instructions.');
            } else {
                toast.error(`Failed to send: ${error.message}`);
            }
        } else {
            console.log('Chat: Message sent successfully:', data);

            // Optimistically add to local state if real-time didn't catch it yet
            // This ensures the user sees their message IMMEDIATELY
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

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <h1 className="text-6xl font-black text-white uppercase tracking-tighter flex items-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-[2rem] text-primary shadow-inner">
                            <MessageCircle className="w-12 h-12" />
                        </div>
                        <span className="premium-gradient-text">{t('chat.title') || 'Staff Global Chat'}</span>
                    </h1>
                    <p className="text-white/40 font-black uppercase tracking-[0.3em] text-xs ml-2">
                        {onlineUsers.length} {t('chat.online_count') || 'Staff members currently online'}
                    </p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 min-h-0">
                {/* Main Chat Area */}
                <div className="flex-1 glass-card rounded-[3.5rem] border border-white/10 shadow-premium flex flex-col overflow-hidden relative group">
                    {/* Background Decoration */}
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-accent/10 transition-all duration-1000"></div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar relative z-10">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20">
                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <span className="font-black uppercase tracking-widest text-xs">{t('common.loading')}</span>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                                <div className="p-8 bg-white/5 rounded-[3rem]">
                                    <MessageCircle className="w-24 h-24" />
                                </div>
                                <p className="font-black uppercase tracking-[0.3em] text-sm">Start the conversation</p>
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.sender_id === user?.id;
                                const showName = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

                                return (
                                    <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                                        {showName && (
                                            <div className={`flex items-center gap-3 mb-2 px-4`}>
                                                {!isMe && (
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${getRoleColor(msg.sender_role)} shadow-inner`}>
                                                        {msg.sender_name?.[0]?.toUpperCase() || 'S'}
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                    {isMe ? t('chat.me') : (msg.sender_name || 'Staff')} • <span className={`${getRoleColor(msg.sender_role).split(' ')[0]}`}>{msg.sender_role?.replace('_', ' ').toUpperCase() || 'STAFF'}</span>
                                                </span>
                                                {isMe && (
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${getRoleColor(msg.sender_role)} shadow-inner`}>
                                                        {msg.sender_name?.[0]?.toUpperCase() || 'S'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className={`relative group/msg max-w-[70%]`}>
                                            <div className={`px-8 py-5 rounded-[2rem] text-lg font-bold tracking-tight shadow-premium ${isMe
                                                ? 'bg-gradient-to-br from-primary to-primary/80 text-white rounded-tr-none'
                                                : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none hover:bg-white/10'
                                                } transition-all duration-300`}>
                                                {msg.content}
                                            </div>
                                            <div className={`absolute -bottom-6 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-[8px] font-black text-white/20 uppercase tracking-widest`}>
                                                <Clock className="w-2 h-2" />
                                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-10 border-t border-white/5 bg-white/[0.02] relative z-10">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                            <div className="flex items-center gap-6">
                                <button type="button" className="p-4 rounded-2xl text-white/20 hover:text-white transition-colors bg-white/5 hover:bg-white/10">
                                    <Smile className="w-6 h-6" />
                                </button>

                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={t('chat.placeholder') || 'Type your message...'}
                                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-10 py-6 text-white placeholder-white/10 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-bold text-lg tracking-tight"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className={`p-6 rounded-[2rem] shadow-premium transition-all active:scale-95 flex items-center justify-center ${newMessage.trim()
                                        ? 'bg-primary text-white shadow-primary/20 hover:scale-105'
                                        : 'bg-white/5 text-white/10 cursor-not-allowed'
                                        }`}
                                >
                                    <Send className={`w-6 h-6 ${isRtl ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Online Users Sidebar */}
                <div className="w-full lg:w-80 glass-card rounded-[3.5rem] border border-white/10 shadow-premium p-8 flex flex-col space-y-8 overflow-hidden relative">
                    <div className="relative z-10">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-8 px-4 flex items-center justify-between">
                            {t('chat.online') || 'Online Now'}
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        </h3>
                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(100vh-25rem)]">
                            {onlineUsers.length <= 1 ? (
                                <p className="px-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-center py-10 italic">
                                    {t('chat.only_you') || 'Nobody else is online'}
                                </p>
                            ) : (
                                onlineUsers.filter(u => u.user_id !== user?.id).map((onlineUser, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 transition-all group">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner relative ${getRoleColor(onlineUser.role)}`}>
                                            {onlineUser.name?.[0]?.toUpperCase() || '?'}
                                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-4 border-background rounded-full"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white text-sm truncate uppercase tracking-tight">{onlineUser.name || 'Anonymous'}</h4>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${getRoleColor(onlineUser.role).split(' ')[0]}`}>
                                                {onlineUser.role?.replace('_', ' ') || 'Staff'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    {/* Decoration bg */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>
            </div>
        </div>
    );
}
