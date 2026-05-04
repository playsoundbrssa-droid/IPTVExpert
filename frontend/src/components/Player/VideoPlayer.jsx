import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
import { useUserStore } from '../../stores/useUserStore';
import api, { getProxyImageUrl } from '../../services/api';
import toast from 'react-hot-toast';
import { useEpgStore } from '../../stores/useEpgStore';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const mpegPlayerRef = useRef(null);
    const containerRef = useRef(null);
    const lastUpdateRef = useRef(0);

    const { currentStream, setCurrentStream, isPlaying, togglePlay, setIsPlaying, playNext, playPrev } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    const { nowPlaying } = useEpgStore();
    const { getActivePlaylist } = usePlaylistManagerStore();
    const { user } = useUserStore();
    const navigate = useNavigate();
    const resumedRef = useRef(null);

    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState(null);
    const [volume, setVolume] = useState(parseFloat(localStorage.getItem('player_volume')) || 1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [useProxy, setUseProxy] = useState(false);
    const [streamFormatFallback, setStreamFormatFallback] = useState(0);
    const [airplayAvailable, setAirplayAvailable] = useState(false);
    const [resumeData, setResumeData] = useState(null);

    const [isPiP, setIsPiP] = useState(false); // Custom PiP
    const [isNativePiP, setIsNativePiP] = useState(false); // Browser PiP
    const [isDragging, setIsDragging] = useState(false);
    const [pipPosition, setPipPosition] = useState({ x: window.innerWidth - 340, y: window.innerHeight - 200 });
    const pipDragRef = useRef({ dragging: false, startX: 0, startY: 0, initX: 0, initY: 0 });

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
        let url = currentStream.streamUrl || currentStream.url;
        if (!url) return '';

        // O proxy ou o mpegts vai lidar com a stream.
        const active = getActivePlaylist();

        // Tentar formatos diferentes de URL Xtream em caso de erro 404
        if (active?.type === 'xtream' && currentStream.type === 'channel') {
            try {
                const urlObj = new URL(url);
                const baseUrl = urlObj.origin;
                const pathParts = urlObj.pathname.split('/').filter(p => p);
                
                // Padrões Xtream comuns: /live/user/pass/id.ts ou /user/pass/id.ts
                let user, pass, idStr;
                if (pathParts.length >= 4 && pathParts[0] === 'live') {
                    user = pathParts[1];
                    pass = pathParts[2];
                    idStr = pathParts[3];
                } else if (pathParts.length >= 3) {
                    user = pathParts[0];
                    pass = pathParts[1];
                    idStr = pathParts[2];
                }

                if (user && pass && idStr) {
                    const id = idStr.replace(/\.[^/.]+$/, ""); // Remove qualquer extensão (.ts, .m3u8, etc)

                    const variations = [
                        null, // 0: Original
                        `${baseUrl}/${user}/${pass}/${id}.ts`,        // 1: Direct TS
                        `${baseUrl}/${user}/${pass}/${id}`,           // 2: Direct No Ext
                        `${baseUrl}/live/${user}/${pass}/${id}.ts`,   // 3: Live TS
                        `${baseUrl}/live/${user}/${pass}/${id}`,      // 4: Live No Ext
                        `${baseUrl}/${user}/${pass}/${id}.m3u8`,      // 5: Direct HLS
                        `${baseUrl}/live/${user}/${pass}/${id}.m3u8`, // 6: Live HLS
                    ];

                    if (variations[streamFormatFallback]) {
                        url = variations[streamFormatFallback];
                    }
                }
            } catch (e) {
                console.warn('Erro ao processar URL para fallback:', e.message);
            }
        }

        // Conversão agressiva para M3U8 em dispositivos Apple antigos (sem suporte a MediaSource)
        const noMseSupport = !window.MediaSource;
        if (noMseSupport && typeof url === 'string') {
            if (active?.type === 'xtream' && currentStream.type === 'channel') {
                url = url.replace(/\.ts$/, '') + '.m3u8';
            } else if (url.match(/\/(live|movie|series)\/.*\/.*\/.*\.ts/)) {
                url = url.replace(/\.ts$/, '.m3u8');
            }
        }

        const isMixedContent = window.location.protocol === 'https:' && url.startsWith('http://');
        if ((isMixedContent || useProxy) && !url.includes('/api/proxy/stream')) {
            let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            if (!apiBase.endsWith('/api')) apiBase += '/api';

            // Adicionar token de autenticação se disponível
            const token = localStorage.getItem('token');
            const proxyUrl = `${apiBase}/proxy/stream?url=${encodeURIComponent(url)}`;
            return token ? `${proxyUrl}&token=${token}` : proxyUrl;
        }
        return url;
    }, [currentStream, useProxy, getActivePlaylist, streamFormatFallback]);

    const initPlayer = useCallback(async () => {
        if (!currentStream || !videoRef.current) return;
        const streamUrl = getStreamUrl();
        const isHls = streamUrl.toLowerCase().includes('.m3u8') || streamUrl.includes('type=m3u8');
        let isTs = streamUrl.toLowerCase().includes('.ts') || streamUrl.includes('output=ts');
        const activePlaylist = getActivePlaylist();

        if (!isHls && !isTs && activePlaylist?.type === 'xtream' && currentStream.type === 'channel') {
            isTs = true; // Assumir TS para canais ao vivo Xtream sem extensão clara
        }

        cleanUp();
        setError(null);
        setIsBuffering(true);

        if (isHls && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch((e) => {
                console.log('Autoplay with sound blocked:', e.message);
                setIsPlaying(false);
            });
        } else if (isHls && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                liveSyncDurationCount: 3, // Melhor sincronização para ao vivo
                maxBufferLength: 30, // Mantém 30s de buffer para evitar travamentos
                maxMaxBufferLength: 60,
                manifestLoadingMaxRetry: 10,
                fragLoadingMaxRetry: 10,
                xhrSetup: (xhr) => { xhr.withCredentials = false; }
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (videoRef.current) {
                    videoRef.current.play().catch((e) => {
                        console.log('Autoplay with sound blocked:', e.message);
                        setIsPlaying(false);
                    });
                }
            });
            hls.on(Hls.Events.ERROR, (e, data) => {
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        if (!useProxy) {
                            setUseProxy(true);
                        } else if (activePlaylist?.type === 'xtream' && streamFormatFallback < 6) {
                            setStreamFormatFallback(prev => prev + 1);
                            setUseProxy(false);
                        } else {
                            setError("Erro ao carregar a stream HLS.");
                        }
                    } else {
                        setError("Erro ao carregar a stream HLS.");
                    }
                }
            });
        } else if (isTs && mpegjs.isSupported()) {
            try {
                const mpeg = mpegjs.createPlayer({
                    type: 'mse',
                    url: streamUrl,
                    isLive: true,
                    cors: true
                }, {
                    enableWorker: true,
                    enableStallDetached: true, // RE-ATIVADO: vital para pular frames corrompidos iniciais do IPTV
                    fixAudioTimestampGap: true, // Importante para IPTV
                    stashInitialSize: 512, // Aumentado para 512KB para garantir download de keyframes inteiros
                    autoCleanupSourceBuffer: true,
                    lazyLoad: false,
                    liveBufferLatencyChasing: false
                });
                mpeg.attachMediaElement(videoRef.current);
                mpeg.load();
                mpeg.play().catch((e) => {
                    console.log('Autoplay with sound blocked:', e.message);
                    setIsPlaying(false);
                });
                mpegPlayerRef.current = mpeg;

                mpeg.on(mpegjs.Events.ERROR, (type, detail, info) => {
                    console.error('[MPEG-TS ERROR]', type, detail, info);
                    if (!useProxy) {
                        setUseProxy(true);
                    } else if (activePlaylist?.type === 'xtream' && streamFormatFallback < 6) {
                        setStreamFormatFallback(prev => prev + 1);
                        setUseProxy(false);
                    } else {
                        setError("Erro na stream MPEG-TS.");
                    }
                });
            } catch (err) { setError("O formato TS não é suportado neste dispositivo."); }
        } else {
            videoRef.current.src = streamUrl;
            videoRef.current.play().catch((e) => {
                console.log('Autoplay with sound blocked:', e.message);
                setIsPlaying(false);
            });
        }
    }, [currentStream, getStreamUrl, cleanUp, useProxy]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onEnterNativePiP = () => {
            setIsNativePiP(true);
            setIsPiP(false); // Desativa o custom se o nativo entrar
        };
        const onLeaveNativePiP = () => setIsNativePiP(false);

        video.addEventListener('enterpictureinpicture', onEnterNativePiP);
        video.addEventListener('leavepictureinpicture', onLeaveNativePiP);
        // Fallback para WebKit (iOS)
        video.addEventListener('webkitbeginfullscreen', onEnterNativePiP);
        video.addEventListener('webkitendfullscreen', onLeaveNativePiP);

        // Media Session API para controle fora do navegador no Mobile
        if ('mediaSession' in navigator && currentStream) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentStream.name || 'IPTV Expert',
                artist: 'IPTV Stream',
                artwork: currentStream.logo ? [
                    { src: getProxyImageUrl(currentStream.logo), sizes: '512x512', type: 'image/png' }
                ] : []
            });
            navigator.mediaSession.setActionHandler('play', () => video.play());
            navigator.mediaSession.setActionHandler('pause', () => video.pause());
        }

        return () => {
            video.removeEventListener('enterpictureinpicture', onEnterNativePiP);
            video.removeEventListener('leavepictureinpicture', onLeaveNativePiP);
            video.removeEventListener('webkitbeginfullscreen', onEnterNativePiP);
            video.removeEventListener('webkitendfullscreen', onLeaveNativePiP);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
            }
        };
    }, [currentStream]);

    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const checkAirPlay = () => {
            if (window.WebKitPlaybackTargetAvailabilityEvent) {
                video.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => {
                    setAirplayAvailable(e.availability === 'available');
                });
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
        if (video.webkitEnterFullscreen) {
            video.webkitEnterFullscreen();
            return;
        }
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) container.requestFullscreen();
            else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const handlePiP = async () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            // Tenta PiP Nativo primeiro (mais estável e funciona fora do navegador)
            if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                    setIsPiP(false);
                } else {
                    // Verificar se metadados estão carregados antes de pedir PiP
                    if (video.readyState < 1) {
                        toast.error('Aguarde o vídeo carregar para usar PiP');
                        return;
                    }
                    await video.requestPictureInPicture();
                }
                return;
            }

            // Fallback para iOS/Safari (WebKit)
            if (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === 'function') {
                const mode = video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture';
                video.webkitSetPresentationMode(mode);
                return;
            }
        } catch (err) {
            console.warn('Native PiP failed, using custom fallback:', err);
        }

        // Se não houver suporte nativo, usa o custom draggable
        setIsPiP(!isPiP);
        if (!isPiP) {
            toast.success('Mini player ativado', { icon: '📺', duration: 2000 });
        }
    };

    const handlePipDragStart = (e) => {
        if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);

        const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

        pipDragRef.current = {
            dragging: true,
            startX: clientX,
            startY: clientY,
            initX: pipPosition.x,
            initY: pipPosition.y,
            lastX: pipPosition.x,
            lastY: pipPosition.y,
            rafId: null
        };
    };

    const handlePipDragMove = useCallback((e) => {
        if (!pipDragRef.current.dragging) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

        const updatePosition = () => {
            const dx = clientX - pipDragRef.current.startX;
            const dy = clientY - pipDragRef.current.startY;

            const newX = Math.max(0, Math.min(window.innerWidth - 320, pipDragRef.current.initX + dx));
            const newY = Math.max(0, Math.min(window.innerHeight - 180, pipDragRef.current.initY + dy));

            // Atualização direta no DOM para máxima performance sem causar re-renders pesados
            if (containerRef.current) {
                containerRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
            }
            pipDragRef.current.lastX = newX;
            pipDragRef.current.lastY = newY;

            pipDragRef.current.rafId = null;
        };

        if (pipDragRef.current.rafId) cancelAnimationFrame(pipDragRef.current.rafId);
        pipDragRef.current.rafId = requestAnimationFrame(updatePosition);
    }, []);

    const handlePipDragEnd = useCallback(() => {
        if (!pipDragRef.current.dragging) return;
        pipDragRef.current.dragging = false;
        if (pipDragRef.current.rafId) cancelAnimationFrame(pipDragRef.current.rafId);
        setIsDragging(false);

        // Sincroniza a posição final com o estado do React
        if (pipDragRef.current.lastX !== undefined) {
            setPipPosition({ x: pipDragRef.current.lastX, y: pipDragRef.current.lastY });
        }
    }, []);

    const handleDownload = (e) => {
        e.stopPropagation();
        const activePlaylist = getActivePlaylist();
        if (!activePlaylist) {
            toast.error('Adicione uma lista nas configurações para fazer downloads.');
            navigate('/settings');
            return;
        }
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const rawUrl = currentStream.streamUrl || currentStream.url;
        const isHls = rawUrl.includes('.m3u8') || rawUrl.includes('type=m3u8');
        if (isHls) {
            toast.error('Download não disponível para este formato (HLS)');
            return;
        }
        const downloadUrl = `${apiUrl}/proxy/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(currentStream.name)}`;
        window.open(downloadUrl, '_blank');
        toast.success('Download iniciado...');
    };

    useEffect(() => {
        if (!isPiP) return;
        const opts = { passive: false };
        window.addEventListener('pointermove', handlePipDragMove, opts);
        window.addEventListener('pointerup', handlePipDragEnd);
        return () => {
            window.removeEventListener('pointermove', handlePipDragMove, opts);
            window.removeEventListener('pointerup', handlePipDragEnd);
        };
    }, [isPiP, handlePipDragMove, handlePipDragEnd]);

    const handleAirPlay = () => {
        if (videoRef.current?.webkitShowPlaybackTargetPicker) {
            videoRef.current.webkitShowPlaybackTargetPicker();
        }
    };

    const progressKey = currentStream ? `progress_${currentStream.id}` : null;

    const loadProgress = useCallback(async () => {
        if (!currentStream || !progressKey || currentStream.type === 'channel') return;
        if (resumedRef.current === currentStream.id) return;
        let savedPosition = null;
        try {
            const active = getActivePlaylist();
            if (active) {
                const response = await api.get('/progress', {
                    params: { mediaId: currentStream.id, playlistId: active.id }
                });
                if (response.data?.progress) savedPosition = response.data.progress.last_position;
            }
        } catch (e) { }
        if (!savedPosition) {
            const local = parseFloat(localStorage.getItem(progressKey));
            if (local && local > 0) savedPosition = local;
        }
        if (savedPosition && savedPosition > 10) {
            const dur = videoRef.current?.duration || 0;
            if (dur > 0 && savedPosition > dur * 0.95) return;
            setResumeData(savedPosition);
            setIsPlaying(false);
        }
    }, [currentStream, progressKey, getActivePlaylist]);

    const handleResume = (shouldResume, e) => {
        if (e) e.stopPropagation();
        const savedPos = resumeData;
        setResumeData(null);
        resumedRef.current = currentStream?.id;

        if (videoRef.current) {
            videoRef.current.currentTime = shouldResume && savedPos ? savedPos : 0;
            videoRef.current.play().catch(() => { });
            setIsPlaying(true);
        }
    };

    const saveProgress = useCallback(async () => {
        if (!videoRef.current || !currentStream || (currentStream.type !== 'movie' && currentStream.type !== 'series')) return;
        const pos = videoRef.current.currentTime;
        if (!pos || pos < 5) return;
        if (progressKey) localStorage.setItem(progressKey, String(pos));
        try {
            const active = getActivePlaylist();
            if (active) {
                await api.post('/progress', {
                    mediaId: currentStream.id,
                    playlistId: active.id,
                    currentTime: pos,
                    duration: videoRef.current.duration
                });
            }
        } catch (error) { }
    }, [currentStream, progressKey, getActivePlaylist]);

    useEffect(() => {
        if (currentStream?.type !== 'movie' && currentStream?.type !== 'series') return;
        const interval = setInterval(saveProgress, 15000);
        return () => { clearInterval(interval); saveProgress(); };
    }, [currentStream, saveProgress]);

    const seek = (seconds) => {
        if (videoRef.current) videoRef.current.currentTime += seconds;
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        // Otimização para iPads antigos: não re-renderiza o React se os controles estiverem ocultos
        if (!showControls) return;

        const now = Date.now();
        // Atualiza a barra de progresso no máximo a cada 500ms para economizar CPU
        if (now - lastUpdateRef.current >= 500) {
            setCurrentTime(videoRef.current.currentTime);
            lastUpdateRef.current = now;
        }
    };

    // Atualiza o tempo imediatamente quando os controles aparecem
    useEffect(() => {
        if (showControls && videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            lastUpdateRef.current = Date.now();
        }
    }, [showControls]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch(() => {
                setIsPlaying(false);
            });
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, setIsPlaying]);

    useEffect(() => {
        if (isBuffering && !error) {
            const timeout = setTimeout(() => {
                if (!useProxy) {
                    toast('Conexão instável, ativando modo proxy...', { icon: '🔄', id: 'proxy-timeout' });
                    setUseProxy(true);
                } else if (getActivePlaylist()?.type === 'xtream' && streamFormatFallback < 6) {
                    setStreamFormatFallback(prev => prev + 1);
                    setUseProxy(false);
                } else {
                    setError('O canal demorou muito para responder ou está offline.');
                }
            }, 20000); // 20 segundos de timeout
            return () => clearTimeout(timeout);
        }
    }, [isBuffering, error, useProxy, setUseProxy]);

    useEffect(() => {
        setStreamFormatFallback(0);
        setUseProxy(false);
    }, [currentStream]);

    useEffect(() => {
        initPlayer();
        setIsPiP(false);
        return cleanUp;
    }, [currentStream, useProxy, streamFormatFallback, initPlayer, cleanUp]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && videoRef.current && isPlaying && !error && !isPiP) {
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
        } catch (e) { }
    }, [currentStream, getActivePlaylist]);

    useEffect(() => {
        if (showSchedule) fetchFullEpg();
    }, [showSchedule, fetchFullEpg]);

    if (!currentStream) return null;

    const playerContent = (
        <div
            ref={containerRef}
            className={`fixed z-[99999] bg-black group/container overflow-hidden shadow-2xl ${!isDragging ? 'transition-all duration-500' : ''
                } ${isPiP ? 'rounded-2xl border border-white/10' : 'inset-0'
                } ${isNativePiP ? 'pointer-events-none opacity-0 !w-0 !h-0' : 'opacity-100'} ${isDragging ? 'scale-[1.02] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] z-[100000] cursor-grabbing' : ''
                }`}
            style={isPiP ? {
                width: '320px',
                height: '180px',
                transform: `translate(${pipPosition.x}px, ${pipPosition.y}px)`,
                left: 0,
                top: 0,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                willChange: 'transform'
            } : {}}
            onPointerDown={isPiP ? handlePipDragStart : undefined}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <video
                ref={videoRef}
                className={`w-full h-full transition-all duration-300 ${isPiP ? 'object-cover' : 'object-contain'}`}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onError={() => {
                    const videoError = videoRef.current?.error;
                    if (videoError && videoError.code !== 1) { // 1 = MEDIA_ERR_ABORTED
                        if (!useProxy) {
                            setUseProxy(true);
                        } else if (getActivePlaylist()?.type === 'xtream' && streamFormatFallback < 6) {
                            setStreamFormatFallback(prev => prev + 1);
                            setUseProxy(false);
                        } else {
                            setError('Falha na conectividade da mídia.');
                        }
                    }
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={() => {
                    setDuration(videoRef.current?.duration || 0);
                    loadProgress();
                }}
                onClick={() => {
                    if (isPiP) setIsPiP(false);
                    else setShowControls(!showControls);
                }}
                playsInline
                autoPlay
                x-webkit-airplay="allow"
                webkit-playsinline="true"
            />

            {isPiP && !isNativePiP && (
                <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none opacity-0 group-hover/container:opacity-100 transition-opacity">
                    <div className="flex justify-end pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); setCurrentStream(null); setIsPiP(false); }} className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full backdrop-blur-md shadow-lg transition-all"><FiX size={16} /></button>
                    </div>
                    <div className="flex items-center justify-between pointer-events-auto">
                        <button onClick={(e) => {
                            e.stopPropagation();
                            if (videoRef.current) {
                                if (isPlaying) videoRef.current.pause();
                                else videoRef.current.play().catch(() => { });
                            }
                            togglePlay();
                        }} className="p-2 text-white hover:text-primary transition-colors">{isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}</button>
                        <span className="text-[10px] font-bold text-white truncate max-w-[140px] uppercase tracking-wider">{currentStream.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setIsPiP(false); }} className="p-2 text-white hover:text-primary transition-colors"><FiMaximize size={20} /></button>
                    </div>
                </div>
            )}

            {!isPiP && !isNativePiP && (
                <>
                    {resumeData && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
                            <div className="bg-surface/90 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm mx-4 transform animate-scale-up">
                                <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6"><FiRotateCw size={32} /></div>
                                <h3 className="text-xl font-black text-white mb-2">Continuar assistindo?</h3>
                                <p className="text-gray-400 text-sm mb-8 font-medium">Você parou em <span className="text-white font-bold">{formatTime(resumeData)}</span></p>
                                <div className="grid grid-cols-1 gap-3">
                                    <button onClick={(e) => handleResume(true, e)} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">Continuar</button>
                                    <button onClick={(e) => handleResume(false, e)} className="w-full py-4 bg-white/5 text-white/70 hover:text-white rounded-2xl font-black uppercase tracking-wider hover:bg-white/10 transition-all">Do início</button>
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
                            <button onClick={initPlayer} className="px-6 py-3 bg-primary rounded-xl text-sm font-black uppercase tracking-wider">Tentar Novamente</button>
                        </div>
                    )}

                    <div className={`absolute left-0 top-0 p-4 md:p-6 lg:p-10 transition-all duration-500 z-40 max-w-[90%] md:max-w-xl ${showControls ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                        <div className="flex flex-col gap-1 md:gap-3">
                            <h3 className="text-white text-base md:text-xl lg:text-3xl font-black leading-tight drop-shadow-2xl opacity-80 mb-1 line-clamp-1">{currentStream.name}</h3>
                            {currentStream.type === 'channel' && (() => {
                                const data = nowPlaying[currentStream.tvgId] || nowPlaying[currentStream.id];
                                if (!data?.current) return null;
                                const prog = data.current;
                                const parseDate = (d) => { if (!d) return null; const clean = d.split(' ')[0]; const y = clean.substring(0, 4), m = clean.substring(4, 6), day = clean.substring(6, 8), h = clean.substring(8, 10), min = clean.substring(10, 12); return new Date(`${y}-${m}-${day}T${h}:${min}:00`).getTime(); };
                                const start = parseDate(prog.start), stop = parseDate(prog.stop), now = Date.now();
                                const progress = start && stop ? Math.max(0, Math.min(100, ((now - start) / (stop - start)) * 100)) : 0;
                                return (
                                    <div className="space-y-1 md:space-y-3 animate-fade-in landscape:hidden md:landscape:block">
                                        <div className="flex items-center gap-3">
                                            <div className="px-2 py-0.5 bg-red-900/80 rounded text-[9px] lg:text-[11px] font-black text-red-200 uppercase tracking-widest border border-red-500/20">AO VIVO</div>
                                            <span className="text-xs lg:text-xl text-white font-black uppercase tracking-tight drop-shadow-lg truncate max-w-[200px]">{prog.title}</span>
                                        </div>
                                        <div className="w-full h-1 md:h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                            <div className="h-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="flex items-center gap-2 md:gap-3 mt-1">
                                <span className="px-1.5 py-0.5 md:px-3 md:py-1 bg-primary text-white text-[8px] md:text-[11px] font-black rounded-lg uppercase tracking-wider md:tracking-[0.2em] shadow-lg shadow-primary/20">{currentStream.group}</span>
                                {duration === 0 && <span className="flex items-center gap-1 text-[8px] md:text-[11px] text-red-500 font-black uppercase tracking-widest animate-pulse"><div className="w-1 h-1 bg-red-500 rounded-full" /> AO VIVO</span>}
                            </div>
                        </div>
                    </div>

                    <div className={`absolute top-0 right-0 p-4 md:p-6 pt-[calc(env(safe-area-inset-top,0px)+1rem)] transition-opacity duration-300 z-40 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isPiP || isNativePiP) {
                                    // Se já estiver em PiP (custom ou nativo), apenas esconde a UI
                                    // isNativePiP já esconderá tudo no render
                                    setShowControls(false);
                                } else {
                                    setCurrentStream(null);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2.5 bg-black/60 hover:bg-red-600/40 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all backdrop-blur-md border border-white/10 shadow-2xl"
                        >
                            <FiChevronLeft size={16} /><span className="landscape:hidden md:landscape:inline">Sair</span>
                        </button>
                    </div>

                    {!isBuffering && (
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 md:gap-4 lg:gap-12 transition-all z-30 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <button onClick={(e) => { e.stopPropagation(); playPrev(); }} className="w-8 h-8 md:w-10 md:h-10 lg:w-14 lg:h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/10"><FiSkipBack size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-md rounded-full flex flex-col items-center justify-center text-white hover:bg-white/10 transition-all border border-white/10"><FiRotateCcw size={18} /><span className="text-[8px] md:text-[10px] font-bold mt-0.5">10s</span></button>
                            <button onClick={(e) => {
                                e.stopPropagation();
                                if (videoRef.current) {
                                    if (isPlaying) videoRef.current.pause();
                                    else videoRef.current.play().catch(() => { });
                                }
                                togglePlay();
                            }} className="w-14 h-14 md:w-20 md:h-20 lg:w-28 lg:h-28 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all">{isPlaying ? <FiPause size={28} className="md:size-[48px]" /> : <FiPlay size={28} className="md:size-[48px] ml-1" />}</button>
                            <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-white/5 backdrop-blur-md rounded-full flex flex-col items-center justify-center text-white hover:bg-white/10 transition-all border border-white/10"><FiRotateCw size={18} /><span className="text-[8px] md:text-[10px] font-bold mt-0.5">10s</span></button>
                            <button onClick={(e) => { e.stopPropagation(); playNext(); }} className="w-8 h-8 md:w-10 md:h-10 lg:w-14 lg:h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/10"><FiSkipForward size={18} /></button>
                        </div>
                    )}

                    <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 lg:p-10 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] transition-all duration-500 z-40 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                        <div className="max-w-7xl mx-auto flex flex-col gap-3 md:gap-6">
                            {duration > 0 && (
                                <div className="group/seek relative w-full h-1.5 md:h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden backdrop-blur-md border border-white/5" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const pct = x / rect.width; if (videoRef.current) videoRef.current.currentTime = pct * duration; }}>
                                    <div className="absolute top-0 left-0 h-full bg-primary transition-[width] duration-500 ease-linear" style={{ width: `${(currentTime / duration) * 100}%` }} />
                                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 transition-opacity shadow-xl" style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }} />
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 md:gap-6">
                                    <div className="flex items-center gap-1 md:gap-3 landscape:hidden md:landscape:flex">
                                        <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 md:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all">{isMuted || volume === 0 ? <FiVolumeX size={18} className="md:size-[24px]" /> : <FiVolume2 size={18} className="md:size-[24px]" />}</button>
                                        <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); setIsMuted(v === 0); localStorage.setItem('player_volume', v); if (videoRef.current) videoRef.current.volume = v; }} className="w-16 md:w-24 lg:w-32 accent-primary cursor-pointer" />
                                    </div>
                                    <div className="text-[10px] md:text-[12px] font-black text-white/50 tracking-widest uppercase">{formatTime(currentTime)} <span className="mx-1 md:mx-2 opacity-20">/</span> {duration > 0 ? formatTime(duration) : 'AO VIVO'}</div>
                                </div>
                                <div className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar">
                                    <button onClick={handlePiP} className="p-1.5 md:p-2 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Mini Player"><FiMinimize2 size={18} className="md:size-[22px]" /></button>
                                    {currentStream.type === 'channel' && (
                                        <button onClick={() => setShowSchedule(true)} className="p-1.5 md:p-2 text-white/70 hover:bg-white/10 rounded-lg transition-all" title="Programação"><FiClock size={18} className="md:size-[22px]" /></button>
                                    )}
                                    {currentStream.type !== 'channel' && user?.canDownload && (
                                        <button onClick={handleDownload} className="p-1.5 md:p-2 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Download"><FiDownload size={18} className="md:size-[22px]" /></button>
                                    )}
                                    {airplayAvailable && <button onClick={handleAirPlay} className="p-1.5 md:p-2 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Transmitir"><FiAirplay size={18} className="md:size-[22px]" /></button>}
                                    <button onClick={toggleFullscreen} className="p-1.5 md:p-2 text-white/70 hover:bg-white/10 rounded-lg transition-all" title="Tela Cheia"><FiMaximize size={18} className="md:size-[22px]" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {showSchedule && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[100] flex justify-end animate-fade-in" onClick={() => setShowSchedule(false)}>
                    <div className="w-full max-w-md h-full bg-surface/95 border-l border-white/10 shadow-2xl flex flex-col animate-slide-left" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/10 flex items-center justify-between">
                            <div><h3 className="text-xl font-black text-white uppercase tracking-tight">Programação</h3><p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{currentStream.name}</p></div>
                            <button onClick={() => setShowSchedule(false)} className="p-3 bg-white/5 hover:bg-red-600/20 hover:text-red-500 rounded-2xl transition-all"><FiX size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {fullEpg.length > 0 ? fullEpg.map((prog, idx) => {
                                const parseDate = (d) => { if (!d) return null; const clean = d.split(' ')[0]; const y = clean.substring(0, 4), m = clean.substring(4, 6), day = clean.substring(6, 8), h = clean.substring(8, 10), min = clean.substring(10, 12); return new Date(`${y}-${m}-${day}T${h}:${min}:00`); };
                                const start = parseDate(prog.start), stop = parseDate(prog.stop), now = new Date();
                                const isCurrent = start && stop && now >= start && now <= stop;
                                return (
                                    <div key={idx} className={`p-5 rounded-2xl border transition-all ${isCurrent ? 'bg-primary/20 border-primary/30' : 'bg-white/5 border-white/5'}`}>
                                        <div className="flex items-center gap-3 mb-2"><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isCurrent ? 'bg-primary' : 'bg-white/10'}`}>{start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{isCurrent && <span className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse">No Ar</span>}</div>
                                        <h4 className="font-black text-white uppercase mb-1">{prog.title}</h4>
                                        {prog.desc && <p className="text-[11px] text-gray-400 font-medium line-clamp-2">{prog.desc}</p>}
                                    </div>
                                );
                            }) : (
                                <div className="h-full flex flex-col items-center justify-center text-center px-10"><FiClock size={48} className="text-white/10 mb-6" /><p className="text-xs font-black uppercase tracking-widest text-white/40">Nenhuma programação disponível</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(playerContent, document.body);
}

function formatTime(seconds) {
    if (!seconds || !Number.isFinite(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
