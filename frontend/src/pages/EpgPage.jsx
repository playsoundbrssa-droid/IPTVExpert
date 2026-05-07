import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../stores/usePlaylistManagerStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { api } from '../services/api';
import { FiTv, FiClock, FiChevronLeft, FiChevronRight, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function EpgPage() {
    const { channelsList } = usePlaylistStore();
    const { getActivePlaylist } = usePlaylistManagerStore();
    const { setCurrentStream } = usePlayerStore();
    
    const [epgData, setEpgData] = useState({});
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeOffset, setTimeOffset] = useState(0);
    const [loadedIds, setLoadedIds] = useState(new Set());
    const [errorMsg, setErrorMsg] = useState(null);

    // Relógio
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Pegar os primeiros 50 canais para exibir
    const visibleChannels = useMemo(() => {
        return channelsList.slice(0, 50);
    }, [channelsList]);

    // Extrair stream_id do ID do canal (ex: "xtream_live_12345" => "12345")
    const getStreamId = useCallback((channel) => {
        if (channel.tvgId) return channel.tvgId;
        const parts = channel.id?.split('_');
        if (parts && parts.length >= 3) return parts[parts.length - 1];
        return null;
    }, []);

    // Buscar EPG para os canais visíveis
    const fetchEpgForChannels = useCallback(async (channels, forceRefresh = false) => {
        const active = getActivePlaylist();
        if (!active) {
            setErrorMsg('Nenhuma playlist ativa.');
            return;
        }

        // Filtrar canais que já foram carregados
        const toLoad = forceRefresh 
            ? channels 
            : channels.filter(c => !loadedIds.has(c.id));
        
        if (toLoad.length === 0) return;

        // Para listas Xtream: usar a API short_epg
        if (active.type === 'xtream' && active.config?.server) {
            const { server, username, password } = active.config;
            const streamIds = toLoad
                .map(c => getStreamId(c))
                .filter(Boolean);

            if (streamIds.length === 0) {
                setErrorMsg('Nenhum canal com ID de stream encontrado.');
                return;
            }

            setLoading(true);
            setErrorMsg(null);

            try {
                // Buscar em lotes de 20
                const batchSize = 20;
                const allData = {};

                for (let i = 0; i < streamIds.length; i += batchSize) {
                    const batch = streamIds.slice(i, i + batchSize);
                    const { data } = await api.get('/epg/xtream', {
                        params: {
                            server,
                            username,
                            password,
                            streamIds: batch.join(',')
                        },
                        timeout: 30000
                    });

                    if (data?.data) {
                        Object.assign(allData, data.data);
                    }
                }

                if (Object.keys(allData).length > 0) {
                    setEpgData(prev => ({ ...prev, ...allData }));
                    setLoadedIds(prev => {
                        const next = new Set(prev);
                        toLoad.forEach(c => next.add(c.id));
                        return next;
                    });
                } else {
                    setErrorMsg('Nenhuma programação disponível neste servidor.');
                }
            } catch (err) {
                console.error('[EPG] Erro:', err);
                setErrorMsg('Erro ao buscar programação. Tente novamente.');
            } finally {
                setLoading(false);
            }
        } else {
            // Para listas M3U: tentar via cache
            if (active.epgCacheKey) {
                setLoading(true);
                try {
                    const { data } = await api.get('/epg/grid', { 
                        params: { cacheKey: active.epgCacheKey } 
                    });
                    if (data && Object.keys(data).length > 0) {
                        setEpgData(data);
                    } else {
                        setErrorMsg('Nenhuma programação no cache. Importe um EPG nas configurações.');
                    }
                } catch (e) {
                    setErrorMsg('Erro ao buscar EPG do cache.');
                } finally {
                    setLoading(false);
                }
            } else {
                setErrorMsg('Configure uma URL de EPG nas Configurações para ver a programação.');
            }
        }
    }, [getActivePlaylist, getStreamId, loadedIds]);

    // Carregar EPG ao montar
    useEffect(() => {
        if (visibleChannels.length > 0) {
            fetchEpgForChannels(visibleChannels);
        }
    }, [visibleChannels]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRefresh = async () => {
        setLoadedIds(new Set());
        setEpgData({});
        await fetchEpgForChannels(visibleChannels, true);
        toast.success('EPG atualizado!');
    };

    const parseEpgDate = (dateStr) => {
        if (!dateStr) return null;
        // Formato Xtream: "2024-01-15 20:00:00" ou EPG: "20240115200000"
        try {
            if (dateStr.includes('-')) {
                return new Date(dateStr);
            }
            const clean = dateStr.split(' ')[0];
            if (clean.length < 12) return null;
            const y = clean.substring(0, 4), m = clean.substring(4, 6);
            const d = clean.substring(6, 8), h = clean.substring(8, 10);
            const min = clean.substring(10, 12);
            return new Date(`${y}-${m}-${d}T${h}:${min}:00`);
        } catch (e) { return null; }
    };

    const parseTimestamp = (ts) => {
        if (!ts) return null;
        return new Date(parseInt(ts) * 1000);
    };

    const timeSlots = useMemo(() => {
        const slots = [];
        const start = new Date(currentTime);
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() + timeOffset);
        for (let i = 0; i < 24; i++) {
            const slot = new Date(start);
            slot.setHours(start.getHours() + i);
            slots.push(slot);
        }
        return slots;
    }, [currentTime, timeOffset]);

    const handleChannelClick = (channel) => {
        setCurrentStream(channel, channelsList);
    };

    if (channelsList.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <FiTv size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nenhum canal carregado</h2>
                <p className="text-gray-500 max-w-xs">Importe uma lista nas configurações.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-3">
                        <FiClock className="text-primary" /> Guia de Programação
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {Object.keys(epgData).length > 0 
                            ? `${Object.keys(epgData).length} canais com programação`
                            : loading ? 'Carregando...' : 'Consulte o que está passando e o que vem a seguir.'
                        }
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleRefresh}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                            loading 
                                ? 'bg-primary/20 border-primary/40 text-primary' 
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} size={14} />
                        {loading ? 'Carregando...' : 'Atualizar EPG'}
                    </button>

                    <button onClick={() => setTimeOffset(prev => prev - 2)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
                        <FiChevronLeft />
                    </button>
                    <button onClick={() => setTimeOffset(0)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
                        Agora
                    </button>
                    <button onClick={() => setTimeOffset(prev => prev + 2)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
                        <FiChevronRight />
                    </button>
                </div>
            </div>

            {/* Erro */}
            {errorMsg && Object.keys(epgData).length === 0 && !loading && (
                <div className="flex items-center gap-4 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <FiAlertCircle className="text-yellow-500 shrink-0" size={24} />
                    <p className="text-yellow-400 font-bold text-sm">{errorMsg}</p>
                </div>
            )}

            {/* Loading */}
            {loading && Object.keys(epgData).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Buscando programação dos canais...</p>
                </div>
            )}

            {/* EPG Grid */}
            {(Object.keys(epgData).length > 0 || !loading) && (
                <div className="flex-1 min-h-0 bg-surface/20 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex border-b border-white/10 bg-black/40 sticky top-0 z-20">
                        <div className="w-48 lg:w-64 flex-shrink-0 p-4 font-black uppercase text-[10px] tracking-widest text-gray-500 border-r border-white/10">
                            Canais
                        </div>
                        <div className="flex-1 flex overflow-x-hidden">
                            {timeSlots.map((slot, i) => (
                                <div key={i} className="min-w-[200px] flex-shrink-0 p-4 border-r border-white/5 text-center text-xs font-bold text-gray-400">
                                    {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        {visibleChannels.map((channel) => {
                            const streamId = getStreamId(channel);
                            const programs = epgData[streamId] || epgData[channel.tvgId] || epgData[channel.id] || [];
                            
                            return (
                                <div key={channel.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                    <div 
                                        onClick={() => handleChannelClick(channel)}
                                        className="w-48 lg:w-64 flex-shrink-0 p-4 border-r border-white/10 flex items-center gap-3 cursor-pointer sticky left-0 bg-[#0a0a0b] z-10"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden border border-white/5">
                                            {channel.logo ? (
                                                <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                                            ) : (
                                                <FiTv className="text-gray-600" />
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-gray-300 group-hover:text-primary transition-colors truncate">
                                            {channel.name}
                                        </span>
                                    </div>

                                    <div className="flex-1 flex overflow-x-auto no-scrollbar relative py-2">
                                        {programs.length > 0 ? (
                                            programs.map((prog, idx) => {
                                                const start = parseTimestamp(prog.start_timestamp) || parseEpgDate(prog.start);
                                                const stop = parseTimestamp(prog.stop_timestamp) || parseEpgDate(prog.stop);
                                                if (!start || !stop) return null;

                                                const gridStart = timeSlots[0].getTime();
                                                const progStart = start.getTime();
                                                const progStop = stop.getTime();

                                                if (progStop < gridStart || progStart > timeSlots[timeSlots.length - 1].getTime() + 3600000) return null;

                                                const left = Math.max(0, (progStart - gridStart) / 3600000) * 200;
                                                const width = ((Math.min(progStop, timeSlots[timeSlots.length - 1].getTime() + 3600000) - Math.max(progStart, gridStart)) / 3600000) * 200;
                                                const isNow = new Date() >= start && new Date() <= stop;

                                                return (
                                                    <div 
                                                        key={idx}
                                                        className={`absolute top-2 bottom-2 border rounded-xl p-3 flex flex-col justify-center select-none ${
                                                            isNow 
                                                                ? 'bg-primary/20 border-primary/40 shadow-lg shadow-primary/10' 
                                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                        }`}
                                                        style={{ left, width: Math.max(width - 4, 50) }}
                                                        title={`${prog.title}\n${prog.desc || ''}`}
                                                    >
                                                        <span className={`text-[10px] font-black truncate uppercase ${isNow ? 'text-primary' : 'text-white'}`}>
                                                            {prog.title || 'Sem título'}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-gray-500 mt-0.5">
                                                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {stop.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">
                                                Sem Programação
                                            </div>
                                        )}
                                        <div className="min-w-[4800px] h-full" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
