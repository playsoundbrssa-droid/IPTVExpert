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
    const { currentStream } = usePlayerStore();
    const { loadFromStorage } = usePlaylistStore();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Aplica o tema salvo ANTES de renderizar qualquer coisa
        const savedTheme = localStorage.getItem('iptv_theme') || 'default';
        applyTheme(savedTheme);
        Promise.all([init(), loadFromStorage()]).then(() => setReady(true));
    }, []);

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
            <DeepLinkHandler />
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

/**
 * DeepLinkHandler: Escuta parâmetros na URL para abrir conteúdo compartilhado
 */
function DeepLinkHandler() {
    const { isAuthenticated } = useUserStore();
    const { moviesList, seriesList, channels } = usePlaylistStore();
    const { setCurrentStream } = usePlayerStore();

    useEffect(() => {
        if (!isAuthenticated) return;

        const params = new URLSearchParams(window.location.search);
        const videoId = params.get('v');

        if (videoId) {
            // Busca em todas as listas
            const allMedia = [...channels, ...moviesList, ...seriesList];
            const found = allMedia.find(m => m.id === videoId);

            if (found) {
                setCurrentStream(found);
                toast.success(`Abrindo: ${found.name}`);
                // Limpa a URL sem recarregar a página
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [isAuthenticated, moviesList, seriesList, channels]);

    return null;
}

export default App;