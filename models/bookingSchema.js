const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    visitDate: {
        type: Date,
        required: true
    },
    groupSize: {
        type: Number,
        required: true,
        min: 1
    },
    tourInterest: {
        type: String,
        required: true
    },
    contactMethods: [{
        type: String,
        enum: ['email', 'phone', 'whatsapp']
    }],
    callTime: {
        type: String,
        enum: ['morning', 'afternoon', 'evening']
    },
    additionalInfo: String,
    referralSource: {
        type: String,
        enum: ['search', 'social', 'friend', 'advertisement', 'other']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking', bookingSchema); 