import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import toast from 'react-hot-toast';
import { FiTv, FiMail, FiLock, FiUser, FiMaximize, FiSmartphone, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../../services/supabase';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

export default function AuthScreen({ isModal = false }) {
    const [mode, setMode] = useState('login'); // 'login', 'register', or 'qrcode'
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const { login, register, googleLogin, loading, setToken } = useUserStore();
    
    const [qrCode, setQrCode] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const pollInterval = useRef(null);

    const generateQrCode = async () => {
        setQrLoading(true);
        try {
            const response = await api.get('/pair/generate');
            setQrCode(response.data.code);
            startPolling(response.data.code);
        } catch (error) {
            toast.error('Erro ao gerar QR Code');
        } finally {
            setQrLoading(false);
        }
    };

    const startPolling = (code) => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        pollInterval.current = setInterval(async () => {
            try {
                const response = await api.get(`/pair/check/${code}`);
                if (response.data.status === 'authorized' && response.data.token) {
                    clearInterval(pollInterval.current);
                    setToken(response.data.token);
                    toast.success('Login via QR Code realizado!');
                }
            } catch (error) {
                if (error.response?.status === 404) {
                    clearInterval(pollInterval.current);
                    setQrCode(null);
                    toast.error('O código expirou. Gere um novo.');
                }
            }
        }, 2000);
    };

    useEffect(() => {
        if (mode === 'qrcode') {
            generateQrCode();
        } else {
            if (pollInterval.current) clearInterval(pollInterval.current);
        }
        return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
    }, [mode]);

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
        <div className={`${!isModal ? 'min-h-screen flex items-center justify-center bg-background relative overflow-y-auto py-8' : 'w-full h-full flex items-center justify-center'}`}>
            {!isModal && (
                <>
                    {/* Background glow */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
                </>
            )}
            <div className="glass-panel p-6 md:p-8 rounded-3xl w-[90%] max-w-[380px] animate-fade-in relative z-10 mx-auto my-auto max-h-[95vh] overflow-y-auto no-scrollbar">
                {/* Logo */}
                <div className="text-center mb-4 md:mb-6 flex flex-col items-center justify-center">
                    <div className="w-32 md:w-48 mb-2 md:mb-3">
                        <img
                            src="/new_logo_banner.jpg"
                            alt="IPTV Expert Logo"
                            className="w-full h-auto relative z-10 rounded-xl drop-shadow-xl"
                        />
                    </div>
                    <p className="text-gray-500 text-[9px] md:text-[10px] font-medium tracking-wider uppercase mt-1">Web Player</p>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-1 p-1 bg-black/30 rounded-xl mb-4 md:mb-6 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all min-w-[70px] ${mode === 'login' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        Entrar
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all min-w-[70px] ${mode === 'register' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        Criar
                    </button>
                    <button
                        onClick={() => setMode('qrcode')}
                        className={`flex-1 py-1.5 md:py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-lg transition-all min-w-[80px] ${mode === 'qrcode' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        QR Code
                    </button>
                </div>

                {mode === 'qrcode' ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-6">
                        {qrLoading ? (
                            <div className="w-48 h-48 bg-white/5 rounded-3xl flex flex-col items-center justify-center border border-white/10">
                                <FiRefreshCw className="w-10 h-10 text-primary animate-spin mb-3" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gerando...</span>
                            </div>
                        ) : qrCode ? (
                            <div className="space-y-6 flex flex-col items-center w-full">
                                <div className="p-4 bg-white rounded-[2rem] shadow-2xl shadow-primary/10 relative group">
                                    <QRCodeSVG 
                                        value={`${window.location.origin}/auth/link?code=${qrCode}`}
                                        size={180}
                                        level="H"
                                        includeMargin={true}
                                    />
                                    <div className="absolute inset-0 border-4 border-primary/20 rounded-[2rem] pointer-events-none group-hover:border-primary/40 transition-colors"></div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-black text-white tracking-[0.3em] mb-2">{qrCode}</div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
                                        Escaneie o código ou use o link de autorização no seu celular
                                    </p>
                                </div>
                                <button 
                                    onClick={generateQrCode}
                                    className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:scale-105 transition-all"
                                >
                                    <FiRefreshCw /> Atualizar Código
                                </button>
                            </div>
                        ) : (
                            <button onClick={generateQrCode} className="btn-primary w-full py-4 rounded-2xl font-black uppercase tracking-widest">Gerar Novo Código</button>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                        {mode === 'register' && (
                            <div className="relative">
                                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="Seu nome"
                                    className="glass-input pl-10 w-full py-2.5 md:py-3"
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
                                className="glass-input pl-10 w-full py-2.5 md:py-3"
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
                                className="glass-input pl-10 w-full py-2.5 md:py-3"
                                required
                                minLength={6}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 md:py-3.5 text-sm md:text-base font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
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
                )}

                {/* Divider */}
                <div className="flex items-center gap-4 my-4 md:my-6">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">ou</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Google Login */}
                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 md:py-3.5 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl font-medium text-gray-300 hover:text-white transition-all duration-300 text-sm md:text-base"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" className="md:w-5 md:h-5">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.99 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continuar com Google
                </button>

                <p className="mt-4 md:mt-6 text-[9px] md:text-[10px] text-gray-600 text-center">
                    Este é um player de mídia. Não fornecemos conteúdo.
                </p>
            </div>
        </div>
    );
}
