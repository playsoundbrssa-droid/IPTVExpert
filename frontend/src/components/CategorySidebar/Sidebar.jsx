import { NavLink } from 'react-router-dom';
import { FiTv, FiFilm, FiVideo, FiHeart, FiSettings, FiPlus, FiShield, FiTrendingUp, FiHome, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useUserStore } from '../../stores/useUserStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import { useState } from 'react';

export default function Sidebar({ onImportClick }) {
    const { user } = useUserStore();
    const { getActivePlaylist, refreshActivePlaylist } = usePlaylistManagerStore();
    const activePlaylist = getActivePlaylist();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshActivePlaylist();
        setIsRefreshing(false);
    };

    const navItems = [
        { path: '/', icon: FiHome, label: 'Início' },
        { path: '/favorites', icon: FiHeart, label: 'Favoritos' },
        { path: '/live-tv', icon: FiTv, label: 'TV ao Vivo' },
        { path: '/movies', icon: FiFilm, label: 'Filmes' },
        { path: '/series', icon: FiVideo, label: 'Séries' },
        ...(user?.role === 'admin' ? [{ path: '/admin', icon: FiShield, label: 'Admin' }] : []),
    ];

    return (
        <aside className="w-64 glass-panel flex flex-col h-full border-r border-white/5 z-40 relative">
            <div className="p-3 md:p-6 flex flex-col items-center text-center">
                <div className="mb-2 md:mb-3 relative group">
                    {user?.avatar ? (
                        <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-primary/50 object-cover shadow-lg group-hover:border-primary transition-all duration-300"
                        />
                    ) : (
                        <img
                            src="/new_logo_banner.jpg"
                            alt="IPTV Expert Logo"
                            className="relative w-20 md:w-28 h-auto rounded-xl drop-shadow-xl"
                        />
                    )}
                </div>
                <p className="text-[9px] md:text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase truncate w-full">{user?.avatar ? user.name : 'Web Player'}</p>
            </div>

            <nav className="flex-1 px-2 md:px-4 space-y-1 md:space-y-2 mt-2 md:mt-4 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 ${isActive
                                ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(108,92,231,0.2)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`
                        }
                    >
                        <item.icon className="text-base md:text-lg" />
                        <span className="text-xs md:text-sm">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-2 md:p-4 border-t border-white/5 space-y-1 md:space-y-2">
                {activePlaylist && (
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 border border-transparent transition-all duration-300 disabled:opacity-50"
                    >
                        <FiRefreshCw className={`text-base md:text-lg ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                        <span className="text-xs md:text-sm">{isRefreshing ? '...' : 'Atualizar'}</span>
                    </button>
                )}
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 ${isActive
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`
                    }
                >
                    <FiSettings className="text-base md:text-lg" />
                    <span className="text-xs md:text-sm">Ajustes</span>
                </NavLink>
            </div>
        </aside>
    );
}