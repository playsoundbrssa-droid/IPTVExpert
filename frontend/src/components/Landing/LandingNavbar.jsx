import React from 'react';
import { FiTv } from 'react-icons/fi';

export default function LandingNavbar({ onLoginClick }) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
            <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img
                        src="/iptv_logo.png"
                        alt="IPTV Expert"
                        className="w-9 h-9 md:w-10 md:h-10 rounded-xl object-cover drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                    />
                    <span className="text-lg md:text-xl font-black italic tracking-tighter bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                        IPTV EXPERT
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={onLoginClick}
                        className="px-5 md:px-6 py-2 md:py-2.5 rounded-xl border border-white/10 text-xs md:text-sm font-bold hover:bg-white/5 active:scale-95 transition-all"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </nav>
    );
}
