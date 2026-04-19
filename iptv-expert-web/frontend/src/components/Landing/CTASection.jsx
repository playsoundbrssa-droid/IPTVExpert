import React from 'react';
import { FiArrowRight } from 'react-icons/fi';

export default function CTASection({ onLoginClick }) {
    return (
        <section id="cta" className="py-16 px-6 relative">
            <div className="container mx-auto">
                <div className="relative glass-panel rounded-[3rem] p-12 md:p-20 text-center border-neon-blue/20 overflow-hidden reveal">
                    {/* Glowing background circles */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-neon-blue/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-neon-purple/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
                    
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                            Pronto para elevar sua <br />
                            <span className="text-neon-blue">experiência de TV?</span>
                        </h2>
                        <p className="text-gray-400 text-lg md:text-xl mb-12">
                            Acesse agora o IPTV Expert e transforme a maneira como você assiste seus conteúdos favoritos.
                            Sem configurações complexas, apenas diversão.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button 
                                onClick={onLoginClick}
                                className="px-10 py-5 bg-white text-black rounded-2xl font-bold text-lg hover:bg-neon-blue hover:text-white transition-all neon-glow-blue hover:scale-105"
                            >
                                Acessar Player Grátis
                            </button>
                            <button className="px-10 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                Documentação <FiArrowRight />
                            </button>
                        </div>
                        
                        <p className="mt-12 text-sm text-gray-600">
                            Ao acessar, você concorda com nossos termos de uso e política de privacidade.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
