import { useState } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiUser, FiArrowLeft } from 'react-icons/fi';
import { FaGoogle, FaDiscord, FaGithub, FaFacebook } from 'react-icons/fa';
import { supabase } from '../../services/supabase';
import { api } from '../../services/api';

export default function AuthScreen({ isModal = false }) {
    const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: ''
    });

    const { login, register, socialSyncLogin } = useUserStore();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSocialLogin = async (provider) => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error) {
            toast.error(`Erro no login com ${provider}: ` + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'forgot') {
                const { data } = await api.post('/auth/forgot-password', { email: form.email });
                toast.success(data.message);
                setMode('login');
            } else if (mode === 'login') {
                await login(form.email, form.password);
                toast.success('Bem-vindo de volta!');
            } else {
                await register(form.name, form.email, form.password);
                toast.success('Conta criada com sucesso!');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ocorreu um erro.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center p-6 ${isModal ? '' : 'min-h-screen bg-[#0F0F0F]'}`}>
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                        {mode === 'login' ? 'BEM-VINDO' : mode === 'register' ? 'CRIAR CONTA' : 'RECUPERAR SENHA'}
                    </h1>
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
                        {mode === 'login' ? 'Entre para gerenciar suas listas' : mode === 'register' ? 'Comece sua experiência premium hoje' : 'Enviaremos um link para seu e-mail'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Nome Completo"
                                className="glass-input pl-10 w-full"
                                required
                            />
                        </div>
                    )}

                    <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="E-mail"
                            className="glass-input pl-10 w-full"
                            required
                        />
                    </div>

                    {mode !== 'forgot' && (
                        <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
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
                    )}

                    {mode === 'login' && (
                        <div className="flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-primary transition-colors"
                            >
                                Esqueceu a senha?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group"
                    >
                        {loading ? 'Processando...' : mode === 'login' ? 'Entrar Agora' : mode === 'register' ? 'Criar Minha Conta' : 'Enviar Link'}
                        <FiLock size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    {mode === 'forgot' && (
                        <button 
                            type="button"
                            onClick={() => setMode('login')}
                            className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-all text-sm font-bold"
                        >
                            <FiArrowLeft size={16} /> Voltar para o Login
                        </button>
                    )}
                </form>

                {mode !== 'forgot' && (
                    <>
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="bg-[#0F0F0F] px-4 text-gray-600">Ou entre com</span></div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all hover:border-primary/30 group">
                                <FaGoogle className="text-xl text-gray-400 group-hover:text-[#EA4335] transition-colors" />
                            </button>
                            <button onClick={() => handleSocialLogin('discord')} className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all hover:border-primary/30 group">
                                <FaDiscord className="text-xl text-gray-400 group-hover:text-[#5865F2] transition-colors" />
                            </button>
                            <button onClick={() => handleSocialLogin('github')} className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all hover:border-primary/30 group">
                                <FaGithub className="text-xl text-gray-400 group-hover:text-white transition-colors" />
                            </button>
                            <button onClick={() => handleSocialLogin('facebook')} className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all hover:border-primary/30 group">
                                <FaFacebook className="text-xl text-gray-400 group-hover:text-[#1877F2] transition-colors" />
                            </button>
                        </div>

                        <div className="text-center pt-4">
                            <button
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                className="text-gray-500 hover:text-white transition-all text-sm font-medium"
                            >
                                {mode === 'login' ? (
                                    <>Não tem uma conta? <span className="text-primary font-bold">Crie agora</span></>
                                ) : (
                                    <>Já possui uma conta? <span className="text-primary font-bold">Faça login</span></>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
