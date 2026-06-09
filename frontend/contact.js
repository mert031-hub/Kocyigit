/**
 * LUXE BERLIN - CONTACT LOGIC
 */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const responseDiv = document.getElementById('responseMessage');
    const btn = e.target.querySelector('button');

    const contactData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };

    btn.disabled = true;
    btn.innerText = "SENDET...";

    try {
        const res = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new TypeError("Sunucudan beklenen yanıt alınamadı (JSON Hatası).");
        }

        const result = await res.json();

        if (res.ok) {
            responseDiv.className = "mt-4 text-center p-3 rounded-3 alert alert-success";
            responseDiv.innerText = "Vielen Dank! Ihre Nachricht wurde erfolgreich versendet.";
            responseDiv.classList.remove('d-none');
            document.getElementById('contactForm').reset();
        } else {
            throw new Error(result.message || "Ein Fehler ist aufgetreten.");
        }
    } catch (err) {
        console.error("Hata Detayı:", err);
        responseDiv.className = "mt-4 text-center p-3 rounded-3 alert alert-danger";
        responseDiv.innerText = "Fehler: " + err.message;
        responseDiv.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerText = "NACHRICHT SENDEN";
    }
});

window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') {
                    AOS.init({
                        duration: 1000,
                        once: true,
                        offset: 50,
                        disableMutationObserver: false
                    });
                    AOS.refresh();
                }
                window.dispatchEvent(new Event('scroll'));
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});