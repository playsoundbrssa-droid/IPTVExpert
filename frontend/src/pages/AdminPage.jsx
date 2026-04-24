import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUserStore } from '../stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
    FiUsers, FiShield, FiTrash2, FiToggleLeft, FiToggleRight, 
    FiActivity, FiFileText, FiRefreshCw, FiAlertCircle 
} from 'react-icons/fi';

export default function AdminPage() {
    const { user } = useUserStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'logs', 'stats'
    
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/');
            return;
        }
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') await fetchUsers();
            if (activeTab === 'logs') await fetchLogs();
            if (activeTab === 'stats') await fetchStats();
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data.users);
        } catch (error) {
            toast.error('Erro ao carregar usuários.');
        }
    };

    const fetchLogs = async () => {
        try {
            const { data } = await api.get('/admin/logs');
            setLogs(data.logs);
        } catch (error) {
            toast.error('Erro ao carregar logs.');
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/admin/stats');
            setStats(data);
        } catch (error) {
            toast.error('Erro ao carregar estatísticas.');
        }
    };

    const handleChangeRole = async (id, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        try {
            await api.put(`/admin/users/${id}/role`, { role: newRole });
            toast.success(`Role alterada para "${newRole}".`);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao alterar role.');
        }
    };

    const handleToggleActive = async (id) => {
        try {
            const { data } = await api.put(`/admin/users/${id}/toggle`);
            toast.success(data.message);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao alterar status.');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Tem certeza que deseja excluir "${name}"? Esta ação é irreversível.`)) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast.success('Usuário removido.');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Erro ao deletar.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-lg shadow-primary/10">
                        <FiShield size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Painel Administrativo</h1>
                        <p className="text-gray-500 text-sm">Monitoramento e gestão do sistema</p>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {[
                        { id: 'users', label: 'Usuários', icon: FiUsers },
                        { id: 'logs', label: 'Logs', icon: FiFileText },
                        { id: 'stats', label: 'Stats', icon: FiActivity },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'text-gray-500 hover:text-white'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                        <span className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Carregando Dados...</span>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {activeTab === 'users' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-400 text-left border-b border-white/5 bg-white/2">
                                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Usuário</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Email</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Permissão</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Status</th>
                                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-white/2 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/10">
                                                            {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-white">{u.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 font-medium">{u.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${
                                                        u.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 text-gray-500 border border-white/10'
                                                    }`}>
                                                        {u.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_10px_rgba(34,197,94,0.3)]`} />
                                                        <span className={`text-[10px] font-black ${u.isActive ? 'text-green-500' : 'text-red-500'}`}>
                                                            {u.isActive ? 'ATIVO' : 'INATIVO'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.id !== user.id && (
                                                        <div className="flex items-center gap-2 justify-end">
                                                            <button onClick={() => handleChangeRole(u.id, u.role)} className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><FiShield size={18} /></button>
                                                            <button onClick={() => handleToggleActive(u.id)} className="p-2.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-xl transition-all">{u.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}</button>
                                                            <button onClick={() => handleDelete(u.id, u.name)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><FiTrash2 size={18} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'logs' && (
                            <div className="divide-y divide-white/5">
                                {logs.length > 0 ? logs.map(log => (
                                    <div key={log.id} className="p-6 hover:bg-white/2 transition-all flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl border ${
                                            log.type.includes('ERROR') ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                            log.type.includes('DELETE') ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        }`}>
                                            <FiFileText size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-black text-[10px] uppercase tracking-widest text-primary">{log.type}</span>
                                                <span className="text-[10px] font-bold text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-gray-300 text-sm font-medium">{log.message}</p>
                                            {log.details && (
                                                <pre className="mt-3 p-3 bg-black/40 rounded-xl border border-white/5 text-[10px] text-gray-500 overflow-x-auto">
                                                    {log.details}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-20 text-center text-gray-500 italic">Nenhum log registrado.</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'stats' && stats && (
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                        <FiUsers size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total de Usuários</h4>
                                        <p className="text-5xl font-black text-white tracking-tighter">{stats.users.total}</p>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-blue-500" style={{ width: `${(stats.users.active / stats.users.total) * 100}%` }} />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">{stats.users.active} Ativos</p>
                                </div>

                                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/10">
                                        <FiActivity size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Visualizações Totais</h4>
                                        <p className="text-5xl font-black text-white tracking-tighter">{stats.totalViews.toLocaleString()}</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-auto">Consumo Global de Mídia</p>
                                </div>

                                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20 shadow-lg shadow-green-500/10">
                                        <FiRefreshCw size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Status do Sistema</h4>
                                        <p className="text-5xl font-black text-white tracking-tighter">100%</p>
                                    </div>
                                    <p className="text-[10px] font-black text-green-500 uppercase mt-auto flex items-center gap-1 animate-pulse">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> OPERACIONAL
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer / Quick Help */}
            <div className="flex items-center gap-2 text-gray-500 justify-center">
                <FiAlertCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Painel Restrito a Administradores do IPTV Expert</span>
            </div>
        </div>
    );
}
