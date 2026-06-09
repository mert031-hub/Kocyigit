const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendStatusEmail } = require("../config/mailer");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit'); // 🛡️ PDF Motoru Kütüphanesi

/**
 * 🛡️ MASTER REFUND HELPER
 * Para iadesi ve stok iadesini tek noktadan yönetir.
 */
async function processFullRefundAndStock(order) {
    if (order.paymentStatus === 'Refunded') {
        console.log(`⚠️ Sipariş zaten iade edilmiş: ${order.shortId}`);
        return;
    }

    if (order.stripeSessionId && order.paymentStatus === 'Paid') {
        try {
            const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
            if (session.payment_intent) {
                await stripe.refunds.create({
                    payment_intent: session.payment_intent,
                    reason: 'requested_by_customer'
                });
                order.paymentStatus = 'Refunded';
                console.log(`💰 Stripe İadesi Başarılı: ${order.shortId}`);
            }
        } catch (stripeErr) {
            console.error("❌ Stripe Refund Hatası:", stripeErr.message);
        }
    }

    for (const item of order.items) {
        if (item.productId) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
        }
    }
}

/**
 * 1️⃣ SİPARİŞ OLUŞTURMA
 */
exports.createOrder = async (req, res) => {
    try {
        const { customer, items, totalAmount, paymentMethod } = req.body;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: "Produkt nicht gefunden." });
            if (product.stock < item.qty) {
                return res.status(400).json({ message: `Nicht genügend Lagerbestand.` });
            }
        }

        const timestamp = Date.now().toString(36).toUpperCase();
        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
        const generatedShortId = `LB-${timestamp}${randomStr}`;

        const newOrder = new Order({
            customer, items, totalAmount,
            paymentMethod: paymentMethod || "Unbekannt",
            shortId: generatedShortId
        });

        await newOrder.save();

        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
        }

        const populatedOrder = await Order.findById(newOrder._id).populate('items.productId');
        sendStatusEmail(populatedOrder, "pending").catch(err => console.error("❌ Mail hatası:", err.message));

        res.status(201).json({ message: "Sipariş başarılı!", orderId: newOrder._id, shortId: generatedShortId });
    } catch (err) {
        res.status(500).json({ message: "Hata", error: err.message });
    }
};

/**
 * 2️⃣ STRIPE SESSION ID İLE SİPARİŞ GETİR
 */
exports.getOrderBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        let order = await Order.findOne({ stripeSessionId: sessionId }).populate('items.productId');
        if (order) return res.json(order);

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session && session.payment_status === 'paid') {
            const metadataItems = JSON.parse(session.metadata.cartItems);
            const timestamp = Date.now().toString(36).toUpperCase();
            const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
            const generatedShortId = `LB-${timestamp}${randomStr}`;

            const newOrder = new Order({
                customer: {
                    firstName: session.metadata.firstName,
                    lastName: session.metadata.lastName,
                    email: session.customer_details.email,
                    phone: session.metadata.phone,
                    address: session.metadata.address
                },
                items: metadataItems,
                totalAmount: session.amount_total / 100,
                paymentStatus: 'Paid',
                paymentMethod: 'KARTE (Stripe)',
                stripeSessionId: session.id,
                shortId: generatedShortId
            });

            await newOrder.save();
            for (const item of metadataItems) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
            }
            const populated = await Order.findById(newOrder._id).populate('items.productId');
            sendStatusEmail(populated, "pending").catch(e => console.error("📧 Mail hatası:", e.message));
            return res.json(populated);
        }
        return res.status(404).json({ message: "Bestellung wird verarbeitet..." });
    } catch (err) {
        console.error("🔴 SİPARİŞ OLUŞTURMA HATASI (getOrderBySession):", err);
        res.status(500).json({ message: "Fehler", error: err.message });
    }
};

/**
 * 3️⃣ TÜM SİPARİŞLERİ GETİR (ARŞİV DAHİL SON 3 AY)
 */
