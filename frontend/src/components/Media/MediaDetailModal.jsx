import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX, FiPlay, FiHeart, FiStar, FiCalendar, FiClock, FiDownload, FiChevronDown, FiInfo } from 'react-icons/fi';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import { organizeBySeasons } from '../../utils/seasonOrganizer';
import { getSeriesBaseName } from '../../utils/seriesUtils';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MediaDetailModal() {
    const { selectedMediaDetails, setSelectedMediaDetails, favorites, addFavorite, removeFavorite, seriesList } = usePlaylistStore();
    const { activePlaylistId } = usePlaylistManagerStore();
    const { setCurrentStream } = usePlayerStore();
    
    const [metadata, setMetadata] = useState(null);
    const [dynamicEpisodes, setDynamicEpisodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);

    const isFavorite = favorites.some(f => f.id === selectedMediaDetails?.id);

    useEffect(() => {
        if (selectedMediaDetails) {
            fetchMetadata();
            
            // Se for Xtream e não tiver episódios consolidados, buscamos no servidor
            const isXtream = selectedMediaDetails.id?.includes('xtream_');
            const hasNoEpisodes = !selectedMediaDetails.allEpisodes || selectedMediaDetails.allEpisodes.length <= 1;
            
            if (isXtream && hasNoEpisodes && activePlaylistId) {
                fetchEpisodes();
            } else {
                setDynamicEpisodes(selectedMediaDetails.allEpisodes || []);
            }
        } else {
            setMetadata(null);
            setDynamicEpisodes([]);
        }
    }, [selectedMediaDetails, activePlaylistId]);

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

    const fetchEpisodes = async () => {
        setLoadingEpisodes(true);
        try {
            const { data } = await api.get('/media/episodes', {
                params: {
                    seriesId: selectedMediaDetails.id,
                    playlistId: activePlaylistId
                }
            });
            if (data.episodes) {
                setDynamicEpisodes(data.episodes);
            }
        } catch (error) {
            console.error('Falha ao buscar episódios:', error);
            toast.error('Erro ao carregar capítulos da série.');
        } finally {
            setLoadingEpisodes(false);
        }
    };

    const episodesBySeason = useMemo(() => {
        if (!selectedMediaDetails || selectedMediaDetails.type !== 'series') return null;
        // Priorizar os episódios carregados dinamicamente (Xtream) ou os consolidados (M3U)
        return organizeBySeasons(dynamicEpisodes.length > 0 ? dynamicEpisodes : (selectedMediaDetails.allEpisodes || []));
    }, [selectedMediaDetails, dynamicEpisodes]);

    const seasons = useMemo(() => {
        return episodesBySeason ? Object.keys(episodesBySeason).sort((a,b) => parseInt(a)-parseInt(b)) : [];
    }, [episodesBySeason]);

    if (!selectedMediaDetails) return null;

    const handlePlay = (episode = null) => {
        const itemToPlay = episode || selectedMediaDetails;
        const allPlaylist = dynamicEpisodes.length > 0 ? dynamicEpisodes : (selectedMediaDetails.allEpisodes || []);
        setCurrentStream(itemToPlay, allPlaylist);
        setSelectedMediaDetails(null);
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

    return (
        <Transition show={!!selectedMediaDetails} as={React.Fragment}>
            <Dialog onClose={() => setSelectedMediaDetails(null)} className="relative z-50">
                <Transition.Child
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-md" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center">
                        <Transition.Child
                            enter="ease-out duration-300" enterFrom="opacity-0 translate-y-10" enterTo="opacity-100 translate-y-0"
                            leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-10"
                            className="w-full max-w-7xl min-h-screen relative"
                        >
                            <Dialog.Panel className="w-full h-full flex flex-col text-white pb-20">
                                
                                {/* Botão Voltar/Fechar */}
                                <button 
                                    onClick={() => setSelectedMediaDetails(null)}
                                    className="absolute top-8 left-8 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                                >
                                    <FiX size={28} />
                                </button>

                                {/* Background Header com Gradiente */}
                                <div className="relative w-full h-[60vh] lg:h-[70vh] flex items-center px-8 lg:px-20 overflow-hidden">
                                    <div className="absolute inset-0 -z-10">
                                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                                        <img 
                                            src={metadata?.backdropPath || selectedMediaDetails.logo} 
                                            className="w-full h-full object-cover opacity-40 blur-[2px]" 
                                            alt="" 
                                        />
                                    </div>

                                    {/* Info à Esquerda */}
                                    <div className="max-w-2xl space-y-6 animate-fade-in">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-primary text-white text-xs font-black rounded uppercase">Série</span>
                                            {metadata?.voteAverage && (
                                                <span className="flex items-center gap-1 text-yellow-500 font-bold">
                                                    <FiStar className="fill-current" /> {metadata.voteAverage.toFixed(1)}
                                                </span>
                                            )}
                                            {metadata?.releaseDate && (
                                                <span className="text-gray-400 font-bold">{new Date(metadata.releaseDate).getFullYear()}</span>
                                            )}
                                        </div>

                                        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none">
                                            {selectedMediaDetails.name}
                                        </h1>

                                        <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-xl line-clamp-4">
                                            {metadata?.overview || 'Nenhuma sinopse disponível para esta série no momento.'}
                                        </p>

                                        <div className="flex items-center gap-4 pt-4">
                                            <button 
                                                onClick={() => handlePlay()}
                                                className="flex items-center gap-3 px-10 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
                                            >
                                                <FiPlay fill="currentColor" size={24} /> Assistir {seasons.length > 0 && 'S01 E01'}
                                            </button>
                                            <button 
                                                onClick={toggleFavorite}
                                                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold border transition-all ${
                                                    isFavorite ? 'bg-red-500 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                                }`}
                                            >
                                                <FiHeart fill={isFavorite ? 'currentColor' : 'none'} size={20} /> 
                                                {isFavorite ? 'Nos Favoritos' : 'Favoritar'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Poster à Direita (Apenas Desktop) */}
                                    <div className="hidden lg:block ml-auto w-[350px] aspect-[2/3] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 rotate-2 hover:rotate-0 transition-transform duration-500">
                                        <img src={metadata?.posterPath || selectedMediaDetails.logo} className="w-full h-full object-cover" alt="" />
                                    </div>
                                </div>

                                {/* Seções de Temporadas */}
                                <div className="px-8 lg:px-20 space-y-12 -mt-10 relative z-20">
                                    {seasons.map(seasonNum => (
                                        <div key={seasonNum} className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-2xl lg:text-3xl font-black tracking-tight">Temporada {seasonNum}</h3>
                                                <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition-all">
                                                    <FiDownload /> Baixar Temporada
                                                </button>
                                            </div>

                                            {/* Carrossel de Episódios */}
                                            <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
                                                {episodesBySeason[seasonNum].map((ep) => (
                                                    <button 
                                                        key={ep.id}
                                                        onClick={() => handlePlay(ep)}
                                                        className="group relative flex-shrink-0 w-64 lg:w-80 aspect-video bg-white/5 rounded-2xl border border-white/5 overflow-hidden hover:border-primary transition-all text-left"
                                                    >
                                                        {/* Thumbnail do Episódio (Usamos o Logo se não houver) */}
                                                        <img src={ep.logo || selectedMediaDetails.logo} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" alt="" />
                                                        
                                                        {/* Overlay de Play */}
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                                                <FiPlay fill="currentColor" className="ml-1" />
                                                            </div>
                                                        </div>

                                                        {/* Badge do Número */}
                                                        <div className="absolute bottom-4 left-4 right-4">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded border border-primary/20">
                                                                    {ep.order || 'EP'}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-bold text-white truncate">{ep.name}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
