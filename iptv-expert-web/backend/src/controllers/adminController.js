const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET /api/admin/users — List all users
exports.listUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'avatar', 'isActive', 'googleId', 'createdAt', 'updatedAt'],
            order: [['createdAt', 'DESC']]
        });
        res.json({ users });
    } catch (error) {
        console.error('[ADMIN] Erro ao listar usuários:', error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// PUT /api/admin/users/:id/role — Change user role
exports.changeRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Role inválida. Use "admin" ou "user".' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Prevent removing your own admin
        if (user.id === req.userId && role !== 'admin') {
            return res.status(400).json({ message: 'Você não pode remover sua própria permissão de admin.' });
        }

        await User.update({ role }, { where: { id: user.id } });
        res.json({ message: `Role alterada para "${role}" com sucesso.`, user: { id: user.id, name: user.name, role } });
    } catch (error) {
        console.error('[ADMIN] Erro ao alterar role:', error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// PUT /api/admin/users/:id/toggle — Activate/deactivate user
exports.toggleActive = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (user.id === req.userId) {
            return res.status(400).json({ message: 'Você não pode desativar sua própria conta.' });
        }

        const newStatus = !user.isActive;
        await User.update({ isActive: newStatus }, { where: { id: user.id } });
        res.json({ message: `Usuário ${newStatus ? 'ativado' : 'desativado'}.`, user: { id: user.id, isActive: newStatus } });
    } catch (error) {
        console.error('[ADMIN] Erro ao alterar status:', error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// DELETE /api/admin/users/:id — Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (user.id === req.userId) {
            return res.status(400).json({ message: 'Você não pode deletar sua própria conta.' });
        }

        await User.destroy({ where: { id: user.id } });
        res.json({ message: 'Usuário removido com sucesso.' });
    } catch (error) {
        console.error('[ADMIN] Erro ao deletar:', error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};
