import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUserStore } from '../stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiUsers, FiShield, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export default function AdminPage() {
    const { user } = useUserStore();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data.users);
        } catch (error) {
            toast.error('Erro ao carregar usuários.');
        } finally {
            setLoading(false);
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
        <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <FiShield size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Painel Admin</h1>
                    <p className="text-gray-500 text-sm">Gerencie usuários e permissões</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-gray-400 text-sm">Total de Usuários</p>
                    <p className="text-3xl font-black text-white">{users.length}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-gray-400 text-sm">Admins</p>
                    <p className="text-3xl font-black text-primary">{users.filter(u => u.role === 'admin').length}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-gray-400 text-sm">Ativos</p>
                    <p className="text-3xl font-black text-green-500">{users.filter(u => u.isActive).length}</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                    <FiUsers className="text-primary" />
                    <h2 className="font-bold text-lg">Usuários Cadastrados</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : users.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 text-left border-b border-white/5">
                                    <th className="px-4 py-3 font-medium">Usuário</th>
                                    <th className="px-4 py-3 font-medium">Email</th>
                                    <th className="px-4 py-3 font-medium">Role</th>
                                    <th className="px-4 py-3 font-medium">Tipo</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {u.avatar ? (
                                                    <img src={u.avatar} alt="" className="w-8 h-8 rounded-full" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                                                        {u.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-white">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {u.googleId ? '🔗 Google' : '📧 Email'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold ${u.isActive ? 'text-green-500' : 'text-red-500'}`}>
                                                {u.isActive ? 'ATIVO' : 'INATIVO'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.id !== user.id && (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleChangeRole(u.id, u.role)}
                                                        title="Alterar Role"
                                                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    >
                                                        <FiShield size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(u.id)}
                                                        title={u.isActive ? 'Desativar' : 'Ativar'}
                                                        className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all"
                                                    >
                                                        {u.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u.id, u.name)}
                                                        title="Excluir"
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
