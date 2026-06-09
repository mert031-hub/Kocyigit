const cloudinary = require('cloudinary').v2;
const multerCloudinary = require('multer-storage-cloudinary');

/**
 * LUXE BERLIN - CLOUDINARY CONFIG (V10.2 - MASTER STABLE)
 * Senior Fix: Basierend auf V8.9. 
 * Nutzt den dynamischen Constructor-Check für maximale Ausfallsicherheit.
 */

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🛡️ MÜHÜR: Dynamische Erkennung der Storage-Klasse (Dein V8.9 Fallback)
// Dies verhindert den "TypeError: CloudinaryStorage is not a constructor" permanent.
const CloudinaryStorageClass = multerCloudinary.CloudinaryStorage || multerCloudinary;

const storage = new CloudinaryStorageClass({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: process.env.CLOUDINARY_FOLDER || 'luxe_berlin_products',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
            public_id: `product_${Date.now()}` // Verhindert Dateinamens-Kollisionen
        };
    }
});

module.exports = {
    cloudinary,
    storage
};