import React from 'react';
import { FiPlay, FiHeart, FiDownload } from 'react-icons/fi';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import toast from 'react-hot-toast';

export default function MediaCard({ item, type, playlist = [] }) {
    const { addFavorite, removeFavorite, favorites } = usePlaylistStore();
    const { setCurrentStream } = usePlayerStore();
    const { setSelectedMediaDetails } = usePlaylistStore();
    
    const isFavorite = favorites.some(f => f.id === item.id);

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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const rawUrl = item.streamUrl || item.url;
        
        // HLS (m3u8) downloads are complex, so we limit to direct formats if possible
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
        if (type === 'movie' || type === 'series') {
            setSelectedMediaDetails({ ...item, type });
        } else {
            setCurrentStream({ ...item, type }, playlist);
        }
    };

    const isVOD = type === 'movie' || type === 'series';

    return (
        <div 
            onClick={handlePlay}
            className="group relative bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 active:scale-[0.98] md:hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-primary/20 flex flex-col h-full"
        >
            {/* Poster / Logo Area */}
            <div className={`${isVOD ? 'aspect-[2/3]' : 'aspect-[16/9]'} relative bg-black/40 flex items-center justify-center shrink-0`}>
                {item.logo ? (() => {
                    let logoUrl = item.logo;
                    if (logoUrl.startsWith('http://')) {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                        logoUrl = `${apiUrl}/proxy/image?url=${encodeURIComponent(logoUrl)}`;
                    }
                    return (
                        <img 
                            src={logoUrl} 
                            alt={item.name} 
                            className={`w-full h-full ${isVOD ? 'object-cover' : 'object-contain p-4'} group-hover:scale-110 transition-transform duration-500`}
                            loading="lazy"
                            decoding="async"
                        />
                    );
                })() : (
                    <div className="text-gray-600 text-4xl font-bold uppercase">{item.name.charAt(0)}</div>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/50 text-white animate-fade-in">
                        <FiPlay size={24} fill="currentColor" />
                    </div>
                </div>

                {/* Top Action Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                    {/* Favorite Button */}
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

                    {/* Download Button (Only for VOD) */}
                    {(type === 'movie' || type === 'series') && (
                        <button 
                            onClick={handleDownload}
                            className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-primary transition-all shadow-lg"
                            title="Download"
                        >
                            <FiDownload size={18} />
                        </button>
                    )}
                </div>

                {/* Badge for Type/Group */}
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] uppercase font-bold text-gray-400">
                    {item.group}
                </div>
            </div>

            {/* Info Area */}
            <div className="p-3 md:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex-1 flex flex-col justify-end">
                <h3 className="font-bold text-xs md:text-sm text-white line-clamp-2 md:truncate group-hover:text-primary transition-colors leading-tight">
                    {item.name}
                </h3>
            </div>
        </div>
    );
}
