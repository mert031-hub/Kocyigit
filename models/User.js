const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Benutzername ist erforderlich"],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Passwort ist erforderlich"]
    },
    // Yetki yönetimi için eklendi (Gelecek adımlar için kritik)
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' }
});

// Şifreleme Middleware
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

module.exports = mongoose.model('User', UserSchema);