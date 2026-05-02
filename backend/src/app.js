const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dns = require('dns');

// Forçar IPv4 primeiro para evitar erros ENETUNREACH em redes que não suportam IPv6 (comum no Render/Supabase)
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Carregar variáveis de ambiente (tenta na raiz e na pasta backend)
dotenv.config();
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const User = require('./models/User');

// --- ERROS GLOBAIS (Para logs do terminal) ---
process.on('unhandledRejection', (reason, promise) => {
    console.error(' [31m[FATAL] Unhandled Rejection at: [39m', promise, ' [31mreason: [39m', reason);
});

process.on('uncaughtException', (err) => {
    console.error(' [31m[FATAL] Uncaught Exception: [39m', err);
    // Em produção, você pode querer fechar o servidor com calma
    // process.exit(1); 
});

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const playlistRoutes = require('./routes/playlist');
const proxyRoutes = require('./routes/proxy');
const statsRoutes = require('./routes/stats');
const xtreamRoutes = require('./routes/xtream');
const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// === CORS CONFIGURATION ===
// Must run before any routes so that preflight OPTIONS requests are handled
const allowedOrigins = [
    'https://iptv-expert.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Allow the specific origin or any if not in our list (for development)
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24h

    // Respond immediately to preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

// Also keep cors() as fallback for edge cases
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.text({ type: 'text/*', limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/user-playlists', require('./routes/userPlaylists'));
app.use('/api/proxy', proxyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/xtream', xtreamRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/epg', require('./routes/epg'));
app.use('/api/progress', require('./routes/progress'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', port: PORT }));

// Error handler
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR]', err.stack || err.message);
    
    // Se o erro for de limite de tamanho (payload too large)
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'A lista ou URL enviada é muito grande.' });
    }

    res.status(err.status || 500).json({ 
        message: 'Erro interno no servidor.',
        detail: err.message
    });
});

const { initializeTables } = require('./config/database');

// Initialize database and start server
const startServer = async () => {
    try {
        // Criar tabelas se não existirem
        await initializeTables();
        // Seed admin user on first run
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@iptvexpert.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });

        if (!existingAdmin) {
            const hashed = await bcrypt.hash(adminPassword, 12);
            await User.create({
                name: 'Administrador',
                email: adminEmail,
                password: hashed,
                role: 'admin'
            });
            console.log(`[DB] Admin criado: ${adminEmail} / ${adminPassword}`);
        }

        app.listen(PORT, () => {
            console.log(`[SERVER] Rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('[DB] Erro ao iniciar:', error);
        process.exit(1);
    }
};

startServer();