exports.getAllOrders = async (req, res) => {
    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const orders = await Order.find({
            date: { $gte: threeMonthsAgo }
        }).sort({ date: -1 }).populate('items.productId');
        res.json(orders);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * 4️⃣ TEK SİPARİŞ GETİR
 */
exports.getOrderById = async (req, res) => {
    try {
        let { id } = req.params;
        const cleanId = id.replace('#', '').replace('LB-', '').toUpperCase();
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        let order = isObjectId
            ? await Order.findById(id).populate('items.productId')
            : await Order.findOne({ shortId: `LB-${cleanId}` }).populate('items.productId');

        if (!order) return res.status(404).json({ message: "Sipariş bulunamadı." });
        res.json(order);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * 5️⃣ DURUM GÜNCELLEME
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, status: { $ne: "Cancelled" } },
            { $set: { status: status } },
            { new: true }
        ).populate('items.productId');

        if (!order) return res.status(400).json({ message: "Sipariş zaten iptal edilmiş veya bulunamadı." });

        if (status === "Cancelled") {
            await processFullRefundAndStock(order);
            await order.save();
        }

        sendStatusEmail(order, status).catch(err => console.error("❌ Mail hatası:", err.message));
        res.json({ success: true, message: "Status başarıyla güncellendi." });
    } catch (err) {
        res.status(500).json({ message: "Güncellenemedi", error: err.message });
    }
};

/**
 * 6️⃣ SİPARİŞ İPTAL (Kullanıcı Tarafı)
 */
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.id,
                status: { $in: ["Pending", "Processing"] }
            },
            { $set: { status: "Cancelled" } },
            { new: true }
        ).populate('items.productId');

        if (!order) return res.status(400).json({ message: "Stornierung nicht möglich." });

        await processFullRefundAndStock(order);
        await order.save();

        sendStatusEmail(order, "Cancelled").catch(err => console.error("❌ İptal maili hatası:", err));
        res.json({ message: "Bestellung erfolgreich storniert.", success: true, order });
    } catch (err) {
        res.status(500).json({ message: "Serverfehler", error: err.message });
    }
};

/**
 * 7️⃣ SİPARİŞİ LİSTEDEN KALDIR (SOFT DELETE / ARCHIVE)
 */
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
        if (!order) return res.status(404).json({ message: "Bestellung nicht gefunden." });
        res.json({ success: true, message: "Sipariş aktif listeden kaldırıldı." });
    } catch (err) { res.status(500).json({ message: "Hata" }); }
};

/**
 * 8️⃣ SİPARİŞİ ARŞİVDEN GERİ GETİR (RESTORE)
 */
