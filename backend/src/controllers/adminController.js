const User = require('../models/User');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Helper to log system events
const logEvent = async (type, message, details = null) => {
    try {
        const sql = db.isPostgres 
            ? 'INSERT INTO system_logs (type, message, details) VALUES ($1, $2, $3)'
            : 'INSERT INTO system_logs (type, message, details) VALUES (?, ?, ?)';
        await db.query(sql, [type, message, details ? JSON.stringify(details) : null]);
    } catch (error) {
        console.error('[LOG] Error saving log:', error);
    }
};

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
        logEvent('DELETE_USER', `Usuário deletado: ${user.email}`, { deletedById: req.userId });
        res.json({ message: 'Usuário removido com sucesso.' });
    } catch (error) {
        console.error('[ADMIN] Erro ao deletar:', error);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// GET /api/admin/logs — List system logs
exports.getLogs = async (req, res) => {
    try {
        const sql = 'SELECT * FROM system_logs ORDER BY createdAt DESC LIMIT 100';
        const result = await db.query(sql);
        res.json({ logs: result.rows || result });
    } catch (error) {
        console.error('[ADMIN] Erro ao listar logs:', error);
        res.status(500).json({ message: 'Erro ao buscar logs.' });
    }
};

// GET /api/admin/stats — Dashboard summary
exports.getStats = async (req, res) => {
    try {
        const usersCount = await User.count();
        const activeUsers = await User.count({ where: { isActive: true } });
        
        const viewsSql = 'SELECT SUM(views) as total_views FROM stats';
        const viewsResult = await db.query(viewsSql);
        const totalViews = (viewsResult.rows || viewsResult)[0]?.total_views || 0;

        res.json({
            users: {
                total: usersCount,
                active: activeUsers
            },
            totalViews: parseInt(totalViews)
        });
    } catch (error) {
        console.error('[ADMIN] Erro ao buscar stats:', error);
        res.status(500).json({ message: 'Erro ao buscar estatísticas.' });
    }
};
