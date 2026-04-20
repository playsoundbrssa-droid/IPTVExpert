import React from 'react';
import { FiPlay, FiArrowRight } from 'react-icons/fi';
import PricingSection from './PricingSection';

export default function HeroSection({ onLoginClick }) {

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-32 px-6 overflow-hidden">
            {/* O glow antes era azul, agora mudei para roxo (neon-purple) combinando com a imagem nova */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-purple/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto relative z-10 flex flex-col items-center text-center">

                {/* Main Logo */}
                <div className="mb-12 relative animate-fade-in-up w-full max-w-[280px] md:max-w-[420px]">
                    {/* Shadow Glow Background */}
                    <div className="absolute -inset-4 bg-neon-purple/30 blur-3xl rounded-full" />
                    
                    <img 
                        src="/logo_banner.png" 
                        alt="IPTV Expert Logo" 
                        className="w-full h-auto relative z-10 drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]" 
                    />
                </div>

                {/* Acessar Player Button */}
                <button 
                    onClick={onLoginClick}
                    className="mb-8 px-10 py-4 bg-white text-black text-sm md:text-base font-black uppercase tracking-widest rounded-2xl hover:bg-neon-purple hover:text-white transition-all duration-300 shadow-[0_0_40px_rgba(122,77,240,0.4)] transform hover:scale-105 active:scale-95"
                >
                    Acessar Player
                </button>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-neon-purple mb-8 animate-fade-in delay-100">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-purple"></span>
                    </span>
                    Nova versão 2.0 disponível
                </div>

                {/* Título */}
                <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tight leading-[1.1] animate-fade-in delay-150">
                    O Futuro da <br />
                    <span className="text-gradient-neon">TV Web Chegou.</span>
                </h1>

                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-14 leading-relaxed font-medium">
                    Experiência premium de streaming com tecnologia de ponta.
                    Organize suas listas, assista em 4K e desfrute de uma interface ultra fluida.
                </p>

                {/* ── PLANOS ── */}
                <div className="w-full mb-14 animate-fade-in delay-200">
                    <PricingSection onLoginClick={onLoginClick} />
                </div>

            </div>
        </section>
    );
}
