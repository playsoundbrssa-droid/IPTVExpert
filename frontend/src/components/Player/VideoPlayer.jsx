import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { useEpgStore } from '../../stores/useEpgStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import { useUserStore } from '../../stores/useUserStore';
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
import { api, getProxyImageUrl } from '../../services/api';
import toast from 'react-hot-toast';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const mpegPlayerRef = useRef(null);
    const containerRef = useRef(null);
    const playPromiseRef = useRef(null);
    const isInitializingRef = useRef(false);

    const { currentStream, setCurrentStream, isPlaying, togglePlay, setIsPlaying, playNext, playPrev } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    const { nowPlaying } = useEpgStore();
    const { getActivePlaylist } = usePlaylistManagerStore();
    const { user } = useUserStore();
    const navigate = useNavigate();
    const resumedRef = useRef(null);

    const isVOD = useMemo(() => {
        if (!currentStream) return false;
        const type = currentStream.type?.toLowerCase();
        // Incluir todas as variações de séries e episódios
        return type === 'movie' || type === 'series' || type === 'vod' || type === 'episode' || type === 'movie_vod' || type === 'series_vod';
    }, [currentStream]);

    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState(null);
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
            try {
                videoRef.current.pause();
                videoRef.current.removeAttribute('src');
                videoRef.current.load();
            } catch (e) { }
        }
    }, []);

    const isApple = useMemo(() => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document, []);

    const getStreamUrl = useCallback(() => {
        if (!currentStream) return '';
        let url = currentStream.streamUrl || currentStream.url;
        if (!url) return '';

        const active = getActivePlaylist();

        // Tentar formatos diferentes de URL Xtream em caso de erro 404
        if (active?.type === 'xtream' && currentStream.type === 'channel') {
            try {
                const urlObj = new URL(url);
                const baseUrl = urlObj.origin;
                const pathParts = urlObj.pathname.split('/').filter(p => p);

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
                    const id = idStr.split('.')[0];
                    const variations = [
                        `${baseUrl}/${user}/${pass}/${id}.ts`,              // 1
                        `${baseUrl}/${user}/${pass}/${id}`,                 // 2
                        `${baseUrl}/live/${user}/${pass}/${id}.ts`,         // 3
                        `${baseUrl}/live/${user}/${pass}/${id}`,            // 4
                        `${baseUrl}/${user}/${pass}/${id}.m3u8`,            // 5
                        `${baseUrl}/live/${user}/${pass}/${id}.m3u8`,       // 6
                        `${baseUrl}/${user}/${pass}/${id}.ts?output=ts`,    // 7
                        `${baseUrl}/live/${user}/${pass}/${id}.ts?output=ts`, // 8
                        `${baseUrl}/${user}/${pass}/${id}.m3u8?output=m3u8`, // 9
                        `${baseUrl}/live/${user}/${pass}/${id}.ts?output=mpegts` // 10
                    ];

                    if (streamFormatFallback > 0 && streamFormatFallback <= variations.length) {
                        url = variations[streamFormatFallback - 1];
                    }
                }
            } catch (e) { }
        }

        // Determinar se usamos proxy ou se é tentativa direta (Fallback 10+)
        const isDirectAttempt = streamFormatFallback >= 10;

        // Conversão agressiva para M3U8 em dispositivos Apple antigos (MediaSource ausente)
        const noMseSupport = !window.MediaSource;
        if (noMseSupport && typeof url === 'string') {
            if (active?.type === 'xtream' && currentStream.type === 'channel') {
                url = url.replace(/\.ts$/, '') + '.m3u8';
            } else if (url.match(/\/(live|movie|series)\/.*\/.*\/.*\.ts/)) {
                url = url.replace(/\.ts$/, '.m3u8');
            }
        }

        const isMixedContent = window.location.protocol === 'https:' && url.startsWith('http://');
        // Se for mixed content, O PROXY É OBRIGATÓRIO, senão o navegador bloqueia.
        const shouldProxy = isMixedContent || (useProxy && !isDirectAttempt);

        if (shouldProxy && !url.includes('/api/proxy/stream')) {
            let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            // Garantir que o apiBase use HTTPS se o site for HTTPS para evitar novo Mixed Content
            if (window.location.protocol === 'https:' && apiBase.startsWith('http://')) {
                apiBase = apiBase.replace('http://', 'https://');
            }

            if (!apiBase.endsWith('/api')) apiBase += '/api';

            const token = localStorage.getItem('token');
            const proxyUrl = `${apiBase}/proxy/stream?url=${encodeURIComponent(url)}`;
            const cacheBuster = `&_t=${Date.now()}&_v=${streamFormatFallback}`;
            return token ? `${proxyUrl}&token=${token}${cacheBuster}` : `${proxyUrl}${cacheBuster}`;
        }
        return url;
    }, [currentStream, useProxy, getActivePlaylist, streamFormatFallback]);

    const playVideo = useCallback(async () => {
        if (!videoRef.current || isInitializingRef.current) return;

        // Se já houver uma promessa de play em curso, aguardamos ela
        if (playPromiseRef.current) {
            try { await playPromiseRef.current; } catch (e) { }
        }

        try {
            videoRef.current.muted = false;
            const promise = videoRef.current.play();
            playPromiseRef.current = promise;
            await promise;
            setIsMuted(false);
            playPromiseRef.current = null;
        } catch (e) {
            playPromiseRef.current = null;
            console.log('Autoplay blocked, trying muted...');
            if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                try {
                    const promise = videoRef.current.play();
                    playPromiseRef.current = promise;
                    await promise;
                    playPromiseRef.current = null;
                } catch (err) {
                    playPromiseRef.current = null;
                    console.error('Playback failed completely:', err);
                    // No mobile, se falhar tudo, mantemos isPlaying como true 
                    // para mostrar o overlay de "Toque para Iniciar"
                    if (videoRef.current.paused && isPlaying) {
                        // Não fazemos nada, o UI vai mostrar o botão de play
                    }
                }
            }
        }
    }, [isPlaying, setIsPlaying]);

    const initPlayer = useCallback(async () => {
        if (!currentStream || !videoRef.current) return;

        const streamUrl = getStreamUrl();
        const isHls = streamUrl.toLowerCase().includes('.m3u8') || streamUrl.includes('type=m3u8');
        let isTs = streamUrl.toLowerCase().includes('.ts') || streamUrl.includes('output=ts');
        const activePlaylist = getActivePlaylist();

        if (!isHls && !isTs && activePlaylist?.type === 'xtream' && currentStream.type === 'channel') {
            isTs = true;
        }

        // Salvar tempo atual se for VOD para retomar após erro
        const savedTime = videoRef.current?.currentTime || 0;

        cleanUp();
        setError(null);
        setIsBuffering(true);
        isInitializingRef.current = true;

        // Resetar áudio para garantir início com som
        if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.volume = 1;
            setIsMuted(false);
            // Se for VOD e tivermos um tempo salvo, vamos tentar aplicar após o load
            if (isVOD && savedTime > 0) {
                const onLoaded = () => {
                    videoRef.current.currentTime = savedTime;
                    videoRef.current.removeEventListener('loadedmetadata', onLoaded);
                };
                videoRef.current.addEventListener('loadedmetadata', onLoaded);
            }
        }

        if (isHls && (isApple || videoRef.current.canPlayType('application/vnd.apple.mpegurl'))) {
            videoRef.current.src = streamUrl;
            playVideo();
        } else if (isHls && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                liveSyncDurationCount: 4, // Mais estabilidade
                maxMaxBufferLength: 60,   // 60s de buffer
                manifestLoadingMaxRetry: 10,
                fragLoadingMaxRetry: 10,
                lowLatencyMode: false,
                xhrSetup: (xhr) => { xhr.withCredentials = false; }
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
            isInitializingRef.current = false;

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (isVOD && savedTime > 0) {
                    videoRef.current.currentTime = savedTime;
                }
            });
            hls.on(Hls.Events.ERROR, (e, data) => {
                if (data.fatal) {
                    // Se for erro de rede ou 404, pula imediatamente
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.response?.code === 404) {
                        if (!useProxy) {
                            setUseProxy(true);
                        } else if (activePlaylist?.type === 'xtream' && streamFormatFallback < 10) {
                            setStreamFormatFallback(prev => prev + 1);
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
                    enableStallDetached: true,
                    fixAudioTimestampGap: true,
                    stashInitialSize: 1024, // 1MB de buffer inicial para máxima estabilidade
                    autoCleanupSourceBuffer: true,
                    lazyLoad: false,
                    liveBufferLatencyChasing: true,
                    liveBufferLatencyMaxLatency: 15, // Mais folga para evitar pausas constantes
                    liveBufferLatencyMinRemain: 2,
                    deferLoadAfterSourceOpen: false
                });
                mpeg.attachMediaElement(videoRef.current);
                mpeg.load();
                mpegPlayerRef.current = mpeg;
                isInitializingRef.current = false;

                if (isVOD && savedTime > 0) {
                    videoRef.current.currentTime = savedTime;
                }

                mpeg.on(mpegjs.Events.ERROR, (type, detail, info) => {
                    console.error('[MPEG-TS ERROR]', type, detail, info);
                    // Se for 404 ou erro de rede, pula imediatamente
                    if (info?.code === 404 || detail === mpegjs.ErrorDetails.NETWORK_EXCEPTION || detail === mpegjs.ErrorDetails.NETWORK_TIMEOUT) {
                        if (!useProxy) {
                            setUseProxy(true);
                        } else if (activePlaylist?.type === 'xtream' && streamFormatFallback < 10) {
                            setStreamFormatFallback(prev => prev + 1);
                        } else {
                            setError("O sinal deste canal está instável no momento.");
                            // Tentar re-inicializar em 5 segundos se falhar tudo
                            setTimeout(() => { if (!videoRef.current?.paused) initPlayer(); }, 5000);
                        }
                    } else if (!useProxy) {
                        setUseProxy(true);
                    } else {
                        // Erro genérico, tenta recarregar o sinal
                        console.warn('[Player] Erro genérico, tentando reconectar...');
                        setTimeout(initPlayer, 2000);
                    }
                });
            } catch (err) { setError("O formato TS não é suportado neste dispositivo."); }
        } else if (videoRef.current.canPlayType('video/mp4') || videoRef.current.canPlayType('video/mp2t')) {
            videoRef.current.src = streamUrl;
            isInitializingRef.current = false;
        }
    }, [currentStream, getStreamUrl, cleanUp, useProxy, getActivePlaylist, streamFormatFallback]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onEnterNativePiP = () => {
            setIsNativePiP(true);
            setIsPiP(false);
        };
        const onLeaveNativePiP = () => setIsNativePiP(false);

        video.addEventListener('enterpictureinpicture', onEnterNativePiP);
        video.addEventListener('leavepictureinpicture', onLeaveNativePiP);
        video.addEventListener('webkitbeginfullscreen', onEnterNativePiP);
        video.addEventListener('webkitendfullscreen', onLeaveNativePiP);

        return () => {
            video.removeEventListener('enterpictureinpicture', onEnterNativePiP);
            video.removeEventListener('leavepictureinpicture', onLeaveNativePiP);
            video.removeEventListener('webkitbeginfullscreen', onEnterNativePiP);
            video.removeEventListener('webkitendfullscreen', onLeaveNativePiP);
        };
    }, []);

    const togglePiP = async () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPiP) {
            setIsPiP(false);
            return;
        }

        if (document.pictureInPictureEnabled && !video.disablePictureInPicture) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
                return;
            } catch (error) {
                console.error('Native PiP failed:', error);
            }
        }

        if (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === 'function') {
            const mode = video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture';
            video.webkitSetPresentationMode(mode);
            return;
        }

        setIsPiP(true);
    };

    const handlePointerDown = (e) => {
        if (!isPiP) return;
        if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);

        pipDragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initX: pipPosition.x,
            initY: pipPosition.y
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (e) => {
            if (!pipDragRef.current.dragging) return;
            const dx = e.clientX - pipDragRef.current.startX;
            const dy = e.clientY - pipDragRef.current.startY;

            setPipPosition({
                x: Math.max(0, Math.min(window.innerWidth - 320, pipDragRef.current.initX + dx)),
                y: Math.max(0, Math.min(window.innerHeight - 180, pipDragRef.current.initY + dy))
            });
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            pipDragRef.current.dragging = false;
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging]);

    const progressKey = useMemo(() =>
        currentStream ? `progress_${currentStream.id}` : null
        , [currentStream]);

    useEffect(() => {
        if (!currentStream || resumedRef.current === currentStream.id) return;

        const checkResume = async () => {
            let savedPosition = 0;
            try {
                const active = getActivePlaylist();
                if (active) {
                    // Usar params na query para o GET
                    const response = await api.get('/progress', {
                        params: {
                            mediaId: currentStream.id,
                            playlistId: active.id
                        }
                    });
                    if (response.data?.progress) savedPosition = response.data.progress.last_position;
                }
            } catch (e) {
                console.error('[Player] Erro ao buscar progresso no servidor:', e);
            }
            if (!savedPosition) {
                const local = parseFloat(localStorage.getItem(progressKey));
                if (local && local > 0) savedPosition = local;
            }

            if (savedPosition > 10) {
                setResumeData(savedPosition);
            } else {
                setResumeData(null);
                resumedRef.current = currentStream.id;
            }
        };

        if (isVOD && currentStream?.id) {
            checkResume();
        } else {
            setResumeData(null);
        }
    }, [currentStream?.id, progressKey, getActivePlaylist, isVOD]);

    // Resetar o estado de 'já resumido' quando o stream muda de verdade
    useEffect(() => {
        if (currentStream?.id) {
            resumedRef.current = null;
        }
    }, [currentStream?.id]);

    const handleResume = (shouldResume) => {
        const savedPos = resumeData;
        setResumeData(null);
        resumedRef.current = currentStream?.id;

        if (videoRef.current) {
            videoRef.current.currentTime = shouldResume && savedPos ? savedPos : 0;
            playVideo();
        }
    };

    const saveProgress = useCallback(async () => {
        if (!videoRef.current || !currentStream || !isVOD) return;
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
    }, [currentStream, progressKey, getActivePlaylist, isVOD]);

    useEffect(() => {
        if (!isVOD) return;
        const interval = setInterval(saveProgress, 10000);
        return () => { clearInterval(interval); saveProgress(); };
    }, [isVOD, saveProgress]);

    const seek = (seconds) => {
        if (videoRef.current) videoRef.current.currentTime += seconds;
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            setCurrentTime(video.currentTime);
            // Se o tempo está mudando, o vídeo NÃO está buffereando
            if (isBuffering && video.currentTime > 0) {
                setIsBuffering(false);
            }

            // Recuperação de dessincronização (AV Sync)
            if (isPlaying && !isBuffering && video.buffered.length > 0) {
                const lastBuffered = video.buffered.end(video.buffered.length - 1);
                const gap = lastBuffered - video.currentTime;
                // Se o gap for muito grande (> 10s), pula para o fim do buffer
                if (gap > 10 && currentStream.type === 'channel') {
                    console.warn('[Player] AV Sync gap too large, jumping to live edge...');
                    video.currentTime = lastBuffered - 1;
                }
            }
        }
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video || isInitializingRef.current) return;

        // Watchdog para detectar se o vídeo travou enquanto deveria estar tocando
        const watchdog = setInterval(() => {
            if (isPlaying && video.paused && !isBuffering && !isInitializingRef.current && !playPromiseRef.current) {
                console.log('[Watchdog] Detectado vídeo parado indevidamente, tentando retomar...');
                playVideo();
            }
        }, 3000);

        const timer = setTimeout(() => {
            const syncPlayback = async () => {
                if (isPlaying) {
                    if (video.paused && !playPromiseRef.current) {
                        playVideo();
                    }
                } else {
                    if (!video.paused) {
                        video.pause();
                    }
                }
            };
            syncPlayback();
        }, 200);

        return () => {
            clearTimeout(timer);
            clearInterval(watchdog);
        };
    }, [isPlaying, playVideo, isBuffering]);

    useEffect(() => {
        initPlayer();
        setIsPiP(false);
        return cleanUp;
    }, [currentStream, useProxy, streamFormatFallback, initPlayer, cleanUp]);

    useEffect(() => {
        if (!currentStream) return;
        setStreamFormatFallback(0);
        setUseProxy(false);
        setError(null);
    }, [currentStream]);

    // Watchdog: Se ficar buffereando por mais de 12s, tenta próxima variação
    useEffect(() => {
        if (!isBuffering || error || !currentStream) return;
        const timer = setTimeout(() => {
            if (isBuffering && !error) {
                console.warn(`[Player] Buffer timeout na variação ${streamFormatFallback}, tentando próxima...`);
                if (!useProxy) {
                    setUseProxy(true);
                } else if (streamFormatFallback < 10) {
                    setStreamFormatFallback(prev => prev + 1);
                }
            }
        }, 12000);
        return () => clearTimeout(timer);
    }, [isBuffering, error, streamFormatFallback, useProxy, currentStream]);

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

    // Memória rápida para evitar recarregar o mesmo canal
    const epgCache = useRef({});

    const loadFullEpg = useCallback(async () => {
        if (!currentStream || (currentStream.type !== 'channel' && currentStream.type !== 'live')) return;

        const channelId = currentStream.id;
        const now = Date.now();

        // Se já temos no cache e foi buscado há menos de 5 minutos, não busca de novo
        if (epgCache.current[channelId] && (now - epgCache.current[channelId].timestamp < 300000)) {
            setFullEpg(epgCache.current[channelId].data);
            return;
        }

        try {
            const active = getActivePlaylist();
            if (!active) return;

            let data = [];

            // Lógica para Xtream
            if (active.type === 'xtream') {
                const streamId = channelId.split('_').pop();
                const { server, username, password } = active.config;

                const response = await api.get('/xtream/short-epg', {
                    params: { server, username, password, stream_id: streamId }
                });

                if (response.data && response.data.epg_listings) {
                    data = response.data.epg_listings.map(item => {
                        const decode = (str) => {
                            try { return decodeURIComponent(escape(atob(str))); } catch (e) { return str; }
                        };
                        return {
                            title: decode(item.title),
                            description: item.description ? decode(item.description) : '',
                            start: item.start,
                            end: item.end
                        };
                    });
                }
            }
            // Lógica para M3U / XMLTV
            else if (currentStream.epgId && active.epgCacheKey) {
                const response = await api.get(`/epg/${currentStream.epgId}`, {
                    params: { cacheKey: active.epgCacheKey }
                });
                data = response.data || [];
            }

            // Salva no cache antes de atualizar o estado
            epgCache.current[channelId] = { data, timestamp: now };
            setFullEpg(data);
        } catch (e) {
            setFullEpg([]);
        }
    }, [currentStream, getActivePlaylist]);

    // Carregamento antecipado (Background Loading)
    useEffect(() => {
        if (currentStream?.id) {
            setFullEpg([]); // Limpa a anterior para não mostrar dado errado
            loadFullEpg(); // Começa a carregar assim que o canal muda
        }
    }, [currentStream?.id, loadFullEpg]);

    if (!currentStream) return null;

    const playerContent = (
        <div
            ref={containerRef}
            className={`fixed transition-all duration-500 z-[99999] bg-black group/container overflow-hidden shadow-2xl touch-none ${isPiP ? 'rounded-2xl border border-white/10' : 'inset-0'
                } ${isNativePiP ? 'pointer-events-none opacity-0 !w-0 !h-0' : 'opacity-100'} ${isDragging ? 'scale-[1.02] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] z-[100000] cursor-grabbing' : ''
                }`}
            style={isPiP ? {
                width: '320px',
                height: '180px',
                left: `${pipPosition.x}px`,
                top: `${pipPosition.y}px`,
            } : {}}
            onPointerDown={handlePointerDown}
            onClick={(e) => {
                e.stopPropagation();
                if (!isPiP) setShowControls(!showControls);
            }}
            onDoubleClick={(e) => {
                if (isPiP) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x < rect.width / 3) seek(-10);
                else if (x > (rect.width * 2) / 3) seek(10);
            }}
        >
            <video
                ref={videoRef}
                className={`w-full h-full transition-all duration-300 ${isPiP ? 'object-cover' : 'object-contain'}`}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => { setIsBuffering(false); setError(null); }}
                onCanPlay={() => { setIsBuffering(false); }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                    setDuration(e.target.duration);
                    setIsBuffering(false);
                }}
                onPause={() => {
                    setIsPlaying(false);
                    if (isVOD) saveProgress();
                }}
                onEnded={() => {
                    setIsPlaying(false);
                    if (isVOD) {
                        // Limpar progresso ao terminar
                        api.post('/progress', {
                            mediaId: currentStream.id,
                            playlistId: getActivePlaylist()?.id,
                            currentTime: 0,
                            duration: duration
                        }).catch(() => { });
                    }
                    playNext();
                }}
                onError={() => {
                    if (!useProxy) setUseProxy(true);
                    else if (streamFormatFallback < 10) setStreamFormatFallback(prev => prev + 1);
                    else setError("Erro ao reproduzir o vídeo. Tente outro formato ou canal.");
                }}
                playsInline
                webkit-playsinline="true"
                crossOrigin="anonymous"
                muted={isMuted}
            />

            {isMuted && isPlaying && !isPiP && videoRef.current && !videoRef.current.paused && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] animate-bounce">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMuted(false); if (videoRef.current) videoRef.current.muted = false; }}
                        className="bg-primary text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl"
                    >
                        <FiVolumeX size={18} /> Ativar Som
                    </button>
                </div>
            )}

            {isBuffering && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                    <div className="relative">
                        <FiRefreshCw className="w-12 h-12 text-primary animate-spin" />
                        <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full"></div>
                    </div>
                    <p className="mt-4 text-[10px] font-black text-white uppercase tracking-[0.2em] animate-pulse">
                        {streamFormatFallback > 0 ? `Otimizando Sinal (Tentativa ${streamFormatFallback}/10)...` : 'Carregando Sinal HD...'}
                    </p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-xl z-50 p-6 text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                        <FiX size={40} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Falha na Transmissão</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-8">{error}</p>
                    <div className="flex gap-4">
                        <button onClick={initPlayer} className="px-8 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform">Tentar Novamente</button>
                        <button onClick={() => setCurrentStream(null)} className="px-8 py-3 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-colors">Fechar</button>
                    </div>
                </div>
            )}

            {resumeData && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[60] p-6">
                    <div className="bg-surface/90 border border-white/10 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl animate-zoom-in">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiClock size={32} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Continuar Assistindo?</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">Você parou em {formatTime(resumeData)}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleResume(true)} className="py-4 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg shadow-primary/20">Continuar</button>
                            <button onClick={() => handleResume(false)} className="py-4 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all border border-white/5">Do Início</button>
                        </div>
                    </div>
                </div>
            )}

            {!isPiP && !isNativePiP && (
                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-500 z-30 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute top-0 left-0 p-4 md:p-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] transition-transform duration-300">
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 backdrop-blur-md rounded-2xl md:rounded-[1.5rem] border border-white/10 overflow-hidden shadow-2xl group-hover:scale-110 transition-transform">
                                <img src={getProxyImageUrl(currentStream.logo)} alt="" className="w-full h-full object-contain p-2" onError={(e) => e.target.src = '/placeholder.png'} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 font-black text-[8px] md:text-[10px] rounded-full uppercase tracking-widest ${currentStream.type === 'channel' ? 'bg-primary text-black' : 'bg-white/20 text-white'
                                        }`}>
                                        {currentStream.type === 'channel' ? 'Ao Vivo' : currentStream.type === 'series' ? 'Série' : 'Filme'}
                                    </span>
                                    {currentStream.category && <span className="text-[8px] md:text-[10px] text-white/40 font-black uppercase tracking-widest"> • {currentStream.category}</span>}
                                </div>
                                <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight truncate max-w-[200px] md:max-w-md">{currentStream.name}</h2>
                                {nowPlaying[currentStream.epgId] && (
                                    <p className="text-[10px] md:text-xs text-primary font-black uppercase tracking-widest mt-1 animate-pulse">No Ar: {nowPlaying[currentStream.epgId].title}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 p-4 md:p-6 pt-[calc(env(safe-area-inset-top,0px)+1rem)] transition-opacity duration-300 z-40">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isPiP || isNativePiP) {
                                    setIsPiP(false);
                                    setIsNativePiP(false);
                                } else {
                                    setCurrentStream(null);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2.5 bg-black/60 hover:bg-red-600/40 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all backdrop-blur-md border border-white/10 shadow-2xl"
                        >
                            <FiChevronLeft size={16} /><span className="landscape:hidden md:landscape:inline">Sair</span>
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
                        {(currentStream.type !== 'channel') && (
                            <div className="mb-6 md:mb-8 group/progress">
                                <div className="flex justify-between text-[10px] md:text-xs font-black text-white/40 mb-3 uppercase tracking-widest">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                                <div
                                    className="h-1.5 md:h-2 bg-white/5 rounded-full cursor-pointer relative overflow-hidden"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const pos = (e.clientX - rect.left) / rect.width;
                                        videoRef.current.currentTime = pos * duration;
                                    }}
                                >
                                    <div className="absolute inset-y-0 left-0 bg-primary group-hover/progress:bg-primary-light transition-colors" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
                            <div className="flex items-center gap-3 md:gap-6">
                                <button onClick={playPrev} className="p-3 md:p-4 text-white/40 hover:text-white transition-colors bg-white/5 rounded-2xl md:rounded-[1.5rem]"><FiSkipBack size={20} /></button>
                                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-16 h-16 md:w-20 md:h-20 bg-primary hover:scale-110 active:scale-95 text-black rounded-3xl md:rounded-[2rem] flex items-center justify-center transition-all shadow-2xl shadow-primary/20">
                                    {isPlaying ? <FiPause size={32} /> : <FiPlay size={32} className="ml-1" />}
                                </button>
                                <button onClick={playNext} className="p-3 md:p-4 text-white/40 hover:text-white transition-colors bg-white/5 rounded-2xl md:rounded-[1.5rem]"><FiSkipForward size={20} /></button>

                                <div className="hidden md:flex items-center gap-3 ml-4">
                                    <button onClick={() => { videoRef.current.currentTime -= 10 }} className="p-4 text-white/40 hover:text-white transition-colors bg-white/5 rounded-[1.5rem]"><FiRotateCcw size={20} /></button>
                                    <button onClick={() => { videoRef.current.currentTime += 10 }} className="p-4 text-white/40 hover:text-white transition-colors bg-white/5 rounded-[1.5rem]"><FiRotateCw size={20} /></button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-center">
                                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md p-2 md:p-3 rounded-2xl md:rounded-[1.5rem] border border-white/10">
                                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 md:p-3 text-white/60 hover:text-white transition-colors">{isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}</button>
                                    <input type="range" min="0" max="1" step="0.1" defaultValue="1" onChange={(e) => videoRef.current.volume = e.target.value} className="w-16 md:w-24 accent-primary" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => addFavorite(currentStream)} className={`p-4 rounded-[1.5rem] transition-all border ${isFavorite ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'}`}><FiHeart size={20} fill={isFavorite ? 'currentColor' : 'none'} /></button>
                                    <button onClick={togglePiP} className="p-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-[1.5rem] transition-all border border-white/5"><FiMonitor size={20} /></button>
                                    <button onClick={() => setShowSchedule(true)} className="p-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-[1.5rem] transition-all border border-white/5"><FiClock size={20} /></button>
                                    <button onClick={() => containerRef.current.requestFullscreen()} className="p-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-[1.5rem] transition-all border border-white/5"><FiMaximize size={20} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isPiP && (
                <div className="absolute top-2 right-2 flex gap-2 z-50">
                    <button onClick={togglePiP} className="p-2 bg-black/60 text-white rounded-lg hover:bg-primary hover:text-black transition-all"><FiMaximize size={16} /></button>
                    <button onClick={() => setCurrentStream(null)} className="p-2 bg-black/60 text-white rounded-lg hover:bg-red-600 transition-all"><FiX size={16} /></button>
                </div>
            )}

            {showSchedule && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-end animate-fade-in" onClick={() => setShowSchedule(false)}>
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
