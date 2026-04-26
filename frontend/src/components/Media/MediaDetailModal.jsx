import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiX, FiPlay, FiHeart, FiStar, FiCalendar, FiClock, FiDownload, FiChevronDown } from 'react-icons/fi';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import { organizeBySeasons } from '../../utils/seasonOrganizer';
import { getSeriesBaseName } from '../../utils/seriesUtils';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { safeImageUrl } from '../../utils/imageUtils';

export default function MediaDetailModal() {
    const { 
        selectedMediaDetails, 
        setSelectedMediaDetails, 
        favorites, 
        addFavorite, 
        removeFavorite, 
        seriesList, 
        moviesList,
        seriesGroups 
    } = usePlaylistStore();
    const { setCurrentStream } = usePlayerStore();

    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(1); // número

    const { getActivePlaylist } = usePlaylistManagerStore();
    const [xtreamEpisodes, setXtreamEpisodes] = useState(null);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);

    const isFavorite = favorites.some(f => f.id === selectedMediaDetails?.id);

    // Verificação inteligente: é série se o tipo for compatível OU se tiver episódios agrupados
    const isSeries = useMemo(() => {
        if (!selectedMediaDetails) return false;
        const type = selectedMediaDetails.type?.toLowerCase?.() ?? '';
        
        // Se já tem episódios agrupados ou temporadas (Xtream), é série
        if ((selectedMediaDetails.allEpisodes?.length || 0) > 1 || selectedMediaDetails.seasons) return true;
        
        // Se o tipo for série/tv
        if (['series', 'serie', 'tv'].includes(type)) return true;

        // Se for 'movie' mas tivermos outros itens com o mesmo nome base nas listas globais
        const currentBaseName = getSeriesBaseName(selectedMediaDetails.name);
        const hasSiblings = [...seriesList, ...moviesList].some(s => 
            s.id !== selectedMediaDetails.id && getSeriesBaseName(s.name) === currentBaseName
        );
        
        return hasSiblings;
    }, [selectedMediaDetails, seriesList, moviesList]);

    useEffect(() => {
        if (selectedMediaDetails) {
            fetchMetadata();
            // Reset de estados
            setXtreamEpisodes(null);
            setLoadingEpisodes(false);
            setSelectedSeason(1);

            if (isSeries && selectedMediaDetails.id?.includes('xtream_')) {
                fetchXtreamSeriesInfo();
            }
        } else {
            setMetadata(null);
            setXtreamEpisodes(null);
        }
    }, [selectedMediaDetails, isSeries]);

    const fetchXtreamSeriesInfo = async () => {
        const active = getActivePlaylist();
        if (!active || active.type !== 'xtream') return;

        setXtreamEpisodes(null);
        setLoadingEpisodes(true);
        try {
            // Extrai o ID numérico final (suporta 'xtream_series_123', 'series_group_xtream_series_123', etc.)
            const seriesId = selectedMediaDetails.id.split('_').filter(Boolean).pop();
            if (!seriesId || isNaN(seriesId)) {
                throw new Error('ID de série inválido');
            }
            const { server, username, password } = active.config;

            const response = await api.get('/xtream/series-info', {
                params: { server, username, password, series_id: seriesId }
            });

            if (response.data && response.data.episodes && Object.keys(response.data.episodes).length > 0) {
                // Normalização dos episódios
                const normalized = [];
                Object.keys(response.data.episodes).forEach(seasonNum => {
                    const seasonNumber = parseInt(seasonNum); // garante número
                    response.data.episodes[seasonNum].forEach(ep => {
                        const base = server.replace(/\/$/, '');
                        normalized.push({
                            id: `xtream_ep_${ep.id}`,
                            name: ep.title,
                            logo: ep.info?.movie_image || selectedMediaDetails.logo,
                            streamUrl: `${base}/series/${username}/${password}/${ep.id}.${ep.container_extension || 'mp4'}`,
                            season: seasonNumber,
                            episode: parseInt(ep.episode_num) || 0,
                            order: parseInt(ep.episode_num) || 0
                        });
                    });
                });
                setXtreamEpisodes(normalized);
            } else {
                // API retornou mas sem episódios
                setXtreamEpisodes([]); // array vazio para indicar que não há episódios (diferente de null = ainda buscando)
                toast.error('Nenhum episódio encontrado no servidor.');
            }
        } catch (error) {
            console.error('Erro ao buscar episódios Xtream:', error);
            toast.error('Erro ao carregar episódios do servidor.');
            setXtreamEpisodes([]); // evita loop de carregamento
        } finally {
            setLoadingEpisodes(false);
        }
    };

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

    // Memo dos episódios agrupados por temporada
    const episodesBySeason = useMemo(() => {
        if (!selectedMediaDetails) return null;

        // 1. Prioridade: Episódios vindos do Xtream (carregados sob demanda)
        if (xtreamEpisodes) {
            return organizeBySeasons(xtreamEpisodes);
        }

        // 2. Episódios locais (M3U)
        let siblings = selectedMediaDetails.allEpisodes || [];

        // Se não houver lista pronta, busca pelo nome base
        if (siblings.length === 0) {
            const currentBaseName = getSeriesBaseName(selectedMediaDetails.name);
            // Busca tanto em seriesList quanto em moviesList (caso algum episódio tenha vazado pra lá)
            siblings = [...seriesList, ...moviesList].filter(s =>
                getSeriesBaseName(s.name) === currentBaseName
            );
        }

        // Se ainda assim não encontrou nada, o próprio item é o "episódio" único
        if (siblings.length === 0) {
            siblings = [selectedMediaDetails];
        }

        return organizeBySeasons(siblings);
    }, [selectedMediaDetails, seriesList, moviesList, xtreamEpisodes]);

    // Lista de temporadas disponíveis (como números)
    const seasons = useMemo(() => {
        return episodesBySeason ? Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b) : [];
    }, [episodesBySeason]);

    // Ao mudar a lista de temporadas, se a temporada selecionada não existir, volta para a primeira
    useEffect(() => {
        if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
            setSelectedSeason(seasons[0]);
        }
    }, [seasons, selectedSeason]);

    const backdropUrl = useMemo(() => safeImageUrl(metadata?.backdropPath || selectedMediaDetails?.logo), [metadata, selectedMediaDetails]);
    const posterUrl = useMemo(() => safeImageUrl(metadata?.posterPath || selectedMediaDetails?.logo), [metadata, selectedMediaDetails]);

    if (!selectedMediaDetails) return null;

    const handlePlay = (episode = null) => {
        const itemToPlay = episode || selectedMediaDetails;
        setCurrentStream(itemToPlay, []);
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
            <Dialog
                onClose={() => setSelectedMediaDetails(null)}
                className="relative z-50"
            >
                {/* Backdrop */}
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
                                                    src={posterUrl}
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
                                                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black border transition-all active:scale-95 text-sm uppercase tracking-wider ${isFavorite
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

                                            {/* SEÇÃO DE TEMPORADAS E EPISÓDIOS (Layout Premium Grid) */}
                                            {isSeries && (
                                                <div className="space-y-12 pt-10 border-t border-white/5">
                                                    {loadingEpisodes ? (
                                                        <div className="py-20 flex flex-col items-center justify-center gap-6">
                                                            <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                                            <div className="text-center">
                                                                <p className="text-white font-black uppercase tracking-widest text-sm">Sincronizando Episódios</p>
                                                            </div>
                                                        </div>
                                                    ) : seasons.length > 0 ? (
                                                        seasons.map(seasonNum => (
                                                            <div key={seasonNum} className="space-y-6">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" />
                                                                        <h3 className="text-2xl font-black text-white">Temporada {seasonNum}</h3>
                                                                    </div>
                                                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black transition-all border border-white/10 group">
                                                                        <FiDownload className="text-primary group-hover:scale-110 transition-transform" /> 
                                                                        <span>Baixar temporada</span>
                                                                    </button>
                                                                </div>

                                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                                                                    {episodesBySeason[seasonNum]?.map((ep, idx) => (
                                                                        <div 
                                                                            key={ep.id || idx}
                                                                            onClick={() => handlePlay(ep)}
                                                                            className="group/card cursor-pointer space-y-3"
                                                                        >
                                                                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5 group-hover/card:border-primary/50 transition-all shadow-lg">
                                                                                <img 
                                                                                    src={safeImageUrl(ep.logo || selectedMediaDetails.logo)} 
                                                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110 opacity-60 group-hover/card:opacity-100"
                                                                                    alt={ep.name}
                                                                                />
                                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-300 bg-black/50 backdrop-blur-[2px]">
                                                                                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-xl transform scale-75 group-hover/card:scale-100 transition-transform">
                                                                                        <FiPlay fill="currentColor" size={24} />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-black text-white border border-white/10">
                                                                                    {ep.duration || '45:00'}
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <span className="text-[10px] font-black text-primary uppercase">E{String(ep.episode || idx + 1).padStart(2, '0')}</span>
                                                                                <h4 className="text-xs font-bold text-gray-200 line-clamp-2 group-hover/card:text-primary transition-colors">
                                                                                    {ep.name}
                                                                                </h4>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="py-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center gap-6">
                                                            <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center text-gray-600">
                                                                <FiPlay size={40} />
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-black uppercase tracking-widest text-sm">Nenhum Episódio Disponível</p>
                                                            </div>
                                                        </div>
                                                    )}
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