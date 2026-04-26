import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/CategorySidebar/Sidebar';
import LiveTvPage from './pages/LiveTvPage';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';
import FavoritesPage from './pages/FavoritesPage';
import HighlightsPage from './pages/HighlightsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import LandingPage from './pages/LandingPage';
import AuthScreen from './components/Auth/AuthScreen';
import { useUserStore } from './stores/useUserStore';
import { usePlaylistStore } from './stores/usePlaylistStore';
import { useEffect, useState } from 'react';
import VideoPlayer from './components/Player/VideoPlayer';
import { usePlayerStore } from './stores/usePlayerStore';
import MediaDetailModal from './components/Media/MediaDetailModal';
import { Toaster } from 'react-hot-toast';

import MobileBottomNav from './components/CategorySidebar/MobileBottomNav';
import { FiPlus } from 'react-icons/fi';
import { applyTheme } from './hooks/useTheme';

const toasterStyle = { style: { background: '#1E1E1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } };

import Navbar from './components/Navigation/Navbar';

function App() {
    const { isAuthenticated, init, user } = useUserStore();
    const { currentStream, setCurrentStream } = usePlayerStore();
    const { 
        loadFromStorage, 
        moviesList, 
        seriesList, 
        channelsList, 
        setSelectedMediaDetails 
    } = usePlaylistStore();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Aplica o tema salvo ANTES de renderizar qualquer coisa
        const savedTheme = localStorage.getItem('iptv_theme') || 'default';
        applyTheme(savedTheme);
        
        // Inicializa o app e garante que o estado 'ready' seja ativado mesmo em caso de erro
        Promise.all([init(), loadFromStorage()])
            .finally(() => setReady(true));
    }, []);

    // Detecta link compartilhado (?v=ID)
    useEffect(() => {
        if (ready && isAuthenticated) {
            const params = new URLSearchParams(window.location.search);
            const videoId = params.get('v');
            if (videoId) {
                const item = [...moviesList, ...seriesList, ...channelsList].find(i => String(i.id) === String(videoId));
                if (item) {
                    if (item.type === 'movie' || item.type === 'series') {
                        setSelectedMediaDetails(item);
                    } else {
                        setCurrentStream(item);
                    }
                }
            }
        }
    }, [ready, isAuthenticated, moviesList, seriesList, channelsList]);

    if (!ready) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
                <div className="mb-4">
                    <img
                        src="/new_logo_banner.jpg"
                        alt="IPTV Expert"
                        className="relative w-48 h-auto rounded-2xl drop-shadow-xl animate-pulse"
                    />
                </div>
                <div className="text-primary text-sm font-semibold tracking-widest uppercase opacity-60">Carregando...</div>
                <Toaster position="top-right" toastOptions={toasterStyle} />
            </div>
        );
    }

    return (
        <BrowserRouter>
            {!isAuthenticated ? (
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<AuthScreen />} />
                    <Route path="*" element={<LandingPage />} />
                </Routes>
            ) : (
                <div className="flex flex-col h-[100dvh] overflow-hidden bg-background relative pt-safe">
                    <Navbar />
                    
                    {/* Main Content Area */}
                    <main className="flex-1 w-full h-full overflow-y-auto custom-scrollbar pt-20 pb-24 md:pb-6 px-4 md:px-12 relative z-10 transition-all duration-300">
                        <Routes>
                            <Route path="/" element={<HighlightsPage />} />
                            <Route path="/live-tv" element={<LiveTvPage />} />
                            <Route path="/movies" element={<MoviesPage />} />
                            <Route path="/series" element={<SeriesPage />} />
                            <Route path="/highlights" element={<HighlightsPage />} />
                            <Route path="/favorites" element={<FavoritesPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            {user?.role === 'admin' && (
                                <Route path="/admin" element={<AdminPage />} />
                            )}
                        </Routes>
                    </main>
                    
                    {/* Mobile Bottom Navigation (hidden on desktop) */}
                    <MobileBottomNav />

                    {currentStream && <VideoPlayer />}
                    <MediaDetailModal />
                </div>
            )}
            <Toaster position="top-right" toastOptions={toasterStyle} />
        </BrowserRouter>
    );
}

export default App;