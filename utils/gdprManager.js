const Order = require('../models/Order');

/**
 * 🛡️ DSGVO (GDPR) VERİ TEMİZLİĞİ
 * Almanya yasalarına göre, işlem süresi dolmuş kişisel veriler anonimleştirilmelidir.
 * Bu fonksiyon, 2 yıldan eski siparişlerin kişisel verilerini siler, 
 * ancak muhasebe için sipariş tutarını ve ürünleri tutar.
 */
const runGdprCleanup = async () => {
    console.log('🛡️ DSGVO-System: Veri temizliği kontrol ediliyor...');

    // 2 Yıl öncesini hesapla
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - 2);

    try {
        // 2 yıldan eski VE henüz anonimleştirilmemiş siparişleri bul ve güncelle
        const result = await Order.updateMany(
            {
                date: { $lt: retentionDate },
                "customer.email": { $ne: "anonym@luxeberlin.de" } // Zaten silinmişleri atla
            },
            {
                $set: {
                    "customer.firstName": "Anonym",
                    "customer.lastName": "User",
                    "customer.email": "anonym@luxeberlin.de",
                    "customer.phone": "0000000000",
                    "customer.address": "Daten gelöscht (DSGVO)",
                    status: 'Archived',
                    isArchived: true
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ DSGVO: ${result.modifiedCount} eski sipariş başarıyla anonimleştirildi.`);
        } else {
            console.log('✅ DSGVO: Temizlenecek eski veri bulunamadı.');
        }
    } catch (err) {
        console.error("❌ DSGVO Hatası:", err.message);
    }
};

module.exports = runGdprCleanup;
