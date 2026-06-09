const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    user: { type: String, required: true },
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, expires: 7776000 } // 90 gün sonra otomatik silinir
});

module.exports = mongoose.model('Log', LogSchema);