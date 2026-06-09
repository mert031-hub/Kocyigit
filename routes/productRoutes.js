const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const { storage } = require('../cloudinaryConfig');

/**
 * LUXE BERLIN - PRODUCT ROUTES (V11 MASTER)
 * KRİTİK DÜZELTME: Sıralama rotası en üste taşındı (404 Hatası Çözümü).
 */

const uploadCloud = multer({
    storage: storage,
    limits: { fileSize: 4 * 1024 * 1024 }
});

// --- 🔓 GENEL ROTALAR ---
router.get('/', productController.getAllProducts);

// --- 🔐 YETKİLİ ROTALAR (SIRALAMA ÖNEMLİ!) ---

// 1. ÖNCE STATİK ROTAYI TANIMLA (Çok Kritik!)
router.patch('/reorder/update-order', auth, productController.updateOrder);

// 2. SONRA DİNAMİK ID ROTASINI TANIMLA
router.get('/:id', productController.getProductById);

// Ürün İşlemleri
router.post('/',
    auth,
    uploadCloud.single('image'),
    productController.createProduct
);

router.put('/:id',
    auth,
    uploadCloud.single('image'),
    productController.updateProduct
);

router.delete('/:id', auth, productController.deleteProduct);
router.put('/restore/:id', auth, productController.restoreProduct);

module.exports = router;