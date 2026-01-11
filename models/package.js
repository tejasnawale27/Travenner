const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    packageName: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    overview: {
        type: String,
        required: true
    },
    images: [{
        type: String,
        required: true
    }],
    departureCity: {
        type: String,
        required: true,
        trim: true
    },
    arrivalCity: {
        type: String,
        required: true,
        trim: true
    },
    tripType: {
        type: String,
        required: true,
        enum: ['adventure', 'leisure', 'business', 'family', 'honeymoon']
    },
    itinerary: {
        type: String,
        required: true
    },
    guide: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add text index for search functionality
packageSchema.index({
    packageName: 'text',
    location: 'text',
    overview: 'text',
    tripType: 'text'
});

const Package = mongoose.model('Package', packageSchema);

module.exports = Package; 