const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    shippingCost: { type: Number, default: 4.99 }, // Standart Kargo Ücreti
    freeShippingThreshold: { type: Number, default: 50.00 }, // Ücretsiz Kargo Limiti
    socialImages: { type: [String], default: [] } // 🛡️ YENİ: Dinamik Sosyal Medya Resimleri
});

module.exports = mongoose.model('Setting', settingSchema);