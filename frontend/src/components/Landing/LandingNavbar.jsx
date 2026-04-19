import React from 'react';
import { FiTv } from 'react-icons/fi';

export default function LandingNavbar({ onLoginClick }) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-xl border-b border-white/5">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <FiTv size={24} className="text-white" />
                    </div>
                    <span className="text-xl font-black italic tracking-tighter bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                        IPTV EXPERT
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={onLoginClick}
                        className="px-6 py-2.5 rounded-xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </nav>
    );
}
