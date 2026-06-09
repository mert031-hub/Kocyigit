const { Resend } = require('resend');

// Resend API anahtarını başlatıyoruz
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * KOÇYİĞİT GmbH - Kontakt Formu Kontrolcüsü
 * 🛡️ REBRANDING: LUXE -> KOÇYİĞİT GmbH mühürlendi.
 */
exports.sendContactMail = async (req, res) => {
    const { name, email, subject, message } = req.body;

    try {
        const { data, error } = await resend.emails.send({
            // 🛡️ REBRANDING: Gönderen ismi güncellendi
            from: "KOÇYİĞİT Kontakt <onboarding@resend.dev>",

            // Mesajın gideceği adres (Senin kendi mailin)
            to: ["kocyigit.trade@gmail.com"],

            // Kullanıcıya direkt cevap yazabilmen için replyTo ayarı
            reply_to: email,

            // 🛡️ REBRANDING: Mail başlığı kurumsal kimliğe mühürlendi
            subject: `KOÇYİĞİT Betrieb&Handel - Neue Kontaktanfrage: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
                    <h2 style="color: #1c2541; border-bottom: 2px solid #c5a059; padding-bottom: 10px;">
                        KOÇYİĞİT Betrieb&Handel - Neue Nachricht
                    </h2>
                    <div style="background:#f9f9f9; padding:20px; border-radius:10px; border-left: 5px solid #c5a059;">
                        <p><strong>Absender Name:</strong> ${name}</p>
                        <p><strong>Absender E-Mail:</strong> ${email}</p>
                        <p><strong>Betreff:</strong> ${subject}</p>
                        <hr style="border:none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p><strong>Nachricht:</strong></p>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    <p style="font-size: 0.8em; color: #777; margin-top: 20px; text-align: center;">
                        Diese E-Mail wurde über das KOÇYİĞİT Betrieb&Handel Kontaktformular gesendet.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error("❌ Resend API Hatası (Kontakt):", error);
            return res.status(500).json({ message: "Mesaj gönderilemedi." });
        }

        console.log("✅ İletişim maili Resend ile uçuruldu! ID:", data.id);
        res.status(200).json({ message: "Nachricht erfolgreich gesendet" });

    } catch (err) {
        console.error("❌ İletişim Formu Catch Hatası:", err.message);
        res.status(500).json({ message: "Sunucu hatası: " + err.message });
    }
};