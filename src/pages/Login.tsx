import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to login');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
        document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black font-cairo p-4 relative overflow-hidden">
            {/* Background Cinematic Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4"></div>

            <div className="w-full max-w-lg relative z-10">
                {/* Logo Section */}
                <div className="mb-12 text-center animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="relative inline-block group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <img
                            src="/logo.png"
                            alt="Epic Gym Logo"
                            className="relative h-32 w-auto mx-auto drop-shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-transform hover:scale-105 duration-500"
                        />
                    </div>
                </div>

                {/* Login Card */}
                <div className="glass-card rounded-[3rem] border border-white/10 shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-700">
                    <div className="p-10 md:p-14">
                        <div className="mb-10 text-center">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter premium-gradient-text">
                                {t('common.login')}
                            </h1>
                            <p className="text-white/30 mt-3 text-xs font-black uppercase tracking-[0.3em]">
                                Welcome to the Elite Academy
                            </p>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 text-rose-400 text-xs font-black p-4 rounded-2xl mb-8 border border-rose-500/20 text-center uppercase tracking-widest animate-in shake duration-500">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-4">
                                    Email Address
                                </label>
                                <div className="flex items-center group bg-white/5 border border-white/10 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all overflow-hidden">
                                    <div className="pl-8 pr-2 py-5 flex-shrink-0">
                                        <Mail className="w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        dir="ltr"
                                        className="w-full bg-transparent border-none outline-none py-5 pr-8 text-white placeholder-white/10 font-bold text-lg tracking-tight text-left"
                                        placeholder="Email Address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                                        Password
                                    </label>
                                </div>
                                <div className="flex items-center group bg-white/5 border border-white/10 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all overflow-hidden">
                                    <div className="pl-8 pr-2 py-5 flex-shrink-0">
                                        <Lock className="w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        dir="ltr"
                                        className="w-full bg-transparent border-none outline-none py-5 pr-8 text-white placeholder-white/10 font-bold text-lg tracking-tight text-left"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur group-hover:blur-xl transition-all opacity-0 group-hover:opacity-100"></div>
                                <div className="relative bg-primary hover:bg-primary/90 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg uppercase tracking-widest overflow-hidden">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{t('common.login')}</span>
                                            <div className="absolute right-0 top-0 h-full w-20 bg-white/20 skew-x-[30deg] -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                                        </>
                                    )}
                                </div>
                            </button>
                        </form>

                        <div className="mt-12 flex flex-col items-center gap-6">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                            >
                                <Globe className="w-4 h-4" />
                                {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            </button>

                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                © {new Date().getFullYear()} Epic Gymnastic Academy Management
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
