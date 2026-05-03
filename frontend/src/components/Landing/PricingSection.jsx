import React from 'react';
import { FiCheck, FiStar } from 'react-icons/fi';

const WHATSAPP_NUMBER = "5571996178013"; // Substitua pelo seu número (55 + DDD + Número)

const getWhatsAppLink = (planName) => {
    const message = `Olá! Gostaria de assinar o *${planName}* do IPTV Expert. Pode me ajudar?`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

export default function PricingSection({ onLoginClick }) {
    const handleSubscribe = (planName) => {
        window.open(getWhatsAppLink(planName), '_blank');
    };

    return (
        <div id="pricing" className="w-full pb-16 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-blue/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-5xl relative z-10 text-left mx-auto px-4 md:px-0">
                <div className="text-center mb-8 md:mb-10 reveal">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">
                        Planos <span className="text-gradient-neon">Premium</span>
                    </h2>
                    <p className="text-gray-400 text-base md:text-lg">
                        Tenha acesso ao melhor conteúdo com a melhor tecnologia.
                    </p>
                </div>

                <div className="grid sm:landscape:grid-cols-2 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto text-left">
                    {/* Plano 1 Mês */}
                    <div className="glass-panel p-6 md:p-8 rounded-3xl neon-border-blue neon-glow-blue transition-all duration-500 reveal group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

                        <div className="mb-6 relative z-10">
                            <h3 className="text-lg md:text-xl font-bold text-gray-400 group-hover:text-neon-blue transition-colors">Plano Mensal</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-xl md:text-2xl font-bold text-gray-500">R$</span>
                                <span className="text-4xl md:text-5xl font-black text-white">14,99</span>
                                <span className="text-gray-500 text-sm">/mês</span>
                            </div>
                            <p className="text-xs md:text-sm text-neon-blue mt-2 font-medium">Recursos premium inclusos</p>
                        </div>

                        <ul className="space-y-3 md:space-y-4 mb-8 relative z-10">
                            <li className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue group-hover:bg-neon-blue/30 transition-colors">
                                    <FiCheck size={12} />
                                </div>
                                <span className="text-gray-300 text-sm md:text-base font-medium">Acesso exclusivo a <strong className="text-white">Canais ao Vivo</strong></span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue group-hover:bg-neon-blue/30 transition-colors">
                                    <FiCheck size={12} />
                                </div>
                                <span className="text-gray-300 text-sm md:text-base font-medium">Acervo completo de <strong className="text-white">Filmes</strong></span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue group-hover:bg-neon-blue/30 transition-colors">
                                    <FiCheck size={12} />
                                </div>
                                <span className="text-gray-300 text-sm md:text-base font-medium">Todas as <strong className="text-white">Séries</strong> atualizadas</span>
                            </li>
                        </ul>

                        <button
                            onClick={() => handleSubscribe('Plano Mensal')}
                            className="w-full py-4 bg-gradient-to-r from-neon-blue to-primary text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-neon-blue/40 relative z-10"
                        >
                            Assinar Mensal
                        </button>
                    </div>

                    {/* Plano 2 Meses */}
                    <div className="glass-panel p-6 md:p-8 rounded-3xl neon-border-purple neon-glow-purple transition-all duration-500 reveal group relative">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider text-white shadow-lg flex items-center gap-2 z-20">
                            <FiStar /> Mais Popular
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

                        <div className="mb-6 relative z-10 text-left">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-lg md:text-xl font-bold text-gray-400 group-hover:text-neon-purple transition-colors">Plano Bimestral</h3>
                                <div className="px-2 py-0.5 bg-neon-purple/20 border border-neon-purple/30 rounded-md text-[9px] md:text-[10px] font-bold text-neon-purple uppercase tracking-tight">
                                    Economize 17%
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-xl md:text-2xl font-bold text-gray-500">R$</span>
                                <span className="text-4xl md:text-5xl font-black text-white">25,00</span>
                                <span className="text-gray-500 text-sm">/2 meses</span>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mt-2">
                                <p className="text-xs md:text-sm text-neon-purple font-medium">Melhor custo-benefício</p>
                                <span className="text-[10px] md:text-xs text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded-full w-fit">apenas R$ 12,50/mês</span>
                            </div>
                        </div>

                        <ul className="space-y-3 md:space-y-4 mb-8 relative z-10 text-left">
                            <li className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple group-hover:bg-neon-purple/30 transition-colors">
                                    <FiCheck size={12} />
                                </div>
                                <span className="text-gray-300 text-sm md:text-base font-medium">Acesso exclusivo a <strong className="text-white">Canais ao Vivo</strong></span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple group-hover:bg-neon-purple/30 transition-colors">
                                    <FiCheck size={12} />
                                </div>
                                <span className="text-gray-300 text-sm md:text-base font-medium">Acervo completo de <strong className="text-white">Filmes</strong></span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 w-5 h-5 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple group-hover:bg-neon-purple/30 transition-colors">
                                    <FiCheck size={12} />
                                </div>
                                <span className="text-gray-300 text-sm md:text-base font-medium">Todas as <strong className="text-white">Séries</strong> atualizadas</span>
                            </li>
                        </ul>

                        <button
                            onClick={() => handleSubscribe('Plano Bimestral')}
                            className="w-full py-4 bg-gradient-to-r from-primary to-neon-purple text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-neon-purple/40 relative z-10"
                        >
                            Assinar Bimestral
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
