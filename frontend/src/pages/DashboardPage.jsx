import React, { useMemo, useRef, memo } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import MediaCard from '../components/Media/MediaCard';
import { FiTv, FiFilm, FiLayers, FiChevronLeft, FiChevronRight, FiPlay } from 'react-icons/fi';

const CarouselRow = memo(({ title, icon: Icon, items, type }) => {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' 
                ? scrollLeft - clientWidth * 0.8 
                : scrollLeft + clientWidth * 0.8;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-4 group/row">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                    <Icon className="text-primary" /> {title}
                </h2>
                <div className="flex gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button onClick={() => scroll('left')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white border border-white/5">
                        <FiChevronLeft size={20} />
                    </button>
                    <button onClick={() => scroll('right')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white border border-white/5">
                        <FiChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar scroll-smooth"
            >
                {items.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex-shrink-0 w-36 lg:w-48 transform transition-all duration-300 hover:scale-105 hover:z-10">
                        <MediaCard item={item} type={type} playlist={items} />
                    </div>
                ))}
            </div>
        </div>
    );
});

export default function DashboardPage() {
    const { channelsList, moviesList, seriesList } = usePlaylistStore();

    // Pegar amostras para o Dashboard
    const dashboardData = useMemo(() => {
        const isAdult = (item) => {
            const forbidden = [/adulto/i, /xxx/i, /sexo/i, /porno/i, /sexy/i, /\+18/i, /18\+/i, /hentai/i];
            const text = `${item.name} ${item.group}`.toLowerCase();
            return forbidden.some(regex => regex.test(text));
        };

        const shuffle = (array) => [...array].filter(i => !isAdult(i)).sort(() => 0.5 - Math.random());
        
        return {
            channels: shuffle(channelsList).slice(0, 15).map(c => ({ ...c, type: 'channel' })),
            movies: shuffle(moviesList).slice(0, 15).map(m => ({ ...m, type: 'movie' })),
            series: shuffle(seriesList).slice(0, 15).map(s => ({ ...s, type: 'series' }))
        };
    }, [channelsList, moviesList, seriesList]);

    if (!channelsList.length && !moviesList.length && !seriesList.length) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <FiLayers size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Sua biblioteca está vazia</h2>
                <p className="text-gray-500 max-w-xs">Importe uma lista M3U ou Xtream nas configurações para ver o catálogo.</p>
            </div>
        );
    }

    return (
        <div className="pb-20 space-y-12 animate-fade-in max-w-[1600px] mx-auto">
            {/* Hero Banner (Estilo Amazon) */}
            <div className="relative h-[40vh] lg:h-[60vh] rounded-[2.5rem] overflow-hidden group/hero mb-16 shadow-2xl shadow-black/50">
                <img 
                    src={dashboardData.movies[0]?.cover || "/new_logo_banner.jpg"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/hero:scale-105"
                    style={{ objectPosition: 'center 20%' }}
                    alt="Featured"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 p-8 lg:p-16 space-y-4 max-w-2xl">
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-primary/20">Em Destaque</span>
                    <h1 className="text-4xl lg:text-7xl font-black text-white leading-tight drop-shadow-2xl">
                        Explore o Melhor do <span className="text-primary">IPTV Expert</span>
                    </h1>
                    <p className="text-gray-300 text-lg lg:text-xl font-medium max-w-xl line-clamp-2 lg:line-clamp-none">
                        Milhares de canais, filmes e séries organizados para você. Comece a assistir agora com a melhor experiência.
                    </p>
                    <div className="flex items-center gap-4 pt-4">
                        <button 
                            onClick={() => window.location.href = '/live-tv'}
                            className="px-8 py-4 bg-white text-black rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl"
                        >
                            <FiPlay className="fill-current" /> Ver Canais
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-16">
                <CarouselRow title="TV AO VIVO" icon={FiTv} items={dashboardData.channels} type="channel" />
                <CarouselRow title="FILMES" icon={FiFilm} items={dashboardData.movies} type="movie" />
                <CarouselRow title="SÉRIES" icon={FiLayers} items={dashboardData.series} type="series" />
            </div>

        </div>
    );
}
