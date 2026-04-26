import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { 
    FiX, FiPlay, FiPause, FiMaximize, FiVolume2, 
    FiVolumeX, FiShare2, FiDownload, FiSettings,
    FiMoreVertical, FiCopy, FiCheck, FiRefreshCw,
    FiExternalLink
} from 'react-icons/fi';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import toast from 'react-hot-toast';

export default function VideoPlayer() {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const mainContainerRef = useRef(null);
    const hlsRef = useRef(null);
    
    const { currentStream, setCurrentStream, isPlaying, setIsPlaying } = usePlayerStore();
    const { favorites, addFavorite, removeFavorite } = usePlaylistStore();
    
    const [isFloating, setIsFloating] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [progress, setProgress] = useState(0);
    const [buffer, setBuffer] = useState(0);
    const [volume, setVolume] = useState(parseFloat(localStorage.getItem('player_volume')) || 1);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isSharing, setIsSharing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPip, setIsPip] = useState(false);

    // Miniplayer Drag Logic
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

    const isFavorite = useMemo(() => 
        currentStream ? favorites.some(f => f.id === currentStream.id) : false
    , [favorites, currentStream]);

    // Handle Fullscreen & PiP Changes
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        const handlePipChange = () => setIsPip(document.pictureInPictureElement === videoRef.current);

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        if (videoRef.current) {
            videoRef.current.addEventListener('enterpictureinpicture', () => setIsPip(true));
            videoRef.current.addEventListener('leavepictureinpicture', () => setIsPip(false));
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Anti-Gravity Logic (Auto Float on Scroll)
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Só flutua internamente se não estiver em PiP ou Fullscreen
                if (!entry.isIntersecting && isPlaying && !document.fullscreenElement && !document.pictureInPictureElement) {
                    setIsFloating(true);
                } else if (entry.isIntersecting) {
                    setIsFloating(false);
                }
            },
            { threshold: 0.1 }
        );
        if (mainContainerRef.current) observer.observe(mainContainerRef.current);
        return () => observer.disconnect();
    }, [isPlaying]);

    // HLS & Stream Initialization
    const initPlayer = useCallback(() => {
        if (!currentStream || !videoRef.current) return;
        const url = currentStream.streamUrl || currentStream.url;
        const isHls = url.toLowerCase().includes('.m3u8') || url.includes('type=m3u8');

        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        setIsBuffering(true);

        if (isHls && Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(url);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (isPlaying) videoRef.current.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (e, data) => {
                if (data.fatal) toast.error('Erro ao carregar stream');
            });
        } else {
            videoRef.current.src = url;
            videoRef.current.load();
            if (isPlaying) videoRef.current.play().catch(() => {});
        }
    }, [currentStream, isPlaying]);

    useEffect(() => {
        initPlayer();
        return () => { if (hlsRef.current) hlsRef.current.destroy(); };
    }, [currentStream, initPlayer]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch(e.key.toLowerCase()) {
                case ' ': case 'k': e.preventDefault(); togglePlay(); break;
                case 'f': toggleFullScreen(); break;
                case 'p': togglePip(); break;
                case 'm': toggleMute(); break;
                case 'arrowright': if (videoRef.current) videoRef.current.currentTime += 5; break;
                case 'arrowleft': if (videoRef.current) videoRef.current.currentTime -= 5; break;
                case 'arrowup': changeVolume(Math.min(volume + 0.1, 1)); break;
                case 'arrowdown': changeVolume(Math.max(volume - 0.1, 0)); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [volume, isPlaying]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const toggleFullScreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => toast.error("Erro ao entrar em tela cheia"));
        } else {
            document.exitFullscreen();
        }
    };

    const togglePip = async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            toast.error("Picture-in-Picture não suportado neste navegador");
        }
    };

    const toggleMute = () => {
        const newMute = !isMuted;
        setIsMuted(newMute);
        if (videoRef.current) videoRef.current.muted = newMute;
    };

    const changeVolume = (val) => {
        setVolume(val);
        if (videoRef.current) {
            videoRef.current.volume = val;
            videoRef.current.muted = val === 0;
        }
        localStorage.setItem('player_volume', val);
    };

    const handleSeek = (e) => {
        if (!videoRef.current) return;
        const time = (e.target.value / 100) * videoRef.current.duration;
        videoRef.current.currentTime = time;
    };

    const handleSpeedChange = () => {
        const speeds = [1, 1.25, 1.5, 2, 0.5];
        const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
        if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
    };

    const handleDownload = () => {
        const url = currentStream.streamUrl || currentStream.url;
        if (url.includes('.m3u8')) {
            toast.error('Download não disponível para transmissões ao vivo');
            return;
        }
        window.open(url, '_blank'); // Forma mais compatível para download
    };

    const copyShareLink = () => {
        const link = `${window.location.origin}${window.location.pathname}?v=${currentStream.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Link copiado!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Miniplayer Drag & Drop
    const handleDragStart = (e) => {
        if (!isFloating) return;
        setIsDragging(true);
        const cx = e.clientX || e.touches?.[0]?.clientX;
        const cy = e.clientY || e.touches?.[0]?.clientY;
        dragStart.current = { x: cx, y: cy, initialX: position.x, initialY: position.y };
    };

    useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging) return;
            const cx = e.clientX || e.touches?.[0]?.clientX;
            const cy = e.clientY || e.touches?.[0]?.clientY;
            setPosition({
                x: dragStart.current.initialX + (dragStart.current.x - cx),
                y: dragStart.current.initialY + (dragStart.current.y - cy)
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
        <>
            {/* Layout Spacer */}
            {!isFloating && !isFullscreen && (
                <div ref={mainContainerRef} className="w-full aspect-video bg-black/40 rounded-[2rem] mb-10 overflow-hidden" />
            )}

            <div 
                ref={containerRef}
                className={`bg-black shadow-2xl transition-all duration-300 ease-out flex items-center justify-center group/player
                    ${isFullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen' : 
                      isFloating ? 'fixed z-[999] w-80 h-44 rounded-2xl border border-white/10 overflow-hidden bottom-8 right-8' : 
                      'relative w-full aspect-video rounded-[2rem] overflow-hidden'}`}
                style={isFloating && !isFullscreen ? { bottom: position.y, right: position.x } : {}}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                onMouseMove={() => {
                    setShowControls(true);
                    window.clearTimeout(window.controlsTimeout);
                    window.controlsTimeout = window.setTimeout(() => isPlaying && setShowControls(false), 3000);
                }}
            >
                <video 
                    ref={videoRef}
                    className="w-full h-full object-contain cursor-pointer"
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onTimeUpdate={() => {
                        if (!videoRef.current) return;
                        setCurrentTime(videoRef.current.currentTime);
                        setDuration(videoRef.current.duration);
                        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                        if (videoRef.current.buffered.length > 0) {
                            setBuffer((videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / videoRef.current.duration) * 100);
                        }
                    }}
                    onClick={togglePlay}
                    playsInline
                />

                {/* Big Center Play Button Overlay */}
                {!isPlaying && !isBuffering && (
                    <div onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer group/center z-10 transition-all">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 group-hover/center:scale-110 transition-transform group-hover/center:bg-primary/20">
                            <FiPlay size={40} fill="currentColor" className="ml-2" />
                        </div>
                    </div>
                )}

                {isBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                        <FiRefreshCw className="w-12 h-12 text-primary animate-spin" />
                    </div>
                )}

                {/* Controls Overlay */}
                <div className={`absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-t from-black via-transparent to-black/60 transition-opacity duration-300 z-20
                    ${(showControls || !isPlaying) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        {!isFloating && (
                            <div className="flex flex-col">
                                <h3 className="text-white font-black text-xl truncate max-w-lg drop-shadow-lg">{currentStream.name}</h3>
                                <span className="text-primary text-[10px] font-black uppercase tracking-widest">{currentStream.group}</span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            {isFloating && (
                                <button onClick={() => { setIsFloating(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2.5 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-primary transition-all">
                                    <FiMaximize size={20} />
                                </button>
                            )}
                            <button onClick={() => setCurrentStream(null)} className="p-2.5 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-red-500 transition-all">
                                <FiX size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Footer Controls */}
                    {!isFloating && (
                        <div className="space-y-4">
                            {/* YouTube Style Progress Bar */}
                            <div className="relative w-full h-1 group/progress flex items-center cursor-pointer mb-6">
                                <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/30 transition-all" style={{ width: `${buffer}%` }} />
                                </div>
                                <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg shadow-primary/40 opacity-0 group-hover/progress:opacity-100 transition-all scale-0 group-hover/progress:scale-100" />
                                </div>
                                <input type="range" min="0" max="100" value={progress || 0} onChange={handleSeek} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button onClick={togglePlay} className="text-white hover:text-primary transition-all scale-125">
                                        {isPlaying ? <FiPause size={24} fill="currentColor" /> : <FiPlay size={24} fill="currentColor" />}
                                    </button>
                                    
                                    <div className="flex items-center gap-3 group/volume">
                                        <button onClick={toggleMute} className="text-white hover:text-primary transition-all">
                                            {isMuted || volume === 0 ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
                                        </button>
                                        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => changeVolume(parseFloat(e.target.value))} className="w-0 group-hover/volume:w-24 transition-all accent-primary h-1" />
                                    </div>

                                    <span className="text-xs font-black text-white/80 font-mono tracking-tighter">
                                        {formatTime(currentTime)} <span className="text-white/40">/</span> {duration > 0 ? formatTime(duration) : 'AO VIVO'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-6">
                                    <button onClick={handleSpeedChange} className="text-[10px] font-black text-white/60 hover:text-white px-2 py-1 border border-white/10 rounded uppercase transition-all">
                                        {playbackSpeed}x
                                    </button>
                                    <button onClick={togglePip} className={`transition-all ${isPip ? 'text-primary' : 'text-white/60 hover:text-primary'}`} title="Picture-in-Picture (P)">
                                        <FiExternalLink size={22} />
                                    </button>
                                    <button onClick={() => setIsSharing(true)} className="text-white/60 hover:text-primary transition-all">
                                        <FiShare2 size={22} />
                                    </button>
                                    <button onClick={handleDownload} className="text-white/60 hover:text-primary transition-all">
                                        <FiDownload size={22} />
                                    </button>
                                    <button onClick={() => { if (isFavorite) removeFavorite(currentStream.id); else addFavorite(currentStream); }} className={isFavorite ? 'text-red-500 scale-110' : 'text-white/60'}>
                                        <FiCheck size={22} className={isFavorite ? 'opacity-100' : 'opacity-0'} />
                                    </button>
                                    <button onClick={toggleFullScreen} className="text-white/60 hover:text-primary transition-all">
                                        <FiMaximize size={22} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Share Modal */}
                {isSharing && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsSharing(false)} />
                        <div className="relative bg-[#0f171e] p-10 rounded-[3rem] border border-white/10 shadow-2xl w-full max-w-sm flex flex-col items-center">
                            <button onClick={() => setIsSharing(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-all"><FiX size={24}/></button>
                            <h3 className="text-2xl font-black mb-8 text-white">Compartilhar</h3>
                            
                            <div className="flex gap-5 mb-10">
                                {['whatsapp', 'twitter', 'facebook'].map(p => (
                                    <button key={p} onClick={() => {
                                        const link = encodeURIComponent(`${window.location.origin}${window.location.pathname}?v=${currentStream.id}`);
                                        const text = encodeURIComponent(`Assista ${currentStream.name}!`);
                                        const shareUrls = {
                                            whatsapp: `https://api.whatsapp.com/send?text=${text}%20${link}`,
                                            twitter: `https://twitter.com/intent/tweet?text=${text}&url=${link}`,
                                            facebook: `https://www.facebook.com/sharer/sharer.php?u=${link}`
                                        };
                                        window.open(shareUrls[p], '_blank');
                                    }} className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-primary/20 transition-all hover:scale-110 group">
                                        <img src={`https://cdn-icons-png.flaticon.com/512/733/${p === 'whatsapp' ? '733585' : p === 'twitter' ? '733579' : '733547'}.png`} className="w-8 h-8 object-contain grayscale group-hover:grayscale-0 transition-all" alt={p}/>
                                    </button>
                                ))}
                            </div>

                            <div className="w-full flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-2xl group">
                                <input readOnly value={`${window.location.origin}${window.location.pathname}?v=${currentStream.id}`} className="flex-1 bg-transparent border-none text-[11px] px-4 focus:ring-0 text-gray-400 font-mono truncate" />
                                <button onClick={copyShareLink} className="p-3 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                                    {copied ? <FiCheck size={20} /> : <FiCopy size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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