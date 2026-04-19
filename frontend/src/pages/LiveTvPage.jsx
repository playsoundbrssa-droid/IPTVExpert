import React, { useState, useMemo } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import MediaCard from '../components/Media/MediaCard';
import CategoryFilter from '../components/Media/CategoryFilter';
import { FiSearch, FiTv, FiRefreshCw } from 'react-icons/fi';
import { usePlaylistManagerStore } from '../stores/usePlaylistManagerStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function LiveTvPage() {
    const { channelsList, channelsGroups, selectedLiveGroup, setSelectedLiveGroup } = usePlaylistStore();
    const { getActivePlaylist, updatePlaylistStats } = usePlaylistManagerStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(50);
    const [isSyncing, setIsSyncing] = useState(false);

    // Debounce search term
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const filteredChannels = useMemo(() => {
        let list = (selectedLiveGroup ? channelsGroups[selectedLiveGroup] : channelsList) || [];

        if (debouncedSearch) {
            const lowTerm = debouncedSearch.toLowerCase();
            if (list.length > 50000 && debouncedSearch.length < 3) return [];
            return list.filter(c => c.name.toLowerCase().includes(lowTerm));
        }

        return list;
    }, [channelsList, channelsGroups, selectedLiveGroup, debouncedSearch]);

    const visibleChannels = useMemo(() => {
        if (!filteredChannels) return [];
        return filteredChannels.slice(0, visibleCount).map(item => ({ ...item, type: 'channel' }));
    }, [filteredChannels, visibleCount]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 50);
    };

    const handleQuickSyncEpg = async () => {
        const active = getActivePlaylist();
        if (!active) return toast.error('Nenhuma playlist ativa.');
        
        const url = active.epgUrl;
        if (!url && active.type === 'm3u') {
            return toast.error('Configure uma URL de EPG nas Configurações primeiro.');
        }

        setIsSyncing(true);
        const tid = toast.loading('Atualizando programação...');
        try {
            const res = await api.post('/epg/import', { url: url || active.config.server }); 
            updatePlaylistStats(active.id, { epgCacheKey: res.data.cacheKey });
            toast.dismiss(tid);
            toast.success(`✅ Programação atualizada!`);
        } catch (err) {
            toast.dismiss(tid);
            toast.error('Falha ao sincronizar EPG.');
        } finally {
            setIsSyncing(false);
        }
    };

    if (channelsList.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <FiTv size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nenhum canal carregado</h2>
                <p className="text-gray-500 max-w-xs">Importe uma lista M3U ou conecte um servidor Xtream para começar.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-3">
                            <FiTv className="text-primary" /> Canais de TV
                        </h1>
                        <p className="text-gray-500 text-sm">Mostrando {visibleChannels.length} de {filteredChannels.length} canais</p>
                    </div>
                    
                    <button 
                        onClick={handleQuickSyncEpg}
                        disabled={isSyncing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${isSyncing ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'}`}
                    >
                        <FiRefreshCw className={isSyncing ? 'animate-spin' : ''} size={14} />
                        {isSyncing ? 'Sincronizando...' : 'Recarregar EPG'}
                    </button>
                </div>

                <div className="relative w-full md:w-96">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Pesquisar canal..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setVisibleCount(50);
                        }}
                        className="glass-input pl-12 w-full py-3"
                    />
                </div>
            </div>

            {/* Filters Area */}
            <CategoryFilter
                groups={channelsGroups}
                selectedGroup={selectedLiveGroup}
                onSelectGroup={(g) => {
                    setSelectedLiveGroup(g);
                    setSearchTerm('');
                    setVisibleCount(50);
                }}
            />

            {/* Grid Area */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {visibleChannels.map((channel, idx) => (
                    <MediaCard 
                        key={`${channel.id}-${idx}`} 
                        item={channel} 
                        type="channel" 
                        playlist={filteredChannels}
                    />
                ))}
            </div>

            {visibleCount < filteredChannels.length && (
                <div className="flex justify-center pt-8 pb-12">
                    <button
                        onClick={handleLoadMore}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-xl"
                    >
                        Carregar Mais Canais (+50)
                    </button>
                </div>
            )}

            {filteredChannels.length === 0 && (
                <div className="py-20 text-center text-gray-500 italic">
                    Nenhum canal encontrado para sua busca.
                </div>
            )}
        </div>
    );
}