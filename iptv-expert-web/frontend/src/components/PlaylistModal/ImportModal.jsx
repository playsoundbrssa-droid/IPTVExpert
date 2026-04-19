import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaylistStore } from '../../stores/usePlaylistStore';
import { usePlaylistManagerStore } from '../../stores/usePlaylistManagerStore';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { FiX, FiLink, FiServer, FiUser, FiLock, FiFile, FiWifi } from 'react-icons/fi';

export default function ImportModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [tab, setTab] = useState('m3u');
    const [m3uUrl, setM3uUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [xtreamCredentials, setXtreamCredentials] = useState({ server: '', username: '', password: '' });
    const [playlistName, setPlaylistName] = useState('');
    const [loading, setLoading] = useState(false);
    const [hlsData, setHlsData] = useState({ name: '', url: '', type: 'channel' });
    const { setPlaylistData } = usePlaylistStore();
    const { savePlaylist } = usePlaylistManagerStore();

    if (!isOpen) return null;

    // ── HLS direto ────────────────────────────────────────────────────────────
    const handleImportHLS = () => {
        const { name, url, type } = hlsData;
        if (!name || !url) { toast.error('Preencha o nome e o link HLS.'); return; }

        const item = { id: `hls_${Date.now()}`, name, streamUrl: url, group: 'Link Direto', logo: null };
        const data = {
            total: 1,
            channels: type === 'channel' ? { list: [item], groups: { 'Link Direto': [item] } } : { list: [], groups: {} },
            movies:   type === 'movie'   ? { list: [item], groups: { 'Link Direto': [item] } } : { list: [], groups: {} },
            series:   type === 'series'  ? { list: [item], groups: { 'Link Direto': [item] } } : { list: [], groups: {} }
        };

        setPlaylistData(data);
        savePlaylist(name, 'hls', 1, { url }, { 
            channelsCount: type === 'channel' ? 1 : 0, 
            moviesCount: type === 'movie' ? 1 : 0, 
            seriesCount: type === 'series' ? 1 : 0 
        });
        toast.success('Link HLS adicionado!');
        navigate('/live-tv');
        onClose();
    };

    // ── M3U via URL ───────────────────────────────────────────────────────────
    const handleImportM3u = async () => {
        if (!m3uUrl.trim()) { toast.error('Insira uma URL válida'); return; }
        setLoading(true);
        try {
            const { data } = await api.post('/playlist/import-m3u', { url: m3uUrl.trim() });
            setPlaylistData(data);
            
            const finalName = playlistName.trim() || new URL(m3uUrl.trim().startsWith('http') ? m3uUrl.trim() : 'http://' + m3uUrl.trim()).hostname;
            savePlaylist(finalName, 'm3u', data.total, { url: m3uUrl.trim() }, {
                channelsCount: data.channels?.list?.length || 0,
                moviesCount: data.movies?.list?.length || 0,
                seriesCount: data.series?.list?.length || 0
            });
            
            toast.success(`✅ ${data.total} mídias carregadas!`);
            navigate('/live-tv');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Falha ao importar. Tente a aba Arquivo.');
        } finally {
            setLoading(false);
        }
    };

    // ── Arquivo local ─────────────────────────────────────────────────────────
    const handleImportFile = async () => {
        if (!selectedFile) { toast.error('Selecione um arquivo .m3u'); return; }
        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const { data } = await api.post('/playlist/import-file', { content, fileName: selectedFile.name });
                    setPlaylistData(data);
                    
                    const finalName = playlistName.trim() || selectedFile.name.replace(/\.[^.]+$/, '');
                    savePlaylist(finalName, 'file', data.total, { fileName: selectedFile.name }, {
                        channelsCount: data.channels?.list?.length || 0,
                        moviesCount: data.movies?.list?.length || 0,
                        seriesCount: data.series?.list?.length || 0
                    });
                    
                    toast.success(`✅ ${data.total} mídias carregadas!`);
                    navigate('/live-tv');
                    onClose();
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Erro ao processar arquivo.');
                } finally {
                    setLoading(false);
                }
            };
            reader.onerror = () => { toast.error('Erro ao ler o arquivo.'); setLoading(false); };
            reader.readAsText(selectedFile);
        } catch (err) {
            toast.error('Falha ao iniciar leitura do arquivo.');
            setLoading(false);
        }
    };

    // ── Xtream ────────────────────────────────────────────────────────────────
    const handleImportXtream = async () => {
        const { server, username, password } = xtreamCredentials;
        if (!server || !username || !password) { toast.error('Preencha todas as credenciais.'); return; }
        setLoading(true);
        try {
            const { data } = await api.post('/xtream/import', { server, username, password });
            setPlaylistData(data);
            
            const finalName = playlistName.trim() || server.split('/')[2] || 'Conta Xtream';
            savePlaylist(finalName, 'xtream', data.total, { server, username, password }, {
                channelsCount: data.channels?.list?.length || 0,
                moviesCount: data.movies?.list?.length || 0,
                seriesCount: data.series?.list?.length || 0
            });
            
            toast.success(`✅ ${data.total} mídias Xtream sincronizadas!`);
            navigate('/live-tv');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Falha ao conectar no servidor Xtream.');
        } finally {
            setLoading(false);
        }
    };

    const submitHandler = tab === 'm3u' ? handleImportM3u : tab === 'file' ? handleImportFile : tab === 'xtream' ? handleImportXtream : handleImportHLS;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative glass-panel !bg-black/80 backdrop-blur-2xl rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border-white/10">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent italic tracking-tighter">
                        ADICIONAR PLAYLIST <span className="text-white opacity-20 ml-2 font-black italic">PRO</span>
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/40 rounded-2xl mb-6">
                        {[['m3u','URL M3U'],['file','Arquivo'],['xtream','Xtream'],['hls','HLS']].map(([key, label]) => (
                            <button key={key}
                                className={`flex-1 min-w-[60px] py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                                onClick={() => {
                                    setTab(key);
                                    setPlaylistName(''); // Reset name when switching tabs
                                }}
                            >{label}</button>
                        ))}
                    </div>

                    {/* common Name field for most tabs */}
                    {(tab !== 'hls') && (
                        <div className="mb-4 animate-fade-in">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Nome da Playlist (Opcional)</label>
                            <input
                                id="playlist-name"
                                name="playlistName"
                                type="text"
                                value={playlistName}
                                onChange={(e) => setPlaylistName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                placeholder="Minha Lista Favorita"
                            />
                        </div>
                    )}

                    {/* ── URL M3U ── */}
                    {tab === 'm3u' && (
                        <div className="space-y-4 animate-fade-in">
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Link da Playlist</span>
                                <div className="relative">
                                    <FiLink className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                    <input
                                        id="m3u-url" name="m3uUrl" type="url" autoComplete="url"
                                        value={m3uUrl}
                                        onChange={(e) => setM3uUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleImportM3u()}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                        placeholder="http://dominio.com/lista.m3u"
                                    />
                                </div>
                                <p className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-400">
                                    Usa DNS Pro (Cloudflare + Google) para contornar bloqueios. Listas grandes podem levar até 2 min.
                                </p>
                            </label>
                        </div>
                    )}

                    {/* ── Arquivo ── */}
                    {tab === 'file' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-primary/50 hover:bg-primary/5 group transition-all">
                                <FiFile size={40} className="text-gray-600 mb-4 group-hover:text-primary transition-colors" />
                                <input type="file" accept=".m3u,.m3u8,.txt" id="file-upload" name="fileUpload" className="hidden"
                                    onChange={(e) => setSelectedFile(e.target.files[0])} />
                                <label htmlFor="file-upload" className="cursor-pointer text-center">
                                    <span className="text-sm font-bold text-white mb-1 block">
                                        {selectedFile ? selectedFile.name : 'Selecionar Arquivo M3U'}
                                    </span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest italic">Clique ou arraste</span>
                                </label>
                            </div>
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-2">
                                <FiWifi className="text-green-400 mt-0.5 shrink-0" size={13} />
                                <p className="text-[10px] text-green-400">Recomendado para listas grandes. Sem limite de tamanho no carregamento inicial.</p>
                            </div>
                        </div>
                    )}

                    {/* ── Xtream ── */}
                    {tab === 'xtream' && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Link do Servidor</label>
                                <div className="relative">
                                    <FiServer className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                    <input id="xtream-server" name="xtreamServer" type="url" autoComplete="url"
                                        value={xtreamCredentials.server}
                                        onChange={(e) => setXtreamCredentials({...xtreamCredentials, server: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                        placeholder="http://dominio.com:porta"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Usuário</label>
                                    <div className="relative">
                                        <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                        <input id="xtream-user" name="xtreamUsername" type="text" autoComplete="username"
                                            value={xtreamCredentials.username}
                                            onChange={(e) => setXtreamCredentials({...xtreamCredentials, username: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            placeholder="User"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Senha</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                        <input id="xtream-pass" name="xtreamPassword" type="password" autoComplete="current-password"
                                            value={xtreamCredentials.password}
                                            onChange={(e) => setXtreamCredentials({...xtreamCredentials, password: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            placeholder="••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── HLS ── */}
                    {tab === 'hls' && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Nome da Mídia</label>
                                <input id="hls-name" name="hlsName" type="text" autoComplete="off"
                                    value={hlsData.name}
                                    onChange={(e) => setHlsData({...hlsData, name: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                    placeholder="Ex: Canal de Esportes"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Link HLS (.m3u8)</label>
                                <div className="relative">
                                    <FiLink className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                    <input id="hls-url" name="hlsUrl" type="url" autoComplete="url"
                                        value={hlsData.url}
                                        onChange={(e) => setHlsData({...hlsData, url: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                                        placeholder="http://dominio.com/stream.m3u8"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Categoria</label>
                                <select id="hls-type" name="hlsType" value={hlsData.type}
                                    onChange={(e) => setHlsData({...hlsData, type: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="channel" className="bg-[#1a1a1a]">TV ao Vivo</option>
                                    <option value="movie"   className="bg-[#1a1a1a]">Filme</option>
                                    <option value="series"  className="bg-[#1a1a1a]">Série</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Botão */}
                    <button
                        onClick={submitHandler}
                        disabled={loading}
                        className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {loading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : 'Importar Media Pro'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}