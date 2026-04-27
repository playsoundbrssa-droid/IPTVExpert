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

        // Tentar restaurar progresso após o vídeo carregar
        if (currentStream.type === 'movie' || currentStream.type === 'series') {
            loadProgress();
        }
    }, [currentStream, getStreamUrl, cleanUp, useProxy]);

    useEffect(() => {
        if (!videoRef.current) return;
        
        const video = videoRef.current;
        
        // Detecção de AirPlay (Safari/iOS)
        if (window.WebKitPlaybackTargetAvailabilityEvent) {
            const handler = (event) => {
                setAirplayAvailable(event.availability === 'available');
            };
            video.addEventListener('webkitplaybacktargetavailabilitychanged', handler);
            
            // Forçar uma verificação inicial se possível
            if (video.webkitPlaybackTargetAvailability) {
                setAirplayAvailable(video.webkitPlaybackTargetAvailability === 'available');
            }

            return () => video.removeEventListener('webkitplaybacktargetavailabilitychanged', handler);
        }
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

    const handlePiP = async () => {
        try {
            if (document.pictureInPictureEnabled && videoRef.current !== document.pictureInPictureElement) {
                await videoRef.current.requestPictureInPicture();
            } else if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
        } catch (error) {
            console.error('PiP Error:', error);
        }
    };

    const handleAirPlay = () => {
        if (videoRef.current?.webkitShowPlaybackTargetPicker) {
            videoRef.current.webkitShowPlaybackTargetPicker();
        }
    };

    const { getActivePlaylist } = usePlaylistManagerStore();

    const loadProgress = async () => {
        const active = getActivePlaylist();
        if (!active || !currentStream) return;
        
        try {
            const response = await api.get('/progress', {
                params: { mediaId: currentStream.id, playlistId: active.id }
            });
            
            if (response.data?.progress) {
                const pos = response.data.progress.last_position;
                if (pos > 10) {
                    setResumeData(pos);
                }
            }
        } catch (error) {
            console.warn('[PROGRESS] Falha ao carregar:', error.message);
        }
    };

    const handleResume = (shouldResume) => {
        if (shouldResume && videoRef.current && resumeData) {
            videoRef.current.currentTime = resumeData;
            videoRef.current.play().catch(() => {});
            toast.success(`Continuando de ${formatTime(resumeData)}`, { icon: '🕒' });
        }
        setResumeData(null);
    };

    const saveProgress = async () => {
        if (!videoRef.current || !currentStream) return;
        if (currentStream.type === 'channel') return;

        const active = getActivePlaylist();
        if (!active) return;

        try {
            await api.post('/progress', {
                mediaId: currentStream.id,
                playlistId: active.id,
                currentTime: videoRef.current.currentTime,
                duration: videoRef.current.duration
            });
        } catch (error) {
            console.warn('[PROGRESS] Falha ao salvar:', error.message);
        }
    };

    // Salvar progresso periodicamente
    useEffect(() => {
        if (currentStream?.type === 'channel') return;
        
        const interval = setInterval(() => {
            saveProgress();
        }, 15000); // A cada 15 segundos

        return () => {
            clearInterval(interval);
            saveProgress(); // Salvar ao fechar
        };
    }, [currentStream]);

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
                try {
                    if (document.pictureInPictureEnabled && videoRef.current !== document.pictureInPictureElement) {
                        await videoRef.current.requestPictureInPicture();
                    }
                } catch (e) {
                    console.warn('[PiP] Auto-PiP failed:', e);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isPlaying, error]);

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
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onClick={() => {
                    setShowControls(!showControls);
                }}
                playsInline
                autoPlay
                x-webkit-airplay="allow"
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

            {/* Repositioned Title/EPG Info (Middle-Left) */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 p-6 lg:p-10 bg-gradient-to-r from-black/80 to-transparent transition-all duration-500 z-40 max-w-[80%] lg:max-w-md
                ${(showControls) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
                <div className="flex flex-col gap-2">
                    <h3 className="text-white text-2xl lg:text-4xl font-black leading-tight shadow-sm drop-shadow-2xl">{currentStream.name}</h3>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary text-white text-[10px] lg:text-[12px] font-black rounded-lg uppercase tracking-[0.2em] shadow-lg shadow-primary/20">{currentStream.group}</span>
                        {duration === 0 && <span className="flex items-center gap-2 text-[10px] lg:text-[12px] text-red-500 font-black uppercase tracking-widest animate-pulse"><div className="w-2 h-2 bg-red-500 rounded-full" /> AO VIVO</span>}
                    </div>
                </div>
            </div>

            {/* Top Right Actions */}
            <div className={`absolute top-0 right-0 p-6 flex flex-col items-end gap-3 transition-opacity duration-300 z-40
                ${(showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                
                <button 
                    onClick={() => setCurrentStream(null)} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md border border-white/10 group/back" 
                    title="Voltar para Episódios / Menu"
                >
                    <FiChevronLeft size={18} className="group-hover/back:-translate-x-1 transition-transform" />
                    <span>Voltar</span>
                </button>

                <button 
                    onClick={() => {
                        // Sair do Player agora também volta para o menu de episódios/sinopse
                        setCurrentStream(null);
                    }} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-red-600/30 border border-white/10 group/exit" 
                    title="Fechar Player"
                >
                    <FiLogOut size={18} />
                    <span>Sair do Player</span>
                </button>
            </div>

            {/* Middle Controls Indicator */}
            {!isBuffering && (
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 lg:gap-12 transition-all z-30
                    ${(showControls) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    
                    {/* Previous */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); playPrev(); }} 
                        className="w-10 h-10 lg:w-14 lg:h-14 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <FiSkipBack size={24} />
                    </button>

                    {/* -10s */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); seek(-10); }} 
                        className="w-12 h-12 lg:w-16 lg:h-16 bg-black/40 backdrop-blur-md rounded-full flex flex-col items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90 border border-white/5"
                    >
                        <FiRotateCcw size={22} />
                        <span className="text-[10px] font-black mt-1">10</span>
                    </button>

                    {/* Play/Pause */}
                    <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-20 h-20 lg:w-28 lg:h-28 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform border border-white/10 shadow-2xl">
                        {isPlaying ? <FiPause size={48} /> : <FiPlay size={48} className="ml-2" />}
                    </button>

                    {/* +10s */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); seek(10); }} 
                        className="w-12 h-12 lg:w-16 lg:h-16 bg-black/40 backdrop-blur-md rounded-full flex flex-col items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90 border border-white/5"
                    >
                        <FiRotateCw size={22} />
                        <span className="text-[10px] font-black mt-1">10</span>
                    </button>

                    {/* Next */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); playNext(); }} 
                        className="w-10 h-10 lg:w-14 lg:h-14 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <FiSkipForward size={24} />
                    </button>
                </div>
            )}

            {/* Bottom Controls Overlay */}
            {(
                <div className={`absolute bottom-0 left-0 w-full p-4 lg:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 z-40
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

                            {/* Speed Selector */}
                            <div className="relative">
                                <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }} className={`p-2 transition-all ${showSpeedMenu ? 'text-primary' : 'text-white/70 hover:text-white'}`} title="Velocidade">
                                    <FiSettings size={22} className={showSpeedMenu ? 'rotate-45' : ''} />
                                </button>
                                {showSpeedMenu && (
                                    <div className="absolute bottom-12 right-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[120px] animate-fade-in-up">
                                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                            <button 
                                                key={rate}
                                                onClick={() => {
                                                    videoRef.current.playbackRate = rate;
                                                    setPlaybackRate(rate);
                                                    setShowSpeedMenu(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-sm font-bold text-left hover:bg-white/10 transition-colors ${playbackRate === rate ? 'text-primary bg-primary/10' : 'text-white/70'}`}
                                            >
                                                {rate === 1 ? 'Normal' : `${rate}x`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* PiP */}
                            <button onClick={handlePiP} className="p-2 text-white/70 hover:text-white transition-all hidden md:block" title="Picture-in-Picture">
                                <FiSquare size={22} />
                            </button>

                            {/* AirPlay */}
                            {airplayAvailable && (
                                <button onClick={handleAirPlay} className="p-2 text-white/70 hover:text-white transition-all" title="AirPlay">
                                    <FiAirplay size={22} />
                                </button>
                            )}

                            {/* Theater Mode Removed as requested */}

                            <button onClick={() => { if (isFavorite) removeFavorite(currentStream.id); else addFavorite(currentStream); }} className={`p-2 transition-all ${isFavorite ? 'text-red-500' : 'text-white/70 hover:text-white'}`} title="Favoritos">
                                <FiHeart size={22} fill={isFavorite ? 'currentColor' : 'none'} />
                            </button>
                            
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