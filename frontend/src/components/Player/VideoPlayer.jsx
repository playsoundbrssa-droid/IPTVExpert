import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import mpegjs from 'mpegts.js';
import { 
    FiX, FiPlay, FiPause, FiMaximize, FiVolume2, 
    FiVolumeX, FiRefreshCw, FiChevronLeft, FiChevronRight, 
    FiHeart, FiMinimize2, FiSkipBack, FiSkipForward,
    FiShare2, FiDownload, FiSettings, FiCopy, FiFacebook, FiTwitter
} from 'react-icons/fi';
import { FaWhatsapp, FaTelegram } from 'react-icons/fa';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import toast from 'react-hot-toast';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const mpegPlayerRef = useRef(null);
    const containerRef = useRef(null);
    const mainContainerRef = useRef(null);
    const progressBarRef = useRef(null);
    
    const { currentStream, setCurrentStream, isPlaying, togglePlay } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    
    // Estados do Player
    const [isMinimized, setIsMinimized] = useState(false);
    const [isAutoMinimized, setIsAutoMinimized] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState(null);
    const [volume, setVolume] = useState(parseFloat(localStorage.getItem('player_volume')) || 1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [progressHover, setProgressHover] = useState(0);
    const [showHoverTime, setShowHoverTime] = useState(false);
    
    // Estados de Arrastar (Miniplayer)
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    const isFavorite = useMemo(() => 
        currentStream ? favorites.some(f => f.id === currentStream.id) : false
    , [favorites, currentStream]);

    const isHls = useMemo(() => {
        if (!currentStream) return false;
        const url = (currentStream.streamUrl || currentStream.url || '').toLowerCase();
        return url.includes('.m3u8') || url.includes('type=m3u8');
    }, [currentStream]);

    // ── Lógica de "Anti-Gravidade" Automática ────────────────────────────────
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting && !isMinimized && isPlaying) {
                    setIsAutoMinimized(true);
                } else if (entry.isIntersecting) {
                    setIsAutoMinimized(false);
                }
            },
            { threshold: 0.1 }
        );

        if (mainContainerRef.current) observer.observe(mainContainerRef.current);
        return () => observer.disconnect();
    }, [isMinimized, isPlaying]);

    // ── Atalhos de Teclado ──────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            
            switch(e.code) {
                case 'Space': e.preventDefault(); togglePlay(); break;
                case 'KeyF': e.preventDefault(); toggleFullscreen(); break;
                case 'KeyM': e.preventDefault(); setIsMuted(!isMuted); break;
                case 'ArrowRight': videoRef.current.currentTime += 5; break;
                case 'ArrowLeft': videoRef.current.currentTime -= 5; break;
                case 'ArrowUp': e.preventDefault(); setVolume(v => Math.min(1, v + 0.1)); break;
                case 'ArrowDown': e.preventDefault(); setVolume(v => Math.max(0, v - 0.1)); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMuted, togglePlay]);

    // ── Inicialização do Player ─────────────────────────────────────────────
    const initPlayer = useCallback(async () => {
        if (!currentStream || !videoRef.current) return;
        const streamUrl = currentStream.streamUrl || currentStream.url;
        
        if (hlsRef.current) hlsRef.current.destroy();
        if (mpegPlayerRef.current) mpegPlayerRef.current.destroy();
        
        setError(null);
        setIsBuffering(true);

        if (isHls) {
            if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.current.src = streamUrl;
            } else if (Hls.isSupported()) {
                const hls = new Hls({ enableWorker: true });
                hls.loadSource(streamUrl);
                hls.attachMedia(videoRef.current);
                hlsRef.current = hls;
            }
        } else {
            videoRef.current.src = streamUrl;
        }
    }, [currentStream, isHls]);

    useEffect(() => {
        initPlayer();
    }, [currentStream, initPlayer]);

    // ── Funções Auxiliares ──────────────────────────────────────────────────
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleDownload = () => {
        if (isHls) {
            toast.error("Download não disponível para transmissões ao vivo.");
            return;
        }
        const link = document.createElement('a');
        link.href = currentStream.streamUrl || currentStream.url;
        link.download = `${currentStream.name || 'video'}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?v=${currentStream.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copiado com sucesso!");
    };

    const handleProgressHover = (e) => {
        const rect = progressBarRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        setProgressHover(pos * duration);
        setShowHoverTime(true);
    };

    // ── Lógica de Arrastar ──────────────────────────────────────────────────
    const handleDragStart = (e) => {
        if (!isMinimized && !isAutoMinimized) return;
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
            setPosition({
                x: dragStart.current.initialX + (dragStart.current.x - clientX),
                y: dragStart.current.initialY + (dragStart.current.y - clientY)
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

    const activeMinimized = isMinimized || isAutoMinimized;
    const shareUrl = `${window.location.origin}${window.location.pathname}?v=${currentStream.id}`;

    return (
        <>
            {/* Placeholder para o player quando ele flutua */}
            {!isMinimized && (
                <div ref={mainContainerRef} className="w-full aspect-video bg-black/40 rounded-3xl overflow-hidden mb-8" />
            )}

            <div 
                ref={containerRef}
                className={`fixed z-[999] bg-black shadow-2xl transition-all duration-300 group
                    ${activeMinimized ? 'w-80 h-44 rounded-2xl border border-white/10 overflow-hidden' : 'inset-0'}
                    ${isDragging ? 'scale-105 cursor-grabbing' : ''}`}
                style={activeMinimized ? { bottom: position.y, right: position.x } : {}}
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
                    onClick={() => activeMinimized ? setIsMinimized(false) : togglePlay()}
                    playsInline
                    autoPlay
                />

                {/* Overlay de Pausa (Estilo YouTube) */}
                {!isPlaying && !isBuffering && !activeMinimized && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={togglePlay}>
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-110">
                            <FiPlay size={40} fill="currentColor" />
                        </div>
                    </div>
                )}

                {/* Spinner de Carregamento */}
                {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <FiRefreshCw className="w-12 h-12 text-primary animate-spin" />
                    </div>
                )}

                {/* Controles do Player */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-300
                    ${(showControls || !isPlaying || activeMinimized) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    
                    {/* Top Header */}
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start">
                        {!activeMinimized && (
                            <div className="flex flex-col">
                                <h3 className="text-white font-bold truncate max-w-md">{currentStream.name}</h3>
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest">{currentStream.group}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {activeMinimized ? (
                                <button onClick={() => {setIsMinimized(false); setIsAutoMinimized(false);}} className="p-2 text-white hover:bg-white/10 rounded-full">
                                    <FiMaximize size={18} />
                                </button>
                            ) : (
                                <button onClick={() => setIsMinimized(true)} className="p-2 text-white hover:bg-white/10 rounded-full">
                                    <FiMinimize2 size={20} />
                                </button>
                            )}
                            <button onClick={() => setCurrentStream(null)} className="p-2 text-white hover:bg-white/10 rounded-full">
                                <FiX size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Barra de Progresso Interativa */}
                    {!activeMinimized && (
                        <div className="absolute bottom-16 left-0 w-full px-4 group/progress">
                            <div 
                                ref={progressBarRef}
                                className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer transition-all group-hover/progress:h-2"
                                onMouseMove={handleProgressHover}
                                onMouseLeave={() => setShowHoverTime(false)}
                                onClick={(e) => {
                                    const rect = progressBarRef.current.getBoundingClientRect();
                                    const pos = (e.clientX - rect.left) / rect.width;
                                    videoRef.current.currentTime = pos * duration;
                                }}
                            >
                                <div className="absolute h-full bg-primary rounded-full z-20" style={{ width: `${(currentTime / duration) * 100}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg" />
                                </div>
                                {showHoverTime && (
                                    <div className="absolute -top-8 px-2 py-1 bg-black/90 text-white text-[10px] rounded font-bold -translate-x-1/2 pointer-events-none" style={{ left: `${(progressHover / duration) * 100}%` }}>
                                        {formatTime(progressHover)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Botões de Controle Inferiores */}
                    {!activeMinimized && (
                        <div className="absolute bottom-0 left-0 w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                                    {isPlaying ? <FiPause size={24} fill="currentColor" /> : <FiPlay size={24} fill="currentColor" />}
                                </button>
                                <div className="flex items-center gap-2 group/volume">
                                    <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                                        {isMuted || volume === 0 ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
                                    </button>
                                    <input 
                                        type="range" min="0" max="1" step="0.1" 
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => {setVolume(parseFloat(e.target.value)); setIsMuted(false);}}
                                        className="w-0 group-hover/volume:w-20 transition-all accent-primary cursor-pointer"
                                    />
                                </div>
                                <span className="text-xs font-medium text-white/90">
                                    {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : 'AO VIVO'}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowSettings(!showSettings)} className="text-white hover:rotate-45 transition-transform"><FiSettings size={20} /></button>
                                <button onClick={() => setShowShareModal(true)} className="text-white hover:text-primary transition-colors"><FiShare2 size={20} /></button>
                                <button onClick={handleDownload} className="text-white hover:text-primary transition-colors" title={isHls ? "Download indisponível para live" : "Baixar vídeo"}>
                                    <FiDownload size={20} />
                                </button>
                                <button onClick={toggleFullscreen} className="text-white hover:scale-110 transition-transform"><FiMaximize size={22} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Menu de Configurações (Velocidade) */}
                {showSettings && (
                    <div className="absolute bottom-16 right-4 w-40 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl z-50">
                        <p className="text-[10px] text-gray-500 font-black uppercase mb-2 px-2">Velocidade</p>
                        {[0.5, 1, 1.5, 2].map(rate => (
                            <button 
                                key={rate} 
                                onClick={() => {setPlaybackRate(rate); videoRef.current.playbackRate = rate; setShowSettings(false);}}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${playbackRate === rate ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'}`}
                            >
                                {rate === 1 ? 'Normal' : `${rate}x`}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Compartilhamento */}
            {showShareModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowShareModal(false)}>
                    <div className="w-full max-w-md bg-[#1a1a1a] rounded-3xl p-8 border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white">Compartilhar</h2>
                            <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
                        </div>

                        <div className="flex gap-4 mb-8 justify-center">
                            <a href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`} target="_blank" className="p-4 bg-[#25d366] rounded-2xl text-white hover:scale-110 transition-transform"><FaWhatsapp size={28} /></a>
                            <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`} target="_blank" className="p-4 bg-[#0088cc] rounded-2xl text-white hover:scale-110 transition-transform"><FaTelegram size={28} /></a>
                            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" className="p-4 bg-black border border-white/10 rounded-2xl text-white hover:scale-110 transition-transform"><FiTwitter size={28} /></a>
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-black rounded-2xl border border-white/10">
                            <input readOnly value={shareUrl} className="flex-1 bg-transparent border-none text-xs text-gray-400 px-4 focus:ring-0" />
                            <button onClick={copyLink} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase hover:bg-primary/80 transition-all">
                                <FiCopy /> Copiar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function formatTime(seconds) {
    if (!seconds || !Number.isFinite(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}