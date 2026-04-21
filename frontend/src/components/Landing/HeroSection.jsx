import React from 'react';
import { FiPlay, FiArrowRight } from 'react-icons/fi';
import PricingSection from './PricingSection';

export default function HeroSection({ onLoginClick }) {

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-24 md:pt-32 px-4 md:px-6 overflow-hidden">
            {/* O glow antes era azul, agora mudei para roxo (neon-purple) combinando com a imagem nova */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-neon-purple/20 rounded-full blur-[60px] md:blur-[100px] pointer-events-none" />

            <div className="container mx-auto relative z-10 flex flex-col items-center text-center">

                {/* Main Logo */}
                <div className="mb-8 md:mb-12 relative animate-fade-in-up w-full max-w-[200px] md:max-w-[300px]">
                    <img 
                        src="/new_logo_banner.jpg" 
                        alt="IPTV Expert Logo" 
                        className="w-full h-auto relative z-10 drop-shadow-xl rounded-xl" 
                    />
                </div>

                {/* Acessar Player Button */}
                <button 
                    onClick={onLoginClick}
                    className="mb-8 px-8 md:px-10 py-3.5 md:py-4 bg-white text-black text-xs md:text-base font-black uppercase tracking-widest rounded-2xl hover:bg-neon-purple hover:text-white transition-all duration-300 shadow-[0_0_40px_rgba(122,77,240,0.4)] transform hover:scale-105 active:scale-95"
                >
                    Acessar Player
                </button>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-semibold text-neon-purple mb-6 md:mb-8 animate-fade-in delay-100">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-purple"></span>
                    </span>
                    Nova versão 2.0 disponível
                </div>

                {/* Título */}
                <h1 className="text-4xl md:text-8xl font-black mb-4 md:mb-6 tracking-tight leading-[1.1] animate-fade-in delay-150">
                    O Futuro da <br />
                    <span className="text-gradient-neon">TV Web Chegou.</span>
                </h1>

                <p className="text-gray-400 text-base md:text-xl max-w-2xl mb-10 md:mb-14 leading-relaxed font-medium px-4 md:px-0">
                    Experiência premium de streaming com tecnologia de ponta.
                    Organize suas listas, assista em 4K e desfrute de uma interface ultra fluida.
                </p>

                {/* ── PLANOS ── */}
                <div className="w-full mb-10 md:mb-14 animate-fade-in delay-200">
                    <PricingSection onLoginClick={onLoginClick} />
                </div>

            </div>
        </section>
    );
}
