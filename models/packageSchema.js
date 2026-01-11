const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    packageName: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    overview: {
        type: String,
        required: true
    },
    images: [{
        type: String  // URLs or Base64 strings of images
    }],
    departureCity: {
        type: String,
        required: true
    },
    arrivalCity: {
        type: String,
        required: true
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
    guide: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Package', packageSchema);