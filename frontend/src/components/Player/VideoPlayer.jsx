import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import mpegjs from 'mpegts.js';
import { 
    FiX, FiPlay, FiPause, FiMaximize, FiVolume2, 
    FiVolumeX, FiRefreshCw, FiChevronLeft, FiChevronRight, 
    FiHeart, FiMinimize2, FiSkipBack, FiSkipForward,
    FiSettings, FiDownload, FiAirplay, FiSquare, FiMonitor,
    FiRotateCcw, FiRotateCw, FiLogOut, FiClock
} from 'react-icons/fi';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useEpgStore } from '../../stores/useEpgStore';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const mpegPlayerRef = useRef(null);
    const containerRef = useRef(null);
    
    const { currentStream, setCurrentStream, isPlaying, togglePlay, playNext, playPrev } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    const { nowPlaying } = useEpgStore();
    
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
                    // Se o nativo funcionar, garantimos que o custom PiP está desativado
                    setIsPiP(false);
                    return;
                } else {
                    await document.exitPictureInPicture();
                    return;
                }
            } catch (e) {
                console.warn('[PiP] Native PiP failed, falling back to custom:', e);
            }
        }
        // Fallback: custom floating mini-player (mobile & unsupported browsers)
        setIsPiP(!isPiP);
        toast.success('Picture-in-Picture ativado', { icon: '📺', duration: 2000 });
    };

    // Drag handlers for custom PiP window
    const handlePipDragStart = (e) => {
        // Prevent default only for touch to stop scroll, but keep click working
        if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
        
        e.stopPropagation();
        
        pipDragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initX: pipPosition.x,
            initY: pipPosition.y
        };
    };

    const handlePipDragMove = useCallback((e) => {
        if (!pipDragRef.current.dragging) return;
        
        // Block interaction leakage
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - pipDragRef.current.startX;
        const dy = e.clientY - pipDragRef.current.startY;
        
        setPipPosition({
            x: Math.max(0, Math.min(window.innerWidth - 280, pipDragRef.current.initX + dx)),
            y: Math.max(0, Math.min(window.innerHeight - 157, pipDragRef.current.initY + dy))
        });
    }, []);

    const handlePipDragEnd = useCallback((e) => {
        if (pipDragRef.current.dragging) {
            e.stopPropagation();
            pipDragRef.current.dragging = false;
        }
    }, []);

    useEffect(() => {
        if (!isPiP) return;
        
        // Use pointer events for universal support (mouse, touch, pen)
        const opts = { passive: false };
        window.addEventListener('pointermove', handlePipDragMove, opts);
        window.addEventListener('pointerup', handlePipDragEnd);
        window.addEventListener('pointercancel', handlePipDragEnd);
        
        return () => {
            window.removeEventListener('pointermove', handlePipDragMove, opts);
            window.removeEventListener('pointerup', handlePipDragEnd);
            window.removeEventListener('pointercancel', handlePipDragEnd);
        };
    }, [isPiP, handlePipDragMove, handlePipDragEnd]);

    const handleAirPlay = async () => {
        const video = videoRef.current;
        if (!video) return;

        // 1) Safari / iOS — AirPlay nativo
        if (video.webkitShowPlaybackTargetPicker) {
            video.webkitShowPlaybackTargetPicker();
            return;
        }

        // 2) Chrome / Android — Remote Playback API (Chromecast, TVs DIAL)
        if (video.remote) {
            try {
                // Verificar se há dispositivos disponíveis
                await video.remote.watchAvailability((available) => {
                    if (!available) {
                        toast.error('Nenhum dispositivo de transmissão encontrado na rede.');
                    }
                }).catch(() => null);

                await video.remote.prompt();
                return;
            } catch (e) {
                if (e.name === 'NotFoundError') {
                    toast.error('Nenhum dispositivo encontrado. Verifique se estão na mesma rede Wi-Fi.');
                } else if (e.name === 'NotAllowedError' || e.name === 'AbortError' || e.message?.includes('dismissed')) {
                    // O usuário apenas fechou a janela, ignorar silenciosamente
                    console.log('[Cast] Seletor fechado pelo usuário.');
                } else if (e.name !== 'NotSupportedError') {
                    console.warn('[Cast]', e.message);
                }
            }
        }

        // 3) Fallback universal — copiar URL para o usuário abrir em outro dispositivo
        const streamUrl = getStreamUrl();
        if (streamUrl && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(streamUrl);
                toast.success(
                    'URL do stream copiada! Cole no VLC ou no seu app de TV para assistir.',
                    { duration: 5000, icon: '📺' }
                );
                return;
            } catch (e) {}
        }

        toast('Para assistir na TV: abra o VLC ou seu app de TV e cole a URL do stream.', {
            icon: '📺',
            duration: 5000
        });
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

        // Só mostrar prompt se já assistiu mais de 10s e menos de 95% do vídeo
        if (savedPosition && savedPosition > 10) {
            const dur = videoRef.current?.duration || 0;
            // Se já viu quase tudo (95%), não pergunta, assume que quer ver de novo ou ignorar
            if (dur > 0 && savedPosition > dur * 0.95) return;
            
            setResumeData(savedPosition);
            if (videoRef.current) videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [currentStream, progressKey, getActivePlaylist]);

    const handleResume = (shouldResume) => {
        if (videoRef.current) {
            if (shouldResume && resumeData) {
                videoRef.current.currentTime = resumeData;
            } else {
                videoRef.current.currentTime = 0;
            }
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
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
                // Se já estiver em algum tipo de PiP, não faz nada
                if (isPiP || document.pictureInPictureElement) return;

                if (supportsNativePiP()) {
                    try {
                        await videoRef.current.requestPictureInPicture();
                        return;
                    } catch (e) {
                        console.warn('[PiP] Auto-PiP failed:', e);
                    }
                }
                // fallback: activate custom PiP
                setIsPiP(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isPlaying, error, isPiP]);

    const [showSchedule, setShowSchedule] = useState(false);
    const [fullEpg, setFullEpg] = useState([]);

    useEffect(() => {
        let timeout;
        const resetTimer = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };
        if (!showSchedule) {
            window.addEventListener('mousemove', resetTimer);
            window.addEventListener('touchstart', resetTimer);
        }
        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
        };
    }, [showSchedule]);

    const fetchFullEpg = useCallback(async () => {
        if (!currentStream || currentStream.type !== 'channel') return;
        const active = getActivePlaylist();
        if (!active?.epgCacheKey) return;

        try {
            const { data } = await api.get(`/epg/${currentStream.tvgId || currentStream.id}`, {
                params: { cacheKey: active.epgCacheKey }
            });
            setFullEpg(data || []);
        } catch (e) {
            console.error('[EPG] Error fetching full grid:', e);
        }
    }, [currentStream, getActivePlaylist]);

    useEffect(() => {
        if (showSchedule) fetchFullEpg();
    }, [showSchedule, fetchFullEpg]);

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
                    width: 280, // Slightly smaller for better mobile fit
                    height: 157,
                    zIndex: 999999, // Ensure it's above everything
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)',
                    background: '#000',
                    cursor: 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handlePipDragStart}
                onMouseDown={e => e.stopPropagation()} // Extra block
                onClick={e => e.stopPropagation()}     // Extra block
            >
                <video
                    ref={videoRef}
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        pointerEvents: 'none' // Important: let events pass to container for drag
                    }}
                    autoPlay
                    playsInline
                    webkit-playsinline="true"
                />
                
                {/* Click to restore full screen */}
                <div 
                    className="absolute inset-0 z-10 cursor-pointer" 
                    onClick={() => setIsPiP(false)}
                />

                {/* Mini controls overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    padding: '8px 12px',
                    zIndex: 20
                }}>
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { 
                            e.stopPropagation(); 
                            togglePlay(); 
                        }}
                        className="p-2 text-white hover:text-primary transition-colors"
                    >
                        {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
                    </button>
                    
                    <span className="text-[10px] font-black text-white/90 uppercase tracking-wider truncate max-w-[140px] pointer-events-none">
                        {currentStream.name}
                    </span>

                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { 
                            e.stopPropagation(); 
                            setCurrentStream(null); 
                            setIsPiP(false);
                        }}
                        className="p-2 text-white/70 hover:bg-red-600/20 hover:text-red-500 rounded-lg transition-all"
                        title="Fechar Player"
                    >
                        <FiX size={20} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={`fixed z-[99999] bg-black shadow-2xl transition-all duration-500 ease-out flex items-center justify-center group/container inset-0 pointer-events-auto
                ${isDragging ? 'scale-105 cursor-grabbing' : ''}`}
            onPointerDown={handleDragStart}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
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
            <div className={`absolute left-0 top-0 p-6 lg:p-10 transition-all duration-500 z-40 max-w-[90%] md:max-w-xl
                ${(showControls) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                <div className="flex flex-col gap-1 md:gap-3">
                    <h3 className="text-white text-xl lg:text-3xl font-black leading-tight drop-shadow-2xl opacity-60 mb-1">{currentStream.name}</h3>
                    
                    {currentStream.type === 'channel' && (() => {
                        const data = nowPlaying[currentStream.tvgId] || nowPlaying[currentStream.id];
                        if (!data) return null;

                        const prog = data.current;
                        const nextProg = data.next;
                        if (!prog) return null;

                        const parseDate = (d) => {
                            if (!d) return null;
                            const y = d.substring(0, 4);
                            const m = d.substring(4, 6);
                            const day = d.substring(6, 8);
                            const h = d.substring(8, 10);
                            const min = d.substring(10, 12);
                            return new Date(`${y}-${m}-${day}T${h}:${min}:00`).getTime();
                        };

                        const start = parseDate(prog.start);
                        const stop = parseDate(prog.stop);
                        const now = Date.now();
                        const progress = start && stop ? Math.max(0, Math.min(100, ((now - start) / (stop - start)) * 100)) : 0;

                        return (
                            <div className="space-y-3 animate-fade-in">
                                {/* Current Program Row */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center px-2 py-0.5 bg-red-900/80 rounded text-[9px] lg:text-[11px] font-black text-red-200 uppercase tracking-widest border border-red-500/20">
                                        AO VIVO
                                    </div>
                                    <span className="text-sm lg:text-xl text-white font-black uppercase tracking-tight drop-shadow-lg">
                                        {prog.title}
                                    </span>
                                </div>

                                {/* Progress Bar - Clean & Bold like the image */}
                                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                    <div 
                                        className="h-full bg-white transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                        style={{ width: `${progress}%` }} 
                                    />
                                </div>

                                {/* Next Program Info */}
                                {nextProg && (
                                    <div className="flex items-center gap-2 text-[9px] lg:text-[12px] font-black uppercase tracking-[0.1em] text-gray-400 drop-shadow-md">
                                        <span className="opacity-50">PRÓXIMO:</span>
                                        <span className="opacity-80">{nextProg.title}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div className="flex items-center gap-3 mt-2">
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-primary text-white text-[9px] lg:text-[11px] font-black rounded-lg uppercase tracking-[0.2em] shadow-lg shadow-primary/20">{currentStream.group}</span>
                        {duration === 0 && <span className="flex items-center gap-1.5 md:gap-2 text-[9px] lg:text-[11px] text-red-500 font-black uppercase tracking-widest animate-pulse"><div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> AO VIVO</span>}
                    </div>
                </div>
            </div>

            {/* Top Right Actions */}
            <div className={`absolute top-0 right-0 pt-12 md:pt-6 px-6 pb-6 flex flex-col items-end gap-3 transition-opacity duration-300 z-40
                ${(showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
            >
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsPiP(true);
                    }} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-black/40 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md border border-white/10 group/exit shadow-2xl" 
                    title="Minimizar e continuar assistindo"
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
                        <div className="flex items-center gap-2 md:gap-4 flex-1">
                            {/* Volume Control - Always visible, but compact on mobile */}
                            <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-2 md:px-3 py-1.5 rounded-xl border border-white/5 transition-all">
                                <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-primary transition-colors">
                                    {isMuted || volume === 0 ? <FiVolumeX size={18} className="md:w-5 md:h-5" /> : <FiVolume2 size={18} className="md:w-5 md:h-5" />}
                                </button>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.1" 
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setVolume(v);
                                        if (videoRef.current) videoRef.current.volume = v;
                                        if (v > 0) setIsMuted(false);
                                        localStorage.setItem('player_volume', v);
                                    }}
                                    className="w-16 md:w-24 lg:w-32 accent-primary h-1 cursor-pointer"
                                />
                            </div>

                            {/* Time Display - Simplified for mobile */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-[10px] md:text-sm font-black text-white whitespace-nowrap">
                                    {duration > 0 ? formatTime(currentTime) : 'AO VIVO'}
                                </span>
                                {duration > 0 && (
                                    <>
                                        <span className="text-white/30 text-[10px]">/</span>
                                        <span className="text-[10px] md:text-sm font-bold text-white/50 whitespace-nowrap">
                                            {formatTime(duration)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right side controls - Organized with better spacing */}
                        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5">
                            {/* Programação (EPG) */}
                            {currentStream.type === 'channel' && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowSchedule(true); }} 
                                    className={`p-2 rounded-lg transition-all ${showSchedule ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10'}`} 
                                    title="Guia de Programação"
                                >
                                    <FiClock size={20} className="md:w-[22px] md:h-[22px]" />
                                </button>
                            )}

                            {/* Download - Only for Movies and Series */}
                            {currentStream.type !== 'channel' && (
                                <button onClick={handleDownload} className="p-2 text-white/70 hover:bg-white/10 rounded-lg transition-all" title="Download">
                                    <FiDownload size={20} className="md:w-[22px] md:h-[22px]" />
                                </button>
                            )}

                            {/* PiP */}
                            <button onClick={handlePiP} className="p-2 text-white/70 hover:bg-white/10 rounded-lg transition-all" title="Picture-in-Picture">
                                <FiSquare size={20} className="md:w-[22px] md:h-[22px]" />
                            </button>

                            {/* Transmitir */}
                            {airplayAvailable && (
                                <button onClick={handleAirPlay} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Transmitir">
                                    <FiAirplay size={20} className="md:w-[22px] md:h-[22px]" />
                                </button>
                            )}

                            {/* Fullscreen */}
                            <button onClick={toggleFullscreen} className="p-2 text-white/70 hover:bg-white/10 rounded-lg transition-all" title="Tela Cheia">
                                <FiMaximize size={20} className="md:w-[22px] md:h-[22px]" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full EPG Schedule Overlay (Right Side) */}
            {showSchedule && (
                <div 
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[100] flex justify-end animate-fade-in"
                    onClick={() => setShowSchedule(false)}
                >
                    <div 
                        className="w-full max-w-sm md:max-w-md h-full bg-black/40 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col animate-slide-left relative overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                        {/* Header */}
                        <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Programação</h3>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1 truncate max-w-[200px]">{currentStream.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); fetchFullEpg(); }}
                                    className="p-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl transition-all"
                                    title="Atualizar"
                                >
                                    <FiRefreshCw size={20} />
                                </button>
                                <button 
                                    onClick={() => setShowSchedule(false)}
                                    className="p-3 bg-white/5 hover:bg-red-600/20 hover:text-red-500 text-white/70 rounded-2xl transition-all"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-3 relative z-10">
                            {fullEpg.length > 0 ? (
                                fullEpg.map((prog, idx) => {
                                    const parseDate = (d) => {
                                        if (!d) return null;
                                        // Handle formats like "20260502040000 +0000"
                                        const clean = d.split(' ')[0];
                                        const y = clean.substring(0, 4), m = clean.substring(4, 6), day = clean.substring(6, 8);
                                        const h = clean.substring(8, 10), min = clean.substring(10, 12);
                                        return new Date(`${y}-${m}-${day}T${h}:${min}:00`);
                                    };
                                    const start = parseDate(prog.start);
                                    const stop = parseDate(prog.stop);
                                    const now = new Date();
                                    const isCurrent = start && stop && now >= start && now <= stop;

                                    return (
                                        <div 
                                            key={idx} 
                                            className={`p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-primary/20 border-primary/30' : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10'}`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${isCurrent ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>
                                                    {start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isCurrent && <span className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse">Agora Passando</span>}
                                            </div>
                                            <h4 className="text-sm md:text-base font-black text-white uppercase leading-tight mb-1">{prog.title}</h4>
                                            {prog.desc && <p className="text-[11px] text-gray-400 font-medium line-clamp-2 leading-relaxed">{prog.desc}</p>}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center px-8">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 text-white/20">
                                        <FiClock size={40} />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-2">Nenhuma programação encontrada</p>
                                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                        Certifique-se de que o EPG está sincronizado nas configurações do canal.
                                    </p>
                                    <button 
                                        onClick={fetchFullEpg}
                                        className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
                                    >
                                        Tentar Carregar Novamente
                                    </button>
                                </div>
                            )}
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