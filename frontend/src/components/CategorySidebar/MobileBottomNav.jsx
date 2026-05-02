import { NavLink } from 'react-router-dom';
import { FiTv, FiFilm, FiVideo, FiSettings, FiHeart, FiHome } from 'react-icons/fi';

export default function MobileBottomNav() {
    const navItems = [
        { path: '/',           icon: FiHome,     label: 'Início'    },
        { path: '/live-tv',    icon: FiTv,       label: 'Ao Vivo'   },
        { path: '/movies',     icon: FiFilm,     label: 'Filmes'    },
        { path: '/series',     icon: FiVideo,    label: 'Séries'    },
        { path: '/favorites',  icon: FiHeart,    label: 'Favoritos' },
        { path: '/settings',   icon: FiSettings, label: 'Ajustes'   },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-3xl border-t border-white/5 z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-stretch justify-around h-[62px]">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 transition-all duration-300 px-0.5 ${
                                isActive
                                    ? 'text-primary drop-shadow-[0_0_8px_rgba(108,92,231,0.6)] -translate-y-0.5'
                                    : 'text-gray-500 hover:text-white'
                            }`
                        }
                    >
                        <item.icon size={18} />
                        <span className="text-[8px] font-bold tracking-tight leading-tight text-center w-full truncate px-0.5">
                            {item.label}
                        </span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
