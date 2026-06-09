const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 🛡️ GÜNCELLEME: İsteğin çerezlerinden (cookies) token'ı al
    const token = req.cookies.token;

    // Token yoksa erişimi reddet
    if (!token) {
        return res.status(401).json({ message: "Zugriff verweigert. Kein Token." });
    }

    try {
        // .env dosyasındaki JWT_SECRET ile doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token ist ungültig." });
    }
};