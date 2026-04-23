import { NavLink } from 'react-router-dom';
import { FiTv, FiFilm, FiVideo, FiSettings, FiHeart, FiStar } from 'react-icons/fi';

export default function MobileBottomNav() {
    const navItems = [
        { path: '/', icon: FiTv, label: 'Ao Vivo' },
        { path: '/movies', icon: FiFilm, label: 'Filmes' },
        { path: '/series', icon: FiVideo, label: 'Séries' },
        { path: '/highlights', icon: FiStar, label: 'Destaques' },
        { path: '/favorites', icon: FiHeart, label: 'Favoritos' },
        { path: '/settings', icon: FiSettings, label: 'Ajustes' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-h-20 bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-white/5 z-40 md:hidden pb-safe">
            <div className="flex items-center justify-around px-2 py-1 h-[68px]">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${
                                isActive
                                    ? 'text-primary drop-shadow-[0_0_10px_rgba(108,92,231,0.5)] transform -translate-y-1'
                                    : 'text-gray-500 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="text-[20px]" />
                        <span className="text-[9px] font-bold tracking-tight whitespace-nowrap">
                            {item.label}
                        </span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
