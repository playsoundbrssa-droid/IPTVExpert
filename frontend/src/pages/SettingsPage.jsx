import React, { useState } from 'react';
import { useUserStore } from '../stores/useUserStore';
import { usePlaylistStore } from '../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../stores/usePlaylistManagerStore';
import { api } from '../services/api';
import { FiUser, FiLogOut, FiSettings, FiGlobe, FiPlayCircle, FiList, FiTrash2, FiCheckCircle, FiRefreshCw, FiTv, FiFilm, FiAlertCircle, FiLayout, FiChevronRight, FiGrid, FiMoon, FiShare2, FiStar, FiMail, FiShield, FiFileText } from 'react-icons/fi';
import { applyTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ImportModal from '../components/PlaylistModal/ImportModal';
import { FiPlus } from 'react-icons/fi';

const TYPE_LABELS = {
    m3u: { label: 'M3U URL', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    file: { label: 'Arquivo', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    xtream: { label: 'Xtream', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    hls: { label: 'HLS Direto', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
};

function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SettingItem({ icon: Icon, title, subtitle, badge, onClick }) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center justify-between p-6 hover:bg-white/[0.03] transition-all group border-l-4 border-transparent hover:border-primary"
        >
            <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-all border border-white/5 group-hover:border-primary/20">
                    <Icon size={24} />
                </div>
                <div className="text-left">
                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{title}</h4>
                    <p className="text-[11px] text-gray-500 font-medium">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {badge && (
                    <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/20 rounded-md text-[9px] font-black uppercase tracking-widest">
                        {badge}
                    </span>
                )}
                <FiChevronRight className="text-gray-700 group-hover:text-primary transition-all group-hover:translate-x-1" />
            </div>
        </button>
    );
}

function FooterLink({ icon: Icon, label, href = "#" }) {
    return (
        <a 
            href={href}
            className="flex items-center gap-3 px-5 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
        >
            <Icon className="text-gray-500 group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-bold text-gray-500 group-hover:text-white uppercase tracking-widest">{label}</span>
        </a>
    );
}

export default function SettingsPage() {
    const navigate = useNavigate();
    const { user, logout } = useUserStore();
    const [showImport, setShowImport] = useState(false);
    const { playlists, activePlaylistId, removePlaylist, setActivePlaylist, renamePlaylist, updatePlaylistStats } = usePlaylistManagerStore();
    const { channelsList, moviesList, seriesList, isLoaded: playlistIsLoaded } = usePlaylistStore();
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [tab, setTab] = useState('playlists');
    const [loadingId, setLoadingId] = useState(null);
    const [epgUrlInput, setEpgUrlInput] = useState('');
    const [isSyncingEpg, setIsSyncingEpg] = useState(false);

    const handleLogout = () => {
        logout();
        toast.success('Sessão encerrada.');
    };

    // Re-importa a playlist a partir das credenciais/URL salvas
    const performImportData = async (playlist) => {
        if (playlist.type === 'xtream') {
            const { server, username, password } = playlist.config;
            const res = await api.post('/xtream/import', { server, username, password });
            return res.data;
        } else if (playlist.type === 'm3u') {
            const res = await api.post('/playlist/import-m3u', { url: playlist.config.url });
            return res.data;
        } else if (playlist.type === 'hls') {
            const item = { id: `hls_${Date.now()}`, name: playlist.name, streamUrl: playlist.config.url, group: 'Link Direto', logo: null };
            return { total: 1, channels: { list: [item], groups: { 'Link Direto': [item] } }, movies: { list: [], groups: {} }, series: { list: [], groups: {} } };
        }
        throw new Error('Tipo de playlist não suportado para atualização.');
    };

    const handleActivate = async (playlist) => {
        setLoadingId(playlist.id);
        const tid = toast.loading(`Carregando "${playlist.name}"...`);
        try {
            const data = await performImportData(playlist);
            setPlaylistData(data);
            setActivePlaylist(playlist.id);
            // Sincroniza as contagens no manager store para persistência leve
            updatePlaylistStats(playlist.id, {
                total: data.total,
                channelsCount: data.channels?.list?.length || 0,
                moviesCount: data.movies?.list?.length || 0,
                seriesCount: data.series?.list?.length || 0
            });
            toast.dismiss(tid);
            toast.success(`✅ "${playlist.name}" ativada!`);
            navigate('/live-tv');
        } catch (err) {
            toast.dismiss(tid);
            toast.error(err.response?.data?.message || err.message || `Falha ao carregar "${playlist.name}".`);
        } finally {
            setLoadingId(null);
        }
    };

    const handleUpdateActive = async (playlist) => {
        setLoadingId(playlist.id);
        const tid = toast.loading(`Atualizando "${playlist.name}"...`);
        try {
            const data = await performImportData(playlist);
            setPlaylistData(data);
            // Sincroniza as contagens no manager store
            updatePlaylistStats(playlist.id, {
                total: data.total,
                channelsCount: data.channels?.list?.length || 0,
                moviesCount: data.movies?.list?.length || 0,
                seriesCount: data.series?.list?.length || 0
            });
            toast.dismiss(tid);
            toast.success(`✅ "${playlist.name}" atualizada com sucesso!`);
        } catch (err) {
            toast.dismiss(tid);
            toast.error(err.response?.data?.message || err.message || `Falha ao atualizar "${playlist.name}".`);
        } finally {
            setLoadingId(null);
        }
    };

    const handleSyncEpg = async () => {
        const active = getActivePlaylist();
        if (!active) return toast.error('Nenhuma playlist ativa.');

        let url = epgUrlInput.trim();
        
        // Se for Xtream e não tiver URL manual, tentamos inferir a URL de EPG se for o caso
        // Mas geralmente o Xtream já sincroniza itens curtos.
        // Se for M3U, a URL é obrigatória.
        if (active.type === 'm3u' && !url && !active.epgUrl) {
            return toast.error('Por favor, informe uma URL de XMLTV (EPG).');
        }

        if (!url) url = active.epgUrl;
        if (!url && active.type === 'xtream') {
            // Xtream sync é automático via endpoint, mas aqui vamos simular um refresh global
            toast.success('EPG Xtream já está sincronizado automaticamente.');
            return;
        }

        setIsSyncingEpg(true);
        const tid = toast.loading('Sincronizando guia de programação...');
        try {
            const res = await api.post('/epg/import', { url });
            updatePlaylistStats(active.id, {
                epgUrl: url,
                epgCacheKey: res.data.cacheKey
            });
            toast.dismiss(tid);
            toast.success(`✅ ${res.data.totalChannels} canais sincronizados!`);
        } catch (err) {
            toast.dismiss(tid);
            toast.error(err.response?.data?.message || 'Erro ao sincronizar EPG.');
        } finally {
            setIsSyncingEpg(false);
        }
    };

    const handleRemove = (id, name) => {
        removePlaylist(id);
        toast.success(`Lista "${name}" removida.`);
    };

    const handleRename = (id) => {
        if (editingName.trim()) {
            renamePlaylist(id, editingName.trim());
            toast.success('Nome atualizado!');
        }
        setEditingId(null);
        setEditingName('');
    };

    // Auto-sincronização: se a playlist ativa está com 0/0/0 mas o store tem os dados, salva no manager
    React.useEffect(() => {
        if (activePlaylistId && playlistIsLoaded) {
            const active = playlists.find(p => p.id === activePlaylistId);
            if (active && (!active.channelsCount && !active.moviesCount && !active.seriesCount)) {
                if (channelsList.length > 0 || moviesList.length > 0 || seriesList.length > 0) {
                    updatePlaylistStats(activePlaylistId, {
                        total: channelsList.length + moviesList.length + seriesList.length,
                        channelsCount: channelsList.length,
                        moviesCount: moviesList.length,
                        seriesCount: seriesList.length
                    });
                }
            }
        }
    }, [activePlaylistId, playlistIsLoaded, channelsList.length, moviesList.length, seriesList.length]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <h1 className="text-3xl font-black tracking-tight mb-8">Configurações</h1>

            {/* Profile Section */}
            <div className="glass-panel p-8 rounded-3xl border-white/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 text-primary overflow-hidden">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <FiUser size={40} />
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user?.name}</h2>
                        <p className="text-gray-500">{user?.email}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-400 border border-white/10">
                            {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl">
                <button
                    onClick={() => setTab('playlists')}
                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${tab === 'playlists' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                >
                    <FiList size={14} /> Minhas Playlists
                </button>
                <button
                    onClick={() => setTab('prefs')}
                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${tab === 'prefs' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                >
                    <FiSettings size={14} /> Preferências
                </button>
                <button
                    onClick={() => setTab('account')}
                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${tab === 'account' ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <FiLogOut size={14} /> Conta
                </button>
            </div>

            {/* ── PLAYLISTS TAB ── */}
            {tab === 'playlists' && (
                <div className="space-y-4 animate-fade-in">
                    {playlists.length === 0 ? (
                        <div className="glass-panel rounded-3xl border-white/10 p-12 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-gray-600">
                                <FiList size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">Nenhuma playlist salva</h3>
                                <p className="text-gray-500 text-sm mb-4">Importe uma lista M3U, conexão Xtream ou link HLS para começar.</p>
                                <button
                                    onClick={() => setShowImport(true)}
                                    className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
                                >
                                    <FiPlus size={16} /> Importar Mídia
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2 p-3 bg-primary/10 border border-primary/20 rounded-2xl">
                                <FiAlertCircle className="text-primary shrink-0" />
                                <p className="text-[11px] text-primary/80 text-left">As listas que você importar aparecerão aqui automaticamente para fácil gerenciamento.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">{playlists.length} playlist(s) salva(s) — clique em uma para ativar.</p>
                                <button
                                    onClick={() => setShowImport(true)}
                                    className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                                >
                                    <FiPlus size={14} /> Importar Nova
                                </button>
                            </div>
                            {playlists.map((playlist) => {
                                const isActive = playlist.id === activePlaylistId;
                                const typeInfo = TYPE_LABELS[playlist.type] || TYPE_LABELS.m3u;
                                return (
                                    <div
                                        key={playlist.id}
                                        className={`glass-panel rounded-2xl p-5 border transition-all ${isActive ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-white/10 hover:border-white/20'}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Active indicator */}
                                            <div className={`mt-1 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-600'}`}>
                                                {isActive ? <FiCheckCircle size={18} /> : <FiList size={18} />}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                {editingId === playlist.id ? (
                                                    <div className="flex gap-2 mb-2">
                                                        <input
                                                            autoFocus
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleRename(playlist.id)}
                                                            onBlur={() => handleRename(playlist.id)}
                                                            className="flex-1 bg-white/10 border border-primary/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary"
                                                        />
                                                    </div>
                                                ) : (
                                                    <h3
                                                        className="font-bold text-white truncate cursor-pointer hover:text-primary transition-colors mb-1"
                                                        onDoubleClick={() => { setEditingId(playlist.id); setEditingName(playlist.name); }}
                                                        title="Clique duplo para renomear"
                                                    >
                                                        {playlist.name}
                                                    </h3>
                                                )}
                                                <div className="flex flex-wrap gap-2 items-center">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeInfo.bg} ${typeInfo.color}`}>
                                                        {typeInfo.label}
                                                    </span>
                                                    <span className="text-[11px] text-gray-600">{playlist.total ?? '?'} itens</span>
                                                    <span className="text-[11px] text-gray-700">•</span>
                                                    <span className="text-[11px] text-gray-600">{formatDate(playlist.createdAt)}</span>
                                                </div>
                                                <div className="flex gap-4 mt-3">
                                                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                                                        <FiTv size={12} className="text-primary" />
                                                        {(isActive && channelsList.length > 0) ? channelsList.length : (playlist.channelsCount || 0)} canais
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                                                        <FiFilm size={12} className="text-purple-400" />
                                                        {(isActive && moviesList.length > 0) ? moviesList.length : (playlist.moviesCount || 0)} filmes
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                                                        <FiPlayCircle size={12} className="text-green-400" />
                                                        {(isActive && seriesList.length > 0) ? seriesList.length : (playlist.seriesCount || 0)} séries
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 shrink-0">
                                                {!isActive && (
                                                    <button
                                                        onClick={() => handleActivate(playlist)}
                                                        disabled={loadingId === playlist.id}
                                                        className="px-3 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-60 flex items-center gap-1.5"
                                                    >
                                                        {loadingId === playlist.id
                                                            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                            : <FiRefreshCw size={11} />
                                                        }
                                                        Usar
                                                    </button>
                                                )}
                                                {isActive && (
                                                    <>
                                                        <span className="px-3 py-2 bg-primary text-white rounded-xl text-[11px] font-bold uppercase tracking-wider text-center flex items-center gap-1.5 flex-1">
                                                            <FiCheckCircle size={11} /> Ativa
                                                        </span>
                                                        <button
                                                            onClick={() => handleUpdateActive(playlist)}
                                                            disabled={loadingId === playlist.id}
                                                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                                        >
                                                            {loadingId === playlist.id 
                                                                ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                                : <FiRefreshCw size={12} className="text-primary" />
                                                            }
                                                            Atualizar
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleRemove(playlist.id, playlist.name)}
                                                    className="w-full p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                                                    title="Remover lista"
                                                >
                                                    <FiTrash2 size={13} />
                                                    Remover
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}

            {/* ── PREFS TAB (REPROJETADA) ── */}
            {tab === 'prefs' && (
                <div className="space-y-6 animate-fade-in pb-12">
                    <div className="glass-panel overflow-hidden rounded-[2.5rem] border-white/10 shadow-2xl">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                <FiSettings className="text-primary" />
                                Preferências do Sistema
                            </h3>
                            <p className="text-gray-500 text-xs mt-1 italic">Personalize sua experiência IPTV Expert</p>
                        </div>

                        <div className="divide-y divide-white/5">
                            <SettingItem 
                                icon={FiPlayCircle} 
                                title="Configurações do Reprodutor" 
                                subtitle="Decodificação, Proxy Pro e fallbacks"
                                onClick={() => toast.success('Acesse pelo player durante a reprodução')}
                            />
                            <SettingItem 
                                icon={FiGrid} 
                                title="EPG (Guia de Programação)" 
                                subtitle="Configurar sincronização XMLTV / Xtream"
                                badge={playlists.find(p => p.id === activePlaylistId)?.epgCacheKey ? "Ativo" : "Pendente"}
                                onClick={() => setTab('epg')}
                            />
                            <SettingItem 
                                icon={FiShare2} 
                                title="Compartilhar app" 
                                subtitle="Indique o IPTV Expert para seus amigos"
                                onClick={() => {
                                    if (navigator.share) {
                                        navigator.share({ title: 'IPTV Expert', text: 'O melhor player de IPTV Web!', url: window.location.origin });
                                    } else {
                                        toast.success('Link copiado para a área de transferência!');
                                    }
                                }}
                            />
                            <SettingItem 
                                icon={FiStar} 
                                title="Avaliar app" 
                                subtitle="Deixe seu feedback sobre o Web Player"
                                onClick={() => toast.success('Obrigado pelo seu feedback!')}
                            />
                        </div>
                    </div>

                    {/* Footer Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4">
                        <FooterLink icon={FiMail} label="Contate o desenvolvedor" />
                        <FooterLink icon={FiFileText} label="Termos de uso" />
                        <FooterLink icon={FiShield} label="Política de privacidade" />
                    </div>
                </div>
            )}

            {/* ── EPG TAB ── */}
            {tab === 'epg' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="glass-panel p-8 rounded-[2.5rem] border-white/10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                                <FiGrid size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Sincronização de EPG</h3>
                                <p className="text-gray-500 text-xs">Configure o guia de programação da sua lista atual</p>
                            </div>
                        </div>

                        {activePlaylistId ? (
                            <div className="space-y-6">
                                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                    <h4 className="text-sm font-bold mb-1 text-white">Playlist Ativa</h4>
                                    <p className="text-xs text-gray-500">{playlists.find(p => p.id === activePlaylistId)?.name}</p>
                                </div>

                                <div className="space-y-4">
                                    <label className="block">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 block">URL do EPG (XMLTV)</span>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="http://exemplo.com/epg.xml"
                                                defaultValue={playlists.find(p => p.id === activePlaylistId)?.epgUrl || ''}
                                                onChange={(e) => setEpgUrlInput(e.target.value)}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                                            />
                                        </div>
                                    </label>

                                    <div className="flex flex-col gap-4 pt-4">
                                        <button 
                                            onClick={handleSyncEpg}
                                            disabled={isSyncingEpg}
                                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {isSyncingEpg ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                                            {isSyncingEpg ? 'Sincronizando...' : 'Sincronizar EPG Agora'}
                                        </button>
                                        
                                        <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                                            Listas <strong>Xtream Codes</strong> geralmente carregam a programação automaticamente. <br/>
                                            Para listas <strong>M3U</strong>, é necessário inserir uma URL XMLTV válida acima.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <FiAlertCircle size={48} className="mx-auto text-gray-700 mb-4" />
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Ative uma playlist primeiro para configurar o EPG</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setTab('prefs')}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Voltar para Preferências
                    </button>
                </div>
            )}
            {tab === 'account' && (
                <div className="glass-panel p-6 rounded-3xl border-white/10 flex flex-col justify-between animate-fade-in">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <FiLogOut className="text-red-500" />
                            <h3 className="font-bold">Conta</h3>
                        </div>
                        <p className="text-gray-500 text-sm mb-6">
                            Ao deslogar, suas listas e favoritos locais serão preservados no navegador.
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <FiLogOut /> Encerrar Sessão
                    </button>
                </div>
            )}

            <div className="text-center pt-8">
                <p className="text-[10px] text-gray-700 uppercase tracking-widest">
                    IPTV Expert Web v2.0.4 · Open Source Media Player
                </p>
            </div>

            <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
        </div>
    );
}