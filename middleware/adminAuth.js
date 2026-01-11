const Admin = require('../models/adminSchema');

const requireAdmin = async (req, res, next) => {
    try {
        if (!req.session.adminId || !req.session.isAdmin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const admin = await Admin.findById(req.session.adminId);
        if (!admin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = requireAdmin; 