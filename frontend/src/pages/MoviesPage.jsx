import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import MediaCard from '../components/Media/MediaCard';
import CategoryFilter from '../components/Media/CategoryFilter';
import { FiSearch, FiFilm } from 'react-icons/fi';

export default function MoviesPage() {
    const { moviesList, moviesGroups, selectedMovieGroup, setSelectedMovieGroup } = usePlaylistStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(60);
    const loadMoreRef = useRef(null);

    // Prevenção de etiquetas erradas (Séries | em Filmes) vindo do provedor
    const cleanedGroups = useMemo(() => {
        const cleaned = {};
        Object.keys(moviesGroups || {}).forEach(key => {
            const newKey = key.replace(/^Séries\s*\|\s*/i, 'Filmes | ');
            cleaned[newKey] = moviesGroups[key];
        });
        return cleaned;
    }, [moviesGroups]);

    // Ajuste do grupo selecionado para refletir a chave limpa se necessário
    const activeGroup = useMemo(() => {
        if (!selectedMovieGroup) return null;
        return selectedMovieGroup.replace(/^Séries\s*\|\s*/i, 'Filmes | ');
    }, [selectedMovieGroup]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const filteredMovies = useMemo(() => {
        let list = (selectedMovieGroup ? moviesGroups[selectedMovieGroup] : moviesList) || [];
        
        if (debouncedSearch) {
            const lowTerm = debouncedSearch.toLowerCase();
            if (list.length > 50000 && debouncedSearch.length < 3) return [];
            return list.filter(m => m.name.toLowerCase().includes(lowTerm));
        }
        
        return list;
    }, [moviesList, moviesGroups, selectedMovieGroup, debouncedSearch]);

    const visibleMovies = useMemo(() => {
        if (!filteredMovies) return [];
        return filteredMovies.slice(0, visibleCount).map(item => ({ ...item, type: 'movie' }));
    }, [filteredMovies, visibleCount]);

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleCount < filteredMovies.length) {
                setVisibleCount(prev => prev + 60);
            }
        }, { threshold: 0.1 });

        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [filteredMovies.length, visibleCount]);

    if (moviesList.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <FiFilm size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nenhum filme carregado</h2>
                <p className="text-gray-500 max-w-xs">Sua playlist atual não contém filmes identificadas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-3">
                        <FiFilm className="text-primary" /> Filmes
                    </h1>
                    <p className="text-gray-500 text-sm">Mostrando {visibleMovies.length} de {filteredMovies.length} filmes</p>
                </div>

                <div className="relative w-full md:w-96">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar filme..." 
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setVisibleCount(60);
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
                    const originalGroup = Object.keys(moviesGroups || {}).find(key => 
                        key.replace(/^Séries\s*\|\s*/i, 'Filmes | ') === g
                    ) || g;

                    setSelectedMovieGroup(originalGroup);
                    setSearchTerm('');
                    setVisibleCount(60);
                }} 
            />

            {/* Grid Area */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6">
                {visibleMovies.map((m, idx) => (
                    <MediaCard 
                        key={`${m.id}-${idx}`} 
                        item={m} 
                        type="movie" 
                        playlist={filteredMovies}
                    />
                ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {visibleCount < filteredMovies.length && (
                <div ref={loadMoreRef} className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            )}

            {filteredMovies.length === 0 && (
                <div className="py-20 text-center text-gray-500 italic">
                    Nenhum filme encontrado para sua busca.
                </div>
            )}
        </div>
    );
}