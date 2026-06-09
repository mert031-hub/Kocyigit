const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // process.env.MONGO_URI'nin yüklendiğinden emin oluyoruz
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`🍃 MongoDB Bağlantısı Başarılı: ${conn.connection.host}`);
    } catch (err) {
        console.error('❌ MongoDB Bağlantı Hatası:', err.message);
        process.exit(1);
    }
};

// Fonksiyonu dışarı aktarırken bu formatı kullan (TypeError'ı çözer)
module.exports = connectDB;