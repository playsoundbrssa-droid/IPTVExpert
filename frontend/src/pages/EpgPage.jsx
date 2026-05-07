import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../stores/usePlaylistManagerStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { api } from '../services/api';
import { FiTv, FiClock, FiChevronLeft, FiChevronRight, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function EpgPage() {
    const { channelsList } = usePlaylistStore();
    const { getActivePlaylist, updatePlaylistStats } = usePlaylistManagerStore();
    const { setCurrentStream } = usePlayerStore();
    
    const [epgData, setEpgData] = useState({});
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeOffset, setTimeOffset] = useState(0);
    const [errorMsg, setErrorMsg] = useState(null);

    // Atualiza a linha de tempo a cada minuto
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchEpg = useCallback(async (showToast = false) => {
        const active = getActivePlaylist();
        if (!active) {
            setLoading(false);
            setErrorMsg('Nenhuma playlist ativa. Vá em Configurações e importe uma lista.');
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            // ESTRATÉGIA 1: Tentar buscar do cache existente
            if (active.epgCacheKey) {
                try {
                    const { data } = await api.get('/epg/grid', { params: { cacheKey: active.epgCacheKey } });
                    if (data && Object.keys(data).length > 0) {
                        setEpgData(data);
                        setLoading(false);
                        if (showToast) toast.success(`✅ EPG carregado: ${Object.keys(data).length} canais`);
                        return;
                    }
                } catch (e) {
                    console.warn('[EPG] Cache não disponível, tentando buscar do servidor...');
                }
            }

            // ESTRATÉGIA 2: Para listas Xtream, buscar direto do servidor
            if (active.type === 'xtream' && active.config?.server) {
                const { server, username, password } = active.config;
                const tid = toast.loading('Buscando guia de programação do servidor...');
                
                try {
                    const { data } = await api.get('/epg/xtream', {
                        params: { server, username, password },
                        timeout: 180000 // 3 min — EPG files podem ser enormes
                    });

                    toast.dismiss(tid);

                    if (data?.data && Object.keys(data.data).length > 0) {
                        setEpgData(data.data);
                        
                        // Salvar o cacheKey para futuras consultas
                        if (data.cacheKey) {
                            updatePlaylistStats(active.id, { epgCacheKey: data.cacheKey });
                        }
                        
                        toast.success(`✅ EPG carregado: ${data.totalChannels || Object.keys(data.data).length} canais`);
                        setLoading(false);
                        return;
                    } else {
                        toast.dismiss(tid);
                        setErrorMsg('O servidor Xtream não retornou dados de programação. Alguns provedores não oferecem EPG.');
                    }
                } catch (e) {
                    toast.dismiss(tid);
                    console.error('[EPG XTREAM] Falha:', e.message);
                    setErrorMsg(`Erro ao buscar EPG do servidor: ${e.message}`);
                }
            }

            // ESTRATÉGIA 3: Para listas M3U, tentar importar via URL de EPG configurada
            if (active.type === 'm3u' && active.epgUrl) {
                const tid = toast.loading('Importando guia de programação...');
                try {
                    const res = await api.post('/epg/import', { url: active.epgUrl, type: 'm3u' });
                    toast.dismiss(tid);
                    if (res.data?.cacheKey) {
                        updatePlaylistStats(active.id, { epgCacheKey: res.data.cacheKey });
                        // Recarregar com a nova cache
                        const { data } = await api.get('/epg/grid', { params: { cacheKey: res.data.cacheKey } });
                        if (data && Object.keys(data).length > 0) {
                            setEpgData(data);
                            toast.success(`✅ EPG importado: ${Object.keys(data).length} canais`);
                        }
                    }
                } catch (e) {
                    toast.dismiss(tid);
                    setErrorMsg('Erro ao importar EPG. Verifique a URL nas configurações.');
                }
            }

            if (Object.keys(epgData).length === 0 && !errorMsg) {
                setErrorMsg('Nenhuma programação disponível. Clique em "Atualizar EPG" para tentar novamente.');
            }
        } catch (err) {
            console.error('[EPG] Erro geral:', err);
            setErrorMsg('Erro ao carregar guia de programação.');
        } finally {
            setLoading(false);
        }
    }, [getActivePlaylist, updatePlaylistStats]);

    useEffect(() => {
        fetchEpg();
    }, [fetchEpg]);

    const handleManualSync = async () => {
        setSyncing(true);
        await fetchEpg(true);
        setSyncing(false);
    };

    const parseEpgDate = (dateStr) => {
        if (!dateStr) return null;
        const clean = dateStr.split(' ')[0]; // Remove timezone offset
        const y = clean.substring(0, 4);
        const m = clean.substring(4, 6);
        const d = clean.substring(6, 8);
        const h = clean.substring(8, 10);
        const min = clean.substring(10, 12);
        return new Date(`${y}-${m}-${d}T${h}:${min}:00`);
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

    // Mapear canais com seus programas EPG
    const channelsWithEpg = useMemo(() => {
        return channelsList.slice(0, 150).map(channel => {
            // Tentar múltiplas chaves de correspondência (tvgId, id, nome)
            const programs = epgData[channel.tvgId] 
                || epgData[channel.id] 
                || epgData[channel.name]
                || [];
            return { channel, programs };
        });
    }, [channelsList, epgData]);

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando Guia de Programação...</p>
                <p className="text-gray-600 text-xs max-w-sm text-center">Isso pode levar alguns segundos na primeira vez, pois o arquivo de programação é grande.</p>
            </div>
        );
    }

    if (channelsList.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <FiTv size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nenhum canal carregado</h2>
                <p className="text-gray-500 max-w-xs">Importe uma lista M3U ou Xtream nas configurações para ver o guia de programação.</p>
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
                            ? `${Object.keys(epgData).length} canais com programação disponível`
                            : 'Consulte o que está passando e o que vem a seguir.'
                        }
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleManualSync}
                        disabled={syncing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                            syncing 
                                ? 'bg-primary/20 border-primary/40 text-primary' 
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <FiRefreshCw className={syncing ? 'animate-spin' : ''} size={14} />
                        {syncing ? 'Atualizando...' : 'Atualizar EPG'}
                    </button>

                    <button 
                        onClick={() => setTimeOffset(prev => prev - 2)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95"
                    >
                        <FiChevronLeft />
                    </button>
                    <button 
                        onClick={() => setTimeOffset(0)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Agora
                    </button>
                    <button 
                        onClick={() => setTimeOffset(prev => prev + 2)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95"
                    >
                        <FiChevronRight />
                    </button>
                </div>
            </div>

            {/* Mensagem de erro ou guia vazio */}
            {errorMsg && Object.keys(epgData).length === 0 && (
                <div className="flex items-center gap-4 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <FiAlertCircle className="text-yellow-500 shrink-0" size={24} />
                    <div>
                        <p className="text-yellow-400 font-bold text-sm">{errorMsg}</p>
                        <p className="text-gray-500 text-xs mt-1">Tente clicar em "Atualizar EPG" acima.</p>
                    </div>
                </div>
            )}

            {/* EPG Grid Container */}
            <div className="flex-1 min-h-0 bg-surface/20 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                {/* Header: Times */}
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

                {/* Body: Channels and Programs */}
                <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    {channelsWithEpg.map(({ channel, programs }) => (
                        <div key={channel.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            {/* Channel Info */}
                            <div 
                                onClick={() => handleChannelClick(channel)}
                                className="w-48 lg:w-64 flex-shrink-0 p-4 border-r border-white/10 flex items-center gap-3 cursor-pointer sticky left-0 bg-[#121212] z-10"
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

                            {/* Programs Timeline */}
                            <div className="flex-1 flex overflow-x-auto custom-scrollbar-hide relative py-2">
                                {/* Linha de "Agora" */}
                                {timeOffset === 0 && (
                                    <div 
                                        className="absolute top-0 bottom-0 w-px bg-primary z-10 shadow-[0_0_10px_rgba(108,92,231,0.5)]"
                                        style={{ left: `${(currentTime.getMinutes() / 60) * 200}px` }}
                                    />
                                )}

                                {programs.length > 0 ? (
                                    programs.map((prog, idx) => {
                                        const start = parseEpgDate(prog.start);
                                        const stop = parseEpgDate(prog.stop);
                                        if (!start || !stop) return null;

                                        const gridStart = timeSlots[0].getTime();
                                        const progStart = start.getTime();
                                        const progStop = stop.getTime();

                                        if (progStop < gridStart || progStart > timeSlots[timeSlots.length - 1].getTime() + 3600000) return null;

                                        const left = Math.max(0, (progStart - gridStart) / 3600000) * 200;
                                        const width = ((progStop - Math.max(progStart, gridStart)) / 3600000) * 200;

                                        const isNow = new Date() >= start && new Date() <= stop;

                                        return (
                                            <div 
                                                key={idx}
                                                className={`absolute top-2 bottom-2 border rounded-xl p-3 flex flex-col justify-center transition-all cursor-default select-none ${
                                                    isNow 
                                                        ? 'bg-primary/20 border-primary/40 shadow-lg shadow-primary/10' 
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                                style={{ left, width: Math.max(width - 4, 50) }}
                                                title={`${prog.title}\n${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${stop.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n${prog.desc || ''}`}
                                            >
                                                <span className={`text-[10px] font-black truncate uppercase tracking-tight ${isNow ? 'text-primary' : 'text-white'}`}>
                                                    {prog.title}
                                                </span>
                                                <span className="text-[8px] font-bold text-gray-500 uppercase mt-0.5">
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
                    ))}
                </div>
            </div>
        </div>
    );
}