exports.restoreOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { isArchived: false }, { new: true });
        if (!order) return res.status(404).json({ message: "Bestellung nicht gefunden." });
        res.json({ success: true, message: "Sipariş başarıyla geri getirildi!" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.archiveOrder = async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { isArchived: true });
        res.json({ message: "Sipariş arşivlendi." });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

/**
 * 🛡️ 9️⃣ KOÇYİĞİT GmbH - PDF FATURA OLUŞTURUCU (MÜHÜRLÜ DİZAYN + KARGO EKLENTİSİ)
 */
exports.downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.productId');
        if (!order) return res.status(404).send('Bestellung nicht gefunden');

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        let invoiceName = `Rechnung_KOCYIGIT_${order.shortId || order._id.toString().slice(-6).toUpperCase()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceName}"`);

        doc.pipe(res);

        const sanitize = (text) => {
            if (!text) return "";
            return text.replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
                .replace(/Ü/g, 'U').replace(/ü/g, 'u')
                .replace(/Ş/g, 'S').replace(/ş/g, 's')
                .replace(/İ/g, 'I').replace(/ı/g, 'i')
                .replace(/Ö/g, 'O').replace(/ö/g, 'o')
                .replace(/Ç/g, 'C').replace(/ç/g, 'c');
        };

        // 1. Şirket Bilgileri
        doc.fillColor('#444444').fontSize(26).font('Helvetica-Bold').text('RECHNUNG', { align: 'right' });
        doc.moveDown();

        doc.fillColor('#1c2541').fontSize(14).font('Helvetica-Bold').text('KOCYIGIT Betrieb&Handel', 50, 90);
        doc.fillColor('#777777').fontSize(10).font('Helvetica');
        doc.text('Sinkenbreite 1', 50, 110);
        doc.text('89180 Berghulen', 50, 125);
        doc.text('Deutschland', 50, 140);

        doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, 170).lineTo(550, 170).stroke();

        // 2. Müşteri ve Sipariş Bilgileri
        doc.fillColor('#1c2541').fontSize(11).font('Helvetica-Bold').text('Rechnung an:', 50, 190);
        doc.fillColor('#444444').fontSize(10).font('Helvetica');
        doc.text(sanitize(`${order.customer.firstName} ${order.customer.lastName}`), 50, 210);
        doc.text(sanitize(`${order.customer.address}`), 50, 225);
        doc.text(sanitize(`${order.customer.email}`), 50, 240);

        doc.fillColor('#1c2541').font('Helvetica-Bold').text('Bestellnummer:', 320, 190);
        doc.fillColor('#444444').font('Helvetica').text(`#${order.shortId || order._id.toString().slice(-6).toUpperCase()}`, 420, 190);

        doc.fillColor('#1c2541').font('Helvetica-Bold').text('Datum:', 320, 210);
        doc.fillColor('#444444').font('Helvetica').text(`${new Date(order.date || Date.now()).toLocaleDateString('de-DE')}`, 420, 210);

        doc.fillColor('#1c2541').font('Helvetica-Bold').text('Zahlungsart:', 320, 230);
        doc.fillColor('#444444').font('Helvetica').text(sanitize(`${order.paymentMethod || 'Online Zahlung'}`), 420, 230);

        // 3. Ürün Tablosu Başlıkları
        const tableTop = 290;
        doc.fillColor('#1c2541').font('Helvetica-Bold').fontSize(10);
        doc.text('Artikel', 50, tableTop);
        doc.text('Menge', 320, tableTop, { width: 50, align: 'center' });
        doc.text('Preis', 400, tableTop, { width: 60, align: 'right' });
        doc.text('Gesamt', 480, tableTop, { width: 70, align: 'right' });

        doc.strokeColor('#c5a059').lineWidth(2).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // 4. Ürünleri Listeleme ve Alt Toplam Hesaplama
        let y = tableTop + 25;
        doc.fillColor('#444444').font('Helvetica');
        let subtotal = 0;

        (order.items || []).forEach(item => {
            const itemPrice = item.price || (item.productId && item.productId.price) || 0;
            const itemQty = item.qty || 1;
            const itemTotal = itemPrice * itemQty;
            subtotal += itemTotal;

            doc.text(sanitize(item.productId?.name || item.name || 'Produkt'), 50, y, { width: 260 });
            doc.text(itemQty.toString(), 320, y, { width: 50, align: 'center' });
            doc.text(`${itemPrice.toFixed(2)} EUR`, 400, y, { width: 60, align: 'right' });
            doc.text(`${itemTotal.toFixed(2)} EUR`, 480, y, { width: 70, align: 'right' });
            y += 20;
        });

        // 🛡️ KARGO (Versandkosten) SATIRINI EKLİYORUZ
        const total = order.totalAmount || 0;
        let shippingCost = total - subtotal;
        if (shippingCost < 0.05) shippingCost = 0; // Küsürat toleransı

        doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, y + 10).lineTo(550, y + 10).stroke();

        y += 20;
        doc.fillColor('#1c2541').font('Helvetica-Oblique').text('Versandkosten (Standard)', 50, y, { width: 260 });
        doc.fillColor('#444444').font('Helvetica').text('1', 320, y, { width: 50, align: 'center' });
        doc.text(`${shippingCost.toFixed(2)} EUR`, 400, y, { width: 60, align: 'right' });
        doc.text(`${shippingCost.toFixed(2)} EUR`, 480, y, { width: 70, align: 'right' });

        doc.strokeColor('#c5a059').lineWidth(1).moveTo(380, y + 20).lineTo(550, y + 20).stroke();

        // 5. Vergi ve Toplam Hesaplamaları (Almanya Standardı)
        const netto = (total / 1.19).toFixed(2);
        const mwst = (total - netto).toFixed(2);

        doc.font('Helvetica').text('Nettobetrag:', 380, y + 35, { width: 90, align: 'right' });
        doc.text(`${netto} EUR`, 480, y + 35, { width: 70, align: 'right' });

        doc.text('MwSt (19%):', 380, y + 55, { width: 90, align: 'right' });
        doc.text(`${mwst} EUR`, 480, y + 55, { width: 70, align: 'right' });

        doc.font('Helvetica-Bold').fontSize(14).fillColor('#c5a059').text('Gesamtsumme:', 320, y + 80, { width: 150, align: 'right' });
        doc.text(`${total.toFixed(2)} EUR`, 480, y + 80, { width: 70, align: 'right' });

        // 6. Alt Bilgi (Footer)
        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#777777').text(
            'Vielen Dank fur Ihren Einkauf bei KOCYIGIT Betrieb&Handel!',
            50, 750, { align: 'center', width: 500 }
        );

        doc.end();
    } catch (error) {
        console.error("PDF Fatura Hatası:", error);
        res.status(500).send('Fatura oluşturulurken hata oluştu.');
    }
};