import { NavLink } from 'react-router-dom';
import { FiTv, FiFilm, FiVideo, FiHeart, FiSettings, FiPlus, FiShield, FiTrendingUp } from 'react-icons/fi';
import { useUserStore } from '../../stores/useUserStore';

export default function Sidebar({ onImportClick }) {
    const { user } = useUserStore();

    const navItems = [
        { path: '/highlights', icon: FiTrendingUp, label: 'Destaques' },
        { path: '/favorites', icon: FiHeart, label: 'Favoritos' },
        { path: '/', icon: FiTv, label: 'TV ao Vivo' },
        { path: '/movies', icon: FiFilm, label: 'Filmes' },
        { path: '/series', icon: FiVideo, label: 'Séries' },
        ...(user?.role === 'admin' ? [{ path: '/admin', icon: FiShield, label: 'Admin' }] : []),
    ];

    return (
        <aside className="w-64 glass-panel flex flex-col h-full border-r border-white/5 z-40 relative">
            <div className="p-6 flex flex-col items-center text-center">
                <div className="mb-3 relative">
                    <div className="absolute -inset-3 bg-neon-purple/20 blur-2xl rounded-full" />
                    <img
                        src="/iptv_logo.png"
                        alt="IPTV Expert Logo"
                        className="relative w-20 h-20 rounded-2xl object-cover drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    />
                </div>
                <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Web Player</p>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive
                                ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(108,92,231,0.2)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`
                        }
                    >
                        <item.icon className="text-lg" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-white/5 space-y-2">
                {onImportClick && (
                    <button
                        onClick={onImportClick}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10"
                    >
                        <FiPlus className="text-lg" />
                        Importar Mídia
                    </button>
                )}
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${isActive
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`
                    }
                >
                    <FiSettings className="text-lg" />
                    Configurações
                </NavLink>
            </div>
        </aside>
    );
}