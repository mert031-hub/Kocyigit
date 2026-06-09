const Log = require('../models/Log');

// Logları kaydet
exports.saveLog = async (req, res) => {
    try {
        const { action, user, status } = req.body;
        const newLog = new Log({ action, user, status });
        await newLog.save();
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Logları getir (Son 500 log)
exports.getLogs = async (req, res) => {
    try {
        const logs = await Log.find().sort({ timestamp: -1 }).limit(500);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};