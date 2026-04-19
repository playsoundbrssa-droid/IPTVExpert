import React, { useMemo, useState } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import MediaCard from '../components/Media/MediaCard';
import { FiHeart, FiSearch } from 'react-icons/fi';

export default function FavoritesPage() {
    const { favorites } = usePlaylistStore();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFavorites = useMemo(() => {
        if (!searchTerm) return favorites;
        const lowTerm = searchTerm.toLowerCase();
        return favorites.filter(f => f.name.toLowerCase().includes(lowTerm));
    }, [favorites, searchTerm]);

    if (favorites.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 text-red-500">
                    <FiHeart size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Sua lista está vazia</h2>
                <p className="text-gray-500 max-w-xs">Adicione canais, filmes ou séries aos favoritos para acessá-los rapidamente aqui.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-1">Favoritos</h1>
                    <p className="text-gray-500 text-sm">{favorites.length} itens salvos</p>
                </div>

                <div className="relative w-full md:w-96">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar nos favoritos..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-input pl-12 w-full py-3"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {filteredFavorites.map(item => (
                    <MediaCard key={item.id} item={item} type="favorite" />
                ))}
            </div>

            {filteredFavorites.length === 0 && searchTerm && (
                <div className="py-20 text-center text-gray-500 italic">
                    Nenhum favorito corresponde à sua busca.
                </div>
            )}
        </div>
    );
}