const express = require("express");
const router = express.Router();
const Setting = require("../models/Setting");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2; // Projedeki mevcut .env ayarlarını otomatik kullanır

// 🛡️ Cloudinary Depolama Ayarları (PC'den seçilen fotoğrafları buluta atar)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "kocyigit_gallery",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
    }
});
const upload = multer({ storage: storage });

// 🛡️ Ayarları Getir (Ödeme sayfası ve Admin okuyacak)
router.get("/", async (req, res) => {
    try {
        let settings = await Setting.findOne();
        // Eğer veritabanında ayar yoksa, varsayılan olarak oluştur
        if (!settings) {
            settings = await Setting.create({ shippingCost: 4.99, freeShippingThreshold: 50, socialImages: [] });
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// 🛡️ Ayarları ve Galeriyi Güncelle (Resim Yükleme Desteği ile)
router.post("/", upload.fields([
    { name: 'instaImg1', maxCount: 1 },
    { name: 'instaImg2', maxCount: 1 },
    { name: 'instaImg3', maxCount: 1 },
    { name: 'instaImg4', maxCount: 1 }
]), async (req, res) => {
    try {
        const { shippingCost, freeShippingThreshold } = req.body;
        let settings = await Setting.findOne();

        if (!settings) settings = new Setting();

        if (shippingCost !== undefined) settings.shippingCost = Number(shippingCost);
        if (freeShippingThreshold !== undefined) settings.freeShippingThreshold = Number(freeShippingThreshold);

        // Mevcut resimleri korumak için diziyi klonluyoruz
        let currentImages = settings.socialImages || [];
        if (currentImages.length < 4) currentImages = [null, null, null, null];

        // Eğer PC'den yeni resim yüklendiyse ilgili indexteki resmi Cloudinary URL'si ile değiştir
        if (req.files) {
            if (req.files['instaImg1']) currentImages[0] = req.files['instaImg1'][0].path;
            if (req.files['instaImg2']) currentImages[1] = req.files['instaImg2'][0].path;
            if (req.files['instaImg3']) currentImages[2] = req.files['instaImg3'][0].path;
            if (req.files['instaImg4']) currentImages[3] = req.files['instaImg4'][0].path;
        }

        // Sadece dolu olanları filtrele ve kaydet
        settings.socialImages = currentImages.filter(img => img !== null && img !== "");
        await settings.save();

        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ message: "Update Error", error: err.message });
    }
});

module.exports = router;