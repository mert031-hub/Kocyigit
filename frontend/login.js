/**
 * LUXE BERLIN - ADMIN LOGIN LOGIC (SECURE VERSION)
 * Stage 2 Mühürü: Luxe Toast Sistemi ve Generic Hata Yönetimi eklendi.
 */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

// --- 💡 LUXE TOAST SİSTEMİ (Login Özel) ---
function showLuxeAlert(message, type = 'success') {
    let container = document.getElementById('luxe-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'luxe-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `luxe-toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">Luxe Berlin Gate</div>
            <div class="toast-msg">${message}</div>
        </div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// 1. PRELOADER & AOS
window.addEventListener("load", function () {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("preloader-hidden");
            setTimeout(() => {
                if (typeof AOS !== 'undefined') {
                    AOS.init({ duration: 1000, once: true, offset: 100 });
                }
                preloader.style.display = "none";
            }, 1000);
        }, 1200);
    }
});

// 2. LOGIN FORM LOGIC
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginBtn = document.getElementById('loginBtn');
    const username = document.getElementById('user').value;
    const password = document.getElementById('pass').value;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Authentifizierung...';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include' // 🛡️ HttpOnly Cookie için şart
        });

        const data = await response.json();

        if (response.ok) {
            showLuxeAlert("Zugriff gewährt. Willkommen.", "success");
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            showLuxeAlert(data.message || "Anmeldung fehlgeschlagen.", "error");
            loginBtn.disabled = false;
            loginBtn.innerText = "Internal Access";
        }
    } catch (err) {
        console.error("Login Fehler:", err);
        showLuxeAlert("Verbindung zum Secure-Gateway fehlgeschlagen.", "error");
        loginBtn.disabled = false;
        loginBtn.innerText = "Internal Access";
    }
});
