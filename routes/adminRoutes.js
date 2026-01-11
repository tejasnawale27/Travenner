const express = require('express');
const router = express.Router();
const Admin = require('../models/adminSchema');
const requireAdmin = require('../middleware/adminAuth');

// Admin login route
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find admin by username
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await admin.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Set admin session
        req.session.adminId = admin._id;
        req.session.isAdmin = true;

        res.json({ 
            message: 'Login successful',
            admin: {
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin logout route
router.post('/admin/logout', requireAdmin, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Create initial admin (should be secured in production)
router.post('/admin/setup', async (req, res) => {
    try {
        const adminExists = await Admin.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(400).json({ error: 'Admin already exists' });
        }

        const admin = new Admin({
            username: 'admin',
            password: 'admin123',
            email: 'admin@example.com',
            role: 'admin'
        });

        await admin.save();
        res.json({ message: 'Admin account created successfully' });
    } catch (error) {
        console.error('Admin setup error:', error);
        res.status(500).json({ error: 'Failed to create admin account' });
    }
});

// Check admin auth status
router.get('/admin/check-auth', requireAdmin, (req, res) => {
    res.json({ isAuthenticated: true });
});

module.exports = router; 