import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    FiSearch, FiBell, FiUser, FiLogOut, 
    FiSettings, FiChevronDown, FiMenu, FiX 
} from 'react-icons/fi';
import { useUserStore } from '../../stores/useUserStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';

export default function Navbar() {
    const { user, logout } = useUserStore();
    const { searchQuery, setSearchQuery } = usePlaylistStore();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Início', path: '/' },
        { name: 'Canais', path: '/live-tv' },
        { name: 'Filmes', path: '/movies' },
        { name: 'Séries', path: '/series' },
        { name: 'Favoritos', path: '/favorites' },
    ];

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 md:px-12 py-4 ${
            isScrolled ? 'bg-[#0f171e]/95 backdrop-blur-xl shadow-2xl py-3' : 'bg-gradient-to-b from-black/80 to-transparent'
        }`}>
            <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-8">
                
                {/* Logo & Links */}
                <div className="flex items-center gap-10">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                            <span className="text-white font-black text-xl">IP</span>
                        </div>
                        <span className="hidden md:block text-white font-black text-xl tracking-tighter">
                            IPTV<span className="text-primary">EXPERT</span>
                        </span>
                    </Link>

                    <div className="hidden lg:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-bold transition-all hover:text-white ${
                                    location.pathname === link.path ? 'text-white' : 'text-gray-400'
                                } relative group`}
                            >
                                {link.name}
                                {location.pathname === link.path && (
                                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
                                )}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Search & Profile */}
                <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Busque por canais, filmes ou séries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                        <FiBell size={20} />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-[#0f171e]" />
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
                        >
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <FiChevronDown className={`text-gray-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                                <div className="absolute right-0 mt-4 w-64 bg-[#1a242d] border border-white/10 rounded-[2rem] shadow-2xl z-20 py-4 animate-scale-in">
                                    <div className="px-6 py-4 border-b border-white/5 mb-2">
                                        <p className="text-white font-black truncate">{user?.name || 'Usuário'}</p>
                                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{user?.role || 'Membro Premium'}</p>
                                    </div>
                                    
                                    <Link to="/settings" className="flex items-center gap-3 px-6 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                        <FiSettings /> <span className="text-sm font-bold">Configurações</span>
                                    </Link>
                                    
                                    <button 
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 px-6 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                                    >
                                        <FiLogOut /> <span className="text-sm font-bold">Sair da Conta</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </nav>
    );
}
