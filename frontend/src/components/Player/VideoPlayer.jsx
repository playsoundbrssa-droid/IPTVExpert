import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import mpegjs from 'mpegts.js';
import { 
    FiX, FiPlay, FiPause, FiMaximize, FiVolume2, 
    FiVolumeX, FiRefreshCw, FiChevronLeft, FiChevronRight, 
    FiHeart, FiMinimize2, FiSkipBack, FiSkipForward
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
    const mainContainerRef = useRef(null);
    
    const { currentStream, setCurrentStream, isPlaying, togglePlay } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    
    const [isMinimized, setIsMinimized] = useState(false);
    const [isAutoMinimized, setIsAutoMinimized] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState(null);
    const [volume, setVolume] = useState(parseFloat(localStorage.getItem('player_volume')) || 1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [useProxy, setUseProxy] = useState(false);
    
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    const isFavorite = useMemo(() => 
        currentStream ? favorites.some(f => f.id === currentStream.id) : false
    , [favorites, currentStream]);

    // Lógica de "Anti-Gravidade" Automática via Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting && !isMinimized) {
                    setIsAutoMinimized(true);
                } else if (entry.isIntersecting) {
                    setIsAutoMinimized(false);
                }
            },
            { threshold: 0.1 }
        );

        if (mainContainerRef.current) {
            observer.observe(mainContainerRef.current);
        }

        return () => observer.disconnect();
    }, [isMinimized]);

    const cleanUp = useCallback(() => {
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        if (mpegPlayerRef.current) { mpegPlayerRef.current.destroy(); mpegPlayerRef.current = null; }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
        }
    }, []);

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

    const initPlayer = useCallback(async () => {
        if (!currentStream || !videoRef.current) return;
        const streamUrl = getStreamUrl();
        const isHls = streamUrl.toLowerCase().includes('.m3u8') || streamUrl.includes('type=m3u8');
        const isTs = streamUrl.toLowerCase().includes('.ts') || streamUrl.includes('output=ts');
        
        cleanUp();
        setError(null);
        setIsBuffering(true);

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isHls && (videoRef.current.canPlayType('application/vnd.apple.mpegurl') || isMobile)) {
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch(() => setIsMuted(true));
        } else if (isHls && Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true, manifestLoadingMaxRetry: 5 });
            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, () => videoRef.current.play().catch(() => {}));
            hls.on(Hls.Events.ERROR, (e, data) => {
                if (data.fatal && !useProxy) setUseProxy(true);
                else if (data.fatal) setError("Erro fatal na stream. Tente outro canal.");
            });
        } else if (isTs && mpegjs.isSupported()) {
            try {
                const mpeg = mpegjs.createPlayer({ type: 'mse', url: streamUrl, isLive: true });
                mpeg.attachMediaElement(videoRef.current);
                mpeg.load();
                mpeg.play().catch(() => {});
                mpegPlayerRef.current = mpeg;
            } catch (err) { setError("O formato TS não é suportado."); }
        } else {
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch(() => {});
        }
    }, [currentStream, getStreamUrl, cleanUp, useProxy]);

    useEffect(() => {
        initPlayer();
        return cleanUp;
    }, [currentStream, useProxy, initPlayer]);

    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            setShowControls(true);
            clearTimeout(timeout);
            if (!isMinimized && !isAutoMinimized) timeout = setTimeout(() => setShowControls(false), 3000);
        };
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, [isMinimized, isAutoMinimized]);

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

    const activeMinimized = isMinimized || isAutoMinimized;

    return (
        <>
            {/* Espaçador para manter o layout quando o player flutuar */}
            {!isMinimized && (
                <div ref={mainContainerRef} className="w-full aspect-video bg-black/40 rounded-3xl overflow-hidden mb-8" />
            )}

            <div 
                ref={containerRef}
                className={`fixed z-[999] bg-[#0f171e] shadow-2xl transition-all duration-500 ease-out flex items-center justify-center
                    ${activeMinimized ? 'w-72 h-40 rounded-2xl border border-white/10' : 'inset-0'}
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

                {isBuffering && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <FiRefreshCw className="w-10 h-10 text-primary animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-red-500 font-bold mb-4">{error}</p>
                        <button onClick={() => initPlayer()} className="px-4 py-2 bg-primary rounded-lg text-sm font-bold">Tentar Novamente</button>
                    </div>
                )}

                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300
                    ${(showControls || activeMinimized) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start">
                        {!activeMinimized && (
                            <div className="flex flex-col">
                                <h3 className="text-white font-black truncate max-w-[200px] lg:max-w-md">{currentStream.name}</h3>
                                <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{currentStream.group}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {!activeMinimized && (
                                <button onClick={() => setIsMinimized(true)} className="p-2 text-white/70 hover:text-white transition-colors">
                                    <FiMinimize2 size={20} />
                                </button>
                            )}
                            <button onClick={() => setCurrentStream(null)} className="p-2 text-white/70 hover:text-white transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>
                    </div>

                    {!activeMinimized && (
                        <button onClick={togglePlay} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
                            {isPlaying ? <FiPause size={32} /> : <FiPlay size={32} className="ml-1" />}
                        </button>
                    )}

                    {!activeMinimized && (
                        <div className="absolute bottom-0 left-0 w-full p-4 pt-10">
                            {duration > 0 && (
                                <div className="w-full h-1 bg-white/20 rounded-full mb-4 relative overflow-hidden">
                                    <div className="absolute h-full bg-primary" style={{ width: `${(currentTime / duration) * 100}%` }} />
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={togglePlay} className="text-white hover:text-primary"><FiPause size={20} /></button>
                                    <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                                        {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
                                    </button>
                                    <span className="text-[12px] font-mono text-white/70">
                                        {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : 'AO VIVO'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => { if (isFavorite) removeFavorite(currentStream.id); else addFavorite(currentStream); }} className={isFavorite ? 'text-red-500' : 'text-white'}>
                                        <FiHeart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                                    </button>
                                    <button onClick={() => containerRef.current.requestFullscreen()} className="text-white"><FiMaximize size={20} /></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
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