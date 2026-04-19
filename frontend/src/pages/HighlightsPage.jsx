import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiTv, FiFilm, FiVideo } from 'react-icons/fi';
import { statsApi } from '../api/stats';
import MediaCard from '../components/Media/MediaCard';

export default function HighlightsPage() {
    const [highlights, setHighlights] = useState({ channels: [], movies: [], series: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHighlights = async () => {
            const data = await statsApi.getHighlights();
            setHighlights(data);
            setLoading(false);
        };
        fetchHighlights();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-gray-400 font-medium">Carregando destaques...</span>
                </div>
            </div>
        );
    }

    const Section = ({ title, icon: Icon, items, type }) => {
        if (!items || items.length === 0) return null;

        return (
            <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="text-primary text-xl" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">{title}</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Mais acessados pela comunidade</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {items.map((item, idx) => (
                        <div key={item.media_id} className="relative group">
                            {/* Popularity Badge */}
                            <div className="absolute -top-2 -left-2 z-10 px-2 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-lg shadow-lg flex items-center gap-1 animate-bounce">
                                <FiTrendingUp size={10} /> #{idx + 1}
                            </div>
                            <MediaCard 
                                item={{
                                    id: item.media_id,
                                    name: item.name,
                                    logo: item.logo,
                                    group: item.group_name,
                                    streamUrl: item.stream_url
                                }} 
                                type={type} 
                                playlist={items.map(i => ({
                                    id: i.media_id,
                                    name: i.name,
                                    logo: i.logo,
                                    group: i.group_name,
                                    streamUrl: i.stream_url
                                }))}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const hasAny = highlights.channels.length > 0 || highlights.movies.length > 0 || highlights.series.length > 0;

    return (
        <div className="animate-fade-in pb-10">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-5xl font-black text-white mb-2 italic tracking-tighter">
                    DESTAQUES <span className="text-primary">XP</span>
                </h1>
                <p className="text-gray-400 font-medium max-w-2xl">
                    Descubra o que é tendência no IPTV Expert. Os conteúdos mais assistidos e acessados 
                    nos últimos dias, atualizados em tempo real.
                </p>
            </div>

            {!hasAny ? (
                <div className="mt-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiTrendingUp className="text-gray-600 text-3xl" />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Ainda sem tendências</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Comece a assistir seus canais e filmes favoritos para que eles apareçam aqui nos próximos destaques!
                    </p>
                </div>
            ) : (
                <>
                    <Section title="Canais em Alta" icon={FiTv} items={highlights.channels} type="channel" />
                    <Section title="Filmes de Sucesso" icon={FiFilm} items={highlights.movies} type="movie" />
                    <Section title="Séries Procuradas" icon={FiVideo} items={highlights.series} type="series" />
                </>
            )}
        </div>
    );
}
