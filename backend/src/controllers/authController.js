const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Helper: sanitize user for response
const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt
});

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Senha deve ter no mínimo 6 caracteres.' });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, password: hashed });
        const token = generateToken(user);

        res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (error) {
        console.error('[AUTH] Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        if (!user.password) {
            return res.status(401).json({ message: 'Esta conta usa login via Google. Use o botão do Google para entrar.' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const token = generateToken(user);
        res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
        console.error('[AUTH] Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// POST /api/auth/google
exports.googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Token do Google não fornecido.' });
        }

        // Verify the Google token
        console.log('[DEBUG] Google Client ID no Servidor:', process.env.GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        console.log('[DEBUG] Payload recebido do Google para:', payload.email);
        const { sub: googleId, email, name, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ where: { googleId } });

        if (!user) {
            // Check if email already registered (link accounts)
            user = await User.findOne({ where: { email } });
            if (user) {
                // Vincular Google ID à conta existente
                await User.update({ googleId, avatar: picture }, { where: { id: user.id } });
            } else {
                // Create new user
                user = await User.create({
                    name,
                    email,
                    googleId,
                    avatar: picture,
                    password: null
                });
            }
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Conta desativada. Contate o administrador.' });
        }

        const token = generateToken(user);
        res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
        console.error('[AUTH] Erro no login Google:', error);
        res.status(401).json({ message: 'Falha na autenticação com o Google.' });
    }
};

// GET /api/auth/me (protected)
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json({ user: sanitizeUser(user) });
    } catch (error) {
        console.error('[AUTH] Erro ao buscar perfil:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};