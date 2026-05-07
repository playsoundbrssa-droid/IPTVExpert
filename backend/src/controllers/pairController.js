const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// In-memory store para pareamentos (Ideal seria Redis, mas para instância única funciona)
const pairings = new Map();

// Limpeza automática de códigos expirados (10 minutos)
setInterval(() => {
    const now = Date.now();
    for (const [code, data] of pairings.entries()) {
        if (now - data.createdAt > 600000) {
            pairings.delete(code);
        }
    }
}, 60000);

const pairController = {
    generateCode: async (req, res) => {
        try {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caracteres amigáveis
            pairings.set(code, {
                status: 'pending',
                createdAt: Date.now(),
                userId: null
            });
            
            res.json({ code });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao gerar código' });
        }
    },

    checkStatus: async (req, res) => {
        try {
            const { code } = req.params;
            const data = pairings.get(code);

            if (!data) {
                return res.status(404).json({ status: 'expired' });
            }

            if (data.status === 'authorized' && data.userId) {
                // Gerar tokens de acesso para o novo dispositivo
                const token = jwt.sign(
                    { userId: data.userId, role: 'user' },
                    process.env.JWT_SECRET || 'secret',
                    { expiresIn: '7d' }
                );

                pairings.delete(code); // Usou, deletou.
                return res.json({ status: 'authorized', token });
            }

            res.json({ status: 'pending' });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao verificar status' });
        }
    },

    authorize: async (req, res) => {
        try {
            const { code } = req.body;
            const userId = req.userId; // Vem do middleware de auth

            if (!pairings.has(code)) {
                return res.status(404).json({ message: 'Código inválido ou expirado' });
            }

            const data = pairings.get(code);
            data.status = 'authorized';
            data.userId = userId;
            pairings.set(code, data);

            res.json({ message: 'Dispositivo autorizado com sucesso!' });
        } catch (error) {
            res.status(500).json({ message: 'Erro ao autorizar' });
        }
    }
};

module.exports = pairController;
