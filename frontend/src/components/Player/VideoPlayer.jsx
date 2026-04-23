import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import mpegjs from 'mpegts.js';

// Desativar logs verbosos do mpegts.js (MSEController, etc.)
if (typeof window !== 'undefined' && mpegjs.LoggingControl) {
    mpegjs.LoggingControl.enableAll = false;
    mpegjs.LoggingControl.enableError = true;
    mpegjs.LoggingControl.enableWarn = true;
}

import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { 
    FiX, FiPlay, FiPause, FiMaximize, FiVolume2, 
    FiVolumeX, FiRefreshCw, FiChevronLeft, FiChevronRight, 
    FiHeart, FiDownload, FiSkipBack, FiSkipForward, FiMenu,
    FiShare2, FiMessageSquare, FiClock, FiAirplay, FiMinimize2
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import { statsApi } from '../../api/stats';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const mpegPlayerRef = useRef(null);
    
    // Stores
    const { currentStream, setCurrentStream, isPlaying, togglePlay, playNext, playPrev, playlist } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    
    // UI State
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [epgInfo, setEpgInfo] = useState(null);
    const [showFullEpg, setShowFullEpg] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [useProxy, setUseProxy] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [position, setPosition] = useState({ x: 24, y: 24 }); // de baixo para cima, de direita para esquerda
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
    const controlsTimeout = useRef(null);
    const mainContainerRef = useRef(null);

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
        
        // Se o proxy estiver ativo e não for um link já proxied, envolvemos na URL de proxy do backend
        if (useProxy && !url.includes('/api/proxy/stream')) {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            return `${apiBase}/proxy/stream?url=${encodeURIComponent(url)}`;
        }

        return url;
    }, [currentStream, useProxy]);

    const handlePlayAction = useCallback(async () => {
        if (!videoRef.current) return;
        
        const playVideo = async () => {
            if (!videoRef.current) return;
            try {
                // Tenta tocar com som primeiro
                videoRef.current.muted = false;
                await videoRef.current.play();
                setIsMuted(false);
                if (!isPlaying) togglePlay();
                setIsBuffering(false);
            } catch (err) {
                if (err.name === 'AbortError') return;
                
                if (!videoRef.current) return;
                try {
                    // Fallback para mudo (permitido pelo browser)
                    videoRef.current.muted = true;
                    await videoRef.current.play();
                    setIsMuted(true);
                    if (!isPlaying) togglePlay();
                    setIsBuffering(false);
                } catch (e) {
                    if (e.name === 'AbortError') return;
                    console.error("[PLAYER] Falha na reprodução:", e);
                    setError("Erro ao iniciar vídeo.");
                }
            }
        };

        playVideo();
    }, [isPlaying, togglePlay]);

    // Listener global para "desbloquear" o áudio no primeiro clique
    useEffect(() => {
        const unlockAudio = () => {
            if (videoRef.current && isMuted) {
                videoRef.current.muted = false;
                setIsMuted(false);
                console.log("[PLAYER] Áudio desbloqueado por interação do usuário.");
                document.removeEventListener('click', unlockAudio);
                document.removeEventListener('keydown', unlockAudio);
            }
        };

        if (isMuted) {
            document.addEventListener('click', unlockAudio);
            document.addEventListener('keydown', unlockAudio);
        }
        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
    }, [isMuted]);

    // Sync isPlaying store state with video element
    useEffect(() => {
        if (!videoRef.current || !currentStream) return;
        if (isPlaying) {
            videoRef.current.play().catch(err => {
                if (err.name !== 'AbortError') console.error("[PLAYER] Auto-play failed:", err);
            });
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, currentStream]);

    // Carregar comentários locais
    useEffect(() => {
        if (currentStream) {
            const saved = localStorage.getItem(`comments_${currentStream.id}`);
            setComments(saved ? JSON.parse(saved) : []);
        }
    }, [currentStream]);

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        
        const comment = {
            id: Date.now(),
            text: newComment,
            user: 'Você',
            date: new Date().toISOString()
        };
        
        const updated = [comment, ...comments];
        setComments(updated);
        setNewComment('');
        localStorage.setItem(`comments_${currentStream.id}`, JSON.stringify(updated));
        toast.success('Comentário enviado!');
    };

    const handleCast = () => {
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (videoRef.current?.remote) {
            videoRef.current.remote.prompt().catch(() => {
                if (!isSafari) {
                    toast('Para espelhamento via AirPlay, utilize o navegador Safari.', { icon: '📺' });
                } else {
                    toast.error('O seu navegador não suporta espelhamento nativo.');
                }
            });
        } else if (videoRef.current?.webkitShowPlaybackTargetPicker) {
            videoRef.current.webkitShowPlaybackTargetPicker();
        } else {
            if (!isSafari) {
                toast('O espelhamento nativo (AirPlay) requer o Safari. Para Chrome, utilize a função de transmitir do próprio navegador.', { icon: '📺', duration: 5000 });
            } else {
                toast.error('O espelhamento não é suportado neste navegador.');
            }
        }
    };


    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            const dx = dragRef.current.startX - clientX;
            const dy = dragRef.current.startY - clientY;
            
            setPosition({
                x: Math.max(10, dragRef.current.initialX + dx),
                y: Math.max(10, dragRef.current.initialY + dy)
            });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    useEffect(() => {
        const handler = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handler);
        document.addEventListener('webkitfullscreenchange', handler);
        document.addEventListener('mozfullscreenchange', handler);
        document.addEventListener('MSFullscreenChange', handler);
        return () => {
            document.removeEventListener('fullscreenchange', handler);
            document.removeEventListener('webkitfullscreenchange', handler);
            document.removeEventListener('mozfullscreenchange', handler);
            document.removeEventListener('MSFullscreenChange', handler);
        };
    }, []);

    const handleFullscreen = () => {
        const container = mainContainerRef.current;
        if (!container) return;

        if (!isFullscreen) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            } else if (videoRef.current?.webkitEnterFullscreen) {
                videoRef.current.webkitEnterFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    const handleMouseDown = (e) => {
        if (!isMinimized) return;
        setIsDragging(true);
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialX: position.x,
            initialY: position.y
        };
    };

    const init = useCallback((attempt = 0) => {
        if (!currentStream || !videoRef.current) return;
        
        const rawUrl = currentStream.streamUrl || currentStream.url || '';
        if (!rawUrl) {
            console.error("[PLAYER] URL de transmissão vazia.");
            setError("URL de transmissão não encontrada.");
            return;
        }

        const isHls = rawUrl.toLowerCase().includes('.m3u8') || rawUrl.toLowerCase().includes('type=m3u8');
        let isTs = rawUrl.toLowerCase().includes('.ts') || rawUrl.toLowerCase().includes('output=ts') || rawUrl.toLowerCase().includes('mpegts') || rawUrl.includes('#');

        // Detecção de Mixed Content (HTTP em página HTTPS)
        const isMixedContent = window.location.protocol === 'https:' && rawUrl.startsWith('http://');
        if ((isMixedContent || attempt > 0) && !useProxy) {
            console.warn(`[PLAYER] Ativando Smart Proxy (Mixed Content ou Fallback). Tentativa: ${attempt}`);
            setUseProxy(true);
            return; // O próximo render com useProxy=true chamará init novamente
        }

        const streamUrl = getStreamUrl();

        // Lógica de Tentativas (Cadeia de Decodificadores)
        if (currentStream.type === 'channel' && !isHls) isTs = true;
        
        // Ajuste baseado em tentativas de fallback
        // attempt 0: Tenta o formato detectado
        // attempt 1: Força o outro formato (TS se era HLS, ou vice-versa) ou tenta nativo
        let useHls = isHls && attempt === 0;
        let useTs = (isTs || (isHls && attempt === 1)) && !useHls;

        setError(null);
        setIsBuffering(true);
        cleanUp();
        statsApi.incrementView(currentStream);

        console.log(`[PLAYER] Tentativa ${attempt}: isHls=${isHls} | isTs=${isTs} | useHls=${useHls} | useTs=${useTs} | url=${rawUrl.substring(0, 50)}...`);

        // 1. Tentar HLS.js
        if (useHls && Hls.isSupported()) {
            const hls = new Hls({ 
                enableWorker: true, 
                lowLatencyMode: true,
                backBufferLength: 60,
                manifestLoadingMaxRetry: 3
            });
            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, handlePlayAction);
            hls.on(Hls.Events.ERROR, (e, data) => {
                const errorCode = data.response?.code;
                if (errorCode === 522 || errorCode === 504 || errorCode === 403) {
                    if (!useProxy) {
                        console.warn(`[PLAYER] Erro ${errorCode} no HLS. Tentando Proxy Pro...`);
                        setUseProxy(true);
                        init(); // Tenta carregar novamente com proxy
                    } else {
                        setError(`Erro ${errorCode}: O servidor da transmissão não responde.`);
                    }
                } else if (data.fatal) {
                    console.warn("[PLAYER] Falha fatal no HLS, tentando fallback TS...");
                    init(attempt + 1);
                }
            });
            hls.on(Hls.Events.FRAG_BUFFERED, () => setIsBuffering(false));
        } 
        // 2. Tentar MPEG-TS (mpegts.js)
        else if (useTs && mpegjs.isSupported()) {
            try {
                const mpeg = mpegjs.createPlayer({
                    type: 'mse',
                    url: streamUrl,
                    isLive: currentStream.type === 'channel' || isTs,
                    enableStashBuffer: false,
                    stashInitialSize: 128
                });
                mpeg.attachMediaElement(videoRef.current);
                mpeg.load();
                mpegPlayerRef.current = mpeg;
                
                mpeg.on(mpegjs.Events.METADATA_ARRIVED, () => {
                   handlePlayAction();
                   setIsBuffering(false);
                });

                mpeg.on(mpegjs.Events.ERROR, (type, detail, info) => {
                    console.error(`[PLAYER] Erro MPEG-TS: ${type} - ${detail}`, info);
                    
                    const errorCode = info?.code;
                    const isNetworkError = detail === mpegjs.ErrorDetails.NETWORK_TIMEOUT || errorCode === 522 || errorCode === 504 || detail === 'HttpStatusCodeInvalid';
                    
                    if (isNetworkError && !useProxy) {
                        console.warn("[PLAYER] Erro de rede no TS. Ativando Proxy Pro...");
                        setUseProxy(true);
                        init();
                    } else if (isNetworkError) {
                        setError("Conexão interrompida (Timeout). O servidor da lista demorou muito para responder.");
                    } else if (attempt < 1) {
                        init(attempt + 1);
                    } else {
                        setError("Erro no decodificador ou servidor de vídeo. Tente outro canal.");
                    }
                });
                
                // Algumas streams TS demoram a emitir METADATA_ARRIVED, tentamos play logo
                handlePlayAction();
            } catch (err) {
                console.error("[PLAYER] Falha ao iniciar mpegts:", err);
                init(attempt + 1);
            }
        } 
        // 3. Fallback Nativo (Safari HLS, MP4, etc.)
        else {
            videoRef.current.src = streamUrl;
            videoRef.current.load();
            handlePlayAction();
            setIsBuffering(false);
        }
    }, [currentStream, getStreamUrl, handlePlayAction, cleanUp]);

    useEffect(() => {
        init();
        setShowFullEpg(false); // Reseta ao mudar de canal
        
        // Helper para decodificar texto do EPG (Xtream usa Base64 com UTF-8)
        const decodeEPGText = (str) => {
            if (!str) return '';
            try {
                // Tenta decodificar como Base64 UTF-8
                return decodeURIComponent(escape(atob(str)));
            } catch (e) {
                try {
                    // Fallback para Base64 simples
                    return atob(str);
                } catch (e2) {
                    // Se não for base64, retorna o original
                    return str;
                }
            }
        };

        // Helper para lidar com datas do EPG (pode vir em vários formatos)
        const parseEPGDate = (dateStr) => {
            if (!dateStr) return new Date();
            const iso = dateStr.replace(' ', 'T');
            const d = new Date(iso);
            return isNaN(d.getTime()) ? new Date() : d;
        };

        // EPG Fetching Logic
        if (currentStream?.type === 'channel') {
            const fetchEPG = async () => {
                try {
                    const manager = usePlaylistManagerStore.getState();
                    const activePlaylist = manager.getActivePlaylist();
                    
                    if (activePlaylist?.type === 'xtream' && currentStream.id.startsWith('xtream_')) {
                        const streamId = currentStream.id.split('_').pop();
                        const { server, username, password } = activePlaylist.config;
                        
                        const { data } = await api.get('/xtream/short-epg', {
                            params: { server, username, password, stream_id: streamId }
                        });

                        if (data && data.epg_listings && data.epg_listings.length > 0) {
                            const now = new Date();
                            
                            let currentIndex = data.epg_listings.findIndex(item => {
                                const start = parseEPGDate(item.start);
                                const end = parseEPGDate(item.end);
                                return now >= start && now <= end;
                            });

                            if (currentIndex === -1) {
                                currentIndex = data.epg_listings.findIndex(item => parseEPGDate(item.start) > now);
                            }

                            const nowListing = currentIndex !== -1 ? data.epg_listings[currentIndex] : data.epg_listings[0];
                            const nextListing = currentIndex !== -1 ? data.epg_listings[currentIndex + 1] : data.epg_listings[1];
                            
                            if (nowListing) {
                                setEpgInfo({
                                    current: {
                                        title: decodeEPGText(nowListing.title),
                                        desc: decodeEPGText(nowListing.description),
                                        start: parseEPGDate(nowListing.start),
                                        end: parseEPGDate(nowListing.end)
                                    },
                                    next: nextListing ? {
                                        title: decodeEPGText(nextListing.title)
                                    } : null,
                                    full: data.epg_listings.map(it => ({
                                        ...it,
                                        title: decodeEPGText(it.title),
                                        description: decodeEPGText(it.description),
                                        startTime: parseEPGDate(it.start),
                                        endTime: parseEPGDate(it.end)
                                    }))
                                });
                            }
                        } else {
                            setEpgInfo(null);
                        }
                    } else if (activePlaylist?.epgCacheKey) {
                        // XMLTV / GLOBAL EPG SYNC
                        const channelId = currentStream.tvgId || currentStream.name;
                        const { data } = await api.get(`/epg/${encodeURIComponent(channelId)}`, {
                            params: { cacheKey: activePlaylist.epgCacheKey }
                        });

                        if (data && data.length > 0) {
                            const now = new Date();
                            const listings = data.map(item => ({
                                title: item.title,
                                description: item.desc,
                                start: item.start, 
                                end: item.stop
                            }));

                            const parseXmltvDate = (str) => {
                                if (!str) return new Date();
                                const y = str.substring(0, 4);
                                const m = str.substring(4, 6);
                                const d = str.substring(6, 8);
                                const h = str.substring(8, 10);
                                const min = str.substring(10, 12);
                                const s = str.substring(12, 14);
                                return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
                            };

                            let currentIndex = listings.findIndex(item => {
                                const start = parseXmltvDate(item.start);
                                const end = parseXmltvDate(item.end);
                                return now >= start && now <= end;
                            });

                            if (currentIndex === -1) {
                                currentIndex = listings.findIndex(item => parseXmltvDate(item.start) > now);
                            }

                            const nowListing = currentIndex !== -1 ? listings[currentIndex] : listings[0];
                            const nextListing = currentIndex !== -1 ? listings[currentIndex + 1] : listings[1];

                            if (nowListing) {
                                setEpgInfo({
                                    current: {
                                        title: nowListing.title,
                                        desc: nowListing.description,
                                        start: parseXmltvDate(nowListing.start),
                                        end: parseXmltvDate(nowListing.end)
                                    },
                                    next: nextListing ? {
                                        title: nextListing.title
                                    } : null,
                                    full: listings.map(it => ({
                                        title: it.title,
                                        description: it.description,
                                        startTime: parseXmltvDate(it.start),
                                        endTime: parseXmltvDate(it.end)
                                    }))
                                });
                            }
                        } else {
                            setEpgInfo(null);
                        }
                    } else {
                        setEpgInfo(null);
                    }
                } catch (error) {
                    console.error("[EPG] Erro ao buscar programação:", error);
                    setEpgInfo(null);
                }
            };
            fetchEPG();
        } else {
            setEpgInfo(null);
        }

        return cleanUp;
    }, [init, cleanUp, currentStream]);

    useEffect(() => {
        const handler = () => {
            setShowControls(true);
            if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
            controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
        };
        window.addEventListener('mousemove', handler);
        window.addEventListener('touchstart', handler);
        return () => {
            window.removeEventListener('mousemove', handler);
            window.removeEventListener('touchstart', handler);
        };
    }, []);

    const handleDownload = () => {
        const rawUrl = currentStream.streamUrl || currentStream.url;
        if (rawUrl.includes('.m3u8')) return toast.error('Download indisponível para HLS');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        window.open(`${apiUrl}/proxy/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(currentStream.name)}`, '_blank');
        toast.success('Download iniciado...');
    };

    const handleFullscreenOld = () => {
        // Esta função foi substituída pela handleFullscreen moderna acima
    };

    const formatTime = (seconds) => {
        if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
    };

    // Não retornamos null para manter o elemento de vídeo montado e com o áudio "desbloqueado" pelo browser
    const isVisible = !!currentStream;
    const stream = currentStream || {};

    return (
        <div 
            ref={mainContainerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            style={isMinimized ? { 
                bottom: `${position.y}px`, 
                right: `${position.x}px`,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none'
            } : {}}
            className={`fixed z-[200] bg-black flex items-center justify-center overflow-hidden font-sans transition-all duration-300 
                ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                ${isMinimized ? 'w-64 h-36 lg:w-80 lg:h-48 rounded-3xl shadow-2xl border border-white/10' : 'inset-0'}`}
        >
            {/* O Vídeo deve estar sempre centralizado */}
            <div className="relative w-full h-full flex items-center justify-center">
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={(e) => { 
                        e.stopPropagation();
                        if (isMinimized) {
                            setIsMinimized(false);
                        } else {
                            togglePlay(); 
                        }
                    }}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                    onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                    playsInline
                    crossOrigin="anonymous"
                />
            </div>

            {/* INFO DO CANAL NO CANTO ESQUERDO CENTRAL (Reduzido no Mobile para não chocar com o centro) */}
            {/* INFO DO CANAL NO CANTO ESQUERDO CENTRAL */}
            <div className={`absolute top-4 lg:top-1/2 lg:-translate-y-1/2 left-4 lg:left-12 z-50 transition-all duration-700 flex flex-col gap-1 lg:gap-3 origin-top-left scale-[0.6] lg:scale-100 
                ${(showControls && !isMinimized) ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0 pointer-events-none'}`}>
                {stream.logo && (
                    <div className="w-10 h-10 lg:w-16 lg:h-16 bg-black/40 backdrop-blur-md rounded-2xl p-1.5 lg:p-2 border border-white/10 shadow-2xl mb-1 lg:mb-2">
                        <img src={stream.logo} className="w-full h-full object-contain drop-shadow-lg" alt="logo" />
                    </div>
                )}
                
                <div className="flex flex-col gap-1 w-[260px] lg:w-[400px]">
                    <h2 className="text-xl lg:text-3xl font-black text-white tracking-tight drop-shadow-2xl leading-tight">
                        {stream.name}
                    </h2>
                    
                    <div className="flex items-center gap-2 mt-1 mb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none drop-shadow-md">
                            {stream.group || 'Geral'}
                        </span>
                    </div>
                    
                    {/* UI de EPG Dinâmico */}
                    {epgInfo?.current && (
                        <div className="mt-3 space-y-2 animate-fade-in bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
                            <p className="text-sm font-bold text-white line-clamp-2 md:line-clamp-1 flex items-center gap-2 uppercase tracking-tighter shadow-sm">
                                <span className="text-[9px] px-2 py-1 bg-red-600 rounded text-white font-black animate-pulse flex-shrink-0">
                                    AO VIVO
                                </span>
                                <span className="truncate">{epgInfo.current.title}</span>
                            </p>
                            
                            {/* Barra de Progresso do Programa */}
                            {(() => {
                                const now = new Date();
                                const start = new Date(epgInfo.current.start);
                                const end = new Date(epgInfo.current.end);
                                const total = end - start;
                                const elapsed = now - start;
                                const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
                                
                                return (
                                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mt-1 shadow-inner">
                                        <div className="h-full bg-white transition-all duration-500 rounded-full drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{ width: `${progress}%` }} />
                                    </div>
                                );
                            })()}

                            {epgInfo.next && (
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate mt-2">
                                    <span className="text-white/60">Próximo:</span> {epgInfo.next.title}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* BOTÕES DE AÇÃO NO CANTO SUPERIOR DIREITO */}
            <div className={`absolute z-[60] transition-all duration-700 flex items-center 
                ${isMinimized ? 'top-2 right-2 gap-1' : 'top-6 right-6 lg:top-10 lg:right-10 gap-3 lg:gap-4'}
                ${(showControls || isMinimized) ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
                {!isMinimized && (
                    <button 
                        onClick={() => { if (isFavorite) removeFavorite(stream.id); else addFavorite(stream); toast.success(isFavorite ? 'Removido dos favoritos' : 'Salvo nos favoritos'); }}
                        className={`p-3 rounded-xl transition-all active:scale-90 ${isFavorite ? 'text-red-500' : 'text-white/80 hover:text-white'}`}
                    >
                        <FiHeart size={24} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                )}
                
                <button 
                    onClick={() => setIsMinimized(!isMinimized)} 
                    className={`${isMinimized ? 'p-1.5' : 'p-3'} text-white/80 hover:text-white transition-all transform hover:scale-110 bg-black/20 rounded-lg backdrop-blur-sm`}
                >
                    {isMinimized ? <FiMaximize2 size={18} /> : <FiMinimize2 size={24} />}
                </button>

                <button 
                    onClick={() => setCurrentStream(null)} 
                    className={`${isMinimized ? 'p-1.5' : 'p-3'} text-white/80 hover:text-white transition-all transform hover:rotate-90 bg-black/20 rounded-lg backdrop-blur-sm`}
                >
                    <FiX size={isMinimized ? 20 : 24} />
                </button>
            </div>

            {/* Overlays Cinematográficos Removidos para Transparência Total */}
            <div className={`absolute inset-0 bg-black/10 transition-opacity duration-1000 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`} />

            {/* Loading Profissional */}
            {isBuffering && !error && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(108,92,231,0.2)]" />
                        <div className="flex flex-col items-center gap-2 text-center">
                            <span className="text-white/40 text-[10px] uppercase font-black tracking-[0.5em] animate-pulse">Sintonizando</span>
                            {useProxy && <span className="text-primary text-[8px] font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Modo Proxy Ativo</span>}
                        </div>
                    </div>
                </div>
            )}


            {/* UI de Erro (Compacta e Elevada) */}
            {error && (
                <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 pb-32">
                    <div className="text-center max-w-xs animate-fade-in">
                        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiRefreshCw className="text-red-500 text-2xl animate-spin-slow" />
                        </div>
                        <h3 className="text-white font-black text-lg mb-2 tracking-tight">Falha na Transmissão</h3>
                        <p className="text-gray-500 text-[12px] mb-8 leading-relaxed px-4">{error}</p>
                        <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                            <button onClick={init} className="w-full py-3 bg-white text-black rounded-xl font-bold text-xs hover:bg-primary hover:text-white transition-all active:scale-95 shadow-lg">Tentar Novamente</button>
                            <button onClick={() => setCurrentStream(null)} className="w-full py-3 bg-white/5 text-white/40 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">Fechar Player</button>
                        </div>
                    </div>
                </div>
            )}

            {/* NOVO LAYOUT DE CONTROLES (ESTILO FOTO) - TRANSPARÊNCIA TOTAL */}
            <div className={`absolute bottom-0 left-0 w-full p-4 lg:p-10 z-50 transition-all duration-700 
                ${(showControls && !isMinimized) ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                

                {/* 1. LINHA SUPERIOR: NAVEGAÇÃO PRINCIPAL (CENTRALIZADA) */}
                <div className="flex items-center justify-center max-w-4xl mx-auto mb-4 lg:mb-8">
                    {/* Bloco Central: Skip, Play, Skip */}
                    <div className="flex items-center gap-8 lg:gap-16">
                        <button onClick={playPrev} className="text-white/80 hover:text-white transition-all transform hover:scale-110 active:scale-75">
                            <FiSkipBack className="w-6 h-6 lg:w-8 lg:h-8" />
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
                <div className="flex items-center justify-center gap-4 lg:gap-14">
                    {/* Controle de Volume Profissional (Movido para Baixo) */}
                    <div className="hidden lg:flex items-center gap-3 w-40 group/vol mr-4">
                        <button 
                            onClick={() => {
                                if (videoRef.current) {
                                    videoRef.current.muted = !isMuted;
                                    setIsMuted(!isMuted);
                                }
                            }} 
                            className="text-white/80 hover:text-white transition-all"
                        >
                            {isMuted || volume === 0 ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
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
                        className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-all group"
                    >
                        <FiShare2 size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Share</span>
                    </button>

                    <button 
                        onClick={() => { setShowComments(!showComments); setShowFullEpg(false); }}
                        className={`flex flex-col items-center gap-1.5 transition-all group ${showComments ? 'text-white' : 'text-white/80 hover:text-white'}`}
                    >
                        <FiMessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Comment</span>
                    </button>

                    <button 
                        onClick={handleCast}
                        className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-all group"
                    >
                        <FiAirplay size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Cast</span>
                    </button>

                    <button 
                        onClick={handleDownload}
                        className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-all group"
                    >
                        <FiDownload size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Download</span>
                    </button>

                    <button 
                        onClick={handleFullscreen}
                        className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-all group"
                    >
                        {isFullscreen ? <FiMinimize2 size={20} className="group-hover:scale-110 transition-transform" /> : <FiMaximize size={20} className="group-hover:scale-110 transition-transform" />}
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isFullscreen ? 'Sair' : 'Maximize'}</span>
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