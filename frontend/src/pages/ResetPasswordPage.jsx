import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { FiLock, FiCheckCircle } from 'react-icons/fi';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Token de recuperação não encontrado.');
            navigate('/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error('As senhas não coincidem.');
        }
        if (password.length < 6) {
            return toast.error('A senha deve ter pelo menos 6 caracteres.');
        }

        setLoading(true);
        try {
            const { data } = await api.post('/auth/reset-password', { token, password });
            toast.success(data.message);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao redefinir senha.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                    <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto text-green-500 border border-green-500/20 shadow-lg shadow-green-500/10">
                        <FiCheckCircle size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">SENHA ALTERADA!</h1>
                    <p className="text-gray-500">Sua senha foi redefinida com sucesso. Redirecionando para o login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">NOVA SENHA</h1>
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Crie uma senha forte para sua conta</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nova Senha"
                            className="glass-input pl-10 w-full"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmar Nova Senha"
                            className="glass-input pl-10 w-full"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group"
                    >
                        {loading ? 'Redefinindo...' : 'Alterar Senha'}
                        <FiLock size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
