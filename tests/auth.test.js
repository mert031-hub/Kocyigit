const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 🛡️ KRİTİK: Rotaları çağırmadan ÖNCE çevresel değişkenleri simüle et
process.env.JWT_SECRET = 'luxe_berlin_master_secret_123';
process.env.RESEND_API_KEY = 're_test_key_123';

const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

let mongoServer;

describe('LUXE BERLIN - Auth Güvenlik Testleri', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    it('POST /api/auth/register - Yeni admin kaydı başarılı olmalı', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'superadmin', password: 'LuxePassword123' });

        expect(res.statusCode).toEqual(201);
        // Eğer controller 'success' dönmüyorsa status code kontrolü yeterlidir
    });

    it('POST /api/auth/login - Yanlış şifre ile giriş reddedilmeli (401)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'superadmin', password: 'wrongpassword' });

        expect(res.statusCode).toEqual(401);
    });

    it('POST /api/auth/login - Doğru bilgilerle giriş yapılmalı ve Cookie atanmalı', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'superadmin', password: 'LuxePassword123' });

        expect(res.statusCode).toEqual(200);
        expect(res.headers['set-cookie']).toBeDefined();
    });
});