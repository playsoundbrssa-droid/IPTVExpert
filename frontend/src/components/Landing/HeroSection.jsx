import React, { useState } from 'react';
import { FiPlay, FiArrowRight, FiTv, FiFilm, FiVideo, FiDownload } from 'react-icons/fi';
import PricingSection from './PricingSection';

const CONTENT = {
    tv: {
        label: 'TV ao Vivo', icon: FiTv,
        items: [
            { title: 'Globo HD',     badge: 'AO VIVO',  badgeColor: 'bg-red-500',   img: 'https://picsum.photos/seed/globo1/300/170' },
            { title: 'ESPN Brasil',  badge: 'ESPORTES', badgeColor: 'bg-green-600', img: 'https://picsum.photos/seed/espn44/300/170' },
            { title: 'Record HD',   badge: 'AO VIVO',  badgeColor: 'bg-red-500',   img: 'https://picsum.photos/seed/record2/300/170' },
            { title: 'Combate',     badge: 'UFC',       badgeColor: 'bg-orange-500',img: 'https://picsum.photos/seed/combat9/300/170' },
            { title: 'SBT HD',      badge: 'AO VIVO',  badgeColor: 'bg-red-500',   img: 'https://picsum.photos/seed/sbt10/300/170' },
            { title: 'CNN Brasil',  badge: 'NEWS',      badgeColor: 'bg-blue-600',  img: 'https://picsum.photos/seed/cnn20/300/170' },
            { title: 'Band HD',     badge: 'AO VIVO',  badgeColor: 'bg-red-500',   img: 'https://picsum.photos/seed/band33/300/170' },
            { title: 'BandSports',  badge: 'ESPORTES', badgeColor: 'bg-green-600', img: 'https://picsum.photos/seed/bsport/300/170' },
        ],
    },
    movies: {
        label: 'Filmes', icon: FiFilm,
        items: [
            { title: 'Vingadores',    badge: 'AÇÃO',    badgeColor: 'bg-[#6C5CE7]', img: 'https://picsum.photos/seed/aveng1/300/170' },
            { title: 'Duna II',       badge: '4K',      badgeColor: 'bg-yellow-500',img: 'https://picsum.photos/seed/dune22/300/170' },
            { title: 'Oppenheimer',   badge: 'HD',      badgeColor: 'bg-blue-500',  img: 'https://picsum.photos/seed/oppen1/300/170' },
            { title: 'Barbie',        badge: 'COMÉDIA', badgeColor: 'bg-pink-500',  img: 'https://picsum.photos/seed/barb20/300/170' },
            { title: 'Godzilla',      badge: 'AÇÃO',    badgeColor: 'bg-[#6C5CE7]', img: 'https://picsum.photos/seed/godzi3/300/170' },
            { title: 'Deadpool 3',    badge: 'NOVO',    badgeColor: 'bg-red-500',   img: 'https://picsum.photos/seed/dead30/300/170' },
            { title: 'Alien Romulus', badge: 'TERROR',  badgeColor: 'bg-gray-600',  img: 'https://picsum.photos/seed/alien5/300/170' },
            { title: 'Wicked',        badge: 'MUSICAL', badgeColor: 'bg-emerald-500',img:'https://picsum.photos/seed/wick10/300/170' },
        ],
    },
    series: {
        label: 'Séries', icon: FiVideo,
        items: [
            { title: 'House of Dragon', badge: 'FANTASIA', badgeColor: 'bg-orange-600', img: 'https://picsum.photos/seed/hod10/300/170' },
            { title: 'The Boys',        badge: 'AÇÃO',     badgeColor: 'bg-[#6C5CE7]', img: 'https://picsum.photos/seed/boys2/300/170' },
            { title: 'Breaking Bad',    badge: 'DRAMA',    badgeColor: 'bg-yellow-600', img: 'https://picsum.photos/seed/break5/300/170' },
            { title: 'Stranger Things', badge: 'TERROR',   badgeColor: 'bg-red-700',    img: 'https://picsum.photos/seed/stran8/300/170' },
            { title: 'The Last of Us',  badge: 'DRAMA',    badgeColor: 'bg-yellow-600', img: 'https://picsum.photos/seed/lastu1/300/170' },
            { title: 'Euphoria',        badge: 'DRAMA',    badgeColor: 'bg-pink-600',   img: 'https://picsum.photos/seed/euph1/300/170' },
            { title: 'Game of Thrones', badge: 'FANTASIA', badgeColor: 'bg-orange-600', img: 'https://picsum.photos/seed/got22/300/170' },
            { title: 'Dark',            badge: 'SCI-FI',   badgeColor: 'bg-blue-700',   img: 'https://picsum.photos/seed/dark90/300/170' },
        ],
    },
    download: {
        label: 'Downloads', icon: FiDownload,
        items: [
            { title: 'Oppenheimer',   badge: 'OFFLINE',  badgeColor: 'bg-green-600', img: 'https://picsum.photos/seed/oppen1/300/170' },
            { title: 'Duna II',       badge: 'BAIXADO',  badgeColor: 'bg-primary',   img: 'https://picsum.photos/seed/dune22/300/170' },
            { title: 'The Boys',      badge: 'SALVO',    badgeColor: 'bg-blue-600',  img: 'https://picsum.photos/seed/boys2/300/170' },
            { title: 'House of Dragon', badge: 'FILA',    badgeColor: 'bg-gray-500',  img: 'https://picsum.photos/seed/hod10/300/170' },
            { title: 'Breaking Bad',  badge: 'BAIXADO',  badgeColor: 'bg-primary',   img: 'https://picsum.photos/seed/break5/300/170' },
            { title: 'Vingadores',    badge: 'OFFLINE',  badgeColor: 'bg-green-600', img: 'https://picsum.photos/seed/aveng1/300/170' },
            { title: 'Stranger Things', badge: 'BAIXADO',  badgeColor: 'bg-primary',   img: 'https://picsum.photos/seed/stran8/300/170' },
            { title: 'Interestelar',  badge: 'SALVO',    badgeColor: 'bg-blue-600',  img: 'https://picsum.photos/seed/inter1/300/170' },
        ],
    },
};

