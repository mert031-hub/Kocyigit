const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser'); // ⬅️ EKLE
const { MongoMemoryServer } = require('mongodb-memory-server');
const productRoutes = require('../routes/productRoutes');

// Test ortamı için gizli anahtar simülasyonu
process.env.JWT_SECRET = 'test_secret_key';

const app = express();
app.use(express.json());
app.use(cookieParser()); // ⬅️ KRİTİK: Auth middleware'in çökmesini engeller
app.use('/api/products', productRoutes);

let mongoServer;

describe('LUXE BERLIN - Ürün API Testleri', () => {

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    // ✅ TEST 1: GET (Zaten geçiyordu)
    it('GET /api/products - Ürün listesini başarıyla dönmeli', async () => {
        const res = await request(app).get('/api/products');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    // 🛡️ TEST 2: POST (Artık 500 değil, 401 verecek)
    it('POST /api/products - Token olmadan ürün eklemeyi reddetmeli (401)', async () => {
        const res = await request(app)
            .post('/api/products')
            .send({ name: "Security Test", price: 100 });

        // Middleware artık çökmeyecek, düzgünce "Yetkin yok" (401) diyecek
        expect(res.statusCode).toEqual(401);
    });
});