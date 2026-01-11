const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/userSchema');

async function createAdminUser() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/cppmainproject');
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@example.com' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminUser = new User({
            name: 'Admin',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        mongoose.connection.close();
    }
}

createAdminUser(); 