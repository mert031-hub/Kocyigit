/**
 * LUXE BERLIN - DSGVO/GDPR COOKIE CONSENT MANAGER
 * Almanya yasalarına uygun "Opt-in" (Önce sor, sonra yükle) prensibiyle çalışır.
 * GÜNCELLEME: LocalStorage yerine süreli (1 Yıl) Cookie kullanımı.
 */

document.addEventListener("DOMContentLoaded", function () {
    const cookieName = "luxe_berlin_consent";

    // Kullanıcı daha önce seçim yaptı mı?
    if (!getCookie(cookieName)) {
        showCookieBanner();
    } else {
        // Eğer kabul ettiyse scriptleri yükle
        if (getCookie(cookieName) === "accepted") {
            loadThirdPartyScripts();
        }
    }

    function showCookieBanner() {
        // 1. HTML Yapısını Oluştur
        const banner = document.createElement("div");
        banner.id = "cookie-consent-banner";
        banner.innerHTML = `
            <div class="cookie-content">
                <h3>Wir schätzen Ihre Privatsphäre</h3>
                <p>
                    Wir verwenden Cookies, um Ihr Erlebnis auf unserer Website zu verbessern. 
                    Einige sind technisch notwendig, andere helfen uns, unser Angebot zu optimieren.
                    Weitere Informationen finden Sie in unserer <a href="/privacy.html">Datenschutzerklärung</a> 
                    und im <a href="/imprint.html">Impressum</a>.
                </p>
                <div class="cookie-buttons">
                    <button id="btn-decline" class="cookie-btn secondary">Nur essenzielle akzeptieren</button>
                    <button id="btn-accept" class="cookie-btn primary">Alle akzeptieren</button>
                </div>
            </div>
        `;

        // 2. CSS Stillerini Ekle (Luxe Berlin Temasına Uygun)
        const style = document.createElement("style");
        style.textContent = `
            #cookie-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                background-color: #111; /* Koyu Lüks Arkaplan */
                color: #fff;
                padding: 20px;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
                z-index: 9999;
                font-family: 'Arial', sans-serif;
                border-top: 1px solid #333;
                animation: slideUp 0.5s ease-out;
            }
            .cookie-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .cookie-content h3 {
                margin: 0 0 10px 0;
                font-size: 1.2rem;
                color: #f0a500; /* Altın Rengi Başlık */
            }
            .cookie-content p {
                font-size: 0.9rem;
                line-height: 1.5;
                margin-bottom: 20px;
                color: #ccc;
            }
            .cookie-content a {
                color: #fff;
                text-decoration: underline;
            }
            .cookie-buttons {
                display: flex;
                gap: 15px;
            }
            .cookie-btn {
                padding: 10px 20px;
                border: none;
                cursor: pointer;
                font-weight: bold;
                border-radius: 4px;
                transition: all 0.3s ease;
            }
            .cookie-btn.primary {
                background-color: #f0a500;
                color: #000;
            }
            .cookie-btn.primary:hover {
                background-color: #d48f00;
            }
            .cookie-btn.secondary {
                background-color: transparent;
                border: 1px solid #666;
                color: #fff;
            }
            .cookie-btn.secondary:hover {
                border-color: #fff;
            }
            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(banner);

        // 3. Event Listener'ları Ekle
        document.getElementById("btn-accept").addEventListener("click", function () {
            setCookie(cookieName, "accepted", 365); // 1 Yıl geçerli
            loadThirdPartyScripts();
            banner.remove();
        });

        document.getElementById("btn-decline").addEventListener("click", function () {
            setCookie(cookieName, "declined", 365); // 1 Yıl boyunca tekrar sorma
            banner.remove();
        });
    }

    function loadThirdPartyScripts() {
        console.log("✅ DSGVO: Kullanıcı onay verdi. 3. Parti scriptler yükleniyor...");

        // BURAYA GOOGLE ANALYTICS, PIXEL VB. KODLAR GELECEK
        // Örnek:
        // const script = document.createElement('script');
        // script.src = "https://www.googletagmanager.com/gtag/js?id=UA-XXXXX";
        // script.async = true;
        // document.head.appendChild(script);
    }

    // --- YARDIMCI FONKSİYONLAR (Cookie Yönetimi) ---

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        // SameSite=Strict ve Secure özellikleri modern tarayıcılar ve en üst düzey güvenlik için kritiktir.
        let cookieString = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
        if (window.location.protocol === "https:") {
            cookieString += "; Secure";
        }
        document.cookie = cookieString;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
});
