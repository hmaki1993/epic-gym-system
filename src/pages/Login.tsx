import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Loader2, Globe, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { updateSettings, settings } = useTheme();

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
        const newLang = settings.language === 'en' ? 'ar' : 'en';
        updateSettings({ language: newLang });
    };

    return (
        <div className="min-h-screen bg-[#0E1D21] flex flex-col items-center justify-center p-4 relative overflow-hidden font-cairo">

            {/* Background Image with Overlay */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2070&auto=format&fit=crop)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* Dark Overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0E1D21]/95 via-[#122E34]/90 to-[#0E1D21]/95"></div>

                    {/* Accent Gradient Overlays - Colorful ribbons effect */}
                    <div className="absolute top-[10%] right-[10%] w-[60%] h-[60%] bg-[#622347]/20 rounded-full blur-[180px] animate-pulse"></div>
                    <div className="absolute bottom-[20%] left-[5%] w-[50%] h-[50%] bg-[#122E34]/30 rounded-full blur-[150px]"></div>
                    <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-[#FF6B35]/10 rounded-full blur-[120px]"></div>
                </div>

                {/* Subtle Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <div className="w-full max-w-md relative z-10 scale-90 md:scale-100">
                {/* Logo Section */}
                <div className="mb-4 text-center animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="relative inline-block group">
                        <div className="absolute -inset-6 bg-gradient-to-r from-[#622347]/30 to-[#122E34]/30 rounded-full blur-2xl opacity-40 group-hover:opacity-100 transition duration-1000"></div>
                        <img
                            src="/logo.png"
                            alt="Epic Gym Logo"
                            className="relative h-28 w-auto mx-auto drop-shadow-2xl transition-transform hover:scale-105 duration-500 brightness-110"
                        />
                    </div>
                </div>

                {/* Login Card */}
                <div className="relative p-[1px] rounded-[2.5rem] bg-gradient-to-br from-white/10 via-transparent to-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-700">
                    <div className="bg-[#122E34]/30 backdrop-blur-3xl rounded-[2.4rem] p-6 md:p-8 border border-white/5 shadow-inner relative overflow-hidden">
                        {/* Internal Decorative Glow */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#622347]/10 rounded-full blur-3xl"></div>

                        <div className="mb-6 text-center relative z-10">
                            <h1 className="text-3xl font-black text-white uppercase tracking-tighter premium-gradient-text-mind">
                                {t('common.login')}
                            </h1>
                            <p className="text-[#677E8A] mt-2 text-[9px] font-black uppercase tracking-[0.4em]">
                                Welcome to the Legacy
                            </p>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 text-rose-400 text-[10px] font-black p-3 rounded-xl mb-6 border border-rose-500/20 text-center uppercase tracking-widest animate-in shake duration-500">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                            <div className="group">
                                <label className="text-[9px] font-black text-[#ABAFB5]/40 uppercase tracking-[0.2em] mb-2 ml-4 block group-focus-within:text-[#677E8A] transition-colors">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    dir="ltr"
                                    className="input-mind text-left"
                                    placeholder=""
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="group">
                                <label className="text-[9px] font-black text-[#ABAFB5]/40 uppercase tracking-[0.2em] mb-2 ml-4 block group-focus-within:text-[#677E8A] transition-colors">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    dir="ltr"
                                    className="input-mind text-left"
                                    placeholder=""
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-center pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full max-w-[220px] group relative overflow-hidden bg-gradient-to-r from-[#622347] to-[#122E34] text-white py-2.5 rounded-full font-black text-xs uppercase tracking-[0.4em] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 premium-button"
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin text-[#ABAFB5]" />
                                                <span className="text-[10px]">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{t('common.login')}</span>
                                                <Sparkles className="w-3 h-3 group-hover:animate-ping text-[#ABAFB5]" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 flex flex-col items-center gap-4 relative z-10">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#0E1D21] border border-[#677E8A]/10 text-[#677E8A]/60 hover:text-white hover:bg-[#122E34] hover:border-[#677E8A]/30 transition-all text-[9px] font-black uppercase tracking-[0.2em] shadow-xl"
                            >
                                <Globe className="w-3 h-3 text-[#622347]" />
                                {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            </button>

                            <p className="text-[8px] font-black text-[#ABAFB5]/10 uppercase tracking-[0.5em] text-center">
                                © {new Date().getFullYear()} Epic Gymnastic Academy
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .premium-gradient-text-mind {
                    background: linear-gradient(135deg, #ABAFB5 0%, #677E8A 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .input-mind {
                    width: 100%;
                    padding: 0.75rem 1.5rem;
                    background: transparent !important;
                    border: 1px solid rgba(103, 126, 138, 0.2);
                    border-radius: 2rem;
                    color: white !important;
                    font-size: 1rem;
                    font-weight: 800;
                    outline: none;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-mind:-webkit-autofill,
                .input-mind:-webkit-autofill:hover, 
                .input-mind:-webkit-autofill:focus {
                    -webkit-text-fill-color: white !important;
                    -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
                    transition: background-color 5000s ease-in-out 0s;
                    background: transparent !important;
                }
                .input-mind:focus {
                    background: rgba(18, 46, 52, 0.3);
                    border-color: #622347;
                    box-shadow: 0 0 40px rgba(98, 35, 71, 0.2);
                    transform: translateY(-2px);
                }
                .input-mind::placeholder {
                    color: rgba(103, 126, 138, 0.3);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-size: 0.8rem;
                }
                .premium-button {
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
                }
                .premium-button:hover {
                    box-shadow: 0 0 25px rgba(98, 35, 71, 0.3), 0 0 50px rgba(18, 46, 52, 0.2);
                    border-color: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
