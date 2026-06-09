const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * LUXE BERLIN - AUTH CONTROLLER (BACKEND)
 */

// 1. Yeni Admin Kaydı
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Eingabefelder dürfen nicht leer sein." });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Registrierung fehlgeschlagen." });
        }
        const newUser = new User({ username, password });
        await newUser.save();
        res.status(201).json({ message: "Admin-Konto erfolgreich erstellt." });
    } catch (err) {
        res.status(500).json({ message: "Serverfehler." });
    }
};

// 2. Login Fonksiyonu (HttpOnly Cookie)
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        // Timing Attack koruması için her zaman karşılaştırma yapıyoruz
        const isMatch = user ? await bcrypt.compare(password, user.password) : false;

        if (!isMatch) {
            return res.status(401).json({ message: "Ungültige Anmeldedaten!" });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 4 * 60 * 60 * 1000 // 4 Saat
        });

        res.json({
            success: true,
            user: { id: user._id, username: user.username }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err.message);
        res.status(500).json({ message: "Anmeldedienst nicht erreichbar." });
    }
};

// 3. Admin Listesini Getir (Eksik fonksiyona mühür)
exports.getAdmins = async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Admin Silme (Hata veren rotanın hedefi)
exports.deleteAdmin = async (req, res) => {
    try {
        // Son adminin silinmesini engelleme (Güvenlik Kalkanı)
        const count = await User.countDocuments();
        if (count <= 1) {
            return res.status(400).json({ message: "Der letzte Admin kann nicht gelöscht werden." });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Admin wurde entfernt." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Logout
exports.logout = async (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Abmeldung erfolgreich." });
};

// 6. Mevcut Kullanıcı Bilgisi
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: "User nicht gefunden." });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Serverfehler" });
    }
};

// 7. Status Kontrolü
exports.getStatus = async (req, res) => {
    res.status(200).json({ authenticated: true });
};