export default function HeroSection({ onLoginClick }) {
    const [activeTab, setActiveTab] = useState('tv');
    const current = CONTENT[activeTab];

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-32 px-6 overflow-hidden">
            {/* O glow antes era azul, agora mudei para roxo (neon-purple) combinando com a imagem nova */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-purple/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto relative z-10 flex flex-col items-center text-center">

                {/* Main Hero Image / App Icon */}
                <div className="mb-8 relative animate-fade-in-up w-48 h-48 md:w-56 md:h-56">
                    {/* Shadow Glow Background */}
                    <div className="absolute -inset-2 bg-neon-purple/50 blur-3xl rounded-full" />
                    
                    {/* Masked Container to crop perfectly */}
                    <div className="relative w-full h-full rounded-[28%] md:rounded-[32%] overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                        <img 
                            src="/hero-icon.png" 
                            alt="IPTV Expert Hero" 
                            className="w-full h-full object-cover object-center scale-110" 
                        />
                    </div>
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

                {/* ── DESTAQUES COM ABAS ── */}
                <div className="w-full max-w-6xl relative mb-24">
                    <div className="absolute -inset-px bg-gradient-to-r from-neon-purple/40 via-primary/20 to-neon-blue/40 rounded-[2rem] blur-sm pointer-events-none" />

                    <div className="relative glass-panel rounded-[2rem] overflow-hidden border border-white/10 p-5">
                        {/* Abas */}
                        <div className="flex items-center gap-2 mb-5 p-1 bg-black/30 rounded-2xl w-fit mx-auto">
                            {Object.entries(CONTENT).map(([key, tab]) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setActiveTab(key)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                                            isActive
                                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                : 'text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        <Icon size={13} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Cards */}
                        <div key={activeTab} className="flex gap-3 overflow-x-auto no-scrollbar pb-1 animate-fade-in">
                            {current.items.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex-shrink-0 w-40 md:w-48 rounded-xl overflow-hidden border border-white/10 group cursor-pointer hover:border-primary/50 hover:scale-[1.03] transition-all duration-300 relative"
                                >
                                    <img
                                        src={item.img}
                                        alt={item.title}
                                        className="w-full h-24 object-cover group-hover:brightness-110 transition-all duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                                    <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-black text-white ${item.badgeColor}`}>
                                        {item.badge}
                                    </span>

                                    <div className="absolute bottom-2 left-2 right-2">
                                        <p className="text-xs font-bold text-white truncate">{item.title}</p>
                                    </div>

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                            <FiPlay className="text-white text-sm ml-0.5" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-[10px] text-gray-600 text-right mt-3 font-medium">Disponível após login</p>
                    </div>
                </div>

            </div>
        </section>
    );
}
