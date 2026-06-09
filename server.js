/**
 * KOÇYİĞİT GmbH - OFFICIAL BACKEND SERVER (ULTRA STABLE V13)
 * OPTİMİZASYON: Gzip/Brotli Sıkıştırma, Static Caching ve DNS Önceliği.
 * 🛡️ REVIZE: Apple Pay (.well-known) Desteği ve Resim Erişimi Mühürlendi.
 * 🛡️ KARGO MOTORU: Dinamik kargo ayarları rotası entegre edildi.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const connectDB = require('./config/db');
const cron = require('node-cron');
const runGdprCleanup = require('./utils/gdprManager');
const paymentController = require('./controllers/paymentController');

// 🔥 CRASH ÖNLEYİCİ GLOBAL HANDLERLAR
process.on('uncaughtException', (err) => {
    console.error('💥 KRITISCHER FEHLER (Uncaught Exception):', err);
});

process.on('unhandledRejection', (err) => {
    console.error('💥 KRITISCHER FEHLER (Unhandled Rejection):', err);
});

// DNS Önceliği (MongoDB bağlantı hızı için)
dns.setDefaultResultOrder('ipv4first');

const app = express();

// --- ⚡ HIZ VE PERFORMANS ---
app.use(compression());

// 🛡️ REVIZE: Statik dosya ayarları (Apple Pay ve Resimler için)
const staticOptions = {
    maxAge: '1d',
    etag: true,
    dotfiles: 'allow' // 🍎 Apple Pay (.well-known) için kritik izin!
};

// --- STRIPE WEBHOOK (JSON'dan ÖNCE OLMALI) ---
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

// --- STANDART MIDDLEWARE ---
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);

// --- VERİTABANI ---
connectDB();

// 🛡️ DSGVO/GDPR ZAMANLAYICI
cron.schedule('0 3 * * *', () => {
    console.log("🕒 GDPR-Bereinigung wird gestartet...");
    runGdprCleanup();
});

// --- CORS AYARLARI ---
app.use(cors({
    origin: [
        'https://kocyigit-trade.com',
        'https://www.kocyigit-trade.com',
        'http://localhost:5173',
        'http://localhost:5000',
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ],
    credentials: true
}));

// --- 🖼️ STATIC ASSETS (REVIZE EDİLDİ) ---
// 1. Resim klasörünü dışarı aç
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '0', // Resimlerde güncelleme anında görünsün diye cache'i sıfırladık
    etag: true
}));

// 2. Frontend dosyalarını dışarı aç (.well-known izni dahil)
app.use(express.static(path.join(__dirname, 'frontend'), staticOptions));

// --- ROUTES ---
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api', require('./routes/testRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/settings', require('./routes/settingRoutes')); // 🛡️ DİNAMİK KARGO ROTASI

// API Durum Kontrolü
app.get('/api-status', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Luxe Berlin API ist online! 🚀',
        timestamp: new Date().toLocaleString('de-DE')
    });
});

// --- 404 HANDLER ---
app.use((req, res) => {
    // Eğer istek /api ile başlıyorsa ve bulunamadıysa JSON dön
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ success: false, message: "API-Endpunkt nicht gefunden." });
    }
    // Değilse 404 sayfasını gönder
    res.status(404).sendFile(path.join(__dirname, 'frontend', '404.html'));
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error("🚨 GLOBALER SERVERFEHLER:");
    console.error(err.stack || err);

    res.status(err.status || 500).json({
        success: false,
        message: "Ein interner Serverfehler ist aufgetreten!",
        error: process.env.NODE_ENV === 'development' ? err.message : "Internal Server Error"
    });
});

// --- BAŞLATMA ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("--------------------------------------------------");
    console.log(`🚀 KOÇYİĞİT SERVER AKTIV AUF PORT: ${PORT}`);
    console.log(`⚡ Statik dosyalar ve Apple Pay erişimi mühürlendi.`);
    console.log("--------------------------------------------------");
});