// middlewares/staffMiddleware.js
export function staffMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Non autenticato!' });
    }

    if (req.user.role !== 'STAFF') {
        return res.status(403).json({ message: 'Accesso riservato allo staff' });
    }

    next();
}
