const Product = require('../models/Product');
const path = require('path');

/**
 * KOÇYİĞİT GmbH - PRODUCT CONTROLLER (V14 MASTER - MÜHÜRLÜ)
 * 🛡️ REVIZE: oldPrice desteği eklendi.
 * 🛡️ FIX: Cloudinary URL'lerinin kırpılması (path.basename) engellendi. Resimler artık direkt Cloudinary linkiyle kaydediliyor.
 */

// 1. TÜM ÜRÜNLERİ GETİR
exports.getAllProducts = async (req, res) => {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';
        const filter = includeDeleted ? {} : { isDeleted: false };

        // Sıralamayı orderIndex'e göre yapıyoruz
        const products = await Product.find(filter).sort({ orderIndex: 1 });
        res.status(200).json(products);
    } catch (err) {
        console.error("GetAllProducts Error:", err);
        res.status(500).json({ success: false, message: "Fehler beim Laden der Produkte: " + err.message });
    }
};

// 2. SIRALAMAYI GÜNCELLE (Sürükle-Bırak Sonrası)
exports.updateOrder = async (req, res) => {
    try {
        const { newOrder } = req.body;

        if (!newOrder || !Array.isArray(newOrder)) {
            return res.status(400).json({ success: false, message: "Ungültige Daten" });
        }

        const updatePromises = newOrder.map(item =>
            Product.findByIdAndUpdate(item.id, { orderIndex: item.index })
        );

        await Promise.all(updatePromises);

        res.status(200).json({ success: true, message: "Reihenfolge erfolgreich aktualisiert" });
    } catch (err) {
        console.error("UpdateOrder Error:", err);
        res.status(500).json({ success: false, message: "Fehler beim Speichern der Reihenfolge" });
    }
};

// 3. TEK ÜRÜN GETİR
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt nicht gefunden" });
        }
        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ success: false, message: "Ungültige Produkt-ID" });
    }
};

// 4. YENİ ÜRÜN OLUŞTUR
exports.createProduct = async (req, res) => {
    try {
        const { name, price, oldPrice, stock, description } = req.body;

        // 🛡️ KRİTİK FIX: path.basename İPTAL EDİLDİ! Gelen Cloudinary URL'sini tam olarak (req.file.path) kaydediyoruz.
        const imageUrl = req.file ? req.file.path : null;

        if (!name || !price) {
            return res.status(400).json({ success: false, message: "Name und Preis sind erforderlich" });
        }

        const lastProduct = await Product.findOne().sort({ orderIndex: -1 });
        const nextIndex = lastProduct ? lastProduct.orderIndex + 1 : 0;

        const newProduct = new Product({
            name,
            price,
            oldPrice: oldPrice || null,
            stock: stock || 0,
            description,
            image: imageUrl, // Artık tam link: https://res.cloudinary.com/...
            orderIndex: nextIndex
        });

        await newProduct.save();
        res.status(201).json({ success: true, product: newProduct });
    } catch (err) {
        console.error("CreateProduct Error:", err);
        res.status(500).json({ success: false, message: "Fehler beim Erstellen: " + err.message });
    }
};

// 5. ÜRÜN GÜNCELLE
exports.updateProduct = async (req, res) => {
    try {
        const { name, price, oldPrice, stock, description } = req.body;

        // Mevcut verileri hazırla
        const updateData = {
            name,
            price,
            oldPrice: oldPrice || null,
            stock,
            description
        };

        // 🛡️ KRİTİK FIX: Resim güncellenirse path.basename kullanmıyoruz, tam Cloudinary URL'sini alıyoruz.
        if (req.file) {
            updateData.image = req.file.path;
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt zum Aktualisieren nicht gefunden" });
        }

        res.status(200).json({ success: true, product });
    } catch (err) {
        console.error("UpdateProduct Error:", err);
        res.status(500).json({ success: false, message: "Fehler beim Aktualisieren: " + err.message });
    }
};

// 6. ÜRÜN ARŞİVLE (Soft Delete)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt nicht gefunden" });
        }
        res.status(200).json({ success: true, message: "Produkt erfolgreich archiviert" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Fehler beim Archivieren" });
    }
};

// 7. ÜRÜN GERİ GETİR (Restore)
exports.restoreProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { isDeleted: false }, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: "Produkt nicht gefunden" });
        }
        res.status(200).json({ success: true, message: "Produkt erfolgreich wiederhergestellt" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Wiederherstellung fehlgeschlagen" });
    }
};