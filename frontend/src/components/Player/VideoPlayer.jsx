import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import mpegjs from 'mpegts.js';
import { 
    FiX, FiPlay, FiPause, FiMaximize, FiVolume2, 
    FiVolumeX, FiRefreshCw, FiChevronLeft, FiChevronRight, 
    FiHeart, FiDownload, FiMinimize2, FiMoreVertical,
    FiSkipBack, FiSkipForward
} from 'react-icons/fi';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const mpegPlayerRef = useRef(null);
    const containerRef = useRef(null);
    
    // Global Stores
    const { currentStream, setCurrentStream, isPlaying, togglePlay } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    
    // Player UI States
    const [isMinimized, setIsMinimized] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState(null);
    const [volume, setVolume] = useState(parseFloat(localStorage.getItem('player_volume')) || 1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [useProxy, setUseProxy] = useState(false);
    
    // Drag State for Floating Mode
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    const isFavorite = useMemo(() => 
        currentStream ? favorites.some(f => f.id === currentStream.id) : false
    , [favorites, currentStream]);

    // Limpeza de recursos
    const cleanUp = useCallback(() => {
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        if (mpegPlayerRef.current) { mpegPlayerRef.current.destroy(); mpegPlayerRef.current = null; }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
        }
    }, []);

    // Construção da URL (Com Proxy se necessário)
    const getStreamUrl = useCallback(() => {
        if (!currentStream) return '';
        const url = currentStream.streamUrl || currentStream.url;
        if (!url) return '';
        
        const isMixedContent = window.location.protocol === 'https:' && url.startsWith('http://');
        if ((isMixedContent || useProxy) && !url.includes('/api/proxy/stream')) {
            let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            if (!apiBase.endsWith('/api')) apiBase += '/api';
            return `${apiBase}/proxy/stream?url=${encodeURIComponent(url)}`;
        }
        return url;
    }, [currentStream, useProxy]);

    // Inicialização da Stream
    const initPlayer = useCallback(async (attempt = 0) => {
        if (!currentStream || !videoRef.current) return;
        
        const streamUrl = getStreamUrl();
        const isHls = streamUrl.toLowerCase().includes('.m3u8') || streamUrl.includes('type=m3u8');
        const isTs = streamUrl.toLowerCase().includes('.ts') || streamUrl.includes('output=ts');
        
        cleanUp();
        setError(null);
        setIsBuffering(true);

        console.log(`[ANTIGRAVITY PLAYER] Iniciando: ${currentStream.name} (Tentativa ${attempt})`);

        // 1. Mobile (iOS/Safari) - Suporte Nativo HLS é melhor
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isHls && (videoRef.current.canPlayType('application/vnd.apple.mpegurl') || isMobile)) {
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch(() => setIsMuted(true));
        }
        // 2. Desktop HLS.js
        else if (isHls && Hls.isSupported()) {
            const hls = new Hls({ 
                enableWorker: true, 
                lowLatencyMode: true,
                manifestLoadingMaxRetry: 5
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, () => videoRef.current.play().catch(() => {}));
            hls.on(Hls.Events.ERROR, (e, data) => {
                if (data.fatal && !useProxy) setUseProxy(true);
                else if (data.fatal) setError("Erro fatal na stream. Tente outro canal.");
            });
        }
        // 3. MPEG-TS (mpegts.js)
        else if (isTs && mpegjs.isSupported()) {
            try {
                const mpeg = mpegjs.createPlayer({ type: 'mse', url: streamUrl, isLive: true });
                mpeg.attachMediaElement(videoRef.current);
                mpeg.load();
                mpeg.play().catch(() => {});
                mpegPlayerRef.current = mpeg;
            } catch (err) {
                setError("O formato TS não é suportado neste navegador.");
            }
        }
        // 4. Fallback Direto
        else {
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch(() => {});
        }
    }, [currentStream, getStreamUrl, cleanUp, useProxy]);

    useEffect(() => {
        initPlayer();
        return cleanUp;
    }, [currentStream, useProxy, initPlayer]);

    // Controles de Visibilidade
    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            setShowControls(true);
            clearTimeout(timeout);
            if (!isMinimized) timeout = setTimeout(() => setShowControls(false), 3000);
        };
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, [isMinimized]);

    // Drag & Drop Logic (Para o Modo Anti-Gravidade)
    const handleDragStart = (e) => {
        if (!isMinimized) return;
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStart.current = { x: clientX, y: clientY, initialX: position.x, initialY: position.y };
    };

    useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const dx = dragStart.current.x - clientX;
            const dy = dragStart.current.y - clientY;
            
            setPosition({
                x: Math.max(10, Math.min(window.innerWidth - 100, dragStart.current.initialX + dx)),
                y: Math.max(10, Math.min(window.innerHeight - 100, dragStart.current.initialY + dy))
            });
        };
        const handleEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging]);

    if (!currentStream) return null;

    return (
        <div 
            ref={containerRef}
            className={`fixed z-[999] bg-black shadow-2xl transition-all duration-500 ease-out flex items-center justify-center
                ${isMinimized ? 'w-72 h-40 rounded-2xl border border-white/10' : 'inset-0'}
                ${isDragging ? 'scale-105 cursor-grabbing' : ''}`}
            style={isMinimized ? { bottom: position.y, right: position.x } : {}}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            <video 
                ref={videoRef}
                className="w-full h-full object-contain"
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onClick={() => isMinimized ? setIsMinimized(false) : togglePlay()}
                playsInline
                autoPlay
            />

            {/* Overlays e Loading */}
            {isBuffering && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <FiRefreshCw className="w-10 h-10 text-primary animate-spin" />
                </div>
            )}

            {/* Erro UI */}
            {error && (
                        </button>

                        <button 
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                            className="text-white/80 hover:text-white transition-all transform hover:scale-110 active:scale-75 flex items-center justify-center"
                        >
                            {isPlaying ? <FiPause className="w-10 h-10 lg:w-14 lg:h-14" /> : <FiPlay className="w-10 h-10 lg:w-14 lg:h-14 ml-1 lg:ml-2" />}
                        </button>

                        <button onClick={playNext} className="text-white/80 hover:text-white transition-all transform hover:scale-110 active:scale-75">
                            <FiSkipForward className="w-6 h-6 lg:w-8 lg:h-8" />
                        </button>
                    </div>
                </div>

                {/* 2. LINHA CENTRAL: BARRA DE PROGRESSO (VERMELHA) */}
                <div className="relative group/progress max-w-4xl mx-auto mb-4 lg:mb-8">
                    {/* Barra de Fundo */}
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-white transition-all duration-150 relative"
                            style={{ width: `${Number.isFinite(duration) ? (currentTime / (duration || 1)) * 100 : 0}%` }}
                        >
                            {/* Ponto Seeker */}
                            {Number.isFinite(duration) && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-2xl opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                            )}
                        </div>
                    </div>
                    {/* Scrubbing for Movies/Series */}
                    {duration > 0 && (
                        <input 
                            type="range" min="0" max={duration} step="1" value={currentTime}
                            onChange={(e) => {
                                const time = parseFloat(e.target.value);
                                videoRef.current.currentTime = time;
                                setCurrentTime(time);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    )}
                    {/* Time labels para VOD */}
                    {duration > 0 && Number.isFinite(duration) && (
                        <div className="flex justify-between mt-2">
                             <span className="text-[10px] font-bold text-gray-500 tracking-tighter">
                                {formatTime(currentTime)}
                             </span>
                             <span className="text-[10px] font-bold text-gray-500 tracking-tighter">
                                {formatTime(duration)}
                             </span>
                        </div>
                    )}
                </div>

                {/* 3. LINHA INFERIOR: AÇÕES EXTRAS (SHARE, COMMENT, DOWNLOAD) */}
                <div className="flex items-center justify-center gap-4 lg:gap-10">
                    {/* Controle de Volume Profissional (Movido para Baixo) */}
                    <div className="hidden lg:flex items-center gap-3 w-32 group/vol mr-4">
                        <button 
                            onClick={() => {
                                if (videoRef.current) {
                                    videoRef.current.muted = !isMuted;
                                    setIsMuted(!isMuted);
                                }
                            }} 
                            className="text-white/60 hover:text-white transition-all"
                        >
                            {isMuted || volume === 0 ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
                        </button>
                        <input 
                            type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (videoRef.current) {
                                    videoRef.current.volume = val;
                                    setVolume(val);
                                    if (val > 0) {
                                        videoRef.current.muted = false;
                                        setIsMuted(false);
                                    }
                                }
                            }}
                            className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
                        />
                    </div>



                    <button 
                        onClick={() => {
                            const rawUrl = stream.streamUrl || stream.url;
                            navigator.clipboard.writeText(rawUrl);
                            toast.success('Link copiado!');
                        }}
                        className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all group"
                    >
                        <FiShare2 size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Share</span>
                    </button>

                    <button 
                        onClick={() => { setShowComments(!showComments); setShowFullEpg(false); }}
                        className={`flex flex-col items-center gap-1 transition-all group ${showComments ? 'text-white' : 'text-white/60 hover:text-white'}`}
                    >
                        <FiMessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Comment</span>
                    </button>

                    <button 
                        onClick={handleCast}
                        className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all group"
                    >
                        <FiAirplay size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Cast</span>
                    </button>

                    <button 
                        onClick={handleDownload}
                        className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all group"
                    >
                        <FiDownload size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Download</span>
                    </button>

                    <button 
                        onClick={handleFullscreen}
                        className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-all group"
                    >
                        {isFullscreen ? <FiMinimize2 size={18} className="group-hover:scale-110 transition-transform" /> : <FiMaximize size={18} className="group-hover:scale-110 transition-transform" />}
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">{isFullscreen ? 'Sair' : 'Maximize'}</span>
                    </button>
                </div>
            </div>

            {/* PAINEL DE EPG COMPLETO (GAVETA LATERAL) */}
            <div className={`absolute top-0 right-0 w-full lg:w-[400px] h-full bg-black/40 backdrop-blur-3xl border-l border-white/10 z-[150] transition-all duration-500 transform ${showFullEpg ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full pt-32 pb-20 px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-white font-black text-2xl tracking-tighter uppercase">Programação</h3>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Grade Horária do Canal</p>
                        </div>
                        <button onClick={() => setShowFullEpg(false)} className="p-2 text-white/40 hover:text-white transition-all">
                            <FiX size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                        {epgInfo?.full ? epgInfo.full.map((item, idx) => {
                            const isCurrent = item.startTime <= new Date() && item.endTime >= new Date();
                            
                            return (
                                <div key={idx} className={`relative p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-white/10 border-white/20 shadow-2xl' : 'bg-transparent border-white/5 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${isCurrent ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                                            {item.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                            - {item.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h4 className={`font-bold mb-1 ${isCurrent ? 'text-white text-base' : 'text-gray-300 text-sm'}`}>{item.title}</h4>
                                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
                                    
                                    {isCurrent && (
                                        <div className="mt-4 w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-white transition-all duration-1000" 
                                                style={{ 
                                                    width: `${Math.min(100, Math.max(0, ((new Date() - item.startTime) / (item.endTime - item.startTime)) * 100))}%` 
                                                }} 
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <FiClock size={48} className="mb-4" />
                                <p className="text-sm font-bold uppercase tracking-widest">Nenhuma programação<br/>disponível</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PAINEL DE COMENTÁRIOS (GAVETA LATERAL) */}
            <div className={`absolute top-0 right-0 w-full lg:w-[400px] h-full bg-black/40 backdrop-blur-3xl border-l border-white/10 z-[150] transition-all duration-500 transform ${showComments ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full pt-32 pb-20 px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-white font-black text-2xl tracking-tighter uppercase">Comentários</h3>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">O que estão dizendo agora</p>
                        </div>
                        <button onClick={() => setShowComments(false)} className="p-2 text-white/40 hover:text-white transition-all">
                            <FiX size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
                        {comments.length > 0 ? comments.map((c) => (
                            <div key={c.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-primary uppercase">{c.user}</span>
                                    <span className="text-[9px] text-gray-500">{new Date(c.date).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm text-gray-200">{c.text}</p>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <FiMessageSquare size={48} className="mb-4" />
                                <p className="text-sm font-bold uppercase tracking-widest">Seja o primeiro a<br/>comentar!</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleAddComment} className="mt-6 flex gap-2">
                        <input 
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escreva algo..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                        />
                        <button type="submit" className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:scale-105 transition-all active:scale-95 shadow-lg shadow-primary/20">
                            Enviar
                        </button>
                    </form>
                </div>
            </div>

        </div>
    );
}

const styles = `
    input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 12px;
        width: 12px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(108, 92, 231, 0.5);
        border: none;
        margin-top: -4px;
    }
    input[type=range]::-moz-range-thumb {
        height: 12px;
        width: 12px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(108, 92, 231, 0.5);
        border: none;
    }
    input[type=range]::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }
    input[type=range]::-moz-range-track {
        width: 100%;
        height: 4px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }
    input[type=range]:focus {
        outline: none;
    }
`;

if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

// Estilos extras para ícones que faltaram