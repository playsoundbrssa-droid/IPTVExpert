// Middleware: requires auth middleware to run first (req.userRole must be set)
module.exports = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
    }
    next();
};
