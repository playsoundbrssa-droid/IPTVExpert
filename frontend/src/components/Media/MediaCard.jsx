import React, { useMemo } from 'react';
import { FiPlay, FiHeart, FiDownload } from 'react-icons/fi';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import toast from 'react-hot-toast';
import { getProxyImageUrl } from '../../services/api';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import { useNavigate } from 'react-router-dom';
import { useEpgStore } from '../../stores/useEpgStore';

export default function MediaCard({ item, type, playlist = [] }) {
    const { addFavorite, removeFavorite, favorites } = usePlaylistStore();
    const { setCurrentStream } = usePlayerStore();
    const { setSelectedMediaDetails } = usePlaylistStore();
    const { getActivePlaylist } = usePlaylistManagerStore();
    const { nowPlaying } = useEpgStore();
    const navigate = useNavigate();
    
    const activePlaylist = getActivePlaylist();
    const isFavorite = favorites.some(f => f.id === item.id);

    // EPG Logic
    const currentProgram = useMemo(() => {
        if (type !== 'channel') return null;
        // Tenta encontrar pelo ID do canal (alguns m3u usam tvg-id)
        const data = nowPlaying[item.tvgId] || nowPlaying[item.id];
        return data?.current || null;
    }, [nowPlaying, item, type]);

    const programProgress = useMemo(() => {
        if (!currentProgram) return 0;
        
        const parseDate = (d) => {
            if (!d) return null;
            // EPG Date Format: 20231027120000 +0000
            const y = d.substring(0, 4);
            const m = d.substring(4, 6);
            const day = d.substring(6, 8);
            const h = d.substring(8, 10);
            const min = d.substring(10, 12);
            return new Date(`${y}-${m}-${day}T${h}:${min}:00`).getTime();
        };

        const start = parseDate(currentProgram.start);
        const stop = parseDate(currentProgram.stop);
        const now = Date.now();

        if (!start || !stop) return 0;
        const total = stop - start;
        const elapsed = now - start;
        return Math.max(0, Math.min(100, (elapsed / total) * 100));
    }, [currentProgram]);

    const toggleFavorite = (e) => {
        e.stopPropagation();
        if (isFavorite) {
            removeFavorite(item.id);
            toast.success('Removido dos favoritos');
        } else {
            addFavorite({ ...item, type });
            toast.success('Adicionado aos favoritos');
        }
    };

    const handleDownload = (e) => {
        e.stopPropagation();
        if (!activePlaylist) {
            toast.error('Adicione uma lista nas configurações para fazer downloads.');
            navigate('/settings');
            return;
        }
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const rawUrl = item.streamUrl || item.url;
        const isHls = rawUrl.includes('.m3u8') || rawUrl.includes('type=m3u8');
        if (isHls) {
            toast.error('Download não disponível para este formato (HLS)');
            return;
        }
        const downloadUrl = `${apiUrl}/proxy/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(item.name)}`;
        window.open(downloadUrl, '_blank');
        toast.success('Download iniciado...');
    };

    const handlePlay = () => {
        if (!activePlaylist) {
            toast.error('Você precisa de uma lista ativa para assistir.');
            navigate('/settings');
            return;
        }
        if (type === 'movie' || type === 'series') {
            setSelectedMediaDetails({ ...item, type });
        } else {
            setCurrentStream({ ...item, type }, playlist);
        }
    };

    const isVOD = type === 'movie' || type === 'series';
    const [imgSrc, setImgSrc] = React.useState(() => getProxyImageUrl(item.logo));
    const [imgError, setImgError] = React.useState(false);

    const handleImgError = () => setImgError(true);

    return (
        <div 
            onClick={handlePlay}
            className="group relative bg-surface/30 border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 active:scale-[0.98] md:hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-primary/20 flex flex-col h-full"
        >
            {/* Poster / Logo Area */}
            <div className="aspect-[2/3] relative bg-black/40 flex items-center justify-center shrink-0">
                {imgSrc && !imgError ? (
                    <img 
                        src={imgSrc} 
                        alt={item.name} 
                        className={`w-full h-full ${isVOD ? 'object-cover' : 'object-contain p-4'} group-hover:scale-110 transition-transform duration-500`}
                        loading="lazy"
                        decoding="async"
                        onError={handleImgError}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-black text-primary/40 text-4xl font-black uppercase select-none">
                        {item.name ? item.name.charAt(0) : '?'}
                    </div>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/50 text-white animate-fade-in">
                        <FiPlay size={24} fill="currentColor" />
                    </div>
                </div>

                {/* Favorite Button */}
                <div className="absolute top-3 right-3">
                    <button 
                        onClick={toggleFavorite}
                        className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${
                            isFavorite 
                            ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20' 
                            : 'bg-black/60 text-white border-white/10 hover:bg-white/10'
                        }`}
                        title="Favoritar"
                    >
                        <FiHeart size={18} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                </div>

                {/* Badge for Type/Group */}
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] uppercase font-bold text-gray-400">
                    {item.group}
                </div>

                {/* Live Indicator if it's a channel */}
                {type === 'channel' && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-600 rounded-md text-[9px] font-black uppercase tracking-widest animate-pulse">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" /> AO VIVO
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex-1 flex flex-col justify-start gap-1">
                <h3 className="font-bold text-xs md:text-sm text-white line-clamp-1 group-hover:text-primary transition-colors leading-tight">
                    {item.name}
                </h3>
                
                {type === 'channel' && currentProgram && (
                    <div className="space-y-1.5 mt-1">
                        <p className="text-[10px] text-gray-400 font-medium line-clamp-1 italic">
                            {currentProgram.title}
                        </p>
                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-1000" 
                                style={{ width: `${programProgress}%` }}
                            />
                        </div>
                    </div>
                )}
                
                {type === 'channel' && !currentProgram && (
                    <p className="text-[10px] text-gray-500 font-medium mt-1">
                        Programação indisponível
                    </p>
                )}
            </div>
        </div>
    );
}
