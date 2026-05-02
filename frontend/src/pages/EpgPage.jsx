import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../stores/usePlaylistManagerStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { api } from '../services/api';
import { FiTv, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function EpgPage() {
    const { channelsList } = usePlaylistStore();
    const { getActivePlaylist } = usePlaylistManagerStore();
    const { setCurrentStream } = usePlayerStore();
    
    const [epgData, setEpgData] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeOffset, setTimeOffset] = useState(0); // em horas

    const scrollContainerRef = useRef(null);

    // Atualiza a linha de tempo a cada minuto
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchEpg = async () => {
            const active = getActivePlaylist();
            if (!active || !active.epgCacheKey) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await api.get('/epg/grid', { params: { cacheKey: active.epgCacheKey } });
                setEpgData(data || {});
            } catch (err) {
                console.error('[EPG] Erro ao carregar grade:', err);
                toast.error('Erro ao carregar guia de programação.');
            } finally {
                setLoading(false);
            }
        };

        fetchEpg();
    }, [getActivePlaylist]);

    const parseEpgDate = (dateStr) => {
        if (!dateStr) return null;
        const y = dateStr.substring(0, 4);
        const m = dateStr.substring(4, 6);
        const d = dateStr.substring(6, 8);
        const h = dateStr.substring(8, 10);
        const min = dateStr.substring(10, 12);
        const s = dateStr.substring(12, 14);
        return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
    };

    // Gera as horas do cabeçalho (ex: 24h a partir de agora ou offset)
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

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4 animate-pulse">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando Guia...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center gap-3">
                        <FiClock className="text-primary" /> Guia de Programação
                    </h1>
                    <p className="text-gray-500 text-sm">Consulte o que está passando e o que vem a seguir.</p>
                </div>

                <div className="flex items-center gap-2">
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

            {/* EPG Grid Container */}
            <div className="flex-1 min-h-0 bg-surface/20 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                {/* Header: Times */}
                <div className="flex border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-20">
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
                    {channelsList.slice(0, 100).map((channel) => {
                        const programs = epgData[channel.tvgId] || epgData[channel.id] || [];
                        
                        return (
                            <div key={channel.id} className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                {/* Channel Info */}
                                <div 
                                    onClick={() => handleChannelClick(channel)}
                                    className="w-48 lg:w-64 flex-shrink-0 p-4 border-r border-white/10 flex items-center gap-3 cursor-pointer sticky left-0 bg-[#121212] z-10"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden border border-white/5">
                                        {channel.logo ? (
                                            <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" />
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
                                            className="absolute top-0 bottom-0 w-px bg-primary z-10 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                            style={{ left: `${(currentTime.getMinutes() / 60) * 200}px` }}
                                        />
                                    )}

                                    {programs.length > 0 ? (
                                        programs.map((prog, idx) => {
                                            const start = parseEpgDate(prog.start);
                                            const stop = parseEpgDate(prog.stop);
                                            if (!start || !stop) return null;

                                            // Cálculo de posição e largura baseado nos slots
                                            const gridStart = timeSlots[0].getTime();
                                            const progStart = start.getTime();
                                            const progStop = stop.getTime();

                                            // Só renderiza se estiver no intervalo visível
                                            if (progStop < gridStart || progStart > timeSlots[timeSlots.length - 1].getTime() + 3600000) return null;

                                            const left = Math.max(0, (progStart - gridStart) / 3600000) * 200;
                                            const width = ((progStop - Math.max(progStart, gridStart)) / 3600000) * 200;

                                            return (
                                                <div 
                                                    key={idx}
                                                    className="absolute top-2 bottom-2 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-center hover:bg-primary/20 hover:border-primary/30 transition-all cursor-default select-none group/prog"
                                                    style={{ left, width: Math.max(width - 4, 40) }}
                                                    title={`${prog.title}\n${new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(stop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                >
                                                    <span className="text-[10px] font-black text-white truncate uppercase tracking-tight">
                                                        {prog.title}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase mt-0.5">
                                                        {new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">
                                            Programação Indisponível
                                        </div>
                                    )}
                                    <div className="min-w-[4800px] h-full" /> {/* Spacer para scroll */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
