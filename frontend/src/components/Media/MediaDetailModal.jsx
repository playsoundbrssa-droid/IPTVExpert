import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX, FiPlay, FiHeart, FiStar, FiCalendar, FiClock, FiDownload, FiChevronDown } from 'react-icons/fi';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { organizeBySeasons } from '../../utils/seasonOrganizer';
import { getSeriesBaseName } from '../../utils/seriesUtils';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MediaDetailModal() {
    const { selectedMediaDetails, setSelectedMediaDetails, favorites, addFavorite, removeFavorite, seriesList, seriesGroups } = usePlaylistStore();
    const { setCurrentStream } = usePlayerStore();
    
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(1);

    const isFavorite = favorites.some(f => f.id === selectedMediaDetails?.id);

    useEffect(() => {
        if (selectedMediaDetails) {
            fetchMetadata();
            // Reset season to 1 when changing media
            setSelectedSeason(1);
        } else {
            setMetadata(null);
        }
    }, [selectedMediaDetails]);

    const fetchMetadata = async () => {
        setLoading(true);
        try {
            const response = await api.get('/media/metadata', {
                params: {
                    title: selectedMediaDetails.name,
                    type: selectedMediaDetails.type
                }
            });
            setMetadata(response.data);
        } catch (error) {
            console.error('Falha ao buscar metadados:', error);
        } finally {
            setLoading(false);
        }
    };

    // Agrupar episódios se for série
    const episodesBySeason = useMemo(() => {
        if (!selectedMediaDetails) return null;
        
        // Se já passamos a lista consolidada, usamos ela, 
        // caso contrário, buscamos na lista global de séries
        let siblings = selectedMediaDetails.allEpisodes;

        if (!siblings) {
            const currentBaseName = getSeriesBaseName(selectedMediaDetails.name);
            siblings = seriesList.filter(s => getSeriesBaseName(s.name) === currentBaseName);
        }

        return organizeBySeasons(siblings);
    }, [selectedMediaDetails, seriesList]);

    const seasons = useMemo(() => {
        return episodesBySeason ? Object.keys(episodesBySeason).sort((a,b) => a-b) : [];
    }, [episodesBySeason]);

    if (!selectedMediaDetails) return null;

    const handlePlay = (episode = null) => {
        const itemToPlay = episode || selectedMediaDetails;
        setCurrentStream(itemToPlay, []);
        setSelectedMediaDetails(null); // Fechar modal ao dar play
    };

    const toggleFavorite = () => {
        if (isFavorite) {
            removeFavorite(selectedMediaDetails.id);
            toast.success('Removido dos favoritos');
        } else {
            addFavorite(selectedMediaDetails);
            toast.success('Adicionado aos favoritos');
        }
    };

    const backdropUrl = metadata?.backdropPath || selectedMediaDetails.logo;

    return (
        <Transition show={!!selectedMediaDetails} as={React.Fragment}>
            <Dialog 
                onClose={() => setSelectedMediaDetails(null)}
                className="relative z-50"
            >
                {/* Backdrop Layer */}
                <Transition.Child
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl" aria-hidden="true" />
                </Transition.Child>

                {/* Modal Container */}
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-0 md:p-6">
                        <Transition.Child
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-8"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-8"
                            className="w-full max-w-6xl"
                        >
                            <Dialog.Panel className="relative w-full bg-surface/40 border border-white/10 md:rounded-[2.5rem] overflow-hidden shadow-2xl h-screen md:h-auto md:max-h-[90vh] flex flex-col">
                                
                                {/* Background Image & Overlay */}
                                <div className="absolute inset-0 -z-10 h-[60%] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent z-10" />
                                    <img 
                                        src={backdropUrl}
                                        alt=""
                                        className="w-full h-full object-cover scale-105 blur-sm opacity-50"
                                    />
                                </div>

                                {/* Close Button */}
                                <button 
                                    onClick={() => setSelectedMediaDetails(null)}
                                    className="absolute top-6 right-6 z-50 p-3 bg-black/40 hover:bg-white/10 rounded-full text-white backdrop-blur-md transition-all border border-white/10"
                                >
                                    <FiX size={24} />
                                </button>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
                                    <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-10">
                                        
                                        {/* Poster Column */}
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="w-full aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                                                <img 
                                                    src={metadata?.posterPath || selectedMediaDetails.logo}
                                                    alt={selectedMediaDetails.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            <div className="w-full grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => handlePlay()}
                                                    className="flex items-center justify-center gap-2 py-4 bg-primary rounded-2xl font-black text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wider"
                                                >
                                                    <FiPlay fill="currentColor" /> Assistir
                                                </button>
                                                <button 
                                                    onClick={toggleFavorite}
                                                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black border transition-all active:scale-95 text-sm uppercase tracking-wider ${
                                                        isFavorite 
                                                        ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20' 
                                                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                                    }`}
                                                >
                                                    <FiHeart fill={isFavorite ? 'currentColor' : 'none'} /> Favoritos
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info Column */}
                                        <div className="space-y-8 pt-4">
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {metadata?.voteAverage && (
                                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/20 text-yellow-500 rounded-lg text-xs font-black border border-yellow-400/20">
                                                            <FiStar className="fill-yellow-500" /> {metadata.voteAverage.toFixed(1)}
                                                        </span>
                                                    )}
                                                    {metadata?.releaseDate && (
                                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs font-bold border border-white/10">
                                                            <FiCalendar /> {new Date(metadata.releaseDate).getFullYear()}
                                                        </span>
                                                    )}
                                                    <span className="px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-black border border-primary/20 uppercase">
                                                        {selectedMediaDetails.type === 'movie' ? 'Filme' : 'Série'}
                                                    </span>
                                                </div>

                                                <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                                                    {selectedMediaDetails.name}
                                                </h2>

                                                {metadata?.genres && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {metadata.genres.map(g => (
                                                            <span key={g} className="text-sm text-gray-400 font-medium">#{g}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-lg font-bold text-gray-300">Sinopse</h3>
                                                <p className="text-gray-400 leading-relaxed text-base md:text-lg max-w-3xl font-medium">
                                                    {loading ? (
                                                        <span className="animate-pulse">Buscando informações detalhadas...</span>
                                                    ) : (
                                                        metadata?.overview || 'Nenhuma descrição disponível para este conteúdo.'
                                                    )}
                                                </p>
                                            </div>

                                            {/* Season & Episode List (Only for Series) */}
                                            {selectedMediaDetails.type === 'series' && seasons.length > 0 && (
                                                <div className="space-y-6 pt-6 border-t border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-2xl font-black">Episódios</h3>
                                                        <div className="relative group/select">
                                                            <select 
                                                                value={selectedSeason}
                                                                onChange={(e) => setSelectedSeason(e.target.value)}
                                                                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                                                            >
                                                                {seasons.map(s => (
                                                                    <option key={s} value={s} className="bg-surface text-white">Temporada {s}</option>
                                                                ))}
                                                            </select>
                                                            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {episodesBySeason[selectedSeason]?.map((ep, idx) => (
                                                            <button 
                                                                key={ep.id}
                                                                onClick={() => handlePlay(ep)}
                                                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group/ep text-left w-full"
                                                            >
                                                                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black group-hover/ep:bg-primary group-hover/ep:text-white transition-all shrink-0">
                                                                    {ep.order}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-white truncate group-hover/ep:text-primary transition-colors">
                                                                        {ep.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 uppercase font-black">ASSISTIR EPISÓDIO</div>
                                                                </div>
                                                                <FiPlay className="text-gray-600 group-hover/ep:text-primary transition-all opacity-0 group-hover/ep:opacity-100" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
