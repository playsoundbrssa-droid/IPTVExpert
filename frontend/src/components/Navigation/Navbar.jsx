import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiUser, FiTv, FiFilm, FiVideo, FiHeart, FiSettings } from 'react-icons/fi';
import { useUserStore } from '../../stores/useUserStore';

export default function Navbar() {
    const { user, logout } = useUserStore();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { path: '/', label: 'Início', icon: FiTv },
        { path: '/live-tv', label: 'Canais', icon: FiTv },
        { path: '/movies', label: 'Filmes', icon: FiFilm },
        { path: '/series', label: 'Séries', icon: FiVideo },
        { path: '/favorites', label: 'Minha Lista', icon: FiHeart },
    ];

    return (
        <header className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 px-6 md:px-12 py-4 flex items-center justify-between ${
            scrolled ? 'bg-[#0f171e] shadow-2xl border-b border-white/5' : 'bg-gradient-to-b from-[#0f171e]/80 to-transparent'
        }`}>
            {/* Left: Logo & Nav */}
            <div className="flex items-center gap-10">
                <div 
                    onClick={() => navigate('/')} 
                    className="flex items-center gap-2 cursor-pointer group"
                >
                    <img src="/new_logo_banner.jpg" alt="Logo" className="w-10 h-10 rounded-lg shadow-lg group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-black text-white tracking-tighter uppercase italic">IPTV <span className="text-primary">STREAM</span></span>
                </div>

                <nav className="hidden lg:flex items-center gap-6">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `text-sm font-bold transition-all hover:text-white ${
                                    isActive ? 'text-white border-b-2 border-primary pb-1' : 'text-gray-400'
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Right: Search, Notification, Profile */}
            <div className="flex items-center gap-6">
                <div className="relative group hidden md:block">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Busca..."
                        className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-primary/50 w-32 focus:w-48 transition-all"
                    />
                </div>

                <button className="text-gray-400 hover:text-white transition-colors relative">
                    <FiBell size={20} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                </button>

                <div className="relative group">
                    <div className="flex items-center gap-2 cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold overflow-hidden">
                            {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <FiUser />}
                        </div>
                    </div>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a242f] border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all p-2">
                        <NavLink to="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                            <FiSettings /> Ajustes
                        </NavLink>
                        <button 
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                        >
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
