import { useState } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import toast from 'react-hot-toast';
import { FiTv, FiMail, FiLock, FiUser } from 'react-icons/fi';
import { supabase } from '../../services/supabase';

export default function AuthScreen({ isModal = false }) {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const { login, register, googleLogin, loading } = useUserStore();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        let result;

        if (mode === 'login') {
            result = await login(form.email, form.password);
        } else {
            if (!form.name.trim()) {
                toast.error('Informe seu nome.');
                return;
            }
            result = await register(form.name, form.email, form.password);
        }

        if (result.success) {
            toast.success(mode === 'login' ? 'Bem-vindo de volta!' : 'Conta criada com sucesso!');
        } else {
            toast.error(result.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;
            
            // Note: This will redirect the user away from the app.
            // The return handling should be done in App.jsx or a dedicated callback page.
        } catch (error) {
            console.error('Erro ao iniciar login Google:', error.message);
            toast.error('Erro ao conectar com Google via Supabase.');
        }
    };

    return (
        <div className={`${!isModal ? 'h-screen flex items-center justify-center bg-background relative overflow-hidden' : ''}`}>
            {!isModal && (
                <>
                    {/* Background glow */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
                </>
            )}
            <div className="glass-panel p-8 rounded-3xl w-[90%] max-w-[380px] animate-fade-in relative z-10 mx-auto">
                {/* Logo */}
                <div className="text-center mb-6 flex flex-col items-center justify-center">
                    <div className="w-24 md:w-32 rounded-xl overflow-hidden flex items-center justify-center mb-1 shadow-lg shadow-neon-purple/20">
                        <img src="/logo_banner.png" alt="IPTV Expert Logo" className="w-full h-auto object-contain scale-[1.05] rounded-xl" />
                    </div>
                    <p className="text-gray-500 text-xs font-medium tracking-wider uppercase mt-4">Web Player</p>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-2 p-1 bg-black/30 rounded-xl mb-6">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Entrar
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Criar Conta
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Seu nome"
                                className="glass-input pl-10 w-full"
                            />
                        </div>
                    )}
                    <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            id="auth-email"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Email"
                            className="glass-input pl-10 w-full"
                            required
                        />
                    </div>
                    <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            id="auth-password"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Senha"
                            className="glass-input pl-10 w-full"
                            required
                            minLength={6}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3 text-lg font-bold rounded-xl flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processando...
                            </>
                        ) : mode === 'login' ? 'Entrar' : 'Criar Conta'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">ou</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Google Login */}
                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium text-gray-300 hover:text-white transition-all duration-300"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.99 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continuar com Google
                </button>

                <p className="mt-6 text-[10px] text-gray-600 text-center">
                    Este é um player de mídia. Não fornecemos conteúdo.
                </p>
            </div>
        </div>
    );
}
