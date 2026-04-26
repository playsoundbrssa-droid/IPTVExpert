import React from 'react';
import { FiPlay, FiInfo, FiPlus } from 'react-icons/fi';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { safeImageUrl } from '../../utils/imageUtils';

export default function ContentHero({ item }) {
    const { setCurrentStream } = usePlayerStore();
    const { setSelectedMediaDetails } = usePlaylistStore();

    const heroImage = React.useMemo(() => safeImageUrl(item?.logo), [item]);

    if (!item) return null;

    const handlePlay = () => {
        setCurrentStream(item);
    };

    const handleInfo = () => {
        setSelectedMediaDetails(item);
    };

    return (
        <div className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden rounded-[2.5rem] mb-12 group">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0">
                <img 
                    src={heroImage || 'https://picsum.photos/1920/1080?random=hero'} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0f171e] via-[#0f171e]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f171e] via-transparent to-transparent" />
            </div>

            {/* Content Info */}
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 max-w-4xl space-y-6">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-primary rounded text-[10px] font-black text-white uppercase tracking-wider shadow-lg shadow-primary/20">
                        EM DESTAQUE
                    </span>
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest">{item.group}</span>
                </div>

                <h1 className="text-4xl md:text-7xl font-black text-white leading-tight drop-shadow-2xl">
                    {item.name}
                </h1>

                <p className="text-white/80 text-sm md:text-lg max-w-xl line-clamp-3 font-medium leading-relaxed drop-shadow-md">
                    Explore esta incrível produção agora. Assista com a melhor qualidade e mergulhe em uma experiência cinematográfica única diretamente do seu navegador.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-4">
                    <button 
                        onClick={handlePlay}
                        className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary hover:text-white transition-all transform active:scale-95 shadow-2xl"
                    >
                        <FiPlay fill="currentColor" /> Assistir Agora
                    </button>
                    
                    <button 
                        onClick={handleInfo}
                        className="flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all transform active:scale-95"
                    >
                        <FiInfo /> Mais Informações
                    </button>

                    <button className="p-4 bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-xl hover:bg-white/20 transition-all">
                        <FiPlus size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
