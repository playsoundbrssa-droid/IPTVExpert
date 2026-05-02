import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import mpegjs from 'mpegts.js';
import { 
    FiX, FiPlay, FiPause, FiMaximize, FiVolume2, 
    FiVolumeX, FiRefreshCw, FiChevronLeft, FiChevronRight, 
    FiHeart, FiMinimize2, FiSkipBack, FiSkipForward,
    FiSettings, FiDownload, FiAirplay, FiSquare, FiMonitor,
    FiRotateCcw, FiRotateCw, FiLogOut
} from 'react-icons/fi';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const mpegPlayerRef = useRef(null);
    const containerRef = useRef(null);
    
    const { currentStream, setCurrentStream, isPlaying, togglePlay, playNext, playPrev } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState(null);
    const [volume, setVolume] = useState(parseFloat(localStorage.getItem('player_volume')) || 1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [useProxy, setUseProxy] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [airplayAvailable, setAirplayAvailable] = useState(false);
    const [resumeData, setResumeData] = useState(null);
    const [isPiP, setIsPiP] = useState(false);
    const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });
    const pipDragRef = useRef({ dragging: false, startX: 0, startY: 0, initX: 0, initY: 0 });
    
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    const isFavorite = useMemo(() => 
        currentStream ? favorites.some(f => f.id === currentStream.id) : false
    , [favorites, currentStream]);

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

    const initPlayer = useCallback(async (attempt = 0) => {
        if (!currentStream || !videoRef.current) return;
        const streamUrl = getStreamUrl();
        const isHls = streamUrl.toLowerCase().includes('.m3u8') || streamUrl.includes('type=m3u8');
        const isTs = streamUrl.toLowerCase().includes('.ts') || streamUrl.includes('output=ts');
        
        cleanUp();
        setError(null);
        setIsBuffering(true);

        // Detectar se é Safari/iOS que requer player nativo para HLS
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.platform);
        
        if (isHls && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // Player Nativo (Safari/iOS)
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch(() => {
                videoRef.current.muted = true;
                videoRef.current.play();
                setIsMuted(true);
            });
        } else if (isHls && Hls.isSupported()) {
            // Hls.js (Chrome, Firefox, Android, etc)
            const hls = new Hls({ 
                enableWorker: true, 
                lowLatencyMode: true, 
                manifestLoadingMaxRetry: 10,
                xhrSetup: (xhr) => { xhr.withCredentials = false; }
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, () => videoRef.current.play().catch(() => {
                videoRef.current.muted = true;
                videoRef.current.play();
                setIsMuted(true);
            }));
            hls.on(Hls.Events.ERROR, (e, data) => {
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !useProxy) {
                        setUseProxy(true);
                    } else {
                        setError("Erro ao carregar a stream HLS.");
                    }
                }
            });
        } else if (isTs && mpegjs.isSupported()) {
            // MPEG-TS (mse)
            try {
                const mpeg = mpegjs.createPlayer({ type: 'mse', url: streamUrl, isLive: true });
                mpeg.attachMediaElement(videoRef.current);
                mpeg.load();
                mpeg.play().catch(() => {
                    videoRef.current.muted = true;
                    videoRef.current.play();
                    setIsMuted(true);
                });
                mpegPlayerRef.current = mpeg;
            } catch (err) { setError("O formato TS não é suportado neste dispositivo."); }
        } else {
            // Fallback genérico (MP4, etc)
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch(() => {
                videoRef.current.muted = true;
                videoRef.current.play();
                setIsMuted(true);
            });
        }

        // Progresso é carregado via evento loadedmetadata (veja abaixo)
    }, [currentStream, getStreamUrl, cleanUp, useProxy]);

    useEffect(() => {
        if (!videoRef.current) return;
        
        const video = videoRef.current;
        
        // Detecção de AirPlay (Safari/iOS)
        const checkAirPlay = () => {
            if (window.WebKitPlaybackTargetAvailabilityEvent) {
                video.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => {
                    setAirplayAvailable(e.availability === 'available');
                });
            } else if (video.webkitShowPlaybackTargetPicker) {
                // Se a função existe mas o evento não disparou, assume disponível no iOS
                setAirplayAvailable(true);
            } else if (video.remote && video.remote.state !== 'unavailable') {
                setAirplayAvailable(true);
            }
        };
        checkAirPlay();
    }, []);

    const toggleFullscreen = () => {
        if (!videoRef.current) return;
        
        const video = videoRef.current;
        const container = containerRef.current;

        // Suporte para iOS (Safari) - Maximização nativa do vídeo
        if (video.webkitEnterFullscreen) {
            video.webkitEnterFullscreen();
            return;
        }

        // Suporte para Android/Desktop
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const handleDownload = () => {
        if (!currentStream) return;
        const url = currentStream.streamUrl || currentStream.url;
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentStream.name}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download iniciado...');
    };

    const supportsNativePiP = () =>
        !!(document.pictureInPictureEnabled && videoRef.current?.requestPictureInPicture);

    const handlePiP = async () => {
        // If already in custom PiP mode, exit it
        if (isPiP) {
            setIsPiP(false);
            return;
        }
        // Try native PiP first (desktop Chrome, Safari)
        if (supportsNativePiP()) {
            try {
                if (videoRef.current !== document.pictureInPictureElement) {
                    await videoRef.current.requestPictureInPicture();
                    videoRef.current.addEventListener('leavepictureinpicture', () => {}, { once: true });
                    return; // native PiP worked, done
                } else {
                    await document.exitPictureInPicture();
                    return;
                }
            } catch (e) {
                console.warn('[PiP] Native PiP failed, falling back to custom:', e);
            }
        }
        // Fallback: custom floating mini-player (mobile & unsupported browsers)
        setIsPiP(true);
        toast.success('Picture-in-Picture ativado', { icon: '📺', duration: 2000 });
    };

    // Drag handlers for custom PiP window
    const handlePipDragStart = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        pipDragRef.current = { dragging: true, startX: clientX, startY: clientY, initX: pipPosition.x, initY: pipPosition.y };
    };

    const handlePipDragMove = useCallback((e) => {
        if (!pipDragRef.current.dragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = clientX - pipDragRef.current.startX;
        const dy = clientY - pipDragRef.current.startY;
        setPipPosition({
            x: Math.max(0, Math.min(window.innerWidth - 320, pipDragRef.current.initX + dx)),
            y: Math.max(0, Math.min(window.innerHeight - 180, pipDragRef.current.initY + dy))
        });
    }, []);

    const handlePipDragEnd = useCallback(() => {
        pipDragRef.current.dragging = false;
    }, []);

    useEffect(() => {
        if (isPiP) {
            window.addEventListener('mousemove', handlePipDragMove);
            window.addEventListener('mouseup', handlePipDragEnd);
            window.addEventListener('touchmove', handlePipDragMove, { passive: true });
            window.addEventListener('touchend', handlePipDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handlePipDragMove);
            window.removeEventListener('mouseup', handlePipDragEnd);
            window.removeEventListener('touchmove', handlePipDragMove);
            window.removeEventListener('touchend', handlePipDragEnd);
        };
    }, [isPiP, handlePipDragMove, handlePipDragEnd]);

    const handleAirPlay = async () => {
        if (videoRef.current?.webkitShowPlaybackTargetPicker) {
            videoRef.current.webkitShowPlaybackTargetPicker();
        } else if (videoRef.current?.remote) {
            try {
                await videoRef.current.remote.prompt();
            } catch (e) {
                console.error('Cast Error:', e);
            }
        } else {
            toast.error('Transmissão não suportada neste navegador.');
        }
    };

    const { getActivePlaylist } = usePlaylistManagerStore();

    // Chave do localStorage como fallback quando usuário não está logado ou API falha
    const progressKey = currentStream
        ? `progress_${currentStream.id}`
        : null;

    const loadProgress = useCallback(async () => {
        if (!currentStream || !progressKey) return;
        if (currentStream.type === 'channel') return;

        let savedPosition = null;

        // 1) Tentar API do backend
        try {
            const active = getActivePlaylist();
            if (active) {
                const response = await api.get('/progress', {
                    params: { mediaId: currentStream.id, playlistId: active.id }
                });
                if (response.data?.progress) {
                    savedPosition = response.data.progress.last_position;
                }
            }
        } catch (e) {
            console.warn('[PROGRESS] API indisponível, usando localStorage:', e.message);
        }

        // 2) Fallback: localStorage
        if (!savedPosition) {
            const local = parseFloat(localStorage.getItem(progressKey));
            if (local && local > 0) savedPosition = local;
        }

        // Só mostrar prompt se já assistiu mais de 10s
        if (savedPosition && savedPosition > 10) {
            setResumeData(savedPosition);
        }
    }, [currentStream, progressKey, getActivePlaylist]);

    const handleResume = (shouldResume) => {
        if (shouldResume && videoRef.current && resumeData) {
            videoRef.current.currentTime = resumeData;
            videoRef.current.play().catch(() => {});
            // Sem toast — apenas continua silenciosamente
        }
        setResumeData(null);
    };

    const saveProgress = useCallback(async () => {
        if (!videoRef.current || !currentStream) return;
        if (currentStream.type !== 'movie' && currentStream.type !== 'series') return;

        const pos = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        if (!pos || pos < 5) return; // não salvar se não iniciou

        // Sempre salvar no localStorage como fallback instantâneo
        if (progressKey) localStorage.setItem(progressKey, String(pos));

        // Tentar salvar na API (sem bloquear se falhar)
        try {
            const active = getActivePlaylist();
            if (active) {
                await api.post('/progress', {
                    mediaId: currentStream.id,
                    playlistId: active.id,
                    currentTime: pos,
                    duration: dur
                });
            }
        } catch (error) {
            console.warn('[PROGRESS] Falha ao salvar na API (salvo localmente):', error.message);
        }
    }, [currentStream, progressKey, getActivePlaylist]);

    // Salvar progresso a cada 15s e ao sair
    useEffect(() => {
        if (currentStream?.type !== 'movie' && currentStream?.type !== 'series') return;

        const interval = setInterval(saveProgress, 15000);
        return () => {
            clearInterval(interval);
            saveProgress();
        };
    }, [currentStream, saveProgress]);

    const seek = (seconds) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch(() => {});
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        initPlayer();
        return cleanUp;
    }, [currentStream, useProxy, initPlayer]);

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && videoRef.current && isPlaying && !error) {
                if (supportsNativePiP()) {
                    try {
                        if (videoRef.current !== document.pictureInPictureElement) {
                            await videoRef.current.requestPictureInPicture();
                        }
                        return;
                    } catch (e) {
                        console.warn('[PiP] Auto-PiP failed:', e);
                    }
                }
                // fallback: activate custom PiP
                if (!isPiP) setIsPiP(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isPlaying, error, isPiP]);

    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, []);

    const handleDragStart = (e) => {
        return;
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

    // ── Custom floating PiP mini-player (mobile fallback) ────────────────────────
    if (isPiP) {
        return (
            <div
                style={{
                    position: 'fixed',
                    left: pipPosition.x,
                    top: pipPosition.y,
                    width: 320,
                    height: 180,
                    zIndex: 99999,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
                    background: '#000',
                    cursor: 'grab',
                    border: '2px solid rgba(255,255,255,0.15)',
                    touchAction: 'none'
                }}
                onMouseDown={handlePipDragStart}
                onTouchStart={handlePipDragStart}
            >
                <video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    autoPlay
                    playsInline
                    webkit-playsinline="true"
                />
                {/* Mini controls overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    padding: '8px 10px'
                }}>
                    <button
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); togglePlay(); }}
                        style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                        {isPlaying ? <FiPause size={18} /> : <FiPlay size={18} />}
                    </button>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentStream.name}
                    </span>
                    <button
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setIsPiP(false); }}
                        style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        title="Fechar PiP"
                    >
                        <FiX size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={`fixed z-[999] bg-black shadow-2xl transition-all duration-500 ease-out flex items-center justify-center group/container inset-0
                ${isDragging ? 'scale-105 cursor-grabbing' : ''}`}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            <video 
                ref={videoRef}
                className="w-full h-full object-contain"
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => {
                    setDuration(videoRef.current?.duration || 0);
                    // Carregar progresso aqui: o video já está pronto para receber currentTime
                    loadProgress();
                }}
                onClick={() => {
                    setShowControls(!showControls);
                }}
                playsInline
                autoPlay
                x-webkit-airplay="allow"
                webkit-playsinline="true"
            />

            {/* Resume Prompt Overlay */}
            {resumeData && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
                    <div className="bg-surface/90 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm mx-4 transform animate-scale-up">
                        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiRotateCw size={32} />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Continuar assistindo?</h3>
                        <p className="text-gray-400 text-sm mb-8 font-medium">Você parou em <span className="text-white font-bold">{formatTime(resumeData)}</span>. Como deseja prosseguir?</p>
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={() => handleResume(true)}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                            >
                                Continuar de onde parei
                            </button>
                            <button 
                                onClick={() => handleResume(false)}
                                className="w-full py-4 bg-white/5 text-white/70 hover:text-white rounded-2xl font-black uppercase tracking-wider hover:bg-white/10 transition-all"
                            >
                                Começar do início
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isBuffering && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-50">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={() => initPlayer()} className="px-6 py-3 bg-primary rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-primary/20">Tentar Novamente</button>
                </div>
            )}

            {/* Repositioned Title/EPG Info (Top-Left) */}
            <div className={`absolute left-0 top-0 p-6 lg:p-10 transition-all duration-500 z-40 max-w-[80%] lg:max-w-md
                ${(showControls) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                <div className="flex flex-col gap-1 md:gap-2">
                    <h3 className="text-white text-xl lg:text-4xl font-black leading-tight drop-shadow-2xl">{currentStream.name}</h3>
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-primary text-white text-[9px] lg:text-[12px] font-black rounded-lg uppercase tracking-[0.2em] shadow-lg shadow-primary/20">{currentStream.group}</span>
                        {duration === 0 && <span className="flex items-center gap-1.5 md:gap-2 text-[9px] lg:text-[12px] text-red-500 font-black uppercase tracking-widest animate-pulse"><div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> AO VIVO</span>}
                    </div>
                </div>
            </div>

            {/* Top Right Actions */}
            <div className={`absolute top-0 right-0 pt-12 md:pt-6 px-6 pb-6 flex flex-col items-end gap-3 transition-opacity duration-300 z-40
                ${(showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
            >
                <button 
                    onClick={() => setCurrentStream(null)} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-black/40 hover:bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md border border-white/10 group/exit shadow-2xl" 
                    title="Sair da Reprodução"
                >
                    <FiChevronLeft size={18} className="group-hover/exit:-translate-x-1 transition-transform" />
                    <span>Voltar</span>
                </button>
            </div>

            {/* Middle Controls Indicator */}
            {!isBuffering && (
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 lg:gap-12 transition-all z-30
                    ${(showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    
                    {/* Previous */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); playPrev(); }} 
                        onTouchStart={(e) => { e.stopPropagation(); playPrev(); }}
                        className="w-10 h-10 lg:w-14 lg:h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/10 active:bg-white/20"
                    >
                        <FiSkipBack size={24} />
                    </button>

                    {/* -10s */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); seek(-10); }} 
                        onTouchStart={(e) => { e.stopPropagation(); seek(-10); }}
                        className="w-12 h-12 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-md rounded-full flex flex-col items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90 border border-white/10 active:bg-white/20"
                    >
                        <FiRotateCcw size={22} />
                        <span className="text-[10px] font-black mt-1">10</span>
                    </button>

                    {/* Play/Pause */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                        onTouchStart={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="w-20 h-20 lg:w-28 lg:h-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform border border-white/20 shadow-2xl active:bg-primary/40"
                    >
                        {isPlaying ? <FiPause size={48} /> : <FiPlay size={48} className="ml-2" />}
                    </button>

                    {/* +10s */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); seek(10); }} 
                        onTouchStart={(e) => { e.stopPropagation(); seek(10); }}
                        className="w-12 h-12 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-md rounded-full flex flex-col items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90 border border-white/10 active:bg-white/20"
                    >
                        <FiRotateCw size={22} />
                        <span className="text-[10px] font-black mt-1">10</span>
                    </button>

                    {/* Next */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); playNext(); }} 
                        onTouchStart={(e) => { e.stopPropagation(); playNext(); }}
                        className="w-10 h-10 lg:w-14 lg:h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/10 active:bg-white/20"
                    >
                        <FiSkipForward size={24} />
                    </button>
                </div>
            )}

            {/* Bottom Controls Overlay */}
            {(
                <div className={`absolute bottom-0 left-0 w-full p-4 lg:p-6 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 z-40
                    ${(showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    
                    {/* Progress Bar (YouTube style) */}
                    {duration > 0 && (
                        <div 
                            className="group/progress w-full h-1.5 bg-white/20 rounded-full mb-6 relative cursor-pointer hover:h-2 transition-all"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pos = (e.clientX - rect.left) / rect.width;
                                videoRef.current.currentTime = pos * duration;
                            }}
                        >
                            <div className="absolute h-full bg-primary rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg shadow-primary/50" />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 lg:gap-8">
                            <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 transition-all">
                                <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-primary transition-colors">
                                    {isMuted || volume === 0 ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
                                </button>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.1" 
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setVolume(v);
                                        videoRef.current.volume = v;
                                        if (v > 0) setIsMuted(false);
                                    }}
                                    className="w-20 lg:w-32 transition-all duration-300 accent-primary h-1 cursor-pointer"
                                />
                            </div>

                            <span className="text-sm font-bold text-white/90 tracking-tight">
                                {formatTime(currentTime)} <span className="text-white/40 mx-1">/</span> {duration > 0 ? formatTime(duration) : 'AO VIVO'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-5">
                            {/* Download */}
                            <button onClick={handleDownload} className="p-2 text-white/70 hover:text-white transition-all" title="Download">
                                <FiDownload size={22} />
                            </button>

                            {/* Speed Selector Removed */}

                            {/* PiP - visible on all devices */}
                            <button onClick={handlePiP} className="p-2 text-white/70 hover:text-primary transition-all" title="Picture-in-Picture">
                                <FiSquare size={22} />
                            </button>

                            {/* Transmitir (AirPlay / Cast) */}
                            <button onClick={handleAirPlay} className={`p-2 transition-all ${airplayAvailable ? 'text-primary' : 'text-white/30'}`} title="Transmitir Tela">
                                <FiAirplay size={22} />
                            </button>

                            {/* Theater Mode Removed as requested */}

                            {/* Favorites Removed */}
                            
                            <button onClick={toggleFullscreen} className="p-2 text-white/70 hover:text-white transition-all" title="Tela Cheia">
                                <FiMaximize size={22} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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