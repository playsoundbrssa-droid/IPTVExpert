import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiMonitor, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function LinkDevicePage() {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleAuthorize = async () => {
        if (!code) return;
        setLoading(true);
        try {
            await api.post('/pair/authorize', { code });
            setSuccess(true);
            toast.success('Dispositivo autorizado com sucesso!');
            setTimeout(() => navigate('/'), 3000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao autorizar dispositivo');
        } finally {
            setLoading(false);
        }
    };

    if (!code) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <FiAlertCircle size={64} className="text-red-500 mb-6" />
                <h1 className="text-2xl font-black text-white uppercase mb-2">Código Inválido</h1>
                <p className="text-gray-400">Nenhum código de pareamento foi encontrado na URL.</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-fade-in">
                <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
                    <FiCheckCircle size={48} />
                </div>
                <h1 className="text-3xl font-black text-white uppercase mb-4 tracking-tight">Sucesso!</h1>
                <p className="text-gray-400 max-w-sm">O outro dispositivo já está fazendo login. Você pode fechar esta aba ou voltar para o início.</p>
                <button 
                    onClick={() => navigate('/')}
                    className="mt-10 px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl"
                >
                    Voltar para o Início
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-10 shadow-2xl border border-primary/20">
                <FiMonitor size={40} />
            </div>
            
            <h1 className="text-3xl font-black text-white uppercase mb-4 tracking-tight text-center">Autorizar Dispositivo?</h1>
            <p className="text-gray-400 text-center mb-10 leading-relaxed font-medium">
                Deseja autorizar este dispositivo a entrar na sua conta? Certifique-se de que é você quem está tentando fazer o login na TV ou Computador.
            </p>

            <div className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl mb-10 text-center">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 block">Código de Pareamento</span>
                <div className="text-4xl font-black text-white tracking-[0.2em]">{code}</div>
            </div>

            <div className="grid grid-cols-1 w-full gap-4">
                <button
                    onClick={handleAuthorize}
                    disabled={loading}
                    className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                        <>Confirmar Login</>
                    )}
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="w-full py-5 bg-white/5 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/10"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
