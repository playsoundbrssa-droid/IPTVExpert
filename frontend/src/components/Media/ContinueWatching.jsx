import React, { useEffect, useState } from 'react';
import { FiPlay, FiX, FiClock, FiTv, FiFilm } from 'react-icons/fi';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import api from '../../services/api';

export default function ContinueWatching() {
    const [lastWatched, setLastWatched] = useState([]);
    const [isVisible, setIsVisible] = useState(true);
    const { setCurrentStream } = usePlayerStore();
    const { setSelectedMediaDetails } = usePlaylistStore();
    const { getActivePlaylist } = usePlaylistManagerStore();
    const { moviesList, seriesList, channelsList } = usePlaylistStore();

    useEffect(() => {
        const fetchRecentProgress = async () => {
            const active = getActivePlaylist();
            if (!active) return;

            try {
                const response = await api.get('/progress/all', {
                    params: { playlistId: active.id }
                });

                if (response.data?.progress) {
                    const recent = response.data.progress
                        .filter(p => (p.last_position / p.duration) < 0.95) // Não terminados
                        .slice(-4)
                        .reverse();

                    const detailed = recent.map(progress => {
                        const allMedia = [...moviesList, ...seriesList, ...channelsList];
                        const item = allMedia.find(m => String(m.id) === String(progress.media_id));
                        if (item) {
                            return { ...item, progress };
                        }
                        return null;
                    }).filter(Boolean);

                    setLastWatched(detailed);
                }
            } catch (error) {
                console.error('[CONTINUE] Error:', error);
            }
        };

        fetchRecentProgress();
    }, [moviesList, seriesList, channelsList, getActivePlaylist]);

    const handleContinue = (item) => {
        if (item.type === 'series') {
            // Para séries, abre o modal de detalhes para escolher continuar pelo episódio certo
            setSelectedMediaDetails({ ...item, continueFrom: item.progress.last_position });
        } else {
            // Para filmes e canais, continua direto
            setCurrentStream(item);
        }
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-4xl animate-fade-in-up">
            <div className="bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 lg:p-6 shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <h3 className="text-white font-black uppercase tracking-wider text-xs lg:text-sm">Continuar Assistindo</h3>
                    </div>
                    <button onClick={() => setIsVisible(false)} className="text-white/40 hover:text-white transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {lastWatched.map((item) => (
                        <div 
                            key={item.id}
                            onClick={() => handleContinue(item)}
                            className="group relative bg-white/5 hover:bg-white/10 rounded-2xl p-3 flex items-center gap-4 cursor-pointer transition-all border border-white/5 hover:border-primary/30"
                        >
                            <div className="relative w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden shadow-lg">
                                <img 
                                    src={item.stream_icon || item.cover || item.logo || 'https://via.placeholder.com/150'} 
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FiPlay className="text-white fill-white" size={20} />
                                </div>
                                {/* Type badge */}
                                <div className="absolute top-1 left-1">
                                    {item.type === 'series' ? 
                                        <FiTv size={10} className="text-white drop-shadow" /> : 
                                        <FiFilm size={10} className="text-white drop-shadow" />
                                    }
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-white text-sm font-bold truncate mb-1">{item.name}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium mb-2">
                                    <FiClock size={10} />
                                    <span>{Math.round((item.progress.last_position / item.progress.duration) * 100)}% concluído</span>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" 
                                        style={{ width: `${(item.progress.last_position / item.progress.duration) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
