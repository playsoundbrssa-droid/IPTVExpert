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
import ImportModal from './components/PlaylistModal/ImportModal';
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

function App() {
    const { isAuthenticated, init, user } = useUserStore();
    const { currentStream } = usePlayerStore();
    const { loadFromStorage } = usePlaylistStore();
    const [showImport, setShowImport] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Aplica o tema salvo ANTES de renderizar qualquer coisa
        const savedTheme = localStorage.getItem('iptv_theme') || 'default';
        applyTheme(savedTheme);
        Promise.all([init(), loadFromStorage()]).then(() => setReady(true));
    }, []);

    if (!ready) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-primary text-2xl font-black italic tracking-tighter">IPTV EXPERT</div>
                <Toaster position="top-right" toastOptions={toasterStyle} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <>
                <LandingPage />
                <Toaster position="top-right" toastOptions={toasterStyle} />
            </>
        );
    }

    return (
        <BrowserRouter>
            <div className="flex h-screen overflow-hidden bg-background relative pt-safe">
                {/* Desktop Sidebar (hidden on mobile) */}
                <div className="hidden md:flex flex-shrink-0 h-full">
                    <Sidebar onImportClick={() => setShowImport(true)} />
                </div>
                
                {/* Mobile Header (hidden on desktop) */}
                <header className="md:hidden absolute top-0 left-0 right-0 h-16 bg-[#0A0A0A]/80 backdrop-blur-3xl border-b border-white/5 z-40 flex items-center justify-between px-4 mt-safe">
                    <h1 className="text-xl font-black bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent italic tracking-tighter">
                        IPTV Expert
                    </h1>
                    <button 
                        onClick={() => setShowImport(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-95 transition-all text-white"
                    >
                        <FiPlus size={18} />
                    </button>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 w-full h-full overflow-y-auto custom-scrollbar pt-20 md:pt-6 pb-24 md:pb-6 px-4 md:px-6 relative z-10 transition-all duration-300">
                    <Routes>
                        <Route path="/" element={<LiveTvPage />} />
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

                {/* OVERLAYS GLOBAIS (Não podem estar presos no z-index do main) */}
                {currentStream && <VideoPlayer />}
                <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
                <MediaDetailModal />
            </div>
            <Toaster position="top-right" toastOptions={toasterStyle} />
        </BrowserRouter>
    );
}

export default App;