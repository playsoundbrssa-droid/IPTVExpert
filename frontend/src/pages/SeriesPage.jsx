import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import MediaCard from '../components/Media/MediaCard';
import CategoryFilter from '../components/Media/CategoryFilter';
import { FiSearch, FiLayers } from 'react-icons/fi';
import { getSeriesBaseName, getBestSeriesLogo } from '../utils/seriesUtils';

export default function SeriesPage() {
    const { seriesList, moviesList, seriesGroups, selectedSeriesGroup, setSelectedSeriesGroup } = usePlaylistStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(40);
    const loadMoreRef = useRef(null);

    // Prevenção de etiquetas erradas (Filmes | em Séries) vindo do provedor
    const cleanedGroups = useMemo(() => {
        const cleaned = {};
        Object.keys(seriesGroups || {}).forEach(key => {
            let newKey = key.replace(/^Filmes\s*\|\s*/i, 'Séries | ');
            const upper = newKey.toUpperCase();
            if (!upper.startsWith('SÉRIES |') && !upper.startsWith('SERIES |')) {
                if (upper.includes('NOVELA') || upper.includes('PROGRAMA') || upper.includes('TV SHOW')) {
                    newKey = 'Séries | ' + newKey;
                }
            }
            cleaned[newKey] = seriesGroups[key];
        });
        return cleaned;
    }, [seriesGroups]);

    // Ajuste do grupo selecionado para refletir a chave limpa
    const activeGroup = useMemo(() => {
        if (!selectedSeriesGroup) return null;
        let cleaned = selectedSeriesGroup.replace(/^Filmes\s*\|\s*/i, 'Séries | ');
        const upper = cleaned.toUpperCase();
        if (!upper.startsWith('SÉRIES |') && !upper.startsWith('SERIES |')) {
            if (upper.includes('NOVELA') || upper.includes('PROGRAMA') || upper.includes('TV SHOW')) {
                cleaned = 'Séries | ' + cleaned;
            }
        }
        return cleaned;
    }, [selectedSeriesGroup]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const consolidatedSeries = useMemo(() => {
        if (!seriesList.length && !moviesList.length) return [];

        const seriesIdSet = new Set(seriesList.map(s => s.id));
        const fullList = [...seriesList, ...moviesList];
        const globalSeriesMap = {};

        fullList.forEach(item => {
            const name = item.name || '';
            const isEpisodePattern = /[sS]\d+|[xX]\d+|\b(temp|ep|cap|season|episode)\b/i.test(name);
            if (!isEpisodePattern && !seriesIdSet.has(item.id)) return;

            const baseName = getSeriesBaseName(name);
            if (!globalSeriesMap[baseName]) {
                globalSeriesMap[baseName] = [];
            }
            globalSeriesMap[baseName].push(item);
        });

        const lowTerm = debouncedSearch.toLowerCase();
        const result = [];
        for (const [name, items] of Object.entries(globalSeriesMap)) {
            if (debouncedSearch && !name.toLowerCase().includes(lowTerm)) continue;
            if (selectedSeriesGroup && !items.some(ep => ep.group === selectedSeriesGroup)) continue;

            const representative = items.find(it => {
                if (!it.logo) return false;
                const lowLogo = it.logo.toLowerCase();
                return !lowLogo.includes('s0') && !lowLogo.includes('e0') && !lowLogo.includes('thumb');
            }) || items[0];

            result.push({
                ...representative,
                id: `series_group_${representative.id}`,
                name: name,
                logo: getBestSeriesLogo(items),
                episodeCount: items.length,
                allEpisodes: items,
                type: 'series'
            });
        }

        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [seriesList, moviesList, selectedSeriesGroup, debouncedSearch]);

    const visibleSeries = useMemo(() => {
        if (!consolidatedSeries) return [];
        return consolidatedSeries.slice(0, visibleCount);
    }, [consolidatedSeries, visibleCount]);

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleCount < consolidatedSeries.length) {
                setVisibleCount(prev => prev + 40);
            }
        }, { threshold: 0.1 });

        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [consolidatedSeries.length, visibleCount]);

    if (seriesList.length === 0 && moviesList.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <FiLayers size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nenhuma série carregada</h2>
                <p className="text-gray-500 max-w-xs">Sua playlist atual não contém séries ou filmes que possam ser agrupados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-3">
                        <FiLayers className="text-primary" /> Séries
                    </h1>
                    <p className="text-gray-500 text-sm">Mostrando {visibleSeries.length} de {consolidatedSeries.length} séries</p>
                </div>

                <div className="relative w-full md:w-96">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar série..." 
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setVisibleCount(40);
                        }}
                        className="glass-input pl-12 w-full py-3"
                    />
                </div>
            </div>

            {/* Filters Area */}
            <CategoryFilter 
                groups={cleanedGroups} 
                selectedGroup={activeGroup} 
                onSelectGroup={(g) => {
                    const originalGroup = Object.keys(seriesGroups || {}).find(key => {
                        let cleaned = key.replace(/^Filmes\s*\|\s*/i, 'Séries | ');
                        const upper = cleaned.toUpperCase();
                        if (!upper.startsWith('SÉRIES |') && !upper.startsWith('SERIES |')) {
                            if (upper.includes('NOVELA') || upper.includes('PROGRAMA') || upper.includes('TV SHOW')) {
                                cleaned = 'Séries | ' + cleaned;
                            }
                        }
                        return cleaned === g;
                    }) || g;

                    setSelectedSeriesGroup(originalGroup);
                    setSearchTerm('');
                    setVisibleCount(40);
                }} 
            />

            {/* Grid Area */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
                {visibleSeries.map((s, idx) => (
                    <MediaCard 
                        key={`${s.id}-${idx}`} 
                        item={s} 
                        type="series" 
                        playlist={consolidatedSeries}
                    />
                ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {visibleCount < consolidatedSeries.length && (
                <div ref={loadMoreRef} className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            )}

            {consolidatedSeries.length === 0 && (
                <div className="py-20 text-center text-gray-500 italic">
                    Nenhuma série encontrada para sua busca.
                </div>
            )}
        </div>
    );
}