const { Resend } = require("resend");
const PDFDocument = require('pdfkit');

const resend = new Resend(process.env.RESEND_API_KEY);

// 🛡️ KOÇYİĞİT GmbH - PATRON BİLDİRİM AYARI
const ADMIN_EMAIL = 'kocyigit.trade@gmail.com';

/**
 * 🛡️ PDF Fatura Buffer Oluşturucu (Mail Eklentisi İçin + Kargo Eklentisi)
 */
function createInvoiceBuffer(order) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                let pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            const sanitize = (text) => {
                if (!text) return "";
                return text.replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
                    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
                    .replace(/Ş/g, 'S').replace(/ş/g, 's')
                    .replace(/İ/g, 'I').replace(/ı/g, 'i')
                    .replace(/Ö/g, 'O').replace(/ö/g, 'o')
                    .replace(/Ç/g, 'C').replace(/ç/g, 'c');
            };

            doc.fillColor('#444444').fontSize(26).font('Helvetica-Bold').text('RECHNUNG', { align: 'right' });
            doc.moveDown();

            doc.fillColor('#1c2541').fontSize(14).font('Helvetica-Bold').text('KOCYIGIT Betrieb&Handel', 50, 90);
            doc.fillColor('#777777').fontSize(10).font('Helvetica');
            doc.text('Sinkenbreite 1', 50, 110);
            doc.text('89180 Berghulen', 50, 125);
            doc.text('Deutschland', 50, 140);

            doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, 170).lineTo(550, 170).stroke();

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

            const tableTop = 290;
            doc.fillColor('#1c2541').font('Helvetica-Bold').fontSize(10);
            doc.text('Artikel', 50, tableTop);
            doc.text('Menge', 320, tableTop, { width: 50, align: 'center' });
            doc.text('Preis', 400, tableTop, { width: 60, align: 'right' });
            doc.text('Gesamt', 480, tableTop, { width: 70, align: 'right' });

            doc.strokeColor('#c5a059').lineWidth(2).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

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
            if (shippingCost < 0.05) shippingCost = 0;

            doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, y + 10).lineTo(550, y + 10).stroke();

            y += 20;
            doc.fillColor('#1c2541').font('Helvetica-Oblique').text('Versandkosten (Standard)', 50, y, { width: 260 });
            doc.fillColor('#444444').font('Helvetica').text('1', 320, y, { width: 50, align: 'center' });
            doc.text(`${shippingCost.toFixed(2)} EUR`, 400, y, { width: 60, align: 'right' });
            doc.text(`${shippingCost.toFixed(2)} EUR`, 480, y, { width: 70, align: 'right' });

            doc.strokeColor('#c5a059').lineWidth(1).moveTo(380, y + 20).lineTo(550, y + 20).stroke();

            const netto = (total / 1.19).toFixed(2);
            const mwst = (total - netto).toFixed(2);

            doc.font('Helvetica').text('Nettobetrag:', 380, y + 35, { width: 90, align: 'right' });
            doc.text(`${netto} EUR`, 480, y + 35, { width: 70, align: 'right' });

            doc.text('MwSt (19%):', 380, y + 55, { width: 90, align: 'right' });
            doc.text(`${mwst} EUR`, 480, y + 55, { width: 70, align: 'right' });

            doc.font('Helvetica-Bold').fontSize(14).fillColor('#c5a059').text('Gesamtsumme:', 320, y + 80, { width: 150, align: 'right' });
            doc.text(`${total.toFixed(2)} EUR`, 480, y + 80, { width: 70, align: 'right' });

            doc.font('Helvetica-Oblique').fontSize(10).fillColor('#777777').text(
                'Vielen Dank fur Ihren Einkauf bei KOCYIGIT Betrieb&Handel!',
                50, 750, { align: 'center', width: 500 }
            );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Sipariş durumuna göre mail gönderen servis.
 */
async function sendStatusEmail(order, newStatus) {
    if (!order || !order.customer || !order.customer.email) {
        console.error("❌ Mail gönderilemedi: Eksik sipariş veya müşteri bilgisi.");
        return;
    }

    let subject = "";
    let message = "";
    let statusLabel = "Bestell-Update";
    const status = newStatus ? newStatus.toLowerCase() : "";

    if (status === "pending" || status === "eingegangen") {
        subject = `Bestellbestätigung - KOÇYİĞİT  #${order.shortId}`;
        statusLabel = "Bestellbestätigung";
        message = "Wir haben Ihre Bestellung erhalten und bereiten sie mit höchster Sorgfalt vor.";
    }
    else if (status === "processing" || status === "in bearbeitung") {
        subject = "Ihre Bestellung wird bearbeitet";
        statusLabel = "In Bearbeitung";
        message = "Ihre exklusiven Stücke werden nun geprüft und für den Versand vorbereitet.";
    }
    else if (status === "shipped" || status === "versandt") {
        subject = "Ihre Bestellung ist auf dem Weg!";
        statusLabel = "Versandt";
        message = `Gute Nachrichten! Ihre Bestellung wurde an den Versanddienstleister übergeben.`;
    }
    else if (status === "delivered" || status === "geliefert") {
        subject = "Ihre Bestellung wurde zugestellt";
        statusLabel = "Zugestellt";
        message = "Vielen Dank für Ihr Vertrauen in KOÇYİĞİT Betrieb&Handel. Wir hoffen, dass Sie viel Freude mit Ihrem Kauf haben!";
    }
    else if (status === "cancelled" || status === "storniert") {
        subject = "Bestellung storniert - KOÇYİĞİT Betrieb&Handel";
        statusLabel = "Storniert";
        message = "Ihre Bestellung wurde erfolgreich storniert. Falls bereits Zahlungen geleistet wurden, werden diese umgehend erstattet.";
    }
    else {
        subject = "Update zu Ihrer Bestellung";
        message = `Der aktuelle Status Ihrer Bestellung wurde aktualisiert: ${newStatus}`;
    }

    // Ürün Tablosu (HTML) - GÜVENLİ FİYAT HESAPLAMASI EKLENDİ
    let subtotal = 0;
    const itemsHTML = (order.items || []).map(item => {
        const productImg = (item.productId && item.productId.image)
            ? item.productId.image
            : 'https://kocyigit-trade.com/favicon.png';

        const itemPrice = item.price || (item.productId && item.productId.price) || 0;
        const itemQty = item.qty || 1;
        subtotal += (itemPrice * itemQty);

        return `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                <img src="${productImg}" alt="${item.name || 'Produkt'}" width="50" height="50" style="border-radius: 6px; object-fit: cover; display: block; border: 1px solid #f0f0f0;">
            </td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eeeeee; font-size: 14px;">
                <span style="font-weight: 600; color: #1c2541;">${itemQty}x</span> ${item.productId?.name || item.name || 'Produkt'}
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #c5a059; font-size: 14px;">
                ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(itemPrice * itemQty)}
            </td>
        </tr>
        `;
    }).join('');

    // 🛡️ MAİL İÇİ KARGO SATIRI EKLENDİ
    const total = order.totalAmount || 0;
    let shippingCost = total - subtotal;
    if (shippingCost < 0.05) shippingCost = 0;

    let shippingHTML = '';
    if (shippingCost > 0) {
        shippingHTML = `
        <tr>
            <td colspan="2" style="padding-top: 15px; font-weight: 500; font-size: 13px; color: #666;">Versandkosten</td>
            <td style="padding-top: 15px; text-align: right; color: #666; font-size: 13px;">
                ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(shippingCost)}
            </td>
        </tr>`;
    }

    try {
        let attachments = [];
        if (status === "pending" || status === "eingegangen") {
            try {
                const invoiceBuffer = await createInvoiceBuffer(order);
                const invoiceName = `Rechnung_KOCYIGIT_${order.shortId || order._id.toString().slice(-6).toUpperCase()}.pdf`;
                attachments.push({
                    filename: invoiceName,
                    content: invoiceBuffer
                });
                console.log(`📄 PDF Fatura oluşturuldu ve maile eklendi: ${invoiceName}`);
            } catch (pdfErr) {
                console.error("❌ PDF Fatura mail eklentisi oluşturulurken hata:", pdfErr);
            }
        }

        // --- 1. MÜŞTERİYE GİDEN LÜKS MAİL ---
        await resend.emails.send({
            from: "KOÇYİĞİT Betrieb&Handel <noreply@kocyigit-trade.com>",
            to: [order.customer.email],
            subject: subject,
            attachments: attachments,
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                    .header { background-color: #1c2541; padding: 40px 20px; text-align: center; border-bottom: 4px solid #c5a059; }
                    .logo { color: #ffffff; font-size: 26px; letter-spacing: 4px; font-weight: bold; text-decoration: none; }
                    .logo span { color: #c5a059; }
                    .content { padding: 40px 30px; color: #1c2541; }
                    .status-badge { display: inline-block; padding: 6px 16px; background-color: rgba(197, 160, 89, 0.1); color: #c5a059; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 25px; }
                    .message-box { font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #4a5568; }
                    .order-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .address-box { background-color: #fdfdfd; border: 1px solid #f0f0f0; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
                    .btn { display: block; padding: 18px 20px; background-color: #c5a059; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-align: center; }
                    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 12px; color: #999999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header"><div class="logo">KOÇYİĞİT<span>Betrieb&Handel</span></div></div>
                    <div class="content">
                        <div class="status-badge">${statusLabel}</div>
                        <h2 style="margin-top: 0; font-size: 22px;">Hallo ${order.customer.firstName},</h2>
                        <div class="message-box">${message}</div>
                        <div style="margin-bottom: 10px; font-size: 12px; color: #a0aec0; font-weight: 700;">BESTELLÜBERSICHT</div>
                        <table class="order-table">
                            ${itemsHTML}
                            ${shippingHTML}
                            <tr>
                                <td colspan="2" style="padding-top: 15px; font-weight: 700;">Gesamtsumme</td>
                                <td style="padding-top: 15px; text-align: right; color: #1c2541; font-weight: 700;">
                                    ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(total)}
                                </td>
                            </tr>
                        </table>
                        <div class="address-box">
                            <span style="font-size: 12px; color: #a0aec0; font-weight: 700;">LIEFERADRESSE</span>
                            <div style="font-weight: 600; font-size: 15px; margin-top: 5px;">${order.customer.firstName} ${order.customer.lastName}</div>
                            <div style="font-size: 14px; color: #4a5568;">${order.customer.address}</div>
                        </div>
                        <a href="https://kocyigit-trade.com/track.html?id=${order.shortId}" class="btn">BESTELLUNG VERFOLGEN</a>
                        <div style="margin-top: 30px; font-size: 11px; color: #cbd5e0; text-align: center;">Bestell-ID: #${order.shortId}</div>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 KOÇYİĞİT Betrieb&Handel. Berlin, Deutschland.</p>
                    </div>
                </div>
            </body>
            </html>
            `
        });

        // --- 2. PATRONA GİDEN BİLDİRİM MAİLİ ---
        if (status === "pending" || status === "eingegangen") {
            await resend.emails.send({
                from: "SİSTEM BİLDİRİMİ <noreply@kocyigit-trade.com>",
                to: [ADMIN_EMAIL],
                subject: `⚠️ NEUE BESTELLUNG ERHALTEN! #${order.shortId}`,
                html: `
                <div style="background-color: #f8f8f8; padding: 25px; border: 2px solid #c5a059; font-family: sans-serif;">
                    <h2 style="color: #1c2541; margin-top: 0;">Patron, Yeni Siparişin Var!</h2>
                    <p>Az önce bir satış mühürlendi. İşte detaylar:</p>
                    <hr style="border: 0; border-top: 1px solid #ddd;">
                    <p><strong>Müşteri:</strong> ${order.customer.firstName} ${order.customer.lastName}</p>
                    <p><strong>Email:</strong> ${order.customer.email}</p>
                    <p><strong>Telefon:</strong> ${order.customer.phone || 'Belirtilmedi'}</p>
                    <p><strong>Adres:</strong> ${order.customer.address}</p>
                    <hr style="border: 0; border-top: 1px solid #ddd;">
                    <h4 style="margin-bottom: 10px;">Ürünler:</h4>
                    <table style="width: 100%; font-size: 14px;">
                        ${itemsHTML}
                        ${shippingHTML}
                    </table>
                    <h3 style="color: #198754; text-align: right; margin-top: 20px;">
                        Toplam Kazanç: ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(total)}
                    </h3>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="https://kocyigit-trade.com/admin.html" style="background: #1c2541; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Admin Paneline Git</a>
                    </div>
                </div>
                `
            });
            console.log(`🚀 Patron bildirimi gönderildi: ${order.shortId}`);
        }

    } catch (err) {
        console.error("❌ Mail servis hatası:", err.message);
    }
}

module.exports = { sendStatusEmail